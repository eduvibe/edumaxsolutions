// GET /api/mock/history?limit= — public list of mock events (active + ended), newest first,
// so clients can show past central mocks and fetch their results/leaderboard after they end.
import { jsonNoStore, CORS_HEADERS, corsPreflight } from "@/lib/bravo/http";
import { getBravoDb } from "@/lib/bravo/db";
import { listMockEvents } from "@/lib/bravo/mock";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return corsPreflight();
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const limitParam = Number(url.searchParams.get("limit") ?? "50");
  const limit = Number.isInteger(limitParam) ? limitParam : 50;
  const events = await listMockEvents(getBravoDb(), limit);
  return jsonNoStore({ events }, 200, CORS_HEADERS);
}
