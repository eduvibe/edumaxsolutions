// READ-ONLY preflight for the Bravo Turso database. Run it BEFORE `npm run db:migrate` against Production.
// It never writes. It prints ledger and schema facts and counts only: no emails, tokens, keys or URLs.
//
// Usage:  TURSO_DATABASE_URL=... TURSO_AUTH_TOKEN=... node scripts/bravo-migration-preflight.mjs
// Exit codes: 0 = ledger and schema consistent with the migration files; 2 = reconciliation needed before db:migrate;
//             1 = could not run the check.
import { createClient } from "@libsql/client";
import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(here, "..", "db", "migrations");
const url = process.env.TURSO_DATABASE_URL?.trim();
const authToken = process.env.TURSO_AUTH_TOKEN?.trim() || undefined;
if (!url) {
  console.error("TURSO_DATABASE_URL is not set");
  process.exit(1);
}

const db = createClient({ url, authToken });
const files = readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();
const tables = new Set((await db.execute("SELECT name FROM sqlite_master WHERE type = 'table'")).rows.map((r) => String(r.name)));

const ledger = new Map();
if (tables.has("schema_migrations")) {
  for (const row of (await db.execute("SELECT version, applied_at FROM schema_migrations")).rows) {
    ledger.set(String(row.version), String(row.applied_at));
  }
}

const orderColumns = tables.has("bravo_orders")
  ? (await db.execute("PRAGMA table_info(bravo_orders)")).rows.map((r) => String(r.name))
  : [];
const orderSql = tables.has("bravo_orders")
  ? String((await db.execute("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'bravo_orders'")).rows[0]?.sql ?? "")
  : "";

const count = async (sql) => Number((await db.execute(sql)).rows[0]?.n ?? 0);
const counts = tables.has("bravo_orders")
  ? {
      orders: await count("SELECT COUNT(*) AS n FROM bravo_orders"),
      fulfilled: await count("SELECT COUNT(*) AS n FROM bravo_orders WHERE status = 'fulfilled'"),
      paid: await count("SELECT COUNT(*) AS n FROM bravo_orders WHERE status = 'paid'"),
      needsReview: await count("SELECT COUNT(*) AS n FROM bravo_orders WHERE status = 'needs_review'"),
      pendingPayment: await count("SELECT COUNT(*) AS n FROM bravo_orders WHERE status = 'pending_payment'"),
      keys: tables.has("bravo_issued_keys") ? await count("SELECT COUNT(*) AS n FROM bravo_issued_keys") : null,
      paymentEvents: tables.has("bravo_payment_events") ? await count("SELECT COUNT(*) AS n FROM bravo_payment_events") : null,
    }
  : null;

console.log("schema_migrations:", tables.has("schema_migrations") ? `${ledger.size} row(s)` : "table missing");
for (const file of files) {
  console.log(`  ledger ${ledger.has(file) ? "RECORDED    " : "NOT RECORDED"}  ${file}`);
}
console.log("bravo tables present:", [...tables].filter((t) => t.startsWith("bravo_")).sort().join(", ") || "(none)");
console.log("bravo_orders columns:", orderColumns.join(", ") || "(table missing)");
console.log("bravo_orders has edition_year column:", orderColumns.includes("edition_year"));
console.log("bravo_orders has email_source column:", orderColumns.includes("email_source"));
console.log("email_source CHECK present in table SQL:", /email_source[^,]*CHECK/i.test(orderSql));
console.log("row counts (no personal data):", counts ? JSON.stringify(counts) : "(no bravo_orders table)");

// What `npm run db:migrate` would do, and whether it would fail on an ALTER TABLE that already took effect.
const problems = [];
for (const file of files) {
  if (ledger.has(file)) continue;
  if (file.startsWith("0002") && orderColumns.includes("edition_year")) {
    problems.push(`${file}: edition_year already exists but is not recorded. db:migrate would fail. Verify, then record it.`);
  }
  if (file.startsWith("0003") && orderColumns.includes("email_source")) {
    problems.push(`${file}: email_source already exists but is not recorded. db:migrate would fail. Verify, then record it.`);
  }
  if (file.startsWith("0001") && tables.has("bravo_orders") && !ledger.has(file)) {
    console.log(`note: ${file} is idempotent (IF NOT EXISTS), so db:migrate can re-apply it safely.`);
  }
}
const pending = files.filter((f) => !ledger.has(f));
if (problems.length) {
  console.log("\nRECONCILIATION NEEDED before db:migrate:");
  for (const p of problems) console.log("  - " + p);
  process.exit(2);
}
console.log(pending.length ? `\nSafe to run db:migrate. Pending: ${pending.join(", ")}` : "\nAll migration files are recorded. Nothing to apply.");
db.close();
