// GET /api/mock/:id/leaderboard — public. Exposes candidate name (or Candidate) and score only.
import { jsonNoStore } from "@/lib/bravo/http";
import { getBravoDb } from "@/lib/bravo/db";
import { getLeaderboard } from "@/lib/bravo/mock";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const url = new URL(req.url);
  const limitParam = Number(url.searchParams.get("limit") ?? "100");
  const limit = Number.isInteger(limitParam) ? limitParam : 100;
  const entries = await getLeaderboard(getBravoDb(), decodeURIComponent(id), limit);
  return jsonNoStore({ leaderboard: entries });
}
