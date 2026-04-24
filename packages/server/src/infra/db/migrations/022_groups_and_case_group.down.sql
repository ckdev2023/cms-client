-- 022_groups_and_case_group rollback

-- RLS
DROP POLICY IF EXISTS org_isolation ON user_group_memberships;
ALTER TABLE user_group_memberships DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS org_isolation ON groups;
ALTER TABLE groups DISABLE ROW LEVEL SECURITY;

-- cases.group_id
DROP INDEX IF EXISTS idx_cases_group;
ALTER TABLE cases DROP COLUMN IF EXISTS group_id;

-- user_group_memberships
DROP INDEX IF EXISTS uq_ugm_user_group;
DROP INDEX IF EXISTS idx_ugm_group;
DROP INDEX IF EXISTS idx_ugm_user;
DROP TABLE IF EXISTS user_group_memberships;

-- groups
DROP INDEX IF EXISTS uq_groups_org_name;
DROP INDEX IF EXISTS idx_groups_org;
DROP TABLE IF EXISTS groups;
