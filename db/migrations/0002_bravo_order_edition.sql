-- Record the Bravo edition each order was sold for, at creation time.
-- The activation key is signed with this value, not with the current BRAVO_EDITION_YEAR,
-- so changing the environment variable cannot change keys for orders already placed.
-- Existing rows (none in production yet) stay NULL; key issuance refuses NULL.
ALTER TABLE bravo_orders ADD COLUMN edition_year INTEGER
  CHECK (edition_year IS NULL OR edition_year BETWEEN 2000 AND 2100);
