-- 050_roles_permissions_tables rollback

-- 1. Clear backfilled role_id
UPDATE users SET role_id = NULL WHERE role_id IS NOT NULL;

-- 2. Drop users.role_id column
ALTER TABLE users DROP COLUMN IF EXISTS role_id;

-- 3. Drop RLS policies
DROP POLICY IF EXISTS org_isolation ON user_permission_overrides;
ALTER TABLE user_permission_overrides DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS org_isolation ON role_permissions;
ALTER TABLE role_permissions DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS org_isolation ON roles;
ALTER TABLE roles DISABLE ROW LEVEL SECURITY;

-- 4. Drop tables (order matters for FK)
DROP TABLE IF EXISTS user_permission_overrides;
DROP TABLE IF EXISTS role_permissions;
DROP TABLE IF EXISTS roles;
