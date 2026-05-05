-- 048_document_templates rollback: drop policy → disable rls → drop table

drop policy if exists org_isolation on document_templates;
alter table document_templates disable row level security;

drop table if exists document_templates;
