// Protected Pay Online checkout: app handoff -> saved-email fast path or buyer email fallback -> Paystack -> key.
import { beforeAll, describe, expect, it, vi } from "vitest";
import {
  CHECKOUT_WINDOW_MS,
  CHECKOUT_WINDOW_MESSAGE,
  BravoServiceError,
  createPendingOrder,
  fulfillFromPaystack,
  getOrderStatus,
  handlePaystackWebhook,
  startCheckout,
} from "@/lib/bravo/orders";
import {
  makeEnv,
  transactionFor,
  signPaystackBody,
  chargeSuccessEvent,
  orderRow,
  keyRows,
  VALID_PRODUCT_ID,
  VALID_EMAIL,
} from "./helpers";

const FIRST_KOBO = 400000;
const RENEWAL_KOBO = 300000;

const holder = vi.hoisted(() => ({ deps: null as unknown }));
vi.mock("@/lib/bravo/service", () => ({
  getBravoDeps: () => holder.deps,
}));

const BASE_NOW = new Date("2026-10-10T12:00:00.000Z");

async function expectServiceError(promise: Promise<unknown>, status: number, code: string) {
  const error = await promise.then(
    () => null,
    (e: unknown) => e
  );
  expect(error).toBeInstanceOf(BravoServiceError);
  expect(error).toMatchObject({ status, code });
}

describe("saved app email: fast path", () => {
  it("initialises Paystack with the saved address without asking the browser for an email", async () => {
    const { deps, paystack } = await makeEnv();
    const order = await createPendingOrder(deps, { productId: VALID_PRODUCT_ID, plan: "first", email: "Parent@Example.com" });

    // Body-less checkout: the browser sends nothing but the handoff token.
    const result = await startCheckout(deps, { orderRef: order.orderRef, statusToken: order.statusToken });

    expect(result.authorizationUrl).toContain(order.orderRef);
    expect(paystack.state.initCalls).toHaveLength(1);
    expect(paystack.state.initCalls[0]).toMatchObject({ email: VALID_EMAIL, amountKobo: FIRST_KOBO, reference: order.orderRef });
  });

  it("exposes only a masked email and an emailOnFile flag in the status response", async () => {
    const { deps } = await makeEnv();
    const order = await createPendingOrder(deps, { productId: VALID_PRODUCT_ID, plan: "first", email: VALID_EMAIL });

    const status = await getOrderStatus(deps, { orderRef: order.orderRef, statusToken: order.statusToken });

    expect(status.emailOnFile).toBe(true);
    expect(status.email).toBe("pa***@example.com");
    expect(JSON.stringify(status)).not.toContain(VALID_EMAIL);
    expect(status.checkoutExpired).toBe(false);
  });

  it("accepts the same address again, and refuses a different one with 409 without calling Paystack", async () => {
    const { deps, paystack } = await makeEnv();
    const order = await createPendingOrder(deps, { productId: VALID_PRODUCT_ID, plan: "first", email: VALID_EMAIL });

    await startCheckout(deps, { orderRef: order.orderRef, statusToken: order.statusToken, email: VALID_EMAIL.toUpperCase() });
    expect(paystack.state.initCalls).toHaveLength(1);

    const other = await createPendingOrder(deps, { productId: VALID_PRODUCT_ID, plan: "first", email: VALID_EMAIL });
    await expectServiceError(
      startCheckout(deps, { orderRef: other.orderRef, statusToken: other.statusToken, email: "attacker@example.com" }),
      409,
      "email_locked"
    );
    expect(paystack.state.initCalls).toHaveLength(1);
  });
});

