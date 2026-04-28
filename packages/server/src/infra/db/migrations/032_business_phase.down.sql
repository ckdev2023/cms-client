-- 032_business_phase (down)
drop index if exists idx_cases_business_phase;
alter table cases drop column if exists business_phase;
