-- 028_conversations_admin rollback

-- Indexes
DROP INDEX IF EXISTS idx_conversations_case;
DROP INDEX IF EXISTS idx_conversations_customer;
DROP INDEX IF EXISTS idx_conversations_org_last_message_at;
DROP INDEX IF EXISTS idx_conversations_org_owner_status;

-- Columns
ALTER TABLE conversations DROP COLUMN IF EXISTS case_id;
ALTER TABLE conversations DROP COLUMN IF EXISTS customer_id;
ALTER TABLE conversations DROP COLUMN IF EXISTS unread_count_user;
ALTER TABLE conversations DROP COLUMN IF EXISTS unread_count_staff_owner;
ALTER TABLE conversations DROP COLUMN IF EXISTS unread_count_staff_tenant;
ALTER TABLE conversations DROP COLUMN IF EXISTS last_message_at;
ALTER TABLE conversations DROP COLUMN IF EXISTS owner_user_id;
