-- 024_case_workflow_step (down)
drop index if exists idx_cases_workflow_step;
alter table cases drop column if exists current_workflow_step_code;
