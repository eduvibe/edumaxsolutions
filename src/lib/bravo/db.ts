// Server-only cached Turso client for Bravo reports/mock (does not require payment config).
import { createClient, type Client } from "@libsql/client";

let cached: Client | null = null;

export function getBravoDb(): Client {
  if (cached) return cached;
  const url = process.env.TURSO_DATABASE_URL?.trim();
  if (!url) throw new Error("TURSO_DATABASE_URL is not configured");
  cached = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN?.trim() || undefined });
  return cached;
}
