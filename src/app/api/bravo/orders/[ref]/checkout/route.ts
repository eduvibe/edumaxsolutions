// POST /api/bravo/orders/{ref}/checkout — initialise Paystack for a pending order.
// Requires: Authorization: Bearer <statusToken>. Body: { email } only, and only when the order has no saved email.
// The amount, Product ID, plan and edition come from the order on the server. Client values for them are rejected.
import { getClientIp, checkRateLimit } from "@/app/api/_lib/rateLimit";
import { bearerToken } from "@/lib/bravo/tokens";
import { bravoErrorResponse, jsonNoStore, readJsonObject } from "@/lib/bravo/http";
import { startCheckout } from "@/lib/bravo/orders";
import { getBravoDeps } from "@/lib/bravo/service";
import { logBravoSignal } from "@/lib/bravo/monitoring";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: { params: Promise<{ ref: string }> }) {
  const { ref } = await ctx.params;
  const ip = getClientIp(req);
  const limit = checkRateLimit(`bravo:checkout:${ip}`, 20, 60_000);
  if (!limit.ok) {
    logBravoSignal("rate_limited", { route: "checkout", ip });
    return jsonNoStore({ error: "rate_limited", message: "Too many requests. Try again shortly." }, 429);
  }

  const body = (await readJsonObject(req)) ?? {};
  try {
    const result = await startCheckout(getBravoDeps(), {
      orderRef: ref,
      statusToken: bearerToken(req),
      email: body.email,
      body,
    });
    return jsonNoStore({ orderRef: result.orderRef, authorizationUrl: result.authorizationUrl });
  } catch (error) {
    return bravoErrorResponse(error);
  }
}
