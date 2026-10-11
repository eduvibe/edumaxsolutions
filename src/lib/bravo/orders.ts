// Core order lifecycle for Bravo CBT online activation.
//
// Invariants:
//  * Amounts/currency come from PLANS on the server, never from the request.
//  * A key is only issued for an order whose Paystack transaction was VERIFIED with the
//    Paystack API (server-to-server) as success, NGN, matching amount, reference and email.
//  * Each order has at most one key (bravo_issued_keys.order_ref is the primary key) and
//    each transaction is attached to at most one order (UNIQUE paystack_transaction_id).
//  * Order status/key retrieval requires the order_ref AND the per-order status token.

import type { Client, Row } from "@libsql/client";
import { createHash } from "node:crypto";
import { hashStatusToken, newOrderRef, newStatusToken, ORDER_REF_RE, statusTokenMatches } from "./tokens";
import { PLANS, normalizeEmail, normalizeProductId, isPlanId, maskEmail, CURRENCY, type PlanId } from "./pricing";
import type { PaystackClient, PaystackTransaction } from "./paystack";
import { verifyPaystackWebhookSignature } from "./paystack";
import type { ActivationKeySigner } from "./activation-key";
import type { Mailer } from "./email";

export type OrderStatus = "pending_payment" | "paid" | "fulfilled" | "needs_review";

export type BravoDeps = {
  db: Client;
  paystack: PaystackClient;
  paystackSecretKey: string;
  signer: ActivationKeySigner;
  /** Edition stamped on every new order (BRAVO_EDITION_YEAR). Order creation refuses when unset. */
  editionYear?: number;
  mailer: Mailer | null;
  siteUrl: string;
  now?: () => Date;
};

export class BravoServiceError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string
  ) {
    super(message);
  }
}

type OrderRow = {
  order_ref: string;
  product_id: string;
  plan: PlanId;
  amount_kobo: number;
  currency: string;
  email: string | null;
  email_source: "creation" | "checkout" | null;
  status: OrderStatus;
  status_token_hash: string;
  authorization_url: string | null;
  paystack_transaction_id: string | null;
  paid_at: string | null;
  review_reason: string | null;
  edition_year: number | null;
  email_status: "not_sent" | "sent" | "failed";
  last_verified_at: string | null;
  created_at: string;
};

type KeyRow = { order_ref: string; product_id: string; activation_key: string; issued_at: string; email_sent_at: string | null };

/** Minimum gap between Paystack verify calls triggered by polling. */
const RECONCILE_INTERVAL_MS = 15_000;

/**
 * How long an order handed over from the Bravo app can START a new Paystack checkout.
 * Expiry blocks only new checkouts. A checkout already started on Paystack is still completed
 * by the webhook/verify path, because the buyer may have paid after the window closed.
 */
export const CHECKOUT_WINDOW_MS = 2 * 60 * 60 * 1000;

const nowIso = (deps: BravoDeps) => (deps.now ? deps.now() : new Date()).toISOString();
const nowMs = (deps: BravoDeps) => (deps.now ? deps.now() : new Date()).getTime();

/**
 * Fields that the client must never set. Matched by name on the request body. Product ID and plan are
 * the order identity, so they are accepted at creation only, never at checkout. Price, currency, edition,
 * status, tokens and Paystack data are always computed or stored by the server.
 */
const AUTHORITATIVE_FIELD_RE =
  /amount|price|currency|edition|status|token|paystack|authori|order_?ref|kobo|naira|bundle|activation|issued|expir|flag/i;
const CREATE_ALLOWED_FIELDS = new Set(["productId", "plan", "email"]);
const CHECKOUT_ALLOWED_FIELDS = new Set(["email"]);
const CHECKOUT_FORBIDDEN_IDENTITY_FIELDS = ["productId", "plan"];