describe("missing email: buyer fallback before payment", () => {
  it("reports no email on file and refuses checkout without one", async () => {
    const { deps, paystack } = await makeEnv();
    const order = await createPendingOrder(deps, { productId: VALID_PRODUCT_ID, plan: "renewal" });

    const status = await getOrderStatus(deps, { orderRef: order.orderRef, statusToken: order.statusToken });
    expect(status).toMatchObject({ emailOnFile: false, email: null });

    await expectServiceError(startCheckout(deps, { orderRef: order.orderRef, statusToken: order.statusToken }), 400, "email_required");
    expect(paystack.state.initCalls).toHaveLength(0);
  });

  it("rejects a malformed buyer email", async () => {
    const { deps, paystack } = await makeEnv();
    const order = await createPendingOrder(deps, { productId: VALID_PRODUCT_ID, plan: "first" });
    await expectServiceError(
      startCheckout(deps, { orderRef: order.orderRef, statusToken: order.statusToken, email: "not-an-email" }),
      400,
      "invalid_email"
    );
    expect(paystack.state.initCalls).toHaveLength(0);
  });

  it("stores the buyer's email, records its source, and then initialises Paystack with it", async () => {
    const { db, deps, paystack } = await makeEnv();
    const order = await createPendingOrder(deps, { productId: VALID_PRODUCT_ID, plan: "first" });

    await startCheckout(deps, { orderRef: order.orderRef, statusToken: order.statusToken, email: VALID_EMAIL });

    expect(paystack.state.initCalls[0]).toMatchObject({ email: VALID_EMAIL, amountKobo: FIRST_KOBO });
    const row = await orderRow(db, order.orderRef);
    expect(row?.email).toBe(VALID_EMAIL);
    expect(row?.email_source).toBe("checkout");
    const status = await getOrderStatus(deps, { orderRef: order.orderRef, statusToken: order.statusToken });
    expect(status.emailOnFile).toBe(true);
    expect(JSON.stringify(status)).not.toContain(VALID_EMAIL);
  });

  it("lets the buyer correct a typed email until Paystack starts, then locks it", async () => {
    const { db, deps, paystack } = await makeEnv();
    const order = await createPendingOrder(deps, { productId: VALID_PRODUCT_ID, plan: "first" });

    paystack.state.initFailure = new Error("upstream down");
    await expectServiceError(
      startCheckout(deps, { orderRef: order.orderRef, statusToken: order.statusToken, email: "typo@example.com" }),
      502,
      "payment_provider_error"
    );
    paystack.state.initFailure = null;

    await startCheckout(deps, { orderRef: order.orderRef, statusToken: order.statusToken, email: VALID_EMAIL });
    expect(paystack.state.initCalls.at(-1)?.email).toBe(VALID_EMAIL);
    expect((await orderRow(db, order.orderRef))?.email).toBe(VALID_EMAIL);

    await expectServiceError(
      startCheckout(deps, { orderRef: order.orderRef, statusToken: order.statusToken, email: "typo@example.com" }),
      409,
      "checkout_already_started"
    );
    expect(paystack.state.initCalls).toHaveLength(2);
  });

  it("does not store a Paystack link if the email changed while Paystack was being initialised", async () => {
    const { db, deps, paystack } = await makeEnv();
    const order = await createPendingOrder(deps, { productId: VALID_PRODUCT_ID, plan: "first" });
    await startCheckout(deps, { orderRef: order.orderRef, statusToken: order.statusToken, email: VALID_EMAIL });
    // Simulate a race: reset the link, then change the email between Paystack's response and the store.
    await db.execute({ sql: "UPDATE bravo_orders SET authorization_url = NULL WHERE order_ref = ?", args: [order.orderRef] });
    const realInit = paystack.client.initializeTransaction;
    paystack.client.initializeTransaction = async (input) => {
      const result = await realInit(input);
      await db.execute({ sql: "UPDATE bravo_orders SET email = 'changed@example.com' WHERE order_ref = ?", args: [order.orderRef] });
      return result;
    };
    await expectServiceError(startCheckout(deps, { orderRef: order.orderRef, statusToken: order.statusToken }), 409, "email_locked");
    expect((await orderRow(db, order.orderRef))?.authorization_url).toBeNull();
  });

  it("never lets a buyer overwrite an email that came from the app", async () => {
    const { db, deps, paystack } = await makeEnv();
    const order = await createPendingOrder(deps, { productId: VALID_PRODUCT_ID, plan: "first", email: VALID_EMAIL });
    paystack.state.initFailure = new Error("upstream down");
    await expectServiceError(
      startCheckout(deps, { orderRef: order.orderRef, statusToken: order.statusToken, email: "other@example.com" }),
      409,
      "email_locked"
    );
    expect((await orderRow(db, order.orderRef))?.email).toBe(VALID_EMAIL);
    expect((await orderRow(db, order.orderRef))?.email_source).toBe("creation");
  });
});

