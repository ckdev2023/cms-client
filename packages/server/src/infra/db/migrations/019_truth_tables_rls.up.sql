-- 019_truth_tables_rls: 为 013 / 017 新增真值表补齐 RLS

alter table residence_periods enable row level security;
alter table residence_periods force row level security;
drop policy if exists org_isolation on residence_periods;
create policy org_isolation on residence_periods
  using (org_id = app_current_org_id())
  with check (org_id = app_current_org_id());

alter table document_assets enable row level security;
alter table document_assets force row level security;
drop policy if exists org_isolation on document_assets;
create policy org_isolation on document_assets
  using (org_id = app_current_org_id())
  with check (org_id = app_current_org_id());

alter table document_requirement_file_refs enable row level security;
alter table document_requirement_file_refs force row level security;
drop policy if exists org_isolation on document_requirement_file_refs;
create policy org_isolation on document_requirement_file_refs
  using (
    exists (
      select 1
      from document_items di
      where di.id = requirement_id
        and di.org_id = app_current_org_id()
    )
  )
  with check (
    exists (
      select 1
      from document_items di
      where di.id = requirement_id
        and di.org_id = app_current_org_id()
    )
  );

alter table submission_packages enable row level security;
alter table submission_packages force row level security;
drop policy if exists org_isolation on submission_packages;
create policy org_isolation on submission_packages
  using (org_id = app_current_org_id())
  with check (org_id = app_current_org_id());

alter table submission_package_items enable row level security;
alter table submission_package_items force row level security;
drop policy if exists org_isolation on submission_package_items;
create policy org_isolation on submission_package_items
  using (
    exists (
      select 1
      from submission_packages sp
      where sp.id = submission_package_id
        and sp.org_id = app_current_org_id()
    )
  )
  with check (
    exists (
      select 1
      from submission_packages sp
      where sp.id = submission_package_id
        and sp.org_id = app_current_org_id()
    )
  );