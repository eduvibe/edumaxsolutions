// POST /api/reports/:id/resolve — staff (admin) marks a report reviewed/resolved.
import { requireBravoStaff } from "@/lib/bravo/staff";
import { jsonNoStore } from "@/lib/bravo/http";
import { getBravoDb } from "@/lib/bravo/db";
import { resolveReport } from "@/lib/bravo/reports";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireBravoStaff(req, getBravoDb(), "reports_review");
  if ("error" in auth) return auth.error;

  const { id } = await ctx.params;
  const row = await resolveReport(getBravoDb(), decodeURIComponent(id), new Date().toISOString());
  if (!row) return jsonNoStore({ error: "not_found", message: "Report not found" }, 404);
  return jsonNoStore({ ok: true, report: row });
}