describe("server-authoritative Product ID, plan, price and edition", () => {
  it("rejects checkout bodies that try to set Product ID, plan, price, currency, status or edition", async () => {
    const { db, deps, paystack, signer } = await makeEnv();
    const order = await createPendingOrder(deps, { productId: VALID_PRODUCT_ID, plan: "renewal", email: VALID_EMAIL });

    const attempts: Record<string, unknown>[] = [
      { productId: "BCBT-AAAA-BBBB-CCCC" },
      { plan: "first" },
      { amount: 1 },
      { amountKobo: 1 },
      { amount_kobo: 1 },
      { currency: "USD" },
      { status: "fulfilled" },
      { editionYear: 2099 },
      { statusToken: "x" },
      { authorizationUrl: "https://checkout.paystack.com/evil" },
    ];
    for (const body of attempts) {
      await expectServiceError(
        startCheckout(deps, { orderRef: order.orderRef, statusToken: order.statusToken, body }),
        400,
        "authoritative_field_rejected"
      );
    }
    expect(paystack.state.initCalls).toHaveLength(0);
    const row = await orderRow(db, order.orderRef);
    expect(row).toMatchObject({ product_id: VALID_PRODUCT_ID, plan: "renewal", amount_kobo: RENEWAL_KOBO, currency: "NGN", status: "pending_payment" });
    expect(signer).not.toHaveBeenCalled();
  });

  it("uses the price for the plan the app sent, never a price from the request", async () => {
    const { db, deps, paystack } = await makeEnv();
    const order = await createPendingOrder(deps, { productId: VALID_PRODUCT_ID, plan: "renewal", email: VALID_EMAIL });
    await startCheckout(deps, { orderRef: order.orderRef, statusToken: order.statusToken, body: { email: VALID_EMAIL } });
    expect(paystack.state.initCalls[0].amountKobo).toBe(RENEWAL_KOBO);
    expect((await orderRow(db, order.orderRef))?.amount_kobo).toBe(RENEWAL_KOBO);
  });

  it("the edition is taken from server configuration when the order is created, not from the request", async () => {
    const { db, deps } = await makeEnv();
    await expectServiceError(
      createPendingOrder(deps, { productId: VALID_PRODUCT_ID, plan: "first", editionYear: 2099 }),
      400,
      "authoritative_field_rejected"
    );
    const order = await createPendingOrder(deps, { productId: VALID_PRODUCT_ID, plan: "first" });
    expect((await orderRow(db, order.orderRef))?.edition_year).toBe(2026);
  });

  it("does not allow a Product ID or plan other than the one the app sent to be substituted at checkout", async () => {
    const { db, deps } = await makeEnv();
    const order = await createPendingOrder(deps, { productId: VALID_PRODUCT_ID, plan: "first", email: VALID_EMAIL });
    await expectServiceError(
      startCheckout(deps, { orderRef: order.orderRef, statusToken: order.statusToken, body: { productId: "BCBT-ZZZZ-ZZZZ-ZZZZ" } }),
      400,
      "authoritative_field_rejected"
    );
    expect((await orderRow(db, order.orderRef))?.product_id).toBe(VALID_PRODUCT_ID);
  });
});

