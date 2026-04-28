-- 026 rollback: Remove P1 residence_period extension columns.

ALTER TABLE residence_periods
  DROP COLUMN IF EXISTS reminder_created,
  DROP COLUMN IF EXISTS entry_date;
