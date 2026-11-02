// GET /api/staff/me — returns the caller's staff context (used by the console sign-in check).
import { authenticateBravoStaff } from "@/lib/bravo/staff";
import { jsonNoStore } from "@/lib/bravo/http";
import { getBravoDb } from "@/lib/bravo/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await authenticateBravoStaff(req, getBravoDb());
  if ("error" in auth) return auth.error;
  return jsonNoStore({ staff: auth.ctx });
}
