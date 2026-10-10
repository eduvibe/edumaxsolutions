import { createHmac, timingSafeEqual } from "node:crypto";

const PAYSTACK_API = "https://api.paystack.co";

export type PaystackTransaction = {
  id: number | string;
  status: string;
  reference: string;
  amount: number; // kobo
  currency: string;
  paid_at?: string | null;
  customer?: { email?: string | null } | null;
};

export type PaystackClient = {
  initializeTransaction(input: {
    email: string;
    amountKobo: number;
    reference: string;
    callbackUrl: string;
    metadata: Record<string, string>;
  }): Promise<{ authorizationUrl: string; accessCode: string }>;
  verifyTransaction(reference: string): Promise<PaystackTransaction>;
};

export class PaystackError extends Error {}

type PaystackEnvelope = { status?: boolean; message?: string; data?: unknown };

/**
 * Paystack signs webhooks with HMAC-SHA512 over the RAW request body using the secret key.
 * `rawBody` must be the exact text received; never re-serialise parsed JSON before checking.
 */
export function verifyPaystackWebhookSignature(
  rawBody: string,
  signature: string | null | undefined,
  secretKey: string
): boolean {
  if (!signature || !secretKey) return false;
  const expected = createHmac("sha512", secretKey).update(rawBody, "utf8").digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature.trim().toLowerCase(), "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

export function createPaystackClient(options: { secretKey: string; fetchImpl?: typeof fetch }): PaystackClient {
  const fetchImpl = options.fetchImpl ?? fetch;
  const headers = {
    Authorization: `Bearer ${options.secretKey}`,
    "Content-Type": "application/json",
  };

  async function call(path: string, init: { method: "GET" | "POST"; body?: string }) {
    const res = await fetchImpl(`${PAYSTACK_API}${path}`, { ...init, headers, cache: "no-store" });
    let json: PaystackEnvelope | null;
    try {
      json = (await res.json()) as PaystackEnvelope;
    } catch {
      json = null;
    }
    if (!res.ok || !json?.status) {
      throw new PaystackError(`Paystack request failed (${res.status}): ${json?.message ?? "no message"}`);
    }
    return json.data;
  }

  return {
    async initializeTransaction({ email, amountKobo, reference, callbackUrl, metadata }) {
      const data = (await call("/transaction/initialize", {
        method: "POST",
        body: JSON.stringify({
          email,
          amount: amountKobo,
          currency: "NGN",
          reference,
          callback_url: callbackUrl,
          metadata,
        }),
      })) as { authorization_url?: string; access_code?: string } | undefined;
      if (!data?.authorization_url || !data.access_code) {
        throw new PaystackError("Paystack did not return a checkout URL");
      }
      return { authorizationUrl: data.authorization_url, accessCode: data.access_code };
    },
    async verifyTransaction(reference) {
      return (await call(`/transaction/verify/${encodeURIComponent(reference)}`, { method: "GET" })) as PaystackTransaction;
    },
  };
}
