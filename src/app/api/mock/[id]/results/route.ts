// GET /api/mock/:id/results — staff (mock_manage) full results incl. profile details for
// contacting reward recipients. Never public: requires the Bravo staff token.
import { requireBravoStaff } from "@/lib/bravo/staff";
import { jsonNoStore } from "@/lib/bravo/http";
import { getBravoDb } from "@/lib/bravo/db";
import { getStaffResults } from "@/lib/bravo/mock";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireBravoStaff(req, getBravoDb(), "mock_manage");
  if ("error" in auth) return auth.error;

  const { id } = await ctx.params;
  const url = new URL(req.url);
  const limitParam = Number(url.searchParams.get("limit") ?? "200");
  const limit = Number.isInteger(limitParam) ? limitParam : 200;
  const results = await getStaffResults(getBravoDb(), decodeURIComponent(id), limit);
  return jsonNoStore({ results });
}
