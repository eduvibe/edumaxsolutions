-- Optional candidate profile captured with a mock score (staff-visible only).
-- Apply with:  npm run db:migrate   (reconcile via db:preflight if a column already exists)
ALTER TABLE bravo_mock_scores ADD COLUMN profile_name TEXT;
ALTER TABLE bravo_mock_scores ADD COLUMN profile_email TEXT;
ALTER TABLE bravo_mock_scores ADD COLUMN profile_phone TEXT;
ALTER TABLE bravo_mock_scores ADD COLUMN profile_state TEXT;
ALTER TABLE bravo_mock_scores ADD COLUMN profile_school TEXT;
