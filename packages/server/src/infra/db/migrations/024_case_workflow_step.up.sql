-- 024_case_workflow_step: 案件当前业务子步骤字段
-- P1 CaseWorkflowStep 存储 — Case.stage (S1-S9) 保持不变，
-- current_workflow_step_code 记录经营管理签等 P1 模板的当前业务细步骤。
-- P0 案件此列为 null（降级运行）。

alter table cases
  add column if not exists current_workflow_step_code text;

comment on column cases.current_workflow_step_code is
  'P1 当前业务子步骤编码（如 WAITING_MATERIAL）；P0 案件为 null。不回写 Case.stage。';

create index if not exists idx_cases_workflow_step
  on cases(org_id, current_workflow_step_code)
  where current_workflow_step_code is not null;