/** Throws 400 when the body tries to set a value the server owns. Unknown benign fields are ignored. */
export function rejectAuthoritativeFields(body: Record<string, unknown> | undefined, allowed: Set<string>, forbiddenNames: string[] = []) {
  if (!body) return;
  for (const key of Object.keys(body)) {
    if (allowed.has(key)) continue;
    if (AUTHORITATIVE_FIELD_RE.test(key) || forbiddenNames.includes(key)) {
      throw new BravoServiceError(
        400,
        "authoritative_field_rejected",
        "Product ID, plan, price and edition are set by Bravo CBT and cannot be changed here."
      );
    }
  }
}

function parseOptionalEmail(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return null;
  const email = normalizeEmail(value);
  if (!email) throw new BravoServiceError(400, "invalid_email", "Enter a valid email address");
  return email;
}

/** True once the handoff window has closed for an order that has NOT yet started Paystack checkout. */
export function isCheckoutExpired(order: Pick<OrderRow, "created_at" | "authorization_url">, nowMillis: number): boolean {
  if (order.authorization_url) return false;
  const created = Date.parse(order.created_at);
  return !Number.isFinite(created) || nowMillis - created > CHECKOUT_WINDOW_MS;
}

/** The buyer may change an email they typed themselves, until Paystack checkout has started. */
function isBuyerEmailChangeable(order: OrderRow): boolean {
  return order.email_source === "checkout" && !order.authorization_url;
}

function str(row: Row, key: string): string | null {
  const v = row[key];
  return v === null || v === undefined ? null : String(v);
}

function toOrder(row: Row): OrderRow {
  return {
    order_ref: String(row.order_ref),
    product_id: String(row.product_id),
    plan: row.plan as PlanId,
    amount_kobo: Number(row.amount_kobo),
    currency: String(row.currency),
    email: str(row, "email"),
    email_source: (str(row, "email_source") as OrderRow["email_source"]) ?? null,
    status: row.status as OrderStatus,
    status_token_hash: String(row.status_token_hash),
    authorization_url: str(row, "authorization_url"),
    paystack_transaction_id: str(row, "paystack_transaction_id"),
    paid_at: str(row, "paid_at"),
    review_reason: str(row, "review_reason"),
    edition_year: row.edition_year === null || row.edition_year === undefined ? null : Number(row.edition_year),
    email_status: row.email_status as OrderRow["email_status"],
    last_verified_at: str(row, "last_verified_at"),
    created_at: String(row.created_at),
  };
}

function isUniqueViolation(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /UNIQUE constraint failed|SQLITE_CONSTRAINT/i.test(message);
}

async function loadOrder(deps: BravoDeps, ref: string): Promise<OrderRow | null> {
  const res = await deps.db.execute({ sql: "SELECT * FROM bravo_orders WHERE order_ref = ?", args: [ref] });
  return res.rows[0] ? toOrder(res.rows[0]) : null;
}

/** Looks up an order AND checks the status token. Unknown ref and wrong token both return 404. */
async function loadAuthorizedOrder(deps: BravoDeps, ref: string, token: string | null): Promise<OrderRow> {
  const order = ORDER_REF_RE.test(ref) ? await loadOrder(deps, ref) : null;
  if (!order || !statusTokenMatches(token, order.status_token_hash)) {
    throw new BravoServiceError(404, "not_found", "Order not found");
  }
  return order;
}

async function getIssuedKey(deps: BravoDeps, ref: string): Promise<KeyRow | null> {
  const res = await deps.db.execute({
    sql: "SELECT order_ref, product_id, activation_key, issued_at, email_sent_at FROM bravo_issued_keys WHERE order_ref = ?",
    args: [ref],
  });
  const row = res.rows[0];
  if (!row) return null;
  return {
    order_ref: String(row.order_ref),
    product_id: String(row.product_id),
    activation_key: String(row.activation_key),
    issued_at: String(row.issued_at),
    email_sent_at: str(row, "email_sent_at"),
  };
}

// ─── 1. Create pending order ────────────────────────────────────────────────

export type CreatedOrder = {
  orderRef: string;
  statusToken: string;
  status: "pending_payment";
  productId: string;
  plan: PlanId;
  amountNaira: number;
  currency: typeof CURRENCY;
  createdAt: string;
};

