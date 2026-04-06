alter table template_versions enable row level security;
drop policy if exists org_isolation on template_versions;
create policy org_isolation on template_versions
  using (org_id = app_current_org_id())
  with check (org_id = app_current_org_id());

alter table template_releases enable row level security;
drop policy if exists org_isolation on template_releases;
create policy org_isolation on template_releases
  using (org_id = app_current_org_id())
  with check (org_id = app_current_org_id());
