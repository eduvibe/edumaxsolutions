import { describe, expect, it, vi } from "vitest";
import { createPublicKey, generateKeyPairSync, randomUUID } from "node:crypto";
import {
  BravoServiceError,
  fulfillFromPaystack,
  getOrderStatus,
  handlePaystackWebhook,
  startCheckout,
  createPendingOrder,
  validateTransaction,
} from "@/lib/bravo/orders";
import { unvendoredActivationKeySigner, assertActivationPrivateKeyMatchesPublicKey, BRAVO_ACTIVATION_PUBLIC_KEY_PEM } from "@/lib/bravo/activation-key";
import { createPaystackClient, verifyPaystackWebhookSignature } from "@/lib/bravo/paystack";
import { getBravoServerConfig, BravoConfigError } from "@/lib/bravo/config";
import { renderActivationEmail, createResendMailer } from "@/lib/bravo/email";
import { hashStatusToken, ORDER_REF_RE, statusTokenMatches } from "@/lib/bravo/tokens";
import { normalizeEmail, normalizeProductId } from "@/lib/bravo/pricing";
import {
  makeEnv,
  createCheckedOutOrder,
  transactionFor,
  signPaystackBody,
  chargeSuccessEvent,
  orderRow,
  keyRows,
  expectStatus,
  fakePaystack,
  fakeMailer,
  fakeSigner,
  VALID_PRODUCT_ID,
  VALID_EMAIL,
  TEST_PAYSTACK_SECRET,
  createTestDb,
} from "./helpers";

const FIRST_KOBO = 400000;
const RENEWAL_KOBO = 300000;

function signedWebhook(body: string, secret = TEST_PAYSTACK_SECRET) {
  return { body, signature: signPaystackBody(body, secret) };
}

describe("webhook signature verification", () => {
  it("accepts a correctly signed raw body", () => {
    const body = chargeSuccessEvent("BCBT_0123456789ABCDEF01234567");
    expect(verifyPaystackWebhookSignature(body, signPaystackBody(body), TEST_PAYSTACK_SECRET)).toBe(true);
  });

  it("rejects a signature made with another secret", () => {
    const body = chargeSuccessEvent("BCBT_0123456789ABCDEF01234567");
    expect(verifyPaystackWebhookSignature(body, signPaystackBody(body, "sk_test_other"), TEST_PAYSTACK_SECRET)).toBe(false);
  });

  it("rejects a tampered body even when the signature was valid for the original", () => {
    const body = chargeSuccessEvent("BCBT_0123456789ABCDEF01234567", { amount: 400000 });
    const signature = signPaystackBody(body);
    const tampered = body.replace("400000", "100");
    expect(verifyPaystackWebhookSignature(tampered, signature, TEST_PAYSTACK_SECRET)).toBe(false);
  });

  it("rejects a missing or malformed signature", () => {
    const body = "{}";
    expect(verifyPaystackWebhookSignature(body, null, TEST_PAYSTACK_SECRET)).toBe(false);
    expect(verifyPaystackWebhookSignature(body, "", TEST_PAYSTACK_SECRET)).toBe(false);
    expect(verifyPaystackWebhookSignature(body, "abc", TEST_PAYSTACK_SECRET)).toBe(false);
  });

  it("returns 401 and touches nothing when the signature is invalid", async () => {
    const { db, deps, paystack, signer } = await makeEnv();
    const created = await createCheckedOutOrder(deps);
    const body = chargeSuccessEvent(created.orderRef);

    const result = await handlePaystackWebhook(deps, body, "deadbeef");

    expect(result.status).toBe(401);
    expect(paystack.state.verifyCalls).toHaveLength(0);
    expect(signer).not.toHaveBeenCalled();
    expect(await keyRows(db)).toHaveLength(0);
    await expectStatus(db, created.orderRef, "pending_payment");
  });

  it("returns 400 for a validly signed body that is not JSON", async () => {
    const { deps } = await makeEnv();
    const body = "not json";
    const result = await handlePaystackWebhook(deps, body, signPaystackBody(body));
    expect(result.status).toBe(400);
  });
});

