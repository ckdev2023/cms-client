-- 019_truth_tables_rls rollback

drop policy if exists org_isolation on submission_package_items;
alter table submission_package_items disable row level security;

drop policy if exists org_isolation on submission_packages;
alter table submission_packages disable row level security;

drop policy if exists org_isolation on document_requirement_file_refs;
alter table document_requirement_file_refs disable row level security;

drop policy if exists org_isolation on document_assets;
alter table document_assets disable row level security;

drop policy if exists org_isolation on residence_periods;
alter table residence_periods disable row level security;