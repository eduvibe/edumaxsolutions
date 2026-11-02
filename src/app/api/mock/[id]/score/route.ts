// POST /api/mock/:id/score — public. Validates the activation key for the Product ID,
// enforces startsAt/closeAt, and stores the score. Offline submissions are accepted
// late only when the attempt started before closeAt and ended at/before closeAt.
import { getClientIp, checkRateLimit } from "@/app/api/_lib/rateLimit";
import { readJsonObject, jsonNoStore } from "@/lib/bravo/http";
import { getBravoDb } from "@/lib/bravo/db";
import { submitMockScore, MockValidationError } from "@/lib/bravo/mock";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const ip = getClientIp(req);
  const limit = checkRateLimit(`bravo:score:${ip}`, 30, 60_000);
  if (!limit.ok) {
    return jsonNoStore({ error: "rate_limited", message: "Too many requests. Try again shortly." }, 429);
  }

  const body = await readJsonObject(req);
  if (!body) return jsonNoStore({ error: "invalid_body", message: "Send a JSON object" }, 400);

  const { id } = await ctx.params;
  try {
    const result = await submitMockScore(getBravoDb(), decodeURIComponent(id), body, new Date().toISOString());
    if (!result.accepted) return jsonNoStore({ error: result.code, message: result.message }, 400);
    return jsonNoStore({ ok: true, id: result.id }, 201);
  } catch (error) {
    if (error instanceof MockValidationError) {
      return jsonNoStore({ error: error.code, message: error.message }, 400);
    }
    console.error("[bravo] score submission failed:", error instanceof Error ? error.message : error);
    return jsonNoStore({ error: "internal_error", message: "Something went wrong. Please try again." }, 500);
  }
}