describe("order creation", () => {
  it("rejects malformed product IDs, plans and emails", async () => {
    const { deps } = await makeEnv();
    await expect(createPendingOrder(deps, { productId: "nope", plan: "first" })).rejects.toMatchObject({ code: "invalid_product_id" });
    await expect(createPendingOrder(deps, { productId: VALID_PRODUCT_ID, plan: "gold" })).rejects.toMatchObject({ code: "invalid_plan" });
    await expect(createPendingOrder(deps, { productId: VALID_PRODUCT_ID, plan: "first", email: "not-an-email" })).rejects.toMatchObject({ code: "invalid_email" });
  });

  it("ignores any amount supplied by the client and stores the server price", async () => {
    const { db, deps } = await makeEnv();
    const created = await createPendingOrder(deps, {
      productId: VALID_PRODUCT_ID,
      plan: "renewal",
      email: VALID_EMAIL,
      amount: 1,
      amount_kobo: 1,
      currency: "USD",
      status: "fulfilled",
    } as never);
    const row = await orderRow(db, created.orderRef);
    expect(row?.amount_kobo).toBe(RENEWAL_KOBO);
    expect(row?.currency).toBe("NGN");
    expect(row?.status).toBe("pending_payment");
    expect(created.amountNaira).toBe(3000);
  });

  it("stores only a hash of the status token and generates unique refs", async () => {
    const { db, deps } = await makeEnv();
    const a = await createPendingOrder(deps, { productId: VALID_PRODUCT_ID, plan: "first" });
    const b = await createPendingOrder(deps, { productId: VALID_PRODUCT_ID, plan: "first" });
    expect(ORDER_REF_RE.test(a.orderRef)).toBe(true);
    expect(a.orderRef).not.toBe(b.orderRef);
    const row = await orderRow(db, a.orderRef);
    expect(row?.status_token_hash).toBe(hashStatusToken(a.statusToken));
    const everything = JSON.stringify((await db.execute("SELECT * FROM bravo_orders")).rows);
    expect(everything).not.toContain(a.statusToken);
  });

  it("normalises product IDs and emails", () => {
    expect(normalizeProductId("  bcbt-ydr9-g5wq-0860 ")).toBe("BCBT-YDR9-G5WQ-0860");
    expect(normalizeProductId("BCBT-YDR9-G5WQ-0860; DROP")).toBeNull();
    expect(normalizeEmail(" Parent@Example.COM ")).toBe("parent@example.com");
    expect(normalizeEmail("a@b")).toBeNull();
  });
});

describe("checkout initialisation", () => {
  it("initialises Paystack with the server amount, NGN, and the order reference", async () => {
    const { deps, paystack } = await makeEnv();
    const created = await createPendingOrder(deps, { productId: VALID_PRODUCT_ID, plan: "first" });
    const result = await startCheckout(deps, { orderRef: created.orderRef, statusToken: created.statusToken, email: VALID_EMAIL });

    expect(result.authorizationUrl).toContain(created.orderRef);
    expect(paystack.state.initCalls).toHaveLength(1);
    const call = paystack.state.initCalls[0];
    expect(call.amountKobo).toBe(FIRST_KOBO);
    expect(call.reference).toBe(created.orderRef);
    expect(call.email).toBe(VALID_EMAIL);
    expect(call.callbackUrl).toBe(`https://www.edumaxsolutions.com.ng/bravo/activate/status?order=${created.orderRef}`);
  });

  it("re-uses the same checkout link and does not re-initialise Paystack on retry", async () => {
    const { deps, paystack } = await makeEnv();
    const created = await createPendingOrder(deps, { productId: VALID_PRODUCT_ID, plan: "first" });
    const first = await startCheckout(deps, { orderRef: created.orderRef, statusToken: created.statusToken, email: VALID_EMAIL });
    const second = await startCheckout(deps, { orderRef: created.orderRef, statusToken: created.statusToken, email: VALID_EMAIL });
    expect(second.authorizationUrl).toBe(first.authorizationUrl);
    expect(paystack.state.initCalls).toHaveLength(1);
  });

  it("refuses to change the email after checkout has started", async () => {
    const { deps } = await makeEnv();
    const created = await createPendingOrder(deps, { productId: VALID_PRODUCT_ID, plan: "first" });
    await startCheckout(deps, { orderRef: created.orderRef, statusToken: created.statusToken, email: VALID_EMAIL });
    await expect(
      startCheckout(deps, { orderRef: created.orderRef, statusToken: created.statusToken, email: "other@example.com" })
    ).rejects.toMatchObject({ status: 409, code: "checkout_already_started" });
  });

  it("requires the correct status token", async () => {
    const { deps, paystack } = await makeEnv();
    const created = await createPendingOrder(deps, { productId: VALID_PRODUCT_ID, plan: "first", email: VALID_EMAIL });
    await expect(startCheckout(deps, { orderRef: created.orderRef, statusToken: null })).rejects.toMatchObject({ status: 404 });
    await expect(startCheckout(deps, { orderRef: created.orderRef, statusToken: "wrong-token" })).rejects.toMatchObject({ status: 404 });
    expect(paystack.state.initCalls).toHaveLength(0);
  });

  it("returns the same 404 for a wrong token and for an unknown order", async () => {
    const { deps } = await makeEnv();
    const created = await createPendingOrder(deps, { productId: VALID_PRODUCT_ID, plan: "first" });
    const unknown = await getOrderStatus(deps, { orderRef: created.orderRef, statusToken: created.statusToken }).then(
      () => "found",
      (e: BravoServiceError) => `${e.status}:${e.code}`
    );
    const wrongToken = await getOrderStatus(deps, { orderRef: created.orderRef, statusToken: "x".repeat(43) }).then(
      () => "found",
      (e: BravoServiceError) => `${e.status}:${e.code}`
    );
    const missingRef = await getOrderStatus(deps, { orderRef: "BCBT_000000000000000000000000", statusToken: "x".repeat(43) }).then(
      () => "found",
      (e: BravoServiceError) => `${e.status}:${e.code}`
    );
    expect(unknown).toBe("found");
    expect(wrongToken).toBe("404:not_found");
    expect(missingRef).toBe("404:not_found");
  });

  it("returns a 502 without leaking provider details when Paystack initialisation fails", async () => {
    const paystack = fakePaystack();
    paystack.state.initFailure = new Error("secret upstream detail");
    const { deps } = await makeEnv({ paystackFake: paystack } as never);
    const created = await createPendingOrder(deps, { productId: VALID_PRODUCT_ID, plan: "first" });
    await expect(startCheckout(deps, { orderRef: created.orderRef, statusToken: created.statusToken, email: VALID_EMAIL })).rejects.toMatchObject({
      status: 502,
      message: "Could not start payment. Please try again.",
    });
  });
});

