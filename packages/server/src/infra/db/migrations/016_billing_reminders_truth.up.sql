-- 016_billing_reminders_truth: P0 BillingPlan / PaymentRecord / Reminder 语义对齐
-- 对应 P0/03 §6, §6.2, §6.3F, §11; P0/07 §3.20, §3.21

-- ============================================================
-- 1. billing_records — 对齐 P0 BillingPlan 语义
-- ============================================================

-- P0: gate_effect_mode (off / warn; P0 默认 warn)
ALTER TABLE billing_records
  ADD COLUMN IF NOT EXISTS gate_effect_mode text NOT NULL DEFAULT 'warn';

-- 迁移状态枚举至 P0 口径: due / partial / paid / overdue
UPDATE billing_records SET status = 'due'     WHERE status IN ('unquoted', 'quoted_pending', 'awaiting_payment');
UPDATE billing_records SET status = 'partial' WHERE status = 'partial_paid';
UPDATE billing_records SET status = 'paid'    WHERE status IN ('settled', 'refunded');

ALTER TABLE billing_records
  ADD CONSTRAINT chk_billing_records_status
  CHECK (status IN ('due', 'partial', 'paid', 'overdue'));

ALTER TABLE billing_records
  ADD CONSTRAINT chk_billing_records_gate_effect_mode
  CHECK (gate_effect_mode IN ('off', 'warn'));

-- ============================================================
-- 2. payment_records — P0 void/reverse 语义 (不可物理删除)
-- ============================================================

ALTER TABLE payment_records
  ADD COLUMN IF NOT EXISTS record_status text NOT NULL DEFAULT 'valid';

ALTER TABLE payment_records
  ADD COLUMN IF NOT EXISTS receipt_storage_type text;

ALTER TABLE payment_records
  ADD COLUMN IF NOT EXISTS receipt_relative_path_or_key text;

ALTER TABLE payment_records
  ADD COLUMN IF NOT EXISTS note text;

ALTER TABLE payment_records
  ADD COLUMN IF NOT EXISTS void_reason_code text;

ALTER TABLE payment_records
  ADD COLUMN IF NOT EXISTS void_reason_note text;

ALTER TABLE payment_records
  ADD COLUMN IF NOT EXISTS voided_by uuid REFERENCES users(id);

ALTER TABLE payment_records
  ADD COLUMN IF NOT EXISTS voided_at timestamptz;

ALTER TABLE payment_records
  ADD COLUMN IF NOT EXISTS reversed_from_payment_record_id uuid REFERENCES payment_records(id);

ALTER TABLE payment_records
  ADD CONSTRAINT chk_payment_records_record_status
  CHECK (record_status IN ('valid', 'voided', 'reversed'));

CREATE INDEX IF NOT EXISTS idx_payment_records_record_status
  ON payment_records(billing_record_id, record_status)
  WHERE record_status = 'valid';

-- ============================================================
-- 3. reminders — P0 Reminder 语义对齐
-- ============================================================

-- 新增 P0 字段
ALTER TABLE reminders
  ADD COLUMN IF NOT EXISTS case_id uuid REFERENCES cases(id);

ALTER TABLE reminders
  ADD COLUMN IF NOT EXISTS target_type text;

ALTER TABLE reminders
  ADD COLUMN IF NOT EXISTS target_id uuid;

ALTER TABLE reminders
  ADD COLUMN IF NOT EXISTS recipient_type text NOT NULL DEFAULT 'internal_user';

ALTER TABLE reminders
  ADD COLUMN IF NOT EXISTS recipient_id uuid;

ALTER TABLE reminders
  ADD COLUMN IF NOT EXISTS channel text NOT NULL DEFAULT 'in_app';

ALTER TABLE reminders
  ADD COLUMN IF NOT EXISTS dedupe_key text;

ALTER TABLE reminders
  ADD COLUMN IF NOT EXISTS send_status text NOT NULL DEFAULT 'pending';

ALTER TABLE reminders
  ADD COLUMN IF NOT EXISTS retry_count integer NOT NULL DEFAULT 0;

ALTER TABLE reminders
  ADD COLUMN IF NOT EXISTS sent_at timestamptz;

-- 迁移已有数据: entity_type/entity_id → target_type/target_id
UPDATE reminders SET target_type = entity_type, target_id = entity_id::uuid
  WHERE target_type IS NULL AND entity_id IS NOT NULL;

-- 迁移 status → send_status 的已有数据
UPDATE reminders SET send_status = 'canceled' WHERE status = 'cancelled';
UPDATE reminders SET send_status = status WHERE send_status = 'pending' AND status != 'cancelled';

-- P0: 重命名旧列以匹配权威字段名
ALTER TABLE reminders RENAME COLUMN scheduled_at TO remind_at;
ALTER TABLE reminders RENAME COLUMN payload TO payload_snapshot;

ALTER TABLE reminders
  ADD CONSTRAINT chk_reminders_send_status
  CHECK (send_status IN ('pending', 'sent', 'failed', 'canceled'));

ALTER TABLE reminders
  ADD CONSTRAINT chk_reminders_channel
  CHECK (channel IN ('in_app'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_reminders_dedupe_key
  ON reminders(org_id, dedupe_key) WHERE dedupe_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_reminders_case_id
  ON reminders(case_id) WHERE case_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_reminders_send_status
  ON reminders(org_id, send_status, remind_at)
  WHERE send_status = 'pending';
