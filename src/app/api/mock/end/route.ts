// POST /api/mock/end — staff (admin) ends the active mock event immediately.
import { requireBravoStaff } from "@/lib/bravo/staff";
import { jsonNoStore } from "@/lib/bravo/http";
import { getBravoDb } from "@/lib/bravo/db";
import { endCurrentMock } from "@/lib/bravo/mock";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const auth = await requireBravoStaff(req, getBravoDb(), "mock_manage");
  if ("error" in auth) return auth.error;

  const ended = await endCurrentMock(getBravoDb(), new Date().toISOString());
  if (!ended) return jsonNoStore({ error: "no_active_mock", message: "No active mock event" }, 404);
  return jsonNoStore({ ok: true });
}