describe("edition is recorded per order", () => {
  it("refuses to create orders while BRAVO_EDITION_YEAR is unset", async () => {
    const { deps } = await makeEnv();
    deps.editionYear = undefined;
    await expect(createPendingOrder(deps, { productId: VALID_PRODUCT_ID, plan: "first" })).rejects.toMatchObject({
      status: 503,
      code: "not_configured",
    });
  });

  it("signs with the edition stored on the order, even if the setting changes later", async () => {
    const { db, deps, paystack, signer } = await makeEnv();
    const order = await createCheckedOutOrder(deps, { plan: "first" }); // stored as 2026
    deps.editionYear = 2027; // a new edition is configured before this payment is verified
    paystack.state.transactions.set(order.orderRef, transactionFor(order.orderRef, FIRST_KOBO));

    const { body, signature } = signedWebhook(chargeSuccessEvent(order.orderRef));
    const res = await handlePaystackWebhook(deps, body, signature);

    expect(res.body.outcome).toBe("fulfilled");
    expect(signer).toHaveBeenCalledWith(expect.objectContaining({ editionYear: 2026 }));
    const row = await orderRow(db, order.orderRef);
    expect(row.edition_year).toBe(2026);
  });
});

describe("happy path: verified payment -> one key -> protected retrieval", () => {
  it("issues one key after webhook verification, emails it once and returns it only with the token", async () => {
    const { db, deps, paystack, signer, mailer } = await makeEnv();
    const order = await createCheckedOutOrder(deps, { plan: "first" });
    paystack.state.transactions.set(order.orderRef, transactionFor(order.orderRef, FIRST_KOBO));

    const { body, signature } = signedWebhook(chargeSuccessEvent(order.orderRef));
    const res = await handlePaystackWebhook(deps, body, signature);

    expect(res.status).toBe(200);
    expect(res.body.outcome).toBe("fulfilled");
    await expectStatus(db, order.orderRef, "fulfilled");
    expect(signer).toHaveBeenCalledTimes(1);
    expect(signer).toHaveBeenCalledWith({ productId: VALID_PRODUCT_ID, plan: "first", orderRef: order.orderRef, editionYear: 2026 });

    const keys = await keyRows(db, order.orderRef);
    expect(keys).toHaveLength(1);
    expect(mailer).toHaveBeenCalledTimes(1);
    expect(mailer.mock.calls[0][0]).toMatchObject({ to: VALID_EMAIL, activationKey: keys[0].activation_key, idempotencyKey: `bravo-activation-${order.orderRef}` });

    const status = await getOrderStatus(deps, { orderRef: order.orderRef, statusToken: order.statusToken });
    expect(status.status).toBe("fulfilled");
    expect(status.activationKey).toBe(keys[0].activation_key);
    expect(status.emailSent).toBe(true);
    expect(status.email).toBe("pa***@example.com");
    expect(status.amountNaira).toBe(4000);

    // Without the token the key is never returned.
    await expect(getOrderStatus(deps, { orderRef: order.orderRef, statusToken: null })).rejects.toMatchObject({ status: 404 });
  });

  it("does not return a key while the order is still pending", async () => {
    const { db, deps } = await makeEnv();
    const order = await createCheckedOutOrder(deps);
    const status = await getOrderStatus(deps, { orderRef: order.orderRef, statusToken: order.statusToken });
    expect(status.status).toBe("pending_payment");
    expect(status.activationKey).toBeNull();
    expect(await keyRows(db)).toHaveLength(0);
  });

  it("never issues a key from a browser return alone: a status poll with no Paystack success stays pending", async () => {
    const { db, deps, paystack, signer } = await makeEnv();
    const order = await createCheckedOutOrder(deps);
    paystack.state.transactions.set(order.orderRef, transactionFor(order.orderRef, FIRST_KOBO, { status: "failed" }));
    const status = await getOrderStatus(deps, { orderRef: order.orderRef, statusToken: order.statusToken });
    expect(status.status).toBe("pending_payment");
    expect(signer).not.toHaveBeenCalled();
    expect(await keyRows(db)).toHaveLength(0);
  });

  it("reconciles a pending order via Paystack verify when polled, at most once per interval", async () => {
    let clock = Date.parse("2026-10-10T12:00:00.000Z");
    const { db, deps, paystack } = await makeEnv({ now: () => new Date(clock) } as never);
    const order = await createCheckedOutOrder(deps, { plan: "renewal" });
    // Customer has not finished paying yet: Paystack reports "abandoned".
    paystack.state.transactions.set(order.orderRef, transactionFor(order.orderRef, RENEWAL_KOBO, { status: "abandoned" }));

    await getOrderStatus(deps, { orderRef: order.orderRef, statusToken: order.statusToken });
    expect(paystack.state.verifyCalls).toHaveLength(1);

    clock += 1000; // within the 15s window: no new Paystack call
    await getOrderStatus(deps, { orderRef: order.orderRef, statusToken: order.statusToken });
    expect(paystack.state.verifyCalls).toHaveLength(1);

    // Payment completes; the next poll after the window verifies and fulfils the order.
    paystack.state.transactions.set(order.orderRef, transactionFor(order.orderRef, RENEWAL_KOBO));
    clock += 16_000;
    const done = await getOrderStatus(deps, { orderRef: order.orderRef, statusToken: order.statusToken });
    expect(paystack.state.verifyCalls).toHaveLength(2);
    expect(done.status).toBe("fulfilled");
    expect(done.activationKey).not.toBeNull();
    await expectStatus(db, order.orderRef, "fulfilled");
  });

  it("stores the key once even if the email provider fails, and still returns it", async () => {
    const { db, deps, paystack } = await makeEnv({ mailer: fakeMailer({ ok: false, error: "Resend 500" }) } as never);
    const order = await createCheckedOutOrder(deps);
    paystack.state.transactions.set(order.orderRef, transactionFor(order.orderRef, FIRST_KOBO));
    const { body, signature } = signedWebhook(chargeSuccessEvent(order.orderRef));
    const res = await handlePaystackWebhook(deps, body, signature);
    expect(res.status).toBe(200);
    const row = await orderRow(db, order.orderRef);
    expect(row?.status).toBe("fulfilled");
    expect(row?.email_status).toBe("failed");
    const status = await getOrderStatus(deps, { orderRef: order.orderRef, statusToken: order.statusToken });
    expect(status.activationKey).not.toBeNull();
    expect(status.emailSent).toBe(false);
  });
});

