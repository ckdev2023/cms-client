-- 008_portal_rls rollback: 移除 Portal 域表 RLS 策略

drop policy if exists org_isolation on user_documents;
alter table user_documents no force row level security;
alter table user_documents disable row level security;

drop policy if exists org_isolation on messages;
alter table messages no force row level security;
alter table messages disable row level security;

drop policy if exists org_isolation on conversations;
alter table conversations no force row level security;
alter table conversations disable row level security;

drop policy if exists org_isolation on leads;
alter table leads no force row level security;
alter table leads disable row level security;
