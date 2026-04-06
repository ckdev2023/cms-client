-- 008_portal_rls: Portal 域表 RLS 策略
-- leads 使用 assigned_org_id 隔离（未分配前 org_id 为空）
-- conversations / messages / user_documents 使用标准 org_id 隔离
-- app_users / intake_forms 不启用 RLS
-- FORCE: 即使应用连接角色是表 owner 也强制受 RLS 约束

alter table leads enable row level security;
alter table leads force row level security;
drop policy if exists org_isolation on leads;
create policy org_isolation on leads
  using (assigned_org_id = app_current_org_id())
  with check (assigned_org_id = app_current_org_id());

alter table conversations enable row level security;
alter table conversations force row level security;
drop policy if exists org_isolation on conversations;
create policy org_isolation on conversations
  using (org_id = app_current_org_id())
  with check (org_id = app_current_org_id());

alter table messages enable row level security;
alter table messages force row level security;
drop policy if exists org_isolation on messages;
create policy org_isolation on messages
  using (org_id = app_current_org_id())
  with check (org_id = app_current_org_id());

alter table user_documents enable row level security;
alter table user_documents force row level security;
drop policy if exists org_isolation on user_documents;
create policy org_isolation on user_documents
  using (org_id = app_current_org_id())
  with check (org_id = app_current_org_id());