describe("webhook retries and concurrency are idempotent", () => {
  it("handles repeated deliveries of the same webhook with one key, one signing, one email", async () => {
    const { db, deps, paystack, signer, mailer } = await makeEnv();
    const order = await createCheckedOutOrder(deps);
    paystack.state.transactions.set(order.orderRef, transactionFor(order.orderRef, FIRST_KOBO));
    const { body, signature } = signedWebhook(chargeSuccessEvent(order.orderRef));

    const results = [];
    for (let i = 0; i < 4; i++) results.push(await handlePaystackWebhook(deps, body, signature));

    expect(results.every((r) => r.status === 200)).toBe(true);
    expect(signer).toHaveBeenCalledTimes(1);
    expect(mailer).toHaveBeenCalledTimes(1);
    const keys = await keyRows(db);
    expect(keys).toHaveLength(1);
    const status = await getOrderStatus(deps, { orderRef: order.orderRef, statusToken: order.statusToken });
    expect(status.activationKey).toBe(keys[0].activation_key);
  });

  it("converges to exactly one key when fulfilment runs concurrently", async () => {
    const { db, deps, paystack, mailer } = await makeEnv();
    const order = await createCheckedOutOrder(deps);
    paystack.state.transactions.set(order.orderRef, transactionFor(order.orderRef, FIRST_KOBO));

    const outcomes = await Promise.all(Array.from({ length: 6 }, () => fulfillFromPaystack(deps, order.orderRef)));

    expect(outcomes.every((o) => o.outcome === "fulfilled")).toBe(true);
    const keys = await keyRows(db);
    expect(keys).toHaveLength(1);
    // Every email attempt must carry the same stored key, so the buyer cannot receive two different keys.
    const sentKeys = new Set(mailer.mock.calls.map((c) => c[0].activationKey));
    expect(sentKeys.size).toBe(1);
    expect([...sentKeys][0]).toBe(keys[0].activation_key);
    expect(new Set(mailer.mock.calls.map((c) => c[0].idempotencyKey))).toEqual(new Set([`bravo-activation-${order.orderRef}`]));
  });

  it("ignores a second, different transaction for an order that is already fulfilled", async () => {
    const { db, deps, paystack, signer } = await makeEnv();
    const order = await createCheckedOutOrder(deps);
    paystack.state.transactions.set(order.orderRef, transactionFor(order.orderRef, FIRST_KOBO, { id: 111 }));
    await fulfillFromPaystack(deps, order.orderRef);
    paystack.state.transactions.set(order.orderRef, transactionFor(order.orderRef, FIRST_KOBO, { id: 222 }));
    const again = await fulfillFromPaystack(deps, order.orderRef);
    expect(again.outcome).toBe("fulfilled");
    expect(signer).toHaveBeenCalledTimes(1);
    expect((await orderRow(db, order.orderRef))?.paystack_transaction_id).toBe("111");
  });
});

