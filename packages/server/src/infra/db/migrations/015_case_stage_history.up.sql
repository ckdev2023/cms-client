-- 015_case_stage_history: P0 案件阶段变更历史表
-- 记录每次 stage 流转，用于审计与回溯（→ 03 §3.1A, 04 §1.2）

CREATE TABLE IF NOT EXISTS case_stage_history (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES organizations(id),
  case_id     uuid NOT NULL REFERENCES cases(id),
  from_stage  text NOT NULL,
  to_stage    text NOT NULL,
  reason      text,
  changed_by  uuid REFERENCES users(id),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_case_stage_history_case
  ON case_stage_history(case_id, created_at);

CREATE INDEX IF NOT EXISTS idx_case_stage_history_org
  ON case_stage_history(org_id, created_at);

-- RLS: tenant isolation
ALTER TABLE case_stage_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS case_stage_history_tenant_isolation ON case_stage_history;
CREATE POLICY case_stage_history_tenant_isolation ON case_stage_history
  USING (org_id = current_setting('app.current_org_id')::uuid);
