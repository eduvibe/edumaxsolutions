// GET /api/bravo/orders/{ref} — status of ONE order, with the activation key once fulfilled.
// Requires: Authorization: Bearer <statusToken> (returned when the order was created).
// Product ID alone never grants access. Unknown order and wrong token both return 404.
import { getClientIp, checkRateLimit } from "@/app/api/_lib/rateLimit";
import { bearerToken } from "@/lib/bravo/tokens";
import { bravoErrorResponse, jsonNoStore } from "@/lib/bravo/http";
import { getOrderStatus } from "@/lib/bravo/orders";
import { getBravoDeps } from "@/lib/bravo/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: { params: Promise<{ ref: string }> }) {
  const { ref } = await ctx.params;
  const limit = checkRateLimit(`bravo:status:${getClientIp(req)}`, 120, 60_000);
  if (!limit.ok) return jsonNoStore({ error: "rate_limited", message: "Too many requests. Try again shortly." }, 429);

  try {
    const status = await getOrderStatus(getBravoDeps(), { orderRef: ref, statusToken: bearerToken(req) });
    return jsonNoStore(status);
  } catch (error) {
    return bravoErrorResponse(error);
  }
}
