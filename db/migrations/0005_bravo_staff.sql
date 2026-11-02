-- Bravo staff accounts for the console (Turso / libSQL). Independent of the Edumax
-- learning platform's Supabase users/roles.
-- Apply with:  npm run db:migrate   (reads TURSO_DATABASE_URL / TURSO_AUTH_TOKEN from env)
-- Idempotent: every statement uses IF NOT EXISTS.

-- One row per staff member. Only the SHA-256 hash of the staff token is stored;
-- the plaintext token is shown once at creation and never stored.
CREATE TABLE IF NOT EXISTS bravo_staff (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 80),
  token_hash  TEXT NOT NULL UNIQUE CHECK (length(token_hash) = 64),  -- SHA-256 hex
  permissions TEXT NOT NULL,      -- JSON array, e.g. ["mock_manage","reports_review","reports_export"]
  active      INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at  TEXT NOT NULL,
  revoked_at  TEXT
);

CREATE INDEX IF NOT EXISTS bravo_staff_active_idx ON bravo_staff (active);
