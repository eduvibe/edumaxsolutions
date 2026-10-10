// POST /api/webhooks/paystack — Paystack webhook (configure this URL in the Paystack dashboard).
// The signature is checked against the RAW body before anything else happens.
// Non-2xx responses make Paystack retry; fulfilment is idempotent so retries are safe.
import { handlePaystackWebhook } from "@/lib/bravo/orders";
import { getBravoDeps } from "@/lib/bravo/service";
import { bravoErrorResponse, jsonNoStore } from "@/lib/bravo/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-paystack-signature");
  try {
    const result = await handlePaystackWebhook(getBravoDeps(), rawBody, signature);
    return jsonNoStore(result.body, result.status);
  } catch (error) {
    return bravoErrorResponse(error);
  }
}
