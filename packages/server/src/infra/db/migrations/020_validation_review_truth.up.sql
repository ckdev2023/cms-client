CREATE TABLE IF NOT EXISTS validation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id),
  case_id uuid NOT NULL REFERENCES cases(id),
  ruleset_ref jsonb,
  result_status text NOT NULL DEFAULT 'pending',
  blocking_count int NOT NULL DEFAULT 0,
  warning_count int NOT NULL DEFAULT 0,
  report_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  executed_by uuid REFERENCES users(id),
  executed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_validation_runs_result_status
    CHECK (result_status IN ('pending', 'failed', 'passed'))
);

CREATE INDEX IF NOT EXISTS idx_validation_runs_org_id
  ON validation_runs(org_id);

CREATE INDEX IF NOT EXISTS idx_validation_runs_case_id
  ON validation_runs(case_id, executed_at DESC);

CREATE INDEX IF NOT EXISTS idx_validation_runs_executed_by
  ON validation_runs(executed_by);

CREATE TABLE IF NOT EXISTS review_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id),
  case_id uuid NOT NULL REFERENCES cases(id),
  validation_run_id uuid NOT NULL REFERENCES validation_runs(id),
  decision text NOT NULL,
  comment text,
  reviewer_user_id uuid REFERENCES users(id),
  reviewed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_review_records_decision
    CHECK (decision IN ('approved', 'rejected'))
);

CREATE INDEX IF NOT EXISTS idx_review_records_org_id
  ON review_records(org_id);

CREATE INDEX IF NOT EXISTS idx_review_records_case_id
  ON review_records(case_id, reviewed_at DESC);

CREATE INDEX IF NOT EXISTS idx_review_records_validation_run_id
  ON review_records(validation_run_id);

CREATE INDEX IF NOT EXISTS idx_review_records_reviewer_user_id
  ON review_records(reviewer_user_id);

ALTER TABLE submission_packages
  ADD CONSTRAINT fk_submission_packages_validation_run
  FOREIGN KEY (validation_run_id) REFERENCES validation_runs(id);

ALTER TABLE submission_packages
  ADD CONSTRAINT fk_submission_packages_review_record
  FOREIGN KEY (review_record_id) REFERENCES review_records(id);

CREATE INDEX IF NOT EXISTS idx_submission_packages_validation_run_id
  ON submission_packages(validation_run_id);

CREATE INDEX IF NOT EXISTS idx_submission_packages_review_record_id
  ON submission_packages(review_record_id);

ALTER TABLE validation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE validation_runs FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS org_isolation ON validation_runs;
CREATE POLICY org_isolation ON validation_runs
  USING (org_id = app_current_org_id())
  WITH CHECK (org_id = app_current_org_id());

ALTER TABLE review_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_records FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS org_isolation ON review_records;
CREATE POLICY org_isolation ON review_records
  USING (org_id = app_current_org_id())
  WITH CHECK (org_id = app_current_org_id());