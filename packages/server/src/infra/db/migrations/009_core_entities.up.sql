-- 009_core_entities: 补全核心业务实体表（产品文档 06 数据模型）

-- ============================================================
-- 1. companies（企业客户）—— 文档 §3.2
-- ============================================================
create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id),
  company_no text,
  company_name text not null,
  corporate_number text,
  established_date date,
  capital_amount numeric(15,2),
  address text,
  business_scope text,
  employee_count int,
  fiscal_year_end text,
  website text,
  contact_phone text,
  contact_email text,
  owner_user_id uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_companies_org on companies(org_id);
create unique index if not exists uq_companies_org_no on companies(org_id, company_no) where company_no is not null;

-- ============================================================
-- 2. contact_persons（联系人/关联人）—— 文档 §3.3
-- ============================================================
create table if not exists contact_persons (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id),
  company_id uuid references companies(id),
  customer_id uuid references customers(id),
  name text not null,
  role_title text,
  relation_type text,
  phone text,
  email text,
  preferred_language text not null default 'ja',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_contact_persons_org on contact_persons(org_id);
create index if not exists idx_contact_persons_company on contact_persons(company_id) where company_id is not null;
create index if not exists idx_contact_persons_customer on contact_persons(customer_id) where customer_id is not null;

-- ============================================================
-- 3. ALTER cases —— 补充缺失字段（文档 §3.4）
-- ============================================================
alter table cases add column if not exists case_no text;
alter table cases add column if not exists case_name text;
alter table cases add column if not exists case_subtype text;
alter table cases add column if not exists application_type text;
alter table cases add column if not exists company_id uuid references companies(id);
alter table cases add column if not exists priority text not null default 'normal';
alter table cases add column if not exists risk_level text not null default 'low';
alter table cases add column if not exists assistant_user_id uuid references users(id);
alter table cases add column if not exists source_channel text;
alter table cases add column if not exists signed_at timestamptz;
alter table cases add column if not exists accepted_at timestamptz;
alter table cases add column if not exists submission_date date;
alter table cases add column if not exists result_date date;
alter table cases add column if not exists residence_expiry_date date;
alter table cases add column if not exists archived_at timestamptz;

create unique index if not exists uq_cases_org_case_no on cases(org_id, case_no) where case_no is not null;
create index if not exists idx_cases_org_company on cases(org_id, company_id) where company_id is not null;
create index if not exists idx_cases_org_priority on cases(org_id, priority);
create index if not exists idx_cases_residence_expiry on cases(org_id, residence_expiry_date) where residence_expiry_date is not null;

-- ============================================================
-- 4. case_parties（案件关联人）—— 文档 §3.5
-- ============================================================
create table if not exists case_parties (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id),
  case_id uuid not null references cases(id),
  party_type text not null,
  customer_id uuid references customers(id),
  contact_person_id uuid references contact_persons(id),
  relation_to_case text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_case_parties_case on case_parties(case_id);
create index if not exists idx_case_parties_org on case_parties(org_id);

-- ============================================================
-- 5. document_files（资料文件/多版本）—— 文档 §3.7
-- ============================================================
create table if not exists document_files (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id),
  requirement_id uuid not null references document_items(id),
  file_name text not null,
  file_url text not null,
  file_type text,
  file_size bigint,
  version_no int not null default 1,
  uploaded_by uuid references users(id),
  uploaded_at timestamptz not null default now(),
  review_status text not null default 'pending',
  review_by uuid references users(id),
  review_at timestamptz,
  expiry_date date,
  hash_value text,
  created_at timestamptz not null default now()
);
create index if not exists idx_document_files_requirement on document_files(requirement_id, version_no desc);
create index if not exists idx_document_files_org on document_files(org_id);

-- ============================================================
-- 6. communication_logs（沟通记录）—— 文档 §3.8
-- ============================================================
create table if not exists communication_logs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id),
  case_id uuid references cases(id),
  customer_id uuid references customers(id),
  company_id uuid references companies(id),
  channel_type text not null,
  direction text not null default 'inbound',
  subject text,
  content_summary text,
  full_content text,
  visible_to_client boolean not null default false,
  created_by uuid references users(id),
  follow_up_required boolean not null default false,
  follow_up_due_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_communication_logs_case on communication_logs(case_id, created_at desc) where case_id is not null;
create index if not exists idx_communication_logs_org on communication_logs(org_id, created_at desc);
create index if not exists idx_communication_logs_follow_up on communication_logs(org_id, follow_up_due_at) where follow_up_required = true;

-- ============================================================
-- 7. tasks（任务）—— 文档 §3.9
-- ============================================================
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id),
  case_id uuid references cases(id),
  title text not null,
  description text,
  task_type text not null default 'general',
  assignee_user_id uuid references users(id),
  priority text not null default 'normal',
  due_at timestamptz,
  status text not null default 'pending',
  source_type text,
  source_id uuid,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_tasks_case on tasks(case_id) where case_id is not null;
create index if not exists idx_tasks_org_status on tasks(org_id, status);
create index if not exists idx_tasks_assignee_status on tasks(assignee_user_id, status) where assignee_user_id is not null;
create index if not exists idx_tasks_org_due on tasks(org_id, due_at) where due_at is not null;

-- ============================================================
-- 8. generated_documents（生成文书）—— 文档 §3.11
-- ============================================================
create table if not exists generated_documents (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id),
  case_id uuid not null references cases(id),
  template_id uuid,
  title text not null,
  version_no int not null default 1,
  output_format text not null default 'pdf',
  file_url text,
  status text not null default 'draft',
  generated_by uuid references users(id),
  approved_by uuid references users(id),
  generated_at timestamptz not null default now(),
  approved_at timestamptz
);
create index if not exists idx_generated_documents_case on generated_documents(case_id);
create index if not exists idx_generated_documents_org on generated_documents(org_id);

-- ============================================================
-- 9. billing_records（收费计划）—— 文档 §3.13
-- ============================================================
create table if not exists billing_records (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id),
  case_id uuid not null references cases(id),
  billing_type text not null default 'standard',
  milestone_name text,
  amount_due numeric(15,2) not null default 0,
  due_date date,
  status text not null default 'unquoted',
  invoice_status text not null default 'none',
  remark text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_billing_records_case on billing_records(case_id);
create index if not exists idx_billing_records_org_status on billing_records(org_id, status);

-- ============================================================
-- 10. payment_records（回款记录）—— 文档 §3.14
-- ============================================================
create table if not exists payment_records (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id),
  billing_record_id uuid not null references billing_records(id),
  case_id uuid not null references cases(id),
  amount_received numeric(15,2) not null,
  received_at timestamptz not null,
  payment_method text,
  receipt_file_url text,
  recorded_by uuid references users(id),
  created_at timestamptz not null default now()
);
create index if not exists idx_payment_records_billing on payment_records(billing_record_id);
create index if not exists idx_payment_records_case on payment_records(case_id);
create index if not exists idx_payment_records_org on payment_records(org_id);
