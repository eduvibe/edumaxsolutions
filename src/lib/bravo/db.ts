/**
 * Turso DB client — dedicated to Bravo CBT orders.
 * Completely separate from Supabase (which handles the resources page).
 *
 * Env vars required:
 *   TURSO_DATABASE_URL   — libsql://your-db-name.turso.io
 *   TURSO_AUTH_TOKEN     — eyJh...
 */

import { createClient, type Client } from "@libsql/client";

let cached: Client | null = null;

export function getTursoClient(): Client {
  if (cached) return cached;

  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url) throw new Error("TURSO_DATABASE_URL is not configured");
  if (!authToken) throw new Error("TURSO_AUTH_TOKEN is not configured");

  cached = createClient({ url, authToken });
  return cached;
}

/**
 * Ensure the bravo_orders table exists.
 * Safe to call on every cold start — uses CREATE TABLE IF NOT EXISTS.
 */
export async function ensureBravoSchema(): Promise<void> {
  const db = getTursoClient();
  await db.execute(`
    CREATE TABLE IF NOT EXISTS bravo_orders (
      id               TEXT PRIMARY KEY,
      email            TEXT NOT NULL,
      kind             TEXT NOT NULL CHECK (kind IN ('new','renewal')),
      amount_kobo      INTEGER NOT NULL,
      product_id       TEXT NOT NULL,
      status           TEXT NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending','paid','failed')),
      activation_key   TEXT,
      paystack_ref     TEXT,
      paid_at          TEXT,
      created_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      updated_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    )
  `);
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_bravo_orders_product_id ON bravo_orders (product_id)
  `);
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_bravo_orders_status ON bravo_orders (status)
  `);
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_bravo_orders_email ON bravo_orders (email)
  `);
}
