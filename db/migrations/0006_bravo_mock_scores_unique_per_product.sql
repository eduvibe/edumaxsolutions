-- One accepted score per (mock event, product id) so client retries are idempotent.
-- Apply with:  npm run db:migrate
CREATE UNIQUE INDEX IF NOT EXISTS bravo_mock_scores_event_product_uidx
  ON bravo_mock_scores (event_id, product_id);