export async function createPendingOrder(
  deps: BravoDeps,
  input: { productId?: unknown; plan?: unknown; email?: unknown; [extra: string]: unknown }
): Promise<CreatedOrder> {
  rejectAuthoritativeFields(input, CREATE_ALLOWED_FIELDS);
  const productId = normalizeProductId(input.productId);
  if (!productId) throw new BravoServiceError(400, "invalid_product_id", "Enter a valid Bravo Product ID");
  if (!isPlanId(input.plan)) throw new BravoServiceError(400, "invalid_plan", "Choose a valid plan");
  const email = parseOptionalEmail(input.email);

  if (!deps.editionYear) {
    throw new BravoServiceError(503, "not_configured", "Online payment is temporarily unavailable.");
  }
  const plan = PLANS[input.plan];
  const orderRef = newOrderRef();
  const statusToken = newStatusToken();
  const createdAt = nowIso(deps);

  await deps.db.execute({
    sql: `INSERT INTO bravo_orders
            (order_ref, product_id, plan, amount_kobo, currency, email, email_source, status, status_token_hash, edition_year, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, 'pending_payment', ?, ?, ?, ?)`,
    args: [
      orderRef,
      productId,
      plan.id,
      plan.amountKobo,
      CURRENCY,
      email,
      email ? "creation" : null,
      hashStatusToken(statusToken),
      deps.editionYear,
      createdAt,
      createdAt,
    ],
  });

  return {
    orderRef,
    statusToken,
    status: "pending_payment",
    productId,
    plan: plan.id,
    amountNaira: plan.amountNaira,
    currency: CURRENCY,
    createdAt,
  };
}

// ─── 2. Start Paystack checkout ─────────────────────────────────────────────

/**
 * Starts (or resumes) Paystack checkout for one order.
 *  - Saved email (from the app) is used server-side. No email is needed from the browser.
 *  - Without a saved email, the buyer's email is required once and stored before Paystack starts.
 *  - Once Paystack has been initialised, the same link is returned and the email is locked.
 */
export async function startCheckout(
  deps: BravoDeps,
  input: { orderRef: string; statusToken: string | null; email?: unknown; body?: Record<string, unknown> }
): Promise<{ orderRef: string; authorizationUrl: string }> {
  let order = await loadAuthorizedOrder(deps, input.orderRef, input.statusToken);
  rejectAuthoritativeFields(input.body, CHECKOUT_ALLOWED_FIELDS, CHECKOUT_FORBIDDEN_IDENTITY_FIELDS);

  if (order.status !== "pending_payment") {
    throw new BravoServiceError(409, "order_not_payable", `Order is already ${order.status}`);
  }
  const provided = parseOptionalEmail(input.email);

  if (order.authorization_url) return resumeCheckout(order, provided);

  if (isCheckoutExpired(order, nowMs(deps))) {
    throw new BravoServiceError(410, "order_expired", "This payment link has expired. Start the purchase again from Bravo CBT.");
  }

  if (provided && provided !== order.email) {
    if (order.email && !isBuyerEmailChangeable(order)) {
      throw new BravoServiceError(409, "email_locked", "This order is tied to a different email. Start a new order from Bravo CBT.");
    }
    // Claim (or change, for a buyer-typed email) the address before Paystack ever sees it.
    await deps.db.execute({
      sql: `UPDATE bravo_orders
               SET email = ?, email_source = 'checkout', updated_at = ?
             WHERE order_ref = ? AND status = 'pending_payment' AND authorization_url IS NULL
               AND (email IS NULL OR (email_source = 'checkout' AND email = ?))`,
      args: [provided, nowIso(deps), order.order_ref, order.email],
    });
    order = (await loadOrder(deps, order.order_ref)) ?? order;
    if (order.authorization_url) return resumeCheckout(order, provided);
    if (order.email !== provided) {
      throw new BravoServiceError(409, "email_locked", "This order is tied to a different email. Start a new order from Bravo CBT.");
    }
  }

  if (!order.email) throw new BravoServiceError(400, "email_required", "An email address is required to pay");

  const initialized = await deps.paystack
    .initializeTransaction({
      email: order.email, // the stored address, never a browser value that was not just validated and saved
      amountKobo: order.amount_kobo, // server-side amount only
      reference: order.order_ref,
      callbackUrl: `${deps.siteUrl}/bravo/activate/status?order=${encodeURIComponent(order.order_ref)}`,
      metadata: { order_ref: order.order_ref, product_id: order.product_id, plan: order.plan, source: "bravo-cbt" },
    })
    .catch((error: unknown) => {
      console.error("[bravo] paystack initialize failed", order.order_ref, error instanceof Error ? error.message : error);
      throw new BravoServiceError(502, "payment_provider_error", "Could not start payment. Please try again.");
    });

  // Store the link only if the email is still the one Paystack was initialised with. A concurrent email change
  // in the meantime must not leave a Paystack transaction that disagrees with the stored order email.
  const stored = await deps.db.execute({
    sql: `UPDATE bravo_orders
             SET authorization_url = ?, paystack_access_code = ?, updated_at = ?
           WHERE order_ref = ? AND status = 'pending_payment' AND authorization_url IS NULL AND email = ?`,
    args: [initialized.authorizationUrl, initialized.accessCode, nowIso(deps), order.order_ref, order.email],
  });
  if (stored.rowsAffected === 1) {
    return { orderRef: order.order_ref, authorizationUrl: initialized.authorizationUrl };
  }

  // A concurrent request stored its own link first (same email), so return that one.
  const current = await loadOrder(deps, order.order_ref);
  if (current?.authorization_url) return resumeCheckout(current, order.email);
  throw new BravoServiceError(409, "email_locked", "This order's email changed while payment was starting. Please try again.");
}

