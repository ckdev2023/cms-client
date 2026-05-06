-- 052_leads_app_user_nullable (down): revert app_user_id to NOT NULL
-- NOTE: only safe if all rows have a non-NULL app_user_id
UPDATE leads SET app_user_id = gen_random_uuid() WHERE app_user_id IS NULL;
ALTER TABLE leads ALTER COLUMN app_user_id SET NOT NULL;
