// READ-ONLY full backup of the Bravo Turso database to a JSON file OUTSIDE the repo.
// Usage: node --env-file=.env.local scripts/bravo-backup.mjs
// Output folder: BACKUP_DIR env var, or ../bravo-backups (outside the repo). The file holds personal data and
// key material. Keep it private and do not commit it.
import { createClient } from "@libsql/client";
import { mkdirSync, writeFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const url = process.env.TURSO_DATABASE_URL?.trim();
const authToken = process.env.TURSO_AUTH_TOKEN?.trim() || undefined;
if (!url) {
  console.error("TURSO_DATABASE_URL is not set");
  process.exit(1);
}
const outDir = resolve(process.env.BACKUP_DIR?.trim() || join(here, "..", "..", "bravo-backups"));
mkdirSync(outDir, { recursive: true });

const db = createClient({ url, authToken });
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const schema = (await db.execute("SELECT type, name, tbl_name, sql FROM sqlite_master WHERE sql IS NOT NULL ORDER BY type, name")).rows;
const tables = schema.filter((r) => r.type === "table" && !String(r.name).startsWith("sqlite_"));
const data = {};
const rowCounts = {};
for (const t of tables) {
  const rows = (await db.execute(`SELECT * FROM "${String(t.name).replace(/"/g, '""')}"`)).rows;
  data[t.name] = rows.map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, typeof v === "bigint" ? v.toString() : v])));
  rowCounts[t.name] = rows.length;
}
const file = join(outDir, `bravo-backup-${stamp}.json`);
writeFileSync(file, JSON.stringify({ takenAt: new Date().toISOString(), schema, data }, null, 2));
console.log("backup written:", file, `(${statSync(file).size} bytes)`);
console.log("row counts:", JSON.stringify(rowCounts));
db.close();
