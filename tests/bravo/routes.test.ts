// Exercises the real App Router handlers with real Request objects. Only the dependency
// wiring (Turso/Paystack/Resend/signer) is replaced with the in-memory test environment.
import { beforeAll, describe, expect, it, vi } from "vitest";
import { makeEnv, transactionFor, signPaystackBody, chargeSuccessEvent, VALID_PRODUCT_ID, VALID_EMAIL, keyRows, orderRow } from "./helpers";

const holder = vi.hoisted(() => ({ deps: null as unknown }));
vi.mock("@/lib/bravo/service", () => ({
  getBravoDeps: () => holder.deps,
}));

type Routes = {
  createOrder: typeof import("@/app/api/bravo/orders/route").POST;
  getStatus: typeof import("@/app/api/bravo/orders/[ref]/route").GET;
  checkout: typeof import("@/app/api/bravo/orders/[ref]/checkout/route").POST;
  webhook: typeof import("@/app/api/webhooks/paystack/route").POST;
};

let routes: Routes;
let env: Awaited<ReturnType<typeof makeEnv>>;

beforeAll(async () => {
  env = await makeEnv();
  holder.deps = env.deps;
  routes = {
    createOrder: (await import("@/app/api/bravo/orders/route")).POST,
    getStatus: (await import("@/app/api/bravo/orders/[ref]/route")).GET,
    checkout: (await import("@/app/api/bravo/orders/[ref]/checkout/route")).POST,
    webhook: (await import("@/app/api/webhooks/paystack/route")).POST,
  };
});

const jsonReq = (url: string, body: unknown, headers: Record<string, string> = {}) =>
  new Request(url, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) });

describe("POST /api/bravo/orders", () => {
  it("creates a pending order and ignores client-supplied amounts", async () => {
    const res = await routes.createOrder(
      jsonReq("https://site.test/api/bravo/orders", { productId: VALID_PRODUCT_ID, plan: "first", email: VALID_EMAIL, amount: 1 })
    );
    expect(res.status).toBe(201);
    expect(res.headers.get("cache-control")).toContain("no-store");
    const body = await res.json();
    expect(body).toMatchObject({ status: "pending_payment", productId: VALID_PRODUCT_ID, plan: "first", amountNaira: 4000, currency: "NGN" });
    expect(body.statusToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
    const row = await orderRow(env.db, body.orderRef);
    expect(row?.amount_kobo).toBe(400000);
  });

  it("rejects an invalid body with 400", async () => {
    const res = await routes.createOrder(new Request("https://site.test/api/bravo/orders", { method: "POST", body: "[]" }));
    expect(res.status).toBe(400);
    const bad = await routes.createOrder(jsonReq("https://site.test/api/bravo/orders", { productId: "x", plan: "first" }));
    expect(bad.status).toBe(400);
    expect((await bad.json()).error).toBe("invalid_product_id");
  });
});

describe("end-to-end through the routes", () => {
  it("create -> checkout -> webhook -> protected status returns the key only with the token", async () => {
    const created = await (
      await routes.createOrder(jsonReq("https://site.test/api/bravo/orders", { productId: VALID_PRODUCT_ID, plan: "renewal" }))
    ).json();

    // Checkout without the token is refused.
    const noToken = await routes.checkout(
      jsonReq(`https://site.test/api/bravo/orders/${created.orderRef}/checkout`, { email: VALID_EMAIL }),
      { params: Promise.resolve({ ref: created.orderRef }) }
    );
    expect(noToken.status).toBe(404);

    const checkout = await routes.checkout(
      jsonReq(`https://site.test/api/bravo/orders/${created.orderRef}/checkout`, { email: VALID_EMAIL }, { authorization: `Bearer ${created.statusToken}` }),
      { params: Promise.resolve({ ref: created.orderRef }) }
    );
    expect(checkout.status).toBe(200);
    expect((await checkout.json()).authorizationUrl).toContain(created.orderRef);
    expect(env.paystack.state.initCalls.at(-1)?.amountKobo).toBe(300000);

    // Status before payment: no key.
    const statusUrl = `https://site.test/api/bravo/orders/${created.orderRef}`;
    const before = await routes.getStatus(new Request(statusUrl, { headers: { authorization: `Bearer ${created.statusToken}` } }), {
      params: Promise.resolve({ ref: created.orderRef }),
    });
    expect((await before.json()).activationKey).toBeNull();

    // Paystack webhook (signed raw body) confirms payment.
    env.paystack.state.transactions.set(created.orderRef, transactionFor(created.orderRef, 300000));
    const body = chargeSuccessEvent(created.orderRef);
    const hook = await routes.webhook(
      new Request("https://site.test/api/webhooks/paystack", {
        method: "POST",
        headers: { "x-paystack-signature": signPaystackBody(body) },
        body,
      })
    );
    expect(hook.status).toBe(200);

    const wrongToken = await routes.getStatus(new Request(statusUrl, { headers: { authorization: "Bearer nope" } }), {
      params: Promise.resolve({ ref: created.orderRef }),
    });
    expect(wrongToken.status).toBe(404);
    expect(JSON.stringify(await wrongToken.json())).not.toMatch(/activation|key/i);

    const after = await routes.getStatus(new Request(statusUrl, { headers: { authorization: `Bearer ${created.statusToken}` } }), {
      params: Promise.resolve({ ref: created.orderRef }),
    });
    const status = await after.json();
    expect(status.status).toBe("fulfilled");
    const keys = await keyRows(env.db, created.orderRef);
    expect(status.activationKey).toBe(keys[0].activation_key);
  });

  it("the webhook route rejects a bad signature with 401 and does not touch orders", async () => {
    const created = await (
      await routes.createOrder(jsonReq("https://site.test/api/bravo/orders", { productId: VALID_PRODUCT_ID, plan: "first" }))
    ).json();
    const body = chargeSuccessEvent(created.orderRef);
    const res = await routes.webhook(
      new Request("https://site.test/api/webhooks/paystack", { method: "POST", headers: { "x-paystack-signature": "00" }, body })
    );
    expect(res.status).toBe(401);
    expect((await orderRow(env.db, created.orderRef))?.status).toBe("pending_payment");
  });

  it("the status route rejects malformed refs before any lookup", async () => {
    const res = await routes.getStatus(new Request("https://site.test/api/bravo/orders/xyz", { headers: { authorization: "Bearer abc" } }), {
      params: Promise.resolve({ ref: "xyz" }),
    });
    expect(res.status).toBe(404);
  });
});
