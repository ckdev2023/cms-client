-- 016_billing_reminders_truth rollback

-- ============================================================
-- 3. reminders rollback
-- ============================================================
DROP INDEX IF EXISTS idx_reminders_send_status;
DROP INDEX IF EXISTS idx_reminders_case_id;
DROP INDEX IF EXISTS idx_reminders_dedupe_key;

ALTER TABLE reminders DROP CONSTRAINT IF EXISTS chk_reminders_channel;
ALTER TABLE reminders DROP CONSTRAINT IF EXISTS chk_reminders_send_status;

-- P0: 还原列重命名
ALTER TABLE reminders RENAME COLUMN remind_at TO scheduled_at;
ALTER TABLE reminders RENAME COLUMN payload_snapshot TO payload;

ALTER TABLE reminders DROP COLUMN IF EXISTS sent_at;
ALTER TABLE reminders DROP COLUMN IF EXISTS retry_count;
ALTER TABLE reminders DROP COLUMN IF EXISTS send_status;
ALTER TABLE reminders DROP COLUMN IF EXISTS dedupe_key;
ALTER TABLE reminders DROP COLUMN IF EXISTS channel;
ALTER TABLE reminders DROP COLUMN IF EXISTS recipient_id;
ALTER TABLE reminders DROP COLUMN IF EXISTS recipient_type;
ALTER TABLE reminders DROP COLUMN IF EXISTS target_id;
ALTER TABLE reminders DROP COLUMN IF EXISTS target_type;
ALTER TABLE reminders DROP COLUMN IF EXISTS case_id;

-- ============================================================
-- 2. payment_records rollback
-- ============================================================
DROP INDEX IF EXISTS idx_payment_records_record_status;

ALTER TABLE payment_records DROP CONSTRAINT IF EXISTS chk_payment_records_record_status;
ALTER TABLE payment_records DROP COLUMN IF EXISTS reversed_from_payment_record_id;
ALTER TABLE payment_records DROP COLUMN IF EXISTS voided_at;
ALTER TABLE payment_records DROP COLUMN IF EXISTS voided_by;
ALTER TABLE payment_records DROP COLUMN IF EXISTS void_reason_note;
ALTER TABLE payment_records DROP COLUMN IF EXISTS void_reason_code;
ALTER TABLE payment_records DROP COLUMN IF EXISTS note;
ALTER TABLE payment_records DROP COLUMN IF EXISTS receipt_relative_path_or_key;
ALTER TABLE payment_records DROP COLUMN IF EXISTS receipt_storage_type;
ALTER TABLE payment_records DROP COLUMN IF EXISTS record_status;

-- ============================================================
-- 1. billing_records rollback
-- ============================================================
ALTER TABLE billing_records DROP CONSTRAINT IF EXISTS chk_billing_records_gate_effect_mode;
ALTER TABLE billing_records DROP CONSTRAINT IF EXISTS chk_billing_records_status;

UPDATE billing_records SET status = 'awaiting_payment' WHERE status = 'due';
UPDATE billing_records SET status = 'partial_paid'     WHERE status = 'partial';
UPDATE billing_records SET status = 'settled'          WHERE status = 'paid';

ALTER TABLE billing_records DROP COLUMN IF EXISTS gate_effect_mode;
