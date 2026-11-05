// Applies db/migrations/*.sql to the Turso database named by server env vars.
// Usage:  npm run db:migrate
// Credentials come from the environment or from a git-ignored .env.local:
//   TURSO_DATABASE_URL=libsql://<db>-<org>.turso.io
//   TURSO_AUTH_TOKEN=...
// Secrets are read from the environment only and never printed.
import dotenv from "dotenv";
// Next.js convention: .env.local first (git-ignored, per-developer), then .env.
dotenv.config({ path: ".env.local" });
dotenv.config();
import { createClient } from "@libsql/client";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(here, "..", "db", "migrations");

const url = process.env.TURSO_DATABASE_URL?.trim();
const authToken = process.env.TURSO_AUTH_TOKEN?.trim() || undefined;
if (!url) {
  console.error("TURSO_DATABASE_URL is not set (environment or .env.local)");
  process.exit(1);
}
// Fail fast on malformed URLs instead of a cryptic HTTP 400 from the server.
let targetName = "(unknown)";
try {
  const parsed = new URL(url);
  if (parsed.protocol !== "libsql:") {
    console.error(`TURSO_DATABASE_URL must use the libsql:// scheme, got '${parsed.protocol}//' — refusing to run.`);
    process.exit(1);
  }
  targetName = parsed.hostname;
} catch {
  console.error("TURSO_DATABASE_URL is not a valid libsql:// URL — refusing to run.");
  process.exit(1);
}
console.log(`target database: ${targetName}  (token: ${authToken ? "set" : "MISSING"})`);
if (!authToken) {
  console.error("TURSO_AUTH_TOKEN is not set (environment or .env.local)");
  process.exit(1);
}

const db = createClient({ url, authToken });

// Read-only: show what already exists, so a table created by another code path is visible before changes.
const existing = await db.execute("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'bravo_orders'");
console.log("existing bravo_orders:", existing.rows[0]?.sql ?? "(no table yet)");

await db.execute(
  "CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY, applied_at TEXT NOT NULL)"
);

const files = readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();
for (const file of files) {
  const done = await db.execute({ sql: "SELECT 1 FROM schema_migrations WHERE version = ?", args: [file] });
  if (done.rows.length > 0) {
    console.log(`skip  ${file} (already applied)`);
    continue;
  }
  await db.executeMultiple(readFileSync(join(migrationsDir, file), "utf8"));
  await db.execute({
    sql: "INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)",
    args: [file, new Date().toISOString()],
  });
  console.log(`apply ${file}`);
}

const tables = await db.execute(
  "SELECT name FROM sqlite_master WHERE type = 'table' AND name LIKE 'bravo_%' ORDER BY name"
);
console.log("bravo tables:", tables.rows.map((r) => r.name).join(", "));
db.close();