describe("verification mismatches never issue a key", () => {
  it("amount mismatch on verify -> needs_review, no key, and stays blocked on retries", async () => {
    const { db, deps, paystack, signer } = await makeEnv();
    const order = await createCheckedOutOrder(deps, { plan: "first" });
    // Paystack says the customer paid the RENEWAL amount for a FIRST order.
    paystack.state.transactions.set(order.orderRef, transactionFor(order.orderRef, RENEWAL_KOBO));
    const { body, signature } = signedWebhook(chargeSuccessEvent(order.orderRef, { amount: FIRST_KOBO }));

    const res = await handlePaystackWebhook(deps, body, signature);
    expect(res.body.outcome).toBe("needs_review");
    await expectStatus(db, order.orderRef, "needs_review");
    expect((await orderRow(db, order.orderRef))?.review_reason).toBe("amount_mismatch");

    // Even if Paystack later reports the right amount, a needs_review order is not auto-fulfilled.
    paystack.state.transactions.set(order.orderRef, transactionFor(order.orderRef, FIRST_KOBO));
    await handlePaystackWebhook(deps, body, signature);
    await expectStatus(db, order.orderRef, "needs_review");
    expect(signer).not.toHaveBeenCalled();
    expect(await keyRows(db)).toHaveLength(0);
  });

  it("uses the Paystack verify response, not the webhook body, for the amount", async () => {
    const { db, deps, paystack } = await makeEnv();
    const order = await createCheckedOutOrder(deps, { plan: "first" });
    paystack.state.transactions.set(order.orderRef, transactionFor(order.orderRef, 100));
    // The webhook body claims the correct amount, but verification says otherwise.
    const { body, signature } = signedWebhook(chargeSuccessEvent(order.orderRef, { amount: FIRST_KOBO, currency: "NGN" }));
    await handlePaystackWebhook(deps, body, signature);
    expect((await orderRow(db, order.orderRef))?.review_reason).toBe("amount_mismatch");
    expect(await keyRows(db)).toHaveLength(0);
  });

  it("currency mismatch (USD) -> needs_review", async () => {
    const { db, deps, paystack, signer } = await makeEnv();
    const order = await createCheckedOutOrder(deps);
    paystack.state.transactions.set(order.orderRef, transactionFor(order.orderRef, FIRST_KOBO, { currency: "USD" }));
    const res = await fulfillFromPaystack(deps, order.orderRef);
    expect(res.outcome).toBe("needs_review");
    expect((await orderRow(db, order.orderRef))?.review_reason).toBe("currency_mismatch");
    expect(signer).not.toHaveBeenCalled();
  });

  it("reference mismatch -> needs_review", async () => {
    const { db, deps, paystack } = await makeEnv();
    const order = await createCheckedOutOrder(deps);
    paystack.state.transactions.set(order.orderRef, transactionFor("BCBT_FFFFFFFFFFFFFFFFFFFFFFFF", FIRST_KOBO));
    const res = await fulfillFromPaystack(deps, order.orderRef);
    expect(res.outcome).toBe("needs_review");
    expect((await orderRow(db, order.orderRef))?.review_reason).toBe("reference_mismatch");
  });

  it("payer email differing from the order email -> needs_review", async () => {
    const { db, deps, paystack } = await makeEnv();
    const order = await createCheckedOutOrder(deps);
    paystack.state.transactions.set(order.orderRef, transactionFor(order.orderRef, FIRST_KOBO, { customer: { email: "someone@else.com" } }));
    await fulfillFromPaystack(deps, order.orderRef);
    expect((await orderRow(db, order.orderRef))?.review_reason).toBe("email_mismatch");
  });

  it("a transaction that is abandoned or failed leaves the order pending without a key", async () => {
    const { db, deps, paystack, signer } = await makeEnv();
    const order = await createCheckedOutOrder(deps);
    paystack.state.transactions.set(order.orderRef, transactionFor(order.orderRef, FIRST_KOBO, { status: "abandoned" }));
    const { body, signature } = signedWebhook(chargeSuccessEvent(order.orderRef));
    const res = await handlePaystackWebhook(deps, body, signature);
    expect(res.body.outcome).toBe("pending_payment");
    await expectStatus(db, order.orderRef, "pending_payment");
    expect(signer).not.toHaveBeenCalled();
  });

  it("a Paystack transaction already attached to another order cannot be reused", async () => {
    const { db, deps, paystack, signer } = await makeEnv();
    const first = await createCheckedOutOrder(deps);
    const second = await createCheckedOutOrder(deps);
    paystack.state.transactions.set(first.orderRef, transactionFor(first.orderRef, FIRST_KOBO, { id: 555 }));
    paystack.state.transactions.set(second.orderRef, transactionFor(second.orderRef, FIRST_KOBO, { id: 555 }));

    expect((await fulfillFromPaystack(deps, first.orderRef)).outcome).toBe("fulfilled");
    const res = await fulfillFromPaystack(deps, second.orderRef);
    expect(res.outcome).toBe("needs_review");
    await expectStatus(db, second.orderRef, "needs_review");
    expect(await keyRows(db, second.orderRef)).toHaveLength(0);
    expect(signer).toHaveBeenCalledTimes(1);
  });

  it("validateTransaction accepts only the exact expected shape", () => {
    const order = { order_ref: "BCBT_0123456789ABCDEF01234567", amount_kobo: FIRST_KOBO, currency: "NGN", email: VALID_EMAIL };
    expect(validateTransaction(transactionFor(order.order_ref, FIRST_KOBO), order)).toEqual({ ok: true });
    expect(validateTransaction(transactionFor(order.order_ref, FIRST_KOBO, { id: undefined as never }), order)).toMatchObject({ ok: false, reason: "missing_transaction_id" });
  });
});

