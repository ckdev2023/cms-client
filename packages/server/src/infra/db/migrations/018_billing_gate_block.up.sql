-- 018_billing_gate_block: allow hard block mode for COE / post-approval billing gate

ALTER TABLE billing_records
  DROP CONSTRAINT IF EXISTS chk_billing_records_gate_effect_mode;

ALTER TABLE billing_records
  ADD CONSTRAINT chk_billing_records_gate_effect_mode
  CHECK (gate_effect_mode IN ('off', 'warn', 'block'));