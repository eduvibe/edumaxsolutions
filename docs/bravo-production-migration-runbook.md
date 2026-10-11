# Runbook: Bravo production migration 0003 (`email_source`)

Production already holds real payments. Do not run `npm run db:migrate` blind. Work through this list in order.
Never paste credentials into chat, a commit, or a log. Use the Vercel environment (`vercel env run`) so values
are injected into the command and not written to disk.

## Why this needs care

`db:migrate` applies every file whose name is not in `schema_migrations`. `0002` and `0003` use
`ALTER TABLE ... ADD COLUMN`, which fails with `duplicate column name` when the column already exists but its
ledger row is missing. A failed run also leaves earlier files recorded. The preflight detects both cases.

## 0. Prerequisites

- Vercel CLI linked to the project, logged in with your own account.
- Turso CLI logged in with your own account.
- Deploy order: **migrate first, then deploy the new code.** The new `createPendingOrder` writes `email_source`,
  so orders fail until the column exists. The column is nullable, so the currently deployed code is unaffected.

## 1. Read-only preflight

```bash
vercel env run -e production -- npm run db:preflight
```

- Exit 0 and "Safe to run db:migrate" means go to step 3.
- Exit 2 means a reconciliation is needed. Go to step 2.
- Check the output for `bravo_orders has edition_year column` and `email_source`, and note the row counts
  (`fulfilled`, `paid`, `needs_review`). These must match what you expect before you continue.

## 2. Reconcile (only when preflight exits 2)

Reconcile only a ledger that is missing rows for a column that already exists. Confirm each line the preflight
reports first. Then record the matching version. Each `INSERT` is for one file:

```sql
-- Only if preflight says 0002's column exists and it is not recorded:
INSERT INTO schema_migrations (version, applied_at) VALUES ('0002_bravo_order_edition.sql', '<ISO time>');
-- Only if preflight says 0001 is not recorded and bravo_orders exists with the 0001 columns (0001 is idempotent,
-- so this record is optional; recording it is still correct):
INSERT INTO schema_migrations (version, applied_at) VALUES ('0001_bravo_online_payments.sql', '<ISO time>');
```

Do not record `0003` by hand unless `email_source` already exists and the preflight shows its CHECK
constraint. Re-run the preflight after each change until it exits 0.

## 3. Back up

Take a backup of the Production database immediately before any write. Store it outside Git, encrypted, and
keep it until the deployment is verified.

```bash
turso db shell <production-db-name> .dump > bravo-prod-backup-$(date -u +%Y%m%dT%H%M%SZ).sql
```

Also confirm that Turso point-in-time restore is available for the database. Check the file is non-empty and
contains `CREATE TABLE bravo_orders`. Count rows with the preflight. The counts should match.

## 4. Apply 0003

```bash
vercel env run -e production -- npm run db:migrate
```

Expect `skip` lines for recorded files and `apply 0003_bravo_checkout_email_source.sql`. A failure here
leaves Production unchanged for 0003 (the runner records a file only after it succeeds). Stop and investigate
rather than retrying blindly.

## 5. Verify

```bash
vercel env run -e production -- npm run db:preflight
```

Expect exit 0 and "All migration files are recorded". The output must show `email_source column: true` and
`email_source CHECK present in table SQL: true`. The row counts must be unchanged from step 1. Existing orders
have `email_source = NULL`, which the code treats as locked.

## 6. Deploy

Deploy the new website code after step 5. Then:

- Run the marketing modal and the `/bravo/activate` no-token checks on the live site.
- Do **not** create a real payment for this check. Use the Preview environment with test keys, or only check
  pages that do not charge.
- Watch the Vercel logs for `bravo_signal` and `[bravo]` errors for 30 minutes.
- Confirm that a new order can be created from a test client, then leave it unpaid. Its `email_source` should be
  `creation` when the request carries an email.

## Rollback

- Migration 0003 only adds a nullable column. Rolling back the code is safe without a schema change.
- If the column must be removed, restore from the step 3 backup (SQLite cannot drop a column with a CHECK easily).
  Do this only with a plan and a second backup.
