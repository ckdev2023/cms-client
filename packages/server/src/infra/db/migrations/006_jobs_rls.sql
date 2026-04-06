alter table jobs enable row level security;
drop policy if exists org_isolation on jobs;
create policy org_isolation on jobs
  using (org_id = app_current_org_id())
  with check (org_id = app_current_org_id());