describe("fail-closed key issuance", () => {
  it("while the Bravo key format is not vendored, the webhook returns 500 and the order stays paid (no key)", async () => {
    const { db, deps, paystack } = await makeEnv({ signer: unvendoredActivationKeySigner } as never);
    const order = await createCheckedOutOrder(deps);
    paystack.state.transactions.set(order.orderRef, transactionFor(order.orderRef, FIRST_KOBO));
    const { body, signature } = signedWebhook(chargeSuccessEvent(order.orderRef));

    const res = await handlePaystackWebhook(deps, body, signature);

    // Paystack must retry: a 2xx would tell it the order was fulfilled when no key exists.
    expect(res.status).toBe(500);
    expect(res.body.outcome).toBe("paid_awaiting_key");
    await expectStatus(db, order.orderRef, "paid");
    expect(await keyRows(db)).toHaveLength(0);
    const status = await getOrderStatus(deps, { orderRef: order.orderRef, statusToken: order.statusToken });
    expect(status.activationKey).toBeNull();
    expect(status.status).toBe("paid");
  });

  it("once a signer is available, a retry issues the key for the already-verified payment without re-verifying", async () => {
    const { db, deps, paystack } = await makeEnv({ signer: unvendoredActivationKeySigner } as never);
    const order = await createCheckedOutOrder(deps);
    paystack.state.transactions.set(order.orderRef, transactionFor(order.orderRef, FIRST_KOBO));
    await fulfillFromPaystack(deps, order.orderRef);
    expect(paystack.state.verifyCalls).toHaveLength(1);

    const workingSigner = fakeSigner();
    (deps as unknown as { signer: typeof workingSigner }).signer = workingSigner;
    const res = await fulfillFromPaystack(deps, order.orderRef);
    expect(res.outcome).toBe("fulfilled");
    expect(paystack.state.verifyCalls).toHaveLength(1);
    expect(await keyRows(db, order.orderRef)).toHaveLength(1);
  });

  it("the default signer throws a clear error and never returns a key", async () => {
    await expect(unvendoredActivationKeySigner({ productId: VALID_PRODUCT_ID, plan: "first", orderRef: "BCBT_x", editionYear: 2026 })).rejects.toThrow(/not vendored/);
  });
});

