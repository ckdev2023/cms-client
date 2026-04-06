-- 010_core_entities_rls rollback: 撤销 RLS 策略

drop policy if exists org_isolation on payment_records;
alter table payment_records disable row level security;

drop policy if exists org_isolation on billing_records;
alter table billing_records disable row level security;

drop policy if exists org_isolation on generated_documents;
alter table generated_documents disable row level security;

drop policy if exists org_isolation on tasks;
alter table tasks disable row level security;

drop policy if exists org_isolation on communication_logs;
alter table communication_logs disable row level security;

drop policy if exists org_isolation on document_files;
alter table document_files disable row level security;

drop policy if exists org_isolation on case_parties;
alter table case_parties disable row level security;

drop policy if exists org_isolation on contact_persons;
alter table contact_persons disable row level security;

drop policy if exists org_isolation on companies;
alter table companies disable row level security;
