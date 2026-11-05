// POST /api/reports — public student submission (strict validation, idempotent by report id).
// GET  /api/reports?status=open|resolved|all&limit=... — staff (admin) only.
import { getClientIp, checkRateLimit } from "@/app/api/_lib/rateLimit";
import { requireBravoStaff } from "@/lib/bravo/staff";
import { readJsonObject, jsonNoStore, CORS_HEADERS, corsPreflight } from "@/lib/bravo/http";
import { getBravoDb } from "@/lib/bravo/db";
import { storeReport, listReports, validateReportPayload, ReportValidationError } from "@/lib/bravo/reports";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Browser clients (Bravo web build) need a preflight answer; Electron main-process does not.
export async function OPTIONS() {
  return corsPreflight();
}

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const limit = checkRateLimit(`bravo:report:${ip}`, 30, 60_000);
  if (!limit.ok) {
    return jsonNoStore({ error: "rate_limited", message: "Too many reports. Try again shortly." }, 429);
  }

  const body = await readJsonObject(req);
  if (!body) return jsonNoStore({ error: "invalid_body", message: "Send a JSON object" }, 400);

  try {
    const payload = validateReportPayload(body);
    const { created } = await storeReport(getBravoDb(), payload, new Date().toISOString());
    // Persist first; there is no notification step that could lose the report.
    // Bravo treats delivery as successful only when JSON has ok:true and reportId === submitted id.
    return jsonNoStore({ ok: true, reportId: payload.id, id: payload.id, created }, created ? 201 : 200, CORS_HEADERS);
  } catch (error) {
    if (error instanceof ReportValidationError) {
      return jsonNoStore({ error: error.code, message: error.message }, 400);
    }
    console.error("[bravo] report intake failed:", error instanceof Error ? error.message : error);
    return jsonNoStore({ error: "internal_error", message: "Something went wrong. Please try again." }, 500);
  }
}

export async function GET(req: Request) {
  const auth = await requireBravoStaff(req, getBravoDb(), "reports_review");
  if ("error" in auth) return auth.error;

  const url = new URL(req.url);
  const statusParam = url.searchParams.get("status") ?? "open";
  const status = statusParam === "open" || statusParam === "resolved" || statusParam === "all" ? statusParam : "open";
  const limitParam = Number(url.searchParams.get("limit") ?? "50");
  const limit = Number.isInteger(limitParam) ? limitParam : 50;

  const reports = await listReports(getBravoDb(), { status, limit });
  return jsonNoStore({ reports });
}