function resumeCheckout(order: OrderRow, provided: string | null): { orderRef: string; authorizationUrl: string } {
  if (provided && order.email && provided !== order.email) {
    throw new BravoServiceError(409, "checkout_already_started", "Checkout already started for this order with another email. Create a new order.");
  }
  return { orderRef: order.order_ref, authorizationUrl: order.authorization_url as string };
}

// ─── 3. Protected status / key retrieval ───────────────────────────────────

export type PublicOrderStatus = {
  orderRef: string;
  status: OrderStatus;
  productId: string;
  plan: PlanId;
  amountNaira: number;
  currency: typeof CURRENCY;
  /** Masked address for display only. The full address is never sent to the browser. */
  email: string | null;
  /** True when an email is already stored for this order (the app supplied it or the buyer typed it). */
  emailOnFile: boolean;
  /** True when the handoff window has closed and no Paystack checkout was started. The browser must not offer payment. */
  checkoutExpired: boolean;
  createdAt: string;
  paidAt: string | null;
  emailSent: boolean;
  /** Present only when status === "fulfilled" (payment verified and key issued). */
  activationKey: string | null;
  issuedAt: string | null;
};

const STATUS_MESSAGES: Record<OrderStatus, string> = {
  pending_payment: "Waiting for payment confirmation.",
  paid: "Payment received. Your activation key is being prepared.",
  fulfilled: "Payment confirmed. Your activation key is ready.",
  needs_review: "This payment needs a manual check. Contact EduMax Solutions with your order reference.",
};

async function toPublicStatus(deps: BravoDeps, order: OrderRow): Promise<PublicOrderStatus> {
  const key = order.status === "fulfilled" ? await getIssuedKey(deps, order.order_ref) : null;
  const expired = order.status === "pending_payment" && isCheckoutExpired(order, nowMs(deps));
  return {
    orderRef: order.order_ref,
    status: order.status,
    productId: order.product_id,
    plan: order.plan,
    amountNaira: order.amount_kobo / 100,
    currency: CURRENCY,
    email: maskEmail(order.email),
    emailOnFile: order.email !== null,
    checkoutExpired: expired,
    createdAt: order.created_at,
    paidAt: order.paid_at,
    emailSent: key?.email_sent_at != null,
    activationKey: key?.activation_key ?? null,
    issuedAt: key?.issued_at ?? null,
  };
}

