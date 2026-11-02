// GET /api/staff — super-admin (env token) lists staff (no token hashes/plaintext tokens).
// POST /api/staff — super-admin creates a staff account; the plaintext token is returned once.
import { requireBravoStaff, listStaff, createStaff, StaffServiceError } from "@/lib/bravo/staff";
import { readJsonObject, jsonNoStore } from "@/lib/bravo/http";
import { getBravoDb } from "@/lib/bravo/db";
import { PERMISSIONS, type Permission } from "@/lib/bravo/staff";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requireBravoStaff(req, getBravoDb());
  if ("error" in auth) return auth.error;
  if (!auth.ctx.isSuperAdmin) return jsonNoStore({ error: "forbidden", message: "Super admin required" }, 403);
  return jsonNoStore({ staff: await listStaff(getBravoDb()) });
}

export async function POST(req: Request) {
  const auth = await requireBravoStaff(req, getBravoDb());
  if ("error" in auth) return auth.error;
  if (!auth.ctx.isSuperAdmin) return jsonNoStore({ error: "forbidden", message: "Super admin required" }, 403);

  const body = await readJsonObject(req);
  if (!body) return jsonNoStore({ error: "invalid_body", message: "Send a JSON object" }, 400);
  if (typeof body.name !== "string" || !Array.isArray(body.permissions)) {
    return jsonNoStore({ error: "invalid_body", message: "name (string) and permissions (array) are required" }, 400);
  }
  const permissions = body.permissions.filter((p): p is Permission => (PERMISSIONS as readonly string[]).includes(p as string));
  try {
    const { staff, token } = await createStaff(getBravoDb(), { name: body.name, permissions }, new Date().toISOString());
    return jsonNoStore({ ok: true, staff, token }, 201);
  } catch (error) {
    if (error instanceof StaffServiceError) return jsonNoStore({ error: error.code, message: error.message }, 400);
    throw error;
  }
}
