-- Records where an order's email came from, so checkout knows whether the buyer may still change it.
--   'creation': supplied by the Bravo app when the order was created. Locked. Used as-is for Paystack.
--   'checkout': typed by the buyer on the protected checkout page (only when the app sent no email).
--               Changeable only until Paystack checkout has been started.
--   NULL: no email on file (or a row written before this column existed; those are treated as locked).
-- Idempotent through the migration runner (schema_migrations); ALTER TABLE is not repeated.
ALTER TABLE bravo_orders ADD COLUMN email_source TEXT
  CHECK (email_source IS NULL OR email_source IN ('creation', 'checkout'));