describe("checkout-start window (30 minutes)", () => {
  const MIN = 60 * 1000;

  it("is exactly 30 minutes and is counted from order creation", () => {
    expect(CHECKOUT_WINDOW_MS).toBe(30 * MIN);
    expect(CHECKOUT_WINDOW_MESSAGE).toContain("30 minutes");
  });

  it("still starts checkout at 29 minutes and refuses it after 31 minutes, with a buyer-facing explanation", async () => {
    const { deps, paystack } = await makeEnv();
    const early = await createPendingOrder(deps, { productId: VALID_PRODUCT_ID, plan: "first", email: VALID_EMAIL });
    deps.now = () => new Date(BASE_NOW.getTime() + 29 * MIN);
    await startCheckout(deps, { orderRef: early.orderRef, statusToken: early.statusToken });
    expect(paystack.state.initCalls).toHaveLength(1);

    deps.now = () => new Date(BASE_NOW.getTime());
    const late = await createPendingOrder(deps, { productId: VALID_PRODUCT_ID, plan: "first", email: VALID_EMAIL });
    deps.now = () => new Date(BASE_NOW.getTime() + 31 * MIN);
    const error = await startCheckout(deps, { orderRef: late.orderRef, statusToken: late.statusToken }).then(
      () => null,
      (e: unknown) => e
    );
    expect(error).toMatchObject({ status: 410, code: "checkout_window_closed", message: CHECKOUT_WINDOW_MESSAGE });
    expect(paystack.state.initCalls).toHaveLength(1);
    expect((error as Error).message).toContain("A payment already started on Paystack is still processed.");
  });

  it("a Paystack checkout started inside the window is never rejected later, and its payment is fulfilled by the webhook", async () => {
    const { db, deps, paystack, signer, mailer } = await makeEnv();
    const order = await createPendingOrder(deps, { productId: VALID_PRODUCT_ID, plan: "first", email: VALID_EMAIL });
    deps.now = () => new Date(BASE_NOW.getTime() + 10 * MIN);
    const started = await startCheckout(deps, { orderRef: order.orderRef, statusToken: order.statusToken });

    // 45 minutes after creation: past the window.
    deps.now = () => new Date(BASE_NOW.getTime() + 45 * MIN);
    const resumed = await startCheckout(deps, { orderRef: order.orderRef, statusToken: order.statusToken });
    expect(resumed.authorizationUrl).toBe(started.authorizationUrl);
    const status = await getOrderStatus(deps, { orderRef: order.orderRef, statusToken: order.statusToken });
    expect(status.checkoutExpired).toBe(false);
    expect(paystack.state.initCalls).toHaveLength(1);

    paystack.state.transactions.set(order.orderRef, transactionFor(order.orderRef, FIRST_KOBO));
    const body = chargeSuccessEvent(order.orderRef);
    const res = await handlePaystackWebhook(deps, body, signPaystackBody(body));
    expect(res).toMatchObject({ status: 200, body: { outcome: "fulfilled" } });
    expect(signer).toHaveBeenCalledTimes(1);
    expect(mailer).toHaveBeenCalledTimes(1);
    expect((await orderRow(db, order.orderRef))?.status).toBe("fulfilled");
  });

  it("a started checkout is also fulfilled by poll reconciliation after the window, with no webhook", async () => {
    const { deps, paystack, signer } = await makeEnv();
    const order = await createPendingOrder(deps, { productId: VALID_PRODUCT_ID, plan: "renewal", email: VALID_EMAIL });
    deps.now = () => new Date(BASE_NOW.getTime() + 5 * MIN);
    await startCheckout(deps, { orderRef: order.orderRef, statusToken: order.statusToken });

    deps.now = () => new Date(BASE_NOW.getTime() + 60 * MIN);
    paystack.state.transactions.set(order.orderRef, transactionFor(order.orderRef, RENEWAL_KOBO));
    const status = await getOrderStatus(deps, { orderRef: order.orderRef, statusToken: order.statusToken });
    expect(status.status).toBe("fulfilled");
    expect(status.activationKey).toBeTruthy();
    expect(signer).toHaveBeenCalledTimes(1);
  });
});

describe("abuse signals", () => {
  it("hashes IP addresses and never logs tokens or full emails", async () => {
    const { hashIp, logBravoSignal } = await import("@/lib/bravo/monitoring");
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    logBravoSignal("rate_limited", { route: "create", ip: "203.0.113.9" });
    const line = String(spy.mock.calls.at(-1)?.[0]);
    spy.mockRestore();
    expect(JSON.parse(line)).toMatchObject({ bravo_signal: "rate_limited", route: "create", ip_hash: hashIp("203.0.113.9") });
    expect(line).not.toContain("203.0.113.9");
  });

  it("logs when the checkout window closes for an order", async () => {
    const { deps } = await makeEnv();
    const order = await createPendingOrder(deps, { productId: VALID_PRODUCT_ID, plan: "first", email: VALID_EMAIL });
    deps.now = () => new Date(BASE_NOW.getTime() + 31 * 60 * 1000);
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    await startCheckout(deps, { orderRef: order.orderRef, statusToken: order.statusToken }).catch(() => null);
    const lines = spy.mock.calls.map((c) => String(c[0]));
    spy.mockRestore();
    expect(lines.some((l) => l.includes('"bravo_signal":"checkout_window_closed"') && l.includes(order.orderRef))).toBe(true);
  });

  it("returns 429 and logs a signal when one client exceeds the order-creation limit", async () => {
    const { deps } = await makeEnv();
    holder.deps = deps;
    const { POST } = await import("@/app/api/bravo/orders/route");
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    let last = 0;
    for (let i = 0; i < 21; i++) {
      const res = await POST(
        new Request("https://site.test/api/bravo/orders", {
          method: "POST",
          headers: { "content-type": "application/json", "x-forwarded-for": "198.51.100.77" },
          body: JSON.stringify({ productId: VALID_PRODUCT_ID, plan: "first", email: VALID_EMAIL }),
        })
      );
      last = res.status;
    }
    const lines = spy.mock.calls.map((c) => String(c[0]));
    spy.mockRestore();
    expect(last).toBe(429);
    expect(lines.some((l) => l.includes('"bravo_signal":"rate_limited"') && l.includes('"route":"create"'))).toBe(true);
    expect(lines.join("\n")).not.toContain("198.51.100.77");
  });
});

