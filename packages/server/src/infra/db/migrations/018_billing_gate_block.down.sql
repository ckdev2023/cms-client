-- 018_billing_gate_block rollback: remove hard block mode from billing gate

UPDATE billing_records
SET gate_effect_mode = 'warn'
WHERE gate_effect_mode = 'block';

ALTER TABLE billing_records
  DROP CONSTRAINT IF EXISTS chk_billing_records_gate_effect_mode;

ALTER TABLE billing_records
  ADD CONSTRAINT chk_billing_records_gate_effect_mode
  CHECK (gate_effect_mode IN ('off', 'warn'));