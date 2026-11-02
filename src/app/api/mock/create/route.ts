// POST /api/mock/create — staff (admin) publishes a scheduled or immediate mock event.
import { requireBravoStaff } from "@/lib/bravo/staff";
import { readJsonObject, jsonNoStore } from "@/lib/bravo/http";
import { getBravoDb } from "@/lib/bravo/db";
import { createMockEvent, validateMockConfig, MockValidationError } from "@/lib/bravo/mock";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const auth = await requireBravoStaff(req, getBravoDb(), "mock_manage");
  if ("error" in auth) return auth.error;

  const body = await readJsonObject(req);
  if (!body) return jsonNoStore({ error: "invalid_body", message: "Send a JSON object" }, 400);

  try {
    const config = validateMockConfig(body);
    const event = await createMockEvent(getBravoDb(), config, new Date().toISOString());
    return jsonNoStore({ ok: true, mock: event }, 201);
  } catch (error) {
    if (error instanceof MockValidationError) {
      return jsonNoStore({ error: error.code, message: error.message }, 400);
    }
    console.error("[bravo] mock create failed:", error instanceof Error ? error.message : error);
    return jsonNoStore({ error: "internal_error", message: "Something went wrong. Please try again." }, 500);
  }
}
