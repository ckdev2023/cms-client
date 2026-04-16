DROP POLICY IF EXISTS org_isolation ON review_records;
ALTER TABLE review_records DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS org_isolation ON validation_runs;
ALTER TABLE validation_runs DISABLE ROW LEVEL SECURITY;

DROP INDEX IF EXISTS idx_submission_packages_review_record_id;
DROP INDEX IF EXISTS idx_submission_packages_validation_run_id;

ALTER TABLE submission_packages
  DROP CONSTRAINT IF EXISTS fk_submission_packages_review_record;

ALTER TABLE submission_packages
  DROP CONSTRAINT IF EXISTS fk_submission_packages_validation_run;

DROP TABLE IF EXISTS review_records;
DROP TABLE IF EXISTS validation_runs;