export function statusMessage(status: OrderStatus): string {
  return STATUS_MESSAGES[status];
}

export async function getOrderStatus(
  deps: BravoDeps,
  input: { orderRef: string; statusToken: string | null }
): Promise<PublicOrderStatus & { message: string }> {
  let order = await loadAuthorizedOrder(deps, input.orderRef, input.statusToken);
  const now = nowMs(deps);
  const lastVerified = order.last_verified_at ? Date.parse(order.last_verified_at) : 0;

  // Polling can reconcile a pending order by asking Paystack directly. This never trusts the browser.
  if (order.status === "pending_payment" && order.authorization_url && now - lastVerified >= RECONCILE_INTERVAL_MS) {
    await fulfillFromPaystack(deps, order.order_ref).catch((error: unknown) =>
      console.error("[bravo] reconcile failed", order.order_ref, error instanceof Error ? error.message : error)
    );
    order = (await loadOrder(deps, order.order_ref)) ?? order;
  } else if (order.status === "paid") {
    // Payment already verified earlier but key issuance failed; retry it.
    await fulfillFromPaystack(deps, order.order_ref).catch((error: unknown) =>
      console.error("[bravo] key retry failed", order.order_ref, error instanceof Error ? error.message : error)
    );
    order = (await loadOrder(deps, order.order_ref)) ?? order;
  }

  const status = await toPublicStatus(deps, order);
  return { ...status, message: statusMessage(order.status) };
}

// ─── 4. Fulfilment (shared by webhook, polling and retries) ────────────────

export type FulfillmentOutcome = "fulfilled" | "pending_payment" | "paid_awaiting_key" | "needs_review" | "not_found";

/**
 * Verifies the Paystack transaction for `ref` server-to-server and, if valid, records the
 * payment and issues exactly one key. Safe to call any number of times, concurrently.
 */
export async function fulfillFromPaystack(deps: BravoDeps, ref: string): Promise<{ outcome: FulfillmentOutcome }> {
  if (!ORDER_REF_RE.test(ref)) return { outcome: "not_found" };
  let order = await loadOrder(deps, ref);
  if (!order) return { outcome: "not_found" };
  if (order.status === "needs_review") return { outcome: "needs_review" };

  if (order.status === "pending_payment") {
    if (!order.authorization_url) return { outcome: "pending_payment" };

    const tx = await deps.paystack.verifyTransaction(ref);
    await deps.db.execute({
      sql: "UPDATE bravo_orders SET last_verified_at = ? WHERE order_ref = ?",
      args: [nowIso(deps), ref],
    });

    const check = validateTransaction(tx, order);
    if (!check.ok) {
      if (check.review) {
        await markNeedsReview(deps, ref, check.reason);
        return { outcome: "needs_review" };
      }
      return { outcome: "pending_payment" };
    }

    const recorded = await recordPayment(deps, order, tx);
    if (recorded === "needs_review") return { outcome: "needs_review" };
    order = (await loadOrder(deps, ref)) ?? order;
  }

  if (order.status === "needs_review") return { outcome: "needs_review" };
  if (order.status !== "paid" && order.status !== "fulfilled") return { outcome: "pending_payment" };

  let key: KeyRow;
  try {
    key = await issueKeyOnce(deps, order);
  } catch (error) {
    console.error("[bravo] key issuance failed", ref, error instanceof Error ? error.message : error);
    return { outcome: "paid_awaiting_key" };
  }
  await sendKeyEmailOnce(deps, order, key);
  return { outcome: "fulfilled" };
}

type Validation = { ok: true } | { ok: false; review: boolean; reason: string };

