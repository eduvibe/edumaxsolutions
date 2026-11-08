-- Bravo student reports and central mock events (Turso / libSQL).
-- Apply with:  npm run db:migrate   (reads TURSO_DATABASE_URL / TURSO_AUTH_TOKEN from env)
-- Idempotent: every statement uses IF NOT EXISTS.

-- Student question reports and general feedback.
-- The client-supplied report id is the primary key, so a retried submission is idempotent (INSERT OR IGNORE).
-- Question reports store only a stable reference (no stem/options/answer/explanation/passage/image).
-- general_feedback is the only category that may carry a free-text message.
CREATE TABLE IF NOT EXISTS bravo_reports (
  id           TEXT PRIMARY KEY,
  category     TEXT NOT NULL CHECK (category IN (
                 'incorrect_answer', 'question_issue', 'incomplete_question',
                 'diagram_issue', 'general_feedback'
               )),
  product_id   TEXT NOT NULL,
  app_version  TEXT NOT NULL,
  -- Question reference (NULL for general_feedback).
  exam_id      TEXT,
  subject_id   TEXT,
  question_id  TEXT,
  year         TEXT,
  model        TEXT,
  -- Free text, only for general_feedback (max 1000 chars enforced by the app).
  message      TEXT,
  status       TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  created_at   TEXT NOT NULL,   -- client-supplied createdAt (ISO 8601)
  received_at  TEXT NOT NULL,   -- server-side receipt time
  resolved_at  TEXT
);

CREATE INDEX IF NOT EXISTS bravo_reports_status_idx ON bravo_reports (status, received_at);

-- Central mock events. One active event at a time (enforced by the app: creating ends any prior active event).
CREATE TABLE IF NOT EXISTS bravo_mock_events (
  id                TEXT PRIMARY KEY,
  title             TEXT NOT NULL,
  exam_id           TEXT NOT NULL,
  subject_ids       TEXT,          -- JSON array of subject ids
  count_per_subject INTEGER,
  duration_min      INTEGER NOT NULL CHECK (duration_min > 0),
  edition_year      INTEGER NOT NULL,
  seed              TEXT NOT NULL,
  starts_at         TEXT NOT NULL, -- ISO 8601; starts before this are blocked
  close_at          TEXT NOT NULL, -- ISO 8601; hard cutoff for starts and active attempts
  status            TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended')),
  created_at        TEXT NOT NULL,
  ended_at          TEXT,
  CHECK (close_at > starts_at)
);

CREATE INDEX IF NOT EXISTS bravo_mock_events_status_idx ON bravo_mock_events (status, created_at);

-- Mock scores, tied to an event and a verified Product ID (signed scoreClaim checks licence eligibility server-side).
-- started_at/ended_at are the validated attempt window; submission may arrive later (offline queue),
-- but only when started_at < close_at AND ended_at <= close_at.
CREATE TABLE IF NOT EXISTS bravo_mock_scores (
  id           TEXT PRIMARY KEY,
  event_id     TEXT NOT NULL REFERENCES bravo_mock_events (id),
  product_id   TEXT NOT NULL,
  score        INTEGER NOT NULL CHECK (score >= 0),
  total        INTEGER NOT NULL CHECK (total > 0 AND score <= total),
  started_at   TEXT NOT NULL,
  ended_at     TEXT NOT NULL,
  submitted_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS bravo_mock_scores_event_idx ON bravo_mock_scores (event_id, score DESC);
CREATE INDEX IF NOT EXISTS bravo_mock_scores_product_idx ON bravo_mock_scores (event_id, product_id);
