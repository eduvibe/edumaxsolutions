// POST /api/reports/:id/delete — staff with reports_review permanently deletes a report
// (e.g. test entries or already-treated ones).
import { requireBravoStaff } from "@/lib/bravo/staff";
import { jsonNoStore } from "@/lib/bravo/http";
import { getBravoDb } from "@/lib/bravo/db";
import { deleteReport } from "@/lib/bravo/reports";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireBravoStaff(req, getBravoDb(), "reports_review");
  if ("error" in auth) return auth.error;

  const { id } = await ctx.params;
  const deleted = await deleteReport(getBravoDb(), decodeURIComponent(id));
  if (!deleted) return jsonNoStore({ error: "not_found", message: "Report not found" }, 404);
  return jsonNoStore({ ok: true });
}
