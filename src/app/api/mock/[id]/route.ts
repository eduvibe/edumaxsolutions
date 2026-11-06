// PATCH /api/mock/:id — staff with mock_manage edits an event (only before it starts and with no scores).
// DELETE /api/mock/:id — staff with mock_manage deletes an event (only when no scores exist).
import { requireBravoStaff } from "@/lib/bravo/staff";
import { readJsonObject, jsonNoStore } from "@/lib/bravo/http";
import { getBravoDb } from "@/lib/bravo/db";
import { updateMockEvent, deleteMockEvent, getMockEvent, validateMockConfig, MockValidationError } from "@/lib/bravo/mock";
import { CORS_HEADERS, corsPreflight } from "@/lib/bravo/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return corsPreflight();
}

// GET /api/mock/:id — public configuration of a known event, including ended ones,
// so students can revisit a finished central mock (with its leaderboard).
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const event = await getMockEvent(getBravoDb(), decodeURIComponent(id));
  if (!event) return jsonNoStore({ error: "not_found", message: "Unknown mock event id" }, 404, CORS_HEADERS);
  return jsonNoStore({ mock: event }, 200, CORS_HEADERS);
}

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
