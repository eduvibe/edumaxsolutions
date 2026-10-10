// POST /api/bravo/orders — create a pending activation order (no payment yet).
// Called by the Bravo app (Pay Online) or by the /bravo/activate page.
// Returns a one-time status token; the caller must keep it to read the order later.
import { getClientIp, checkRateLimit } from "@/app/api/_lib/rateLimit";
import { readJsonObject, bravoErrorResponse, jsonNoStore } from "@/lib/bravo/http";
import { createPendingOrder } from "@/lib/bravo/orders";
import { getBravoDeps } from "@/lib/bravo/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const limit = checkRateLimit(`bravo:create:${getClientIp(req)}`, 20, 60_000);
  if (!limit.ok) return jsonNoStore({ error: "rate_limited", message: "Too many requests. Try again shortly." }, 429);

  const body = await readJsonObject(req);
  if (!body) return jsonNoStore({ error: "invalid_body", message: "Send a JSON object" }, 400);

  try {
    // Only productId, plan and email are read. Any amount/currency/status sent by the client is ignored.
    const order = await createPendingOrder(getBravoDeps(), {
      productId: body.productId,
      plan: body.plan,
      email: body.email,
    });
    return jsonNoStore(order, 201);
  } catch (error) {
    return bravoErrorResponse(error);
  }
}
