// POST /api/staff/:id/revoke — super-admin revokes a staff account immediately.
import { requireBravoStaff, revokeStaff } from "@/lib/bravo/staff";
import { jsonNoStore } from "@/lib/bravo/http";
import { getBravoDb } from "@/lib/bravo/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireBravoStaff(req, getBravoDb());
  if ("error" in auth) return auth.error;
  if (!auth.ctx.isSuperAdmin) return jsonNoStore({ error: "forbidden", message: "Super admin required" }, 403);

  const { id } = await ctx.params;
  const revoked = await revokeStaff(getBravoDb(), decodeURIComponent(id), new Date().toISOString());
  if (!revoked) return jsonNoStore({ error: "not_found", message: "Active staff account not found" }, 404);
  return jsonNoStore({ ok: true });
}
