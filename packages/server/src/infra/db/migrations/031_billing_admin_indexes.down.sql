-- 031_billing_admin_indexes rollback

drop index if exists idx_billing_records_case_due;
drop index if exists idx_payment_records_org_received_at;
drop index if exists idx_tasks_source_status;
