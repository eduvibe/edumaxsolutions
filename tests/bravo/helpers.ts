import { createClient, type Client } from "@libsql/client";
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, vi } from "vitest";
import type { PaystackClient, PaystackTransaction } from "@/lib/bravo/paystack";
import { PaystackError } from "@/lib/bravo/paystack";
import type { ActivationKeySigner } from "@/lib/bravo/activation-key";
import type { BravoDeps, OrderStatus } from "@/lib/bravo/orders";
import { createPendingOrder, startCheckout } from "@/lib/bravo/orders";
import type { Mailer } from "@/lib/bravo/email";
import type { PlanId } from "@/lib/bravo/pricing";

export const TEST_PAYSTACK_SECRET = "sk_test_unit_test_secret";
export const VALID_PRODUCT_ID = "BCBT-YDR9-G5WQ-0860";
export const VALID_EMAIL = "parent@example.com";

/** Real migration file, executed against an in-memory libSQL database. */
export async function createTestDb(): Promise<Client> {
  const db = createClient({ url: ":memory:" });
  const sql = readFileSync(join(process.cwd(), "db", "migrations", "0001_bravo_online_payments.sql"), "utf8");
  await db.executeMultiple(sql);
  return db;
}

export function fakePaystack() {
  const state = {
    initCalls: [] as Array<Parameters<PaystackClient["initializeTransaction"]>[0]>,
    verifyCalls: [] as string[],
    transactions: new Map<string, PaystackTransaction>(),
    verifyFailure: null as Error | null,
    initFailure: null as Error | null,
  };
  const client: PaystackClient = {
    async initializeTransaction(input) {
      state.initCalls.push(input);
      if (state.initFailure) throw state.initFailure;
      return { authorizationUrl: `https://checkout.paystack.com/${input.reference}`, accessCode: `ac_${input.reference}` };
    },
    async verifyTransaction(reference) {
      state.verifyCalls.push(reference);
      if (state.verifyFailure) throw state.verifyFailure;
      const tx = state.transactions.get(reference);
      if (!tx) throw new PaystackError("Transaction reference not found");
      return tx;
    },
  };
  return { client, state };
}

export function fakeSigner(prefix = "TEST-KEY") {
  let counter = 0;
  const signer = vi.fn<ActivationKeySigner>(async ({ productId }) => {
    counter += 1;
    return `${prefix}-${productId}-${String(counter).padStart(4, "0")}`;
  });
  return signer;
}

export function fakeMailer(result: Awaited<ReturnType<Mailer>> = { ok: true, id: "email_1" }) {
  return vi.fn<Mailer>(async () => result);
}

export function makeDeps(overrides: Partial<BravoDeps> & { paystackFake?: ReturnType<typeof fakePaystack> } = {}) {
  const paystackFake = overrides.paystackFake ?? fakePaystack();
  const deps: BravoDeps = {
    db: overrides.db ?? (undefined as unknown as Client),
    paystack: paystackFake.client,
    paystackSecretKey: TEST_PAYSTACK_SECRET,
    signer: fakeSigner(),
    mailer: fakeMailer(),
    siteUrl: "https://www.edumaxsolutions.com.ng",
    now: () => new Date("2026-10-10T12:00:00.000Z"),
    ...overrides,
  };
  return { deps, paystack: paystackFake };
}

export async function makeEnv(overrides: Partial<BravoDeps> = {}) {
  const db = overrides.db ?? (await createTestDb());
  const { deps, paystack } = makeDeps({ ...overrides, db });
  return { db, deps, paystack, signer: deps.signer as ReturnType<typeof fakeSigner>, mailer: deps.mailer as ReturnType<typeof fakeMailer> };
}

/** Creates an order and starts checkout, returning the one-time status token. */
export async function createCheckedOutOrder(
  deps: BravoDeps,
  options: { plan?: PlanId; productId?: string; email?: string } = {}
) {
  const created = await createPendingOrder(deps, {
    productId: options.productId ?? VALID_PRODUCT_ID,
    plan: options.plan ?? "first",
    email: options.email ?? VALID_EMAIL,
  });
  const checkout = await startCheckout(deps, { orderRef: created.orderRef, statusToken: created.statusToken, email: options.email ?? VALID_EMAIL });
  return { ...created, authorizationUrl: checkout.authorizationUrl };
}

export function transactionFor(
  reference: string,
  amountKobo: number,
  overrides: Partial<PaystackTransaction> = {}
): PaystackTransaction {
  return {
    id: overrides.id ?? Math.floor(Math.random() * 1e9) + 1,
    status: "success",
    reference,
    amount: amountKobo,
    currency: "NGN",
    paid_at: "2026-10-10T12:00:01.000Z",
    customer: { email: VALID_EMAIL },
    ...overrides,
  };
}

export function signPaystackBody(body: string, secret = TEST_PAYSTACK_SECRET): string {
  return createHmac("sha512", secret).update(body, "utf8").digest("hex");
}

export function chargeSuccessEvent(reference: string, overrides: Record<string, unknown> = {}) {
  return JSON.stringify({ event: "charge.success", data: { reference, status: "success", ...overrides } });
}

export async function orderRow(db: Client, ref: string) {
  const res = await db.execute({ sql: "SELECT * FROM bravo_orders WHERE order_ref = ?", args: [ref] });
  return res.rows[0];
}

export async function keyRows(db: Client, ref?: string) {
  const res = ref
    ? await db.execute({ sql: "SELECT * FROM bravo_issued_keys WHERE order_ref = ?", args: [ref] })
    : await db.execute("SELECT * FROM bravo_issued_keys");
  return res.rows;
}

export async function expectStatus(db: Client, ref: string, status: OrderStatus) {
  const row = await orderRow(db, ref);
  expect(row?.status).toBe(status);
}