describe("handoff token, ownership and expiry", () => {
  it("returns 404 for a missing, malformed, wrong or another order's token", async () => {
    const { deps, paystack } = await makeEnv();
    const a = await createPendingOrder(deps, { productId: VALID_PRODUCT_ID, plan: "first", email: VALID_EMAIL });
    const b = await createPendingOrder(deps, { productId: VALID_PRODUCT_ID, plan: "first", email: VALID_EMAIL });
    for (const token of [null, "", "short", "x".repeat(43), "not base64!!", b.statusToken]) {
      await expectServiceError(startCheckout(deps, { orderRef: a.orderRef, statusToken: token }), 404, "not_found");
      await expectServiceError(getOrderStatus(deps, { orderRef: a.orderRef, statusToken: token }), 404, "not_found");
    }
    expect(paystack.state.initCalls).toHaveLength(0);
  });

  it("returns 404 for an unknown or malformed order reference, even with a valid-looking token", async () => {
    const { deps } = await makeEnv();
    const a = await createPendingOrder(deps, { productId: VALID_PRODUCT_ID, plan: "first", email: VALID_EMAIL });
    for (const ref of ["BCBT_000000000000000000000000", "BCBT_1", "../etc", "<script>"]) {
      await expectServiceError(startCheckout(deps, { orderRef: ref, statusToken: a.statusToken, email: VALID_EMAIL }), 404, "not_found");
    }
  });

  it("refuses to start a new checkout after the 30-minute window (410), and reports it in status", async () => {
    const { db, deps, paystack } = await makeEnv();
    const order = await createPendingOrder(deps, { productId: VALID_PRODUCT_ID, plan: "first", email: VALID_EMAIL });

    deps.now = () => new Date(BASE_NOW.getTime() + CHECKOUT_WINDOW_MS + 1000);

    await expectServiceError(startCheckout(deps, { orderRef: order.orderRef, statusToken: order.statusToken }), 410, "checkout_window_closed");
    expect(paystack.state.initCalls).toHaveLength(0);
    expect((await orderRow(db, order.orderRef))?.authorization_url).toBeNull();

    const status = await getOrderStatus(deps, { orderRef: order.orderRef, statusToken: order.statusToken });
    expect(status).toMatchObject({ status: "pending_payment", checkoutExpired: true });
  });

  it("an expired buyer order cannot have its email changed either", async () => {
    const { deps, paystack } = await makeEnv();
    const order = await createPendingOrder(deps, { productId: VALID_PRODUCT_ID, plan: "first" });
    deps.now = () => new Date(BASE_NOW.getTime() + CHECKOUT_WINDOW_MS + 1000);
    await expectServiceError(
      startCheckout(deps, { orderRef: order.orderRef, statusToken: order.statusToken, email: VALID_EMAIL }),
      410,
      "checkout_window_closed"
    );
    expect(paystack.state.initCalls).toHaveLength(0);
  });

  it("an order that already started Paystack keeps its link after the window, and its payment still completes", async () => {
    const { db, deps, paystack, signer, mailer } = await makeEnv();
    const order = await createPendingOrder(deps, { productId: VALID_PRODUCT_ID, plan: "first", email: VALID_EMAIL });
    const started = await startCheckout(deps, { orderRef: order.orderRef, statusToken: order.statusToken });

    deps.now = () => new Date(BASE_NOW.getTime() + CHECKOUT_WINDOW_MS * 5);
    const resumed = await startCheckout(deps, { orderRef: order.orderRef, statusToken: order.statusToken });
    expect(resumed.authorizationUrl).toBe(started.authorizationUrl);
    expect(paystack.state.initCalls).toHaveLength(1);

    // The buyer paid on Paystack after the window: the verified webhook still issues the key.
    paystack.state.transactions.set(order.orderRef, transactionFor(order.orderRef, FIRST_KOBO));
    const body = chargeSuccessEvent(order.orderRef);
    const res = await handlePaystackWebhook(deps, body, signPaystackBody(body));
    expect(res).toMatchObject({ status: 200, body: { outcome: "fulfilled" } });
    expect(signer).toHaveBeenCalledTimes(1);
    expect(mailer).toHaveBeenCalledTimes(1);
    expect((await orderRow(db, order.orderRef))?.status).toBe("fulfilled");
  });
});

