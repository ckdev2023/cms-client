-- 014_case_truth rollback

DROP INDEX IF EXISTS idx_case_stage_history_case;
DROP TABLE IF EXISTS case_stage_history;

DROP INDEX IF EXISTS idx_cases_billing_risk;
DROP INDEX IF EXISTS idx_cases_result_outcome;

ALTER TABLE cases DROP COLUMN IF EXISTS entry_confirmed_at;
ALTER TABLE cases DROP COLUMN IF EXISTS overseas_visa_start_at;
ALTER TABLE cases DROP COLUMN IF EXISTS billing_risk_ack_reason_note;
ALTER TABLE cases DROP COLUMN IF EXISTS billing_risk_ack_reason_code;
ALTER TABLE cases DROP COLUMN IF EXISTS billing_risk_acknowledged_at;
ALTER TABLE cases DROP COLUMN IF EXISTS billing_risk_acknowledged_by;
ALTER TABLE cases DROP COLUMN IF EXISTS billing_unpaid_amount_cached;
ALTER TABLE cases DROP COLUMN IF EXISTS final_payment_paid_cached;
ALTER TABLE cases DROP COLUMN IF EXISTS deposit_paid_cached;
ALTER TABLE cases DROP COLUMN IF EXISTS quote_price;
ALTER TABLE cases DROP COLUMN IF EXISTS result_outcome;
