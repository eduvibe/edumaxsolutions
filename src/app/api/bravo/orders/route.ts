// POST /api/bravo/orders — create a pending activation order (no payment yet).
// Called by the Bravo app (Pay Online). The website no longer creates orders.
// Returns a one-time status token; the caller must keep it to read the order later.
import { getClientIp, checkRateLimit } from "@/app/api/_lib/rateLimit";
import { readJsonObject, bravoErrorResponse, jsonNoStore } from "@/lib/bravo/http";
import { createPendingOrder } from "@/lib/bravo/orders";
import { getBravoDeps } from "@/lib/bravo/service";
import { logBravoSignal } from "@/lib/bravo/monitoring";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const limit = checkRateLimit(`bravo:create:${ip}`, 20, 60_000);
  if (!limit.ok) {
    logBravoSignal("rate_limited", { route: "create", ip });
    return jsonNoStore({ error: "rate_limited", message: "Too many requests. Try again shortly." }, 429);
  }

  const body = await readJsonObject(req);
  if (!body) return jsonNoStore({ error: "invalid_body", message: "Send a JSON object" }, 400);

  try {
    // productId, plan and email are read. Any amount, currency, edition or status sent by the client is rejected (400).
    const order = await createPendingOrder(getBravoDeps(), body);
    return jsonNoStore(order, 201);
  } catch (error) {
    return bravoErrorResponse(error);
  }
}
