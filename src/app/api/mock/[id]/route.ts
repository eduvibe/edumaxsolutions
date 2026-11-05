// PATCH /api/mock/:id — staff with mock_manage edits an event (only before it starts and with no scores).
// DELETE /api/mock/:id — staff with mock_manage deletes an event (only when no scores exist).
import { requireBravoStaff } from "@/lib/bravo/staff";
import { readJsonObject, jsonNoStore } from "@/lib/bravo/http";
import { getBravoDb } from "@/lib/bravo/db";
import { updateMockEvent, deleteMockEvent, validateMockConfig, MockValidationError } from "@/lib/bravo/mock";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireBravoStaff(req, getBravoDb(), "mock_manage");
  if ("error" in auth) return auth.error;

  const body = await readJsonObject(req);
  if (!body) return jsonNoStore({ error: "invalid_body", message: "Send a JSON object" }, 400);

  const { id } = await ctx.params;
  try {
    const config = validateMockConfig(body);
    const result = await updateMockEvent(getBravoDb(), decodeURIComponent(id), config, new Date().toISOString());
    if (!result.ok) return jsonNoStore({ error: result.code, message: result.message }, 409);
    return jsonNoStore({ ok: true, mock: result.mock });
  } catch (error) {
    if (error instanceof MockValidationError) return jsonNoStore({ error: error.code, message: error.message }, 400);
    throw error;
  }
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireBravoStaff(req, getBravoDb(), "mock_manage");
  if ("error" in auth) return auth.error;

  const { id } = await ctx.params;
  const result = await deleteMockEvent(getBravoDb(), decodeURIComponent(id));
  if (!result.ok) return jsonNoStore({ error: result.code, message: result.message }, result.code === "not_found" ? 404 : 409);
  return jsonNoStore({ ok: true });
}
