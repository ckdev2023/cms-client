-- 010_core_entities_rls: 新增核心实体表 RLS 策略
-- 所有新表均含 org_id，统一使用 app_current_org_id() 隔离

alter table companies enable row level security;
alter table companies force row level security;
drop policy if exists org_isolation on companies;
create policy org_isolation on companies
  using (org_id = app_current_org_id())
  with check (org_id = app_current_org_id());

alter table contact_persons enable row level security;
alter table contact_persons force row level security;
drop policy if exists org_isolation on contact_persons;
create policy org_isolation on contact_persons
  using (org_id = app_current_org_id())
  with check (org_id = app_current_org_id());

alter table case_parties enable row level security;
alter table case_parties force row level security;
drop policy if exists org_isolation on case_parties;
create policy org_isolation on case_parties
  using (org_id = app_current_org_id())
  with check (org_id = app_current_org_id());

alter table document_files enable row level security;
alter table document_files force row level security;
drop policy if exists org_isolation on document_files;
create policy org_isolation on document_files
  using (org_id = app_current_org_id())
  with check (org_id = app_current_org_id());

alter table communication_logs enable row level security;
alter table communication_logs force row level security;
drop policy if exists org_isolation on communication_logs;
create policy org_isolation on communication_logs
  using (org_id = app_current_org_id())
  with check (org_id = app_current_org_id());

alter table tasks enable row level security;
alter table tasks force row level security;
drop policy if exists org_isolation on tasks;
create policy org_isolation on tasks
  using (org_id = app_current_org_id())
  with check (org_id = app_current_org_id());

alter table generated_documents enable row level security;
alter table generated_documents force row level security;
drop policy if exists org_isolation on generated_documents;
create policy org_isolation on generated_documents
  using (org_id = app_current_org_id())
  with check (org_id = app_current_org_id());

alter table billing_records enable row level security;
alter table billing_records force row level security;
drop policy if exists org_isolation on billing_records;
create policy org_isolation on billing_records
  using (org_id = app_current_org_id())
  with check (org_id = app_current_org_id());

alter table payment_records enable row level security;
alter table payment_records force row level security;
drop policy if exists org_isolation on payment_records;
create policy org_isolation on payment_records
  using (org_id = app_current_org_id())
  with check (org_id = app_current_org_id());
