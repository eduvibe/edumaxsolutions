// READ-ONLY preflight for the Bravo Turso database. Run it BEFORE `npm run db:migrate`.
// It never writes. It prints migration/schema facts and row counts only: no emails, tokens, keys or URLs.
//
// Usage:  npm run db:preflight
// Exit codes: 0 = pending migrations pass known safety checks; 2 = reconciliation/manual review needed;
//             1 = database configuration or read-only inspection failed.
import dotenv from "dotenv";
// Next.js convention: .env.local first (git-ignored, per-developer), then .env.
dotenv.config({ path: ".env.local" });
dotenv.config();
import { createClient } from "@libsql/client";
import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { inspectMockScoreProfileMigration } from "./bravo-migration-preflight-state.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(here, "..", "db", "migrations");
const url = process.env.TURSO_DATABASE_URL?.trim();
const authToken = process.env.TURSO_AUTH_TOKEN?.trim() || undefined;
if (!url) {
  console.error("TURSO_DATABASE_URL is not set");
  process.exit(1);
}

const db = createClient({ url, authToken });
const files = readdirSync(migrationsDir).filter((file) => file.endsWith(".sql")).sort();
const tables = new Set((await db.execute("SELECT name FROM sqlite_master WHERE type = 'table'")).rows.map((row) => String(row.name)));

const ledger = new Map();
if (tables.has("schema_migrations")) {
  for (const row of (await db.execute("SELECT version, applied_at FROM schema_migrations")).rows) {
    ledger.set(String(row.version), String(row.applied_at));
  }
}
const pending = files.filter((file) => !ledger.has(file));
const columnNames = async (table) => tables.has(table)
  ? (await db.execute(`PRAGMA table_info(${table})`)).rows.map((row) => String(row.name))
  : [];
const orderColumns = await columnNames("bravo_orders");
const scoreColumns = await columnNames("bravo_mock_scores");
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
for (const file of files) console.log(`  ledger ${ledger.has(file) ? "RECORDED    " : "NOT RECORDED"}  ${file}`);
console.log("pending migrations:", pending.length ? pending.join(", ") : "(none)");
console.log("bravo tables present:", [...tables].filter((table) => table.startsWith("bravo_")).sort().join(", ") || "(none)");
console.log("bravo_orders columns:", orderColumns.join(", ") || "(table missing)");
console.log("bravo_orders has edition_year column:", orderColumns.includes("edition_year"));
console.log("bravo_orders has email_source column:", orderColumns.includes("email_source"));
console.log("email_source CHECK present in table SQL:", /email_source[^,]*CHECK/i.test(orderSql));
console.log("bravo_mock_scores columns:", scoreColumns.join(", ") || "(table missing)");
console.log("row counts (no personal data):", counts ? JSON.stringify(counts) : "(no bravo_orders table)");

const problems = [];
const hasPending = (prefix) => pending.some((file) => file.startsWith(prefix));
const baseMigrationsPending = hasPending("0004");

for (const file of pending) {
  if (file.startsWith("0001") && tables.has("bravo_orders")) {
    console.log(`note: ${file} is idempotent (IF NOT EXISTS); it can be re-applied safely.`);
  }
  if (file.startsWith("0002")) {
    if (orderColumns.includes("edition_year")) {
      problems.push(`${file}: edition_year already exists but is not recorded; reconciliation is required.`);
    } else if (!tables.has("bravo_orders") && !hasPending("0001")) {
      problems.push(`${file}: bravo_orders is missing and 0001 is not pending; manual review is required.`);
    }
  }
  if (file.startsWith("0003")) {
    if (orderColumns.includes("email_source")) {
      problems.push(`${file}: email_source already exists but is not recorded; reconciliation is required.`);
    } else if (!tables.has("bravo_orders") && !hasPending("0001")) {
      problems.push(`${file}: bravo_orders is missing and 0001 is not pending; manual review is required.`);
    }
  }
  if (file.startsWith("0006")) {
    if (!tables.has("bravo_mock_scores")) {
      if (!baseMigrationsPending) problems.push(`${file}: bravo_mock_scores is missing and 0004 is not pending; manual review is required.`);
    } else {
      const duplicateGroups = await count(`SELECT COUNT(*) AS n FROM (
        SELECT event_id, product_id FROM bravo_mock_scores GROUP BY event_id, product_id HAVING COUNT(*) > 1
      )`);
      console.log("duplicate (event_id, product_id) score groups:", duplicateGroups);
      if (duplicateGroups > 0) problems.push(`${file}: duplicate score groups prevent creation of its unique index.`);
    }
  }
}

const profileMigrationFile = files.find((file) => file.startsWith("0007_bravo_mock_score_profile"));
if (profileMigrationFile) {
  const profileState = inspectMockScoreProfileMigration({
    recorded: ledger.has(profileMigrationFile),
    tableExists: tables.has("bravo_mock_scores"),
    columns: scoreColumns,
    baseMigrationPending,
  });
  console.log(`0007 profile columns: ${profileState.presentColumns.length}/5 present; absent: ${profileState.absentColumns.join(", ") || "(none)"}`);
  console.log(`0007 profile migration status: ${profileState.status}`);
  if (profileState.status === "reconciliation") {
    problems.push(profileState.presentColumns.length === 5
      ? `${profileMigrationFile}: all five columns exist but the migration is unrecorded; reconcile only after verification (do not edit the ledger automatically).`
      : `${profileMigrationFile}: the ledger records the migration but profile columns are missing; manual reconciliation is required.`);
  } else if (profileState.status === "manual_review") {
    problems.push(`${profileMigrationFile}: only some profile columns exist, or the base score table is inconsistent; stop for manual review.`);
  } else if (profileState.status === "safe_to_apply") {
    console.log(`${profileMigrationFile}: all five columns are absent and the migration is pending; safe to apply after reviewing the entire pending list.`);
  }
}

if (problems.length) {
  console.log("\nSTOP — reconciliation/manual review required before db:migrate:");
  for (const problem of problems) console.log("  - " + problem);
  db.close();
  process.exit(2);
}
console.log(pending.length
  ? `\nKnown safety checks passed for the full pending list: ${pending.join(", ")}`
  : "\nAll migration files are recorded. Nothing to apply.");
db.close();
