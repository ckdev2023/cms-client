-- 023_case_templates: 案件模板表
-- 对应 P0 数据模型设计 §3.8（CaseTemplate）
-- P0 两类预置模板 workflow_steps_blueprint / extra_fields_schema / reminder_schedule_blueprint 为 null（降级运行）。
-- P1 经营管理签模板填充 blueprint 字段后启用业务子步骤。

create table if not exists case_templates (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id),
  template_name text not null,
  case_type text not null,
  application_type text,
  requirement_blueprint jsonb,
  default_tasks_blueprint jsonb,
  validation_ruleset_ref jsonb,
  review_required_flag boolean not null default false,
  billing_gate_mode text not null default 'warn',
  workflow_steps_blueprint jsonb,
  extra_fields_schema jsonb,
  reminder_schedule_blueprint jsonb,
  active_flag boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_case_templates_org
  on case_templates(org_id);
create index if not exists idx_case_templates_case_type
  on case_templates(org_id, case_type);

-- RLS
alter table case_templates enable row level security;
alter table case_templates force row level security;
drop policy if exists org_isolation on case_templates;
create policy org_isolation on case_templates
  using (org_id = app_current_org_id())
  with check (org_id = app_current_org_id());
