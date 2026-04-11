-- 013_business_manager_visa: 经营管理签专属流程字段 + residence_periods 表
-- 对应 P0 数据模型规格 §3.4（cases 扩展）与 §3.17（residence_periods）

-- ============================================================
-- 1. cases 表：补充经营管理签专属字段
-- ============================================================

-- 流程阶段（对应流程文档 19 状态，含双轨道：S1-S9 抽象 + 经管签具体状态）
alter table cases add column if not exists stage text;

-- 下签后子阶段（COE流程 Step15-18）
-- 枚举值: none | waiting_final_payment | coe_sent | overseas_visa_applying
--         | entry_success | overseas_visa_rejected
alter table cases add column if not exists post_approval_stage text not null default 'none';

-- 申请流程类型
-- 枚举值: standard | coe_overseas
alter table cases add column if not exists application_flow_type text not null default 'standard';

-- 签证方案（如：2年・5年・経営管理 特定活動等）
alter table cases add column if not exists visa_plan text;

-- COE 相关时间戳
alter table cases add column if not exists coe_issued_at timestamptz;
alter table cases add column if not exists coe_expiry_date date;
alter table cases add column if not exists coe_sent_at timestamptz;

-- 关闭原因（结案/撤回说明）
alter table cases add column if not exists close_reason text;

-- 补资料循环计数（每次 NEED_SUPPLEMENT → SUPPLEMENT_PROCESSING 自增）
alter table cases add column if not exists supplement_count int not null default 0;

-- 索引
create index if not exists idx_cases_stage
  on cases(org_id, stage) where stage is not null;
create index if not exists idx_cases_post_approval_stage
  on cases(org_id, post_approval_stage) where post_approval_stage <> 'none';
create index if not exists idx_cases_coe_expiry
  on cases(org_id, coe_expiry_date) where coe_expiry_date is not null;

-- ============================================================
-- 2. residence_periods 表（P0 §3.17）
-- ============================================================
create table if not exists residence_periods (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id),
  case_id uuid not null references cases(id),
  customer_id uuid not null references customers(id),
  visa_type text not null,
  status_of_residence text not null,
  period_years int,
  period_label text,
  valid_from date not null,
  valid_until date not null,
  card_number text,
  is_current boolean not null default false,
  notes text,
  created_by uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_residence_periods_case
  on residence_periods(case_id);
create index if not exists idx_residence_periods_org
  on residence_periods(org_id);
create index if not exists idx_residence_periods_customer
  on residence_periods(customer_id);
create index if not exists idx_residence_periods_org_valid_until
  on residence_periods(org_id, valid_until) where valid_until is not null;
create index if not exists idx_residence_periods_created_by
  on residence_periods(created_by) where created_by is not null;

