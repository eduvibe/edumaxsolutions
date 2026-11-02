// GET /api/reports/export?status=open|resolved|all&format=json|csv — staff with reports_export.
// Exports report references only (question reports never contain question content).
import { requireBravoStaff } from "@/lib/bravo/staff";
import { getBravoDb } from "@/lib/bravo/db";
import { listReports } from "@/lib/bravo/reports";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toCsv(rows: unknown[]): string {
  const headers = ["id", "category", "status", "product_id", "exam_id", "subject_id", "question_id", "year", "model", "message", "created_at", "received_at", "resolved_at"];
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.join(",")];
  for (const r of rows as Record<string, unknown>[]) lines.push(headers.map((h) => esc(r[h])).join(","));
  return lines.join("\n") + "\n";
}

export async function GET(req: Request) {
  const auth = await requireBravoStaff(req, getBravoDb(), "reports_export");
  if ("error" in auth) return auth.error;

  const url = new URL(req.url);
  const statusParam = url.searchParams.get("status") ?? "all";
  const status = statusParam === "open" || statusParam === "resolved" || statusParam === "all" ? statusParam : "all";
  const format = url.searchParams.get("format") === "csv" ? "csv" : "json";

  const reports = await listReports(getBravoDb(), { status, limit: 200 });
  if (format === "csv") {
    return new NextResponse(toCsv(reports), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="bravo-reports-${status}.csv"`,
        "Cache-Control": "no-store, max-age=0",
      },
    });
  }
  return NextResponse.json({ reports }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}
