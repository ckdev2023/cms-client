-- 013_business_manager_visa rollback

-- 2. residence_periods
drop table if exists residence_periods;

-- 1. cases 新增列 & 索引
drop index if exists idx_cases_coe_expiry;
drop index if exists idx_cases_post_approval_stage;
drop index if exists idx_cases_stage;

alter table cases drop column if exists supplement_count;
alter table cases drop column if exists close_reason;
alter table cases drop column if exists coe_sent_at;
alter table cases drop column if exists coe_expiry_date;
alter table cases drop column if exists coe_issued_at;
alter table cases drop column if exists visa_plan;
alter table cases drop column if exists application_flow_type;
alter table cases drop column if exists post_approval_stage;
alter table cases drop column if exists stage;

