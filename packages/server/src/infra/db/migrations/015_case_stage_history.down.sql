-- 015_case_stage_history rollback

DROP POLICY IF EXISTS case_stage_history_tenant_isolation ON case_stage_history;
DROP INDEX IF EXISTS idx_case_stage_history_org;
DROP INDEX IF EXISTS idx_case_stage_history_case;
DROP TABLE IF EXISTS case_stage_history;