describe("webhook routing", () => {
  it("ignores unrelated events and unknown references without issuing anything", async () => {
    const { db, deps, paystack, signer } = await makeEnv();
    const order = await createCheckedOutOrder(deps);
    paystack.state.transactions.set(order.orderRef, transactionFor(order.orderRef, FIRST_KOBO));

    const transfer = signedWebhook(JSON.stringify({ event: "transfer.success", data: { reference: order.orderRef } }));
    expect((await handlePaystackWebhook(deps, transfer.body, transfer.signature)).status).toBe(200);

    const unknown = signedWebhook(chargeSuccessEvent("BCBT_AAAAAAAAAAAAAAAAAAAAAAAA"));
    const res = await handlePaystackWebhook(deps, unknown.body, unknown.signature);
    expect(res.status).toBe(200);
    expect(res.body.outcome).toBe("not_found");

    expect(signer).not.toHaveBeenCalled();
    expect(await keyRows(db)).toHaveLength(0);
  });

  it("returns 500 (so Paystack retries) when Paystack verification is unavailable", async () => {
    const paystack = fakePaystack();
    paystack.state.verifyFailure = new Error("network down");
    const { db, deps } = await makeEnv({ paystackFake: paystack } as never);
    const order = await createCheckedOutOrder(deps);
    const { body, signature } = signedWebhook(chargeSuccessEvent(order.orderRef));
    const res = await handlePaystackWebhook(deps, body, signature);
    expect(res.status).toBe(500);
    await expectStatus(db, order.orderRef, "pending_payment");
  });

  it("writes an audit row per delivery without storing the body", async () => {
    const { db, deps, paystack } = await makeEnv();
    const order = await createCheckedOutOrder(deps);
    paystack.state.transactions.set(order.orderRef, transactionFor(order.orderRef, FIRST_KOBO));
    const { body, signature } = signedWebhook(chargeSuccessEvent(order.orderRef));
    await handlePaystackWebhook(deps, body, signature);
    await handlePaystackWebhook(deps, body, signature);
    const events = await db.execute("SELECT event_type, outcome, body_sha256 FROM bravo_payment_events ORDER BY id");
    expect(events.rows.map((r) => r.outcome)).toEqual(["fulfilled", "fulfilled"]);
    expect(String(events.rows[0].body_sha256)).toHaveLength(64);
  });
});

describe("database constraints (defence in depth)", () => {
  it("rejects a mis-priced order directly in SQL", async () => {
    const db = await createTestDb();
    await expect(
      db.execute({
        sql: `INSERT INTO bravo_orders (order_ref, product_id, plan, amount_kobo, currency, status, status_token_hash, created_at, updated_at)
              VALUES (?, ?, 'first', 300000, 'NGN', 'pending_payment', ?, 'x', 'x')`,
        args: ["BCBT_0123456789ABCDEF01234567", VALID_PRODUCT_ID, "a".repeat(64)],
      })
    ).rejects.toThrow(/CHECK/);
  });

  it("rejects a second key for the same order, and reuse of a key string across orders", async () => {
    const { db, deps, paystack } = await makeEnv();
    const a = await createCheckedOutOrder(deps);
    const b = await createCheckedOutOrder(deps);
    paystack.state.transactions.set(a.orderRef, transactionFor(a.orderRef, FIRST_KOBO));
    await fulfillFromPaystack(deps, a.orderRef);
    const [keyA] = await keyRows(db, a.orderRef);
    // Second key for the SAME order is rejected by the primary key.
    await expect(
      db.execute({ sql: "INSERT INTO bravo_issued_keys (order_ref, product_id, activation_key, issued_at) VALUES (?, ?, ?, 'x')", args: [a.orderRef, VALID_PRODUCT_ID, "other"] })
    ).rejects.toThrow(/UNIQUE/);
    // The same key string cannot be attached to a different order.
    await expect(
      db.execute({ sql: "INSERT INTO bravo_issued_keys (order_ref, product_id, activation_key, issued_at) VALUES (?, ?, ?, 'x')", args: [b.orderRef, VALID_PRODUCT_ID, String(keyA.activation_key)] })
    ).rejects.toThrow(/UNIQUE/);
  });

  it("the migration is idempotent", async () => {
    const db = await createTestDb();
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    await db.executeMultiple(readFileSync(join(process.cwd(), "db", "migrations", "0001_bravo_online_payments.sql"), "utf8"));
    const tables = await db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'bravo_%' ORDER BY name");
    expect(tables.rows.map((r) => r.name)).toEqual(["bravo_issued_keys", "bravo_orders", "bravo_payment_events"]);
  });
});

