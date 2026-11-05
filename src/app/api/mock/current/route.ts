// GET /api/mock/current — public. Returns { mock: null } or the active event configuration only.
import { jsonNoStore, CORS_HEADERS, corsPreflight } from "@/lib/bravo/http";
import { getBravoDb } from "@/lib/bravo/db";
import { getCurrentMock } from "@/lib/bravo/mock";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return corsPreflight();
}

export async function GET() {
  try {
    const mock = await getCurrentMock(getBravoDb());
    return jsonNoStore({ mock }, 200, CORS_HEADERS);
  } catch (error) {
    console.error("[bravo] mock current failed:", error instanceof Error ? error.message : error);
    return jsonNoStore({ mock: null }, 200, CORS_HEADERS);
  }
}
