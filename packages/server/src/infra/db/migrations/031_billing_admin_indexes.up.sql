-- 031_billing_admin_indexes: billing/payment/tasks 查询索引补充
-- 权威来源: billing-module-integration 计划 §2.8

-- 服务于 bulk-collect「最早 overdue plan」查询与案件 billing tab 列表
create index if not exists idx_billing_records_case_due
  on billing_records(case_id, status, due_date);

-- 服务于全 org 流水按时间倒序列表
create index if not exists idx_payment_records_org_received_at
  on payment_records(org_id, received_at desc);

-- 服务于 bulk-collect fingerprint 查重（含 task_type 前缀避免误命中其他 source-typed 任务）
create index if not exists idx_tasks_source_status
  on tasks(task_type, source_type, source_id, status)
  where source_type is not null;