describe("payment completion and activation", () => {
  it("a key stored by an interrupted run finishes the order instead of leaving it stuck in paid", async () => {
    const { db, deps, paystack, signer } = await makeEnv();
    const order = await createPendingOrder(deps, { productId: VALID_PRODUCT_ID, plan: "first", email: VALID_EMAIL });
    await startCheckout(deps, { orderRef: order.orderRef, statusToken: order.statusToken });

    // Simulate a crash after the key row was written but before the order was marked fulfilled.
    await db.execute({
      sql: "UPDATE bravo_orders SET status = 'paid', paystack_transaction_id = '777' WHERE order_ref = ?",
      args: [order.orderRef],
    });
    await db.execute({
      sql: "INSERT INTO bravo_issued_keys (order_ref, product_id, activation_key, issued_at) VALUES (?, ?, 'STORED-KEY', ?)",
      args: [order.orderRef, VALID_PRODUCT_ID, "2026-10-10T12:00:00.000Z"],
    });
    paystack.state.transactions.set(order.orderRef, transactionFor(order.orderRef, FIRST_KOBO, { id: 777 }));

    const result = await fulfillFromPaystack(deps, order.orderRef);
    expect(result.outcome).toBe("fulfilled");
    expect((await orderRow(db, order.orderRef))?.status).toBe("fulfilled");
    expect(signer).not.toHaveBeenCalled();
    expect(await keyRows(db, order.orderRef)).toHaveLength(1);

    const status = await getOrderStatus(deps, { orderRef: order.orderRef, statusToken: order.statusToken });
    expect(status.activationKey).toBe("STORED-KEY");
  });

  it("the key is returned to the app only with the token, and only after fulfilment", async () => {
    const { db, deps, paystack } = await makeEnv();
    const order = await createPendingOrder(deps, { productId: VALID_PRODUCT_ID, plan: "first", email: VALID_EMAIL });
    await startCheckout(deps, { orderRef: order.orderRef, statusToken: order.statusToken });

    const pending = await getOrderStatus(deps, { orderRef: order.orderRef, statusToken: order.statusToken });
    expect(pending).toMatchObject({ status: "pending_payment", activationKey: null });

    paystack.state.transactions.set(order.orderRef, transactionFor(order.orderRef, FIRST_KOBO));
    const body = chargeSuccessEvent(order.orderRef);
    await handlePaystackWebhook(deps, body, signPaystackBody(body));

    await expectServiceError(getOrderStatus(deps, { orderRef: order.orderRef, statusToken: null }), 404, "not_found");
    const done = await getOrderStatus(deps, { orderRef: order.orderRef, statusToken: order.statusToken });
    expect(done.status).toBe("fulfilled");
    expect(done.activationKey).toBe((await keyRows(db, order.orderRef))[0].activation_key);
  });
});

describe("protected page and API surface", () => {
  it("the activate page is excluded from search indexes", async () => {
    const mod = await import("@/app/(main)/bravo/activate/page");
    expect(mod.metadata.robots).toMatchObject({ index: false, follow: false });
  }, 30000); // first import of the page is slow on a cold machine
});

