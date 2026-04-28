-- 027_leads_p0 rollback

-- RLS
DROP POLICY IF EXISTS org_isolation ON lead_logs;
ALTER TABLE lead_logs DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS org_isolation ON lead_followups;
ALTER TABLE lead_followups DISABLE ROW LEVEL SECURITY;

-- Indexes (lead_logs / lead_followups)
DROP INDEX IF EXISTS idx_lead_logs_lead_created_desc;
DROP INDEX IF EXISTS idx_lead_followups_lead;

-- Tables
DROP TABLE IF EXISTS lead_logs;
DROP TABLE IF EXISTS lead_followups;

-- Indexes (leads)
DROP INDEX IF EXISTS idx_leads_created_at_desc;
DROP INDEX IF EXISTS idx_leads_email;
DROP INDEX IF EXISTS idx_leads_phone;
DROP INDEX IF EXISTS idx_leads_group_status;
DROP INDEX IF EXISTS idx_leads_owner_status;

-- Constraints
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_lost_reason_chk;
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_status_chk;

-- Compat view
DROP VIEW IF EXISTS leads_v1_compat;

-- Reverse column rename: owner_user_id → assigned_user_id
ALTER TABLE leads RENAME COLUMN owner_user_id TO assigned_user_id;

-- Drop added columns
DROP INDEX IF EXISTS uq_leads_lead_no;
ALTER TABLE leads DROP COLUMN IF EXISTS converted_case_id;
ALTER TABLE leads DROP COLUMN IF EXISTS converted_customer_id;
ALTER TABLE leads DROP COLUMN IF EXISTS lost_reason;
ALTER TABLE leads DROP COLUMN IF EXISTS note;
ALTER TABLE leads DROP COLUMN IF EXISTS quote_amount;
ALTER TABLE leads DROP COLUMN IF EXISTS next_follow_up_at;
ALTER TABLE leads DROP COLUMN IF EXISTS next_action;
ALTER TABLE leads DROP COLUMN IF EXISTS group_id;
ALTER TABLE leads DROP COLUMN IF EXISTS intended_case_type;
ALTER TABLE leads DROP COLUMN IF EXISTS referrer;
ALTER TABLE leads DROP COLUMN IF EXISTS source_channel;
ALTER TABLE leads DROP COLUMN IF EXISTS email;
ALTER TABLE leads DROP COLUMN IF EXISTS phone;
ALTER TABLE leads DROP COLUMN IF EXISTS name;
ALTER TABLE leads DROP COLUMN IF EXISTS lead_no;
