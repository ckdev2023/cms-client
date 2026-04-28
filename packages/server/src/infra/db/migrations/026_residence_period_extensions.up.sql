-- 026: Extend residence_periods for P1 business-manager visa flow.
-- Adds entry_date (date of entry to Japan) and reminder_created (gate flag for success close).

ALTER TABLE residence_periods
  ADD COLUMN entry_date date,
  ADD COLUMN reminder_created boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN residence_periods.entry_date IS 'Date of entry to Japan, recorded after successful visa and arrival';
COMMENT ON COLUMN residence_periods.reminder_created IS 'True when 180/90/30-day expiry reminders have been successfully generated';