describe("route handlers", () => {
  let routes: {
    createOrder: typeof import("@/app/api/bravo/orders/route").POST;
    getStatus: typeof import("@/app/api/bravo/orders/[ref]/route").GET;
    checkout: typeof import("@/app/api/bravo/orders/[ref]/checkout/route").POST;
  };
  let env: Awaited<ReturnType<typeof makeEnv>>;

  beforeAll(async () => {
    env = await makeEnv();
    holder.deps = env.deps;
    routes = {
      createOrder: (await import("@/app/api/bravo/orders/route")).POST,
      getStatus: (await import("@/app/api/bravo/orders/[ref]/route")).GET,
      checkout: (await import("@/app/api/bravo/orders/[ref]/checkout/route")).POST,
    };
  });

  const jsonReq = (url: string, body: unknown, headers: Record<string, string> = {}) =>
    new Request(url, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) });

  it("direct access without a token: status and checkout both return 404 and reveal nothing", async () => {
    const created = await (await routes.createOrder(jsonReq("https://site.test/api/bravo/orders", { productId: VALID_PRODUCT_ID, plan: "first", email: VALID_EMAIL }))).json();
    const ref = { params: Promise.resolve({ ref: created.orderRef }) };

    const status = await routes.getStatus(new Request(`https://site.test/api/bravo/orders/${created.orderRef}`), ref);
    expect(status.status).toBe(404);
    expect(JSON.stringify(await status.json())).not.toContain(VALID_EMAIL);

    const checkout = await routes.checkout(jsonReq(`https://site.test/api/bravo/orders/${created.orderRef}/checkout`, {}), ref);
    expect(checkout.status).toBe(404);
    expect(env.paystack.state.initCalls.some((c) => c.reference === created.orderRef)).toBe(false);
  });

  it("the saved-email checkout works from the handoff token alone and the status never includes the full email", async () => {
    const created = await (await routes.createOrder(jsonReq("https://site.test/api/bravo/orders", { productId: VALID_PRODUCT_ID, plan: "first", email: VALID_EMAIL }))).json();
    const ref = { params: Promise.resolve({ ref: created.orderRef }) };
    const headers = { authorization: `Bearer ${created.statusToken}` };

    const status = await routes.getStatus(new Request(`https://site.test/api/bravo/orders/${created.orderRef}`, { headers }), ref);
    const statusBody = await status.json();
    expect(statusBody).toMatchObject({ emailOnFile: true, checkoutExpired: false, email: "pa***@example.com" });
    expect(JSON.stringify(statusBody)).not.toContain(VALID_EMAIL);

    const checkout = await routes.checkout(jsonReq(`https://site.test/api/bravo/orders/${created.orderRef}/checkout`, {}, headers), ref);
    expect(checkout.status).toBe(200);
    expect(env.paystack.state.initCalls.at(-1)).toMatchObject({ email: VALID_EMAIL, reference: created.orderRef });
  });

  it("returns 400 with a clear code when the browser tries to override a value", async () => {
    const created = await (await routes.createOrder(jsonReq("https://site.test/api/bravo/orders", { productId: VALID_PRODUCT_ID, plan: "first" }))).json();
    const ref = { params: Promise.resolve({ ref: created.orderRef }) };
    const res = await routes.checkout(
      jsonReq(`https://site.test/api/bravo/orders/${created.orderRef}/checkout`, { email: "parent@example.com", amount: 1 }, { authorization: `Bearer ${created.statusToken}` }),
      ref
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("authoritative_field_rejected");
  });

  it("missing-email order: checkout without an email returns email_required, and with one it starts Paystack", async () => {
    const created = await (await routes.createOrder(jsonReq("https://site.test/api/bravo/orders", { productId: VALID_PRODUCT_ID, plan: "renewal" }))).json();
    const ref = { params: Promise.resolve({ ref: created.orderRef }) };
    const headers = { authorization: `Bearer ${created.statusToken}` };

    const needs = await routes.checkout(jsonReq(`https://site.test/api/bravo/orders/${created.orderRef}/checkout`, {}, headers), ref);
    expect(needs.status).toBe(400);
    expect((await needs.json()).error).toBe("email_required");

    const ok = await routes.checkout(jsonReq(`https://site.test/api/bravo/orders/${created.orderRef}/checkout`, { email: "buyer@example.com" }, headers), ref);
    expect(ok.status).toBe(200);
    expect(env.paystack.state.initCalls.at(-1)).toMatchObject({ email: "buyer@example.com", amountKobo: RENEWAL_KOBO });
  });
});