/** Validates the Paystack verify response against our order. Amount/currency/ref/email mismatches need review. */
export function validateTransaction(tx: PaystackTransaction, order: Pick<OrderRow, "order_ref" | "amount_kobo" | "currency" | "email">): Validation {
  if (!tx || tx.reference !== order.order_ref) return { ok: false, review: true, reason: "reference_mismatch" };
  if (tx.status !== "success") return { ok: false, review: false, reason: "not_successful" };
  if (String(tx.currency ?? "").toUpperCase() !== order.currency) return { ok: false, review: true, reason: "currency_mismatch" };
  if (Number(tx.amount) !== order.amount_kobo) return { ok: false, review: true, reason: "amount_mismatch" };
  if (order.email && (tx.customer?.email ?? "").toLowerCase() !== order.email.toLowerCase()) {
    return { ok: false, review: true, reason: "email_mismatch" };
  }
  if (tx.id === undefined || tx.id === null || String(tx.id) === "") return { ok: false, review: true, reason: "missing_transaction_id" };
  return { ok: true };
}

async function recordPayment(deps: BravoDeps, order: OrderRow, tx: PaystackTransaction): Promise<"paid" | "needs_review"> {
  const now = nowIso(deps);
  try {
    const res = await deps.db.execute({
      sql: `UPDATE bravo_orders
               SET status = 'paid', paystack_transaction_id = ?, paid_amount_kobo = ?, paid_at = ?,
                   last_verified_at = ?, updated_at = ?
             WHERE order_ref = ? AND status = 'pending_payment'`,
      args: [String(tx.id), Number(tx.amount), tx.paid_at ?? now, now, now, order.order_ref],
    });
    if (res.rowsAffected === 1) return "paid";

    // Lost a race. Accept only if the same transaction was already recorded.
    const current = await loadOrder(deps, order.order_ref);
    if (current && (current.status === "paid" || current.status === "fulfilled") && current.paystack_transaction_id === String(tx.id)) {
      return "paid";
    }
    await markNeedsReview(deps, order.order_ref, "conflicting_payment_record");
    return "needs_review";
  } catch (error) {
    if (isUniqueViolation(error)) {
      // The same Paystack transaction is already attached to a different order.
      await markNeedsReview(deps, order.order_ref, "transaction_already_used");
      return "needs_review";
    }
    throw error;
  }
}

async function markNeedsReview(deps: BravoDeps, ref: string, reason: string) {
  console.error("[bravo] order needs review", ref, reason);
  await deps.db.execute({
    sql: `UPDATE bravo_orders SET status = 'needs_review', review_reason = ?, updated_at = ?
           WHERE order_ref = ? AND status IN ('pending_payment', 'paid')`,
    args: [reason, nowIso(deps), ref],
  });
}

/** Creates the key row exactly once. A concurrent loser signs a key it then discards. */
async function issueKeyOnce(deps: BravoDeps, order: OrderRow): Promise<KeyRow> {
  const existing = await getIssuedKey(deps, order.order_ref);
  if (existing) {
    // A previous attempt may have stored the key but stopped before marking the order fulfilled. Finish that step.
    await deps.db.execute({
      sql: "UPDATE bravo_orders SET status = 'fulfilled', updated_at = ? WHERE order_ref = ? AND status = 'paid'",
      args: [nowIso(deps), order.order_ref],
    });
    return existing;
  }

  if (!order.edition_year) {
    throw new Error("order has no edition_year; refusing to issue a key");
  }
  const activationKey = await deps.signer({
    productId: order.product_id,
    plan: order.plan,
    orderRef: order.order_ref,
    editionYear: order.edition_year,
  });
  if (typeof activationKey !== "string" || activationKey.trim().length === 0) {
    throw new Error("signer returned an empty key");
  }

  const now = nowIso(deps);
  const inserted = await deps.db.execute({
    sql: "INSERT OR IGNORE INTO bravo_issued_keys (order_ref, product_id, activation_key, issued_at) VALUES (?, ?, ?, ?)",
    args: [order.order_ref, order.product_id, activationKey.trim(), now],
  });
  if (inserted.rowsAffected === 1) {
    await deps.db.execute({
      sql: "UPDATE bravo_orders SET status = 'fulfilled', updated_at = ? WHERE order_ref = ? AND status = 'paid'",
      args: [now, order.order_ref],
    });
  }

  const key = await getIssuedKey(deps, order.order_ref);
  if (!key) throw new Error("key row missing after insert");
  return key;
}

