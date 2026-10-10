-- Bravo CBT online activation orders (Turso / libSQL).
-- Apply with:  npm run db:migrate   (reads TURSO_DATABASE_URL / TURSO_AUTH_TOKEN from env)
-- Idempotent: every statement uses IF NOT EXISTS.

-- One row per checkout attempt. order_ref is also the Paystack transaction reference,
-- so it is the primary key (globally unique) and is what the webhook/verify path looks up.
CREATE TABLE IF NOT EXISTS bravo_orders (
  order_ref              TEXT PRIMARY KEY CHECK (order_ref GLOB 'BCBT_[0-9A-F][0-9A-F]*' AND length(order_ref) = 29),
  product_id             TEXT NOT NULL CHECK (length(product_id) BETWEEN 9 AND 40),
  plan                   TEXT NOT NULL CHECK (plan IN ('first', 'renewal')),
  -- Server-side price. Pinned per plan so a bad write cannot create a mis-priced order.
  amount_kobo            INTEGER NOT NULL,
  currency               TEXT NOT NULL DEFAULT 'NGN' CHECK (currency = 'NGN'),
  email                  TEXT,
  status                 TEXT NOT NULL DEFAULT 'pending_payment'
                           CHECK (status IN ('pending_payment', 'paid', 'fulfilled', 'needs_review')),
  -- SHA-256 hex of the per-order status token. The raw token is never stored.
  status_token_hash      TEXT NOT NULL CHECK (length(status_token_hash) = 64),
  paystack_access_code   TEXT,
  authorization_url      TEXT,
  -- A Paystack transaction can be attached to at most one order (idempotent payment recording).
  paystack_transaction_id TEXT UNIQUE,
  paid_amount_kobo       INTEGER,
  paid_at                TEXT,
  review_reason          TEXT,
  email_status           TEXT NOT NULL DEFAULT 'not_sent' CHECK (email_status IN ('not_sent', 'sent', 'failed')),
  last_verified_at       TEXT,
  created_at             TEXT NOT NULL,
  updated_at             TEXT NOT NULL,
  CHECK (
    (plan = 'first' AND amount_kobo = 400000) OR
    (plan = 'renewal' AND amount_kobo = 300000)
  )
);

CREATE INDEX IF NOT EXISTS bravo_orders_status_idx ON bravo_orders (status, updated_at);
CREATE INDEX IF NOT EXISTS bravo_orders_email_idx ON bravo_orders (email);

-- At most ONE activation key per order (primary key), and every key string is unique.
-- Keys are inserted with INSERT OR IGNORE so concurrent/retried fulfilment cannot issue twice.
CREATE TABLE IF NOT EXISTS bravo_issued_keys (
  order_ref       TEXT PRIMARY KEY REFERENCES bravo_orders (order_ref),
  product_id      TEXT NOT NULL,
  activation_key  TEXT NOT NULL UNIQUE,
  issued_at       TEXT NOT NULL,
  email_sent_at   TEXT
);

-- Append-only audit trail of webhook deliveries (body hash only, never the raw body or secrets).
CREATE TABLE IF NOT EXISTS bravo_payment_events (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  provider      TEXT NOT NULL DEFAULT 'paystack',
  event_type    TEXT NOT NULL,
  order_ref     TEXT,
  body_sha256   TEXT NOT NULL,
  outcome       TEXT NOT NULL,
  received_at   TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS bravo_payment_events_ref_idx ON bravo_payment_events (order_ref);
