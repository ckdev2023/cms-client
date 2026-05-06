-- 049_users_admin_columns rollback

ALTER TABLE users DROP COLUMN IF EXISTS password_set_at;
ALTER TABLE users DROP COLUMN IF EXISTS disabled_at;
ALTER TABLE users DROP COLUMN IF EXISTS created_by;

ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_status;
ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_role;