describe("activation key public key and configuration", () => {
  it("the committed public key is a valid P-256 key", () => {
    const key = createPublicKey(BRAVO_ACTIVATION_PUBLIC_KEY_PEM);
    expect(key.asymmetricKeyType).toBe("ec");
    expect(key.asymmetricKeyDetails?.namedCurve).toBe("prime256v1");
  });

  it("refuses a signing key that does not correspond to the committed public key", () => {
    const { privateKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
    const pem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
    expect(() => assertActivationPrivateKeyMatchesPublicKey(pem)).toThrow(/does not match/);
  });

  it("fails to configure when the Paystack key does not match the Vercel environment", () => {
    const base = {
      TURSO_DATABASE_URL: "libsql://x.turso.io",
      TURSO_AUTH_TOKEN: "t",
      RESEND_API_KEY: "re_x",
      EMAIL_FROM: "Bravo CBT <no-reply@example.com>",
      BRAVO_ACTIVATION_PRIVATE_KEY: "-----BEGIN PRIVATE KEY-----\\nx\\n-----END PRIVATE KEY-----",
    };
    expect(() => getBravoServerConfig({ ...base, PAYSTACK_SECRET_KEY: "sk_test_x", VERCEL_ENV: "production" })).toThrow(BravoConfigError);
    expect(() => getBravoServerConfig({ ...base, PAYSTACK_SECRET_KEY: "sk_live_x", VERCEL_ENV: "preview" })).toThrow(BravoConfigError);
    expect(() => getBravoServerConfig({ ...base, PAYSTACK_SECRET_KEY: "pk_test_x" })).toThrow(BravoConfigError);
    // The signing key is optional: without it keys fail closed but checkout still works (Preview).
    const { BRAVO_ACTIVATION_PRIVATE_KEY: _unused, ...withoutSigningKey } = base;
    void _unused;
    expect(getBravoServerConfig({ ...withoutSigningKey, PAYSTACK_SECRET_KEY: "sk_test_x" }).activationPrivateKeyPem).toBeUndefined();
    expect(() => getBravoServerConfig({ ...base, PAYSTACK_SECRET_KEY: "sk_live_x", VERCEL_ENV: "production" })).not.toThrow();
    expect(getBravoServerConfig({ ...base, PAYSTACK_SECRET_KEY: "sk_test_x", VERCEL_ENV: "preview" }).paystackMode).toBe("test");
  });

  it("reports missing required variables by name only", () => {
    expect(() => getBravoServerConfig({ PAYSTACK_SECRET_KEY: "sk_test_x" })).toThrow("TURSO_DATABASE_URL is not configured");
    expect(() => getBravoServerConfig({ PAYSTACK_SECRET_KEY: "sk_test_x", BRAVO_ACTIVATION_PRIVATE_KEY: "x" })).toThrow("TURSO_DATABASE_URL is not configured");
  });

  it("verifies Paystack initialize/verify request shapes against a fake fetch", async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const fetchImpl = (async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      if (url.endsWith("/transaction/initialize")) {
        return new Response(JSON.stringify({ status: true, data: { authorization_url: "https://checkout", access_code: "ac" } }), { status: 200 });
      }
      return new Response(JSON.stringify({ status: true, data: { id: 9, status: "success", reference: "BCBT_x", amount: 1, currency: "NGN" } }), { status: 200 });
    }) as typeof fetch;
    const client = createPaystackClient({ secretKey: "sk_test_x", fetchImpl });
    await client.initializeTransaction({ email: VALID_EMAIL, amountKobo: FIRST_KOBO, reference: "BCBT_x", callbackUrl: "https://x", metadata: {} });
    await client.verifyTransaction("BCBT_x");
    expect(calls[0].init.method).toBe("POST");
    expect(JSON.parse(String(calls[0].init.body))).toMatchObject({ amount: FIRST_KOBO, currency: "NGN", reference: "BCBT_x" });
    expect((calls[0].init.headers as Record<string, string>).Authorization).toBe("Bearer sk_test_x");
    expect(calls[1].url).toBe("https://api.paystack.co/transaction/verify/BCBT_x");
  });

  it("sends the Resend email with an idempotency key and escapes HTML", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ id: "em_1" }), { status: 200 })) as unknown as typeof fetch;
    const mailer = createResendMailer({ apiKey: "re_x", from: "Bravo <no-reply@example.com>", fetchImpl });
    const result = await mailer({ to: VALID_EMAIL, productId: VALID_PRODUCT_ID, plan: "first", orderRef: "BCBT_x", activationKey: "KEY<1>", idempotencyKey: "bravo-activation-BCBT_x" });
    expect(result).toEqual({ ok: true, id: "em_1" });
    const [, init] = (fetchImpl as unknown as { mock: { calls: [string, RequestInit][] } }).mock.calls[0];
    expect((init.headers as Record<string, string>)["Idempotency-Key"]).toBe("bravo-activation-BCBT_x");
    expect(String(init.body)).toContain("KEY<1>"); // JSON text; html escaping is checked below
    expect(renderActivationEmail({ productId: VALID_PRODUCT_ID, plan: "renewal", orderRef: "BCBT_x", activationKey: "<script>" }).html).toContain("&lt;script&gt;");
  });

  it("statusTokenMatches is constant-time safe for malformed input", () => {
    const token = randomUUID();
    const hash = hashStatusToken(token);
    expect(statusTokenMatches(token, hash)).toBe(true);
    expect(statusTokenMatches(token + "x", hash)).toBe(false);
    expect(statusTokenMatches("bad token!", hash)).toBe(false);
    expect(statusTokenMatches(undefined, hash)).toBe(false);
  });
});
