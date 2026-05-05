-- 048_document_templates: 文书模板表（产品文档 §3.14）

-- ============================================================
-- 1. document_templates 表
-- ============================================================
create table if not exists document_templates (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id),
  template_name text not null,
  case_type text not null,
  doc_type text not null,
  language text not null default 'ja',
  version_no int not null default 1,
  content_body text not null default '',
  variables_schema jsonb not null default '{}'::jsonb,
  active_flag boolean not null default true,
  created_by uuid references users(id),
  updated_by uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- 2. 唯一约束（同名 × 案件类型 × 文书类型 × 语言 × 版本号）
-- ============================================================
create unique index if not exists uq_document_templates_identity
  on document_templates(org_id, template_name, case_type, doc_type, language, version_no);

-- ============================================================
-- 3. 索引
-- ============================================================
create index if not exists idx_document_templates_org_case_active
  on document_templates(org_id, case_type, active_flag);

create index if not exists idx_document_templates_org_name
  on document_templates(org_id, template_name);

-- ============================================================
-- 4. RLS（org_isolation，与 generated_documents 同款）
-- ============================================================
alter table document_templates enable row level security;
alter table document_templates force row level security;

drop policy if exists org_isolation on document_templates;
create policy org_isolation on document_templates
  using (org_id = app_current_org_id())
  with check (org_id = app_current_org_id());
