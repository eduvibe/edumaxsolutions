// POST /api/bravo/orders/{ref}/checkout — initialise Paystack for a pending order.
// Requires: Authorization: Bearer <statusToken>. Body: { email }.
// The amount is taken from the order on the server; nothing about price comes from the browser.
import { getClientIp, checkRateLimit } from "@/app/api/_lib/rateLimit";
import { bearerToken } from "@/lib/bravo/tokens";
import { bravoErrorResponse, jsonNoStore, readJsonObject } from "@/lib/bravo/http";
import { startCheckout } from "@/lib/bravo/orders";
import { getBravoDeps } from "@/lib/bravo/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: { params: Promise<{ ref: string }> }) {
  const { ref } = await ctx.params;
  const limit = checkRateLimit(`bravo:checkout:${getClientIp(req)}`, 20, 60_000);
  if (!limit.ok) return jsonNoStore({ error: "rate_limited", message: "Too many requests. Try again shortly." }, 429);

  const body = (await readJsonObject(req)) ?? {};
  try {
    const result = await startCheckout(getBravoDeps(), {
      orderRef: ref,
      statusToken: bearerToken(req),
      email: body.email,
    });
    return jsonNoStore({ orderRef: result.orderRef, authorizationUrl: result.authorizationUrl });
  } catch (error) {
    return bravoErrorResponse(error);
  }
}
