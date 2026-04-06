-- 009_core_entities rollback: 按依赖反序 DROP

-- 10. payment_records
drop table if exists payment_records;

-- 9. billing_records
drop table if exists billing_records;

-- 8. generated_documents
drop table if exists generated_documents;

-- 7. tasks
drop table if exists tasks;

-- 6. communication_logs
drop table if exists communication_logs;

-- 5. document_files
drop table if exists document_files;

-- 4. case_parties
drop table if exists case_parties;

-- 3. ALTER cases —— 撤回新增列
drop index if exists idx_cases_residence_expiry;
drop index if exists idx_cases_org_priority;
drop index if exists idx_cases_org_company;
drop index if exists uq_cases_org_case_no;

alter table cases drop column if exists archived_at;
alter table cases drop column if exists residence_expiry_date;
alter table cases drop column if exists result_date;
alter table cases drop column if exists submission_date;
alter table cases drop column if exists accepted_at;
alter table cases drop column if exists signed_at;
alter table cases drop column if exists source_channel;
alter table cases drop column if exists assistant_user_id;
alter table cases drop column if exists risk_level;
alter table cases drop column if exists priority;
alter table cases drop column if exists company_id;
alter table cases drop column if exists application_type;
alter table cases drop column if exists case_subtype;
alter table cases drop column if exists case_name;
alter table cases drop column if exists case_no;

-- 2. contact_persons
drop table if exists contact_persons;

-- 1. companies
drop table if exists companies;