/** Emails the stored key. Uses a stable idempotency key so retries never send a second, different key. */
async function sendKeyEmailOnce(deps: BravoDeps, order: OrderRow, key: KeyRow): Promise<void> {
  if (key.email_sent_at || !order.email || !deps.mailer) return;
  const result = await deps.mailer({
    to: order.email,
    productId: order.product_id,
    plan: order.plan,
    orderRef: order.order_ref,
    activationKey: key.activation_key,
    idempotencyKey: `bravo-activation-${order.order_ref}`,
  });
  const now = nowIso(deps);
  if (result.ok) {
    await deps.db.execute({
      sql: "UPDATE bravo_issued_keys SET email_sent_at = ? WHERE order_ref = ? AND email_sent_at IS NULL",
      args: [now, order.order_ref],
    });
    await deps.db.execute({ sql: "UPDATE bravo_orders SET email_status = 'sent' WHERE order_ref = ?", args: [order.order_ref] });
  } else {
    // The key is still stored and shown on the status page, so an email failure is not fatal.
    console.error("[bravo] activation email failed", order.order_ref, result.error);
    await deps.db.execute({ sql: "UPDATE bravo_orders SET email_status = 'failed' WHERE order_ref = ?", args: [order.order_ref] });
  }
}

// ─── 5. Paystack webhook ───────────────────────────────────────────────────

type PaystackWebhookEvent = { event?: unknown; data?: { reference?: unknown } } | null;

export async function handlePaystackWebhook(
  deps: BravoDeps,
  rawBody: string,
  signature: string | null
): Promise<{ status: number; body: Record<string, unknown> }> {
  if (!verifyPaystackWebhookSignature(rawBody, signature, deps.paystackSecretKey)) {
    return { status: 401, body: { error: "invalid_signature" } };
  }

  let event: PaystackWebhookEvent | null;
  try {
    event = JSON.parse(rawBody) as PaystackWebhookEvent;
  } catch {
    return { status: 400, body: { error: "invalid_json" } };
  }

  const type = typeof event?.event === "string" ? event.event : "unknown";
  const reference = typeof event?.data?.reference === "string" ? event.data.reference : null;
  const bodyHash = sha256Hex(rawBody);

  if (type !== "charge.success" || !reference || !ORDER_REF_RE.test(reference)) {
    await logEvent(deps, type, reference, bodyHash, "ignored");
    return { status: 200, body: { received: true, ignored: true } };
  }

  try {
    const { outcome } = await fulfillFromPaystack(deps, reference);
    await logEvent(deps, type, reference, bodyHash, outcome);
    if (outcome === "paid_awaiting_key") {
      // Payment is verified and recorded, but no key could be issued (e.g. signer unavailable).
      // A non-2xx makes Paystack retry, and the next delivery issues the key without re-charging.
      return { status: 500, body: { error: "key_pending", outcome } };
    }
    return { status: 200, body: { received: true, outcome } };
  } catch (error) {
    // Non-2xx makes Paystack retry the webhook. Fulfilment is idempotent, so retries are safe.
    console.error("[bravo] webhook processing failed", reference, error instanceof Error ? error.message : error);
    await logEvent(deps, type, reference, bodyHash, "retry");
    return { status: 500, body: { error: "processing_failed" } };
  }
}

async function logEvent(deps: BravoDeps, type: string, ref: string | null, bodyHash: string, outcome: string) {
  try {
    await deps.db.execute({
      sql: "INSERT INTO bravo_payment_events (provider, event_type, order_ref, body_sha256, outcome, received_at) VALUES ('paystack', ?, ?, ?, ?, ?)",
      args: [type, ref, bodyHash, outcome, nowIso(deps)],
    });
  } catch (error) {
    console.error("[bravo] could not write payment event log", error instanceof Error ? error.message : error);
  }
}

function sha256Hex(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}
