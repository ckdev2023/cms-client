-- 022_groups_and_case_group: Group 治理表 + UserGroupMembership + cases.group_id 补齐与历史数据 backfill
-- 对应 p0-sv-002a §6 / §7 G1–G4；p0-authority-baseline §3

-- ============================================================
-- 1. groups 表（P0 §3.0）
-- ============================================================
CREATE TABLE IF NOT EXISTS groups (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES organizations(id),
  group_no    text,
  name        text NOT NULL,
  description text,
  active_flag boolean NOT NULL DEFAULT true,
  created_by  uuid REFERENCES users(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_by  uuid REFERENCES users(id),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_groups_org ON groups(org_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_groups_org_name ON groups(org_id, name)
  WHERE active_flag = true;

-- ============================================================
-- 2. user_group_memberships 表（P0 §3.0A）
-- ============================================================
CREATE TABLE IF NOT EXISTS user_group_memberships (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES users(id),
  group_id         uuid NOT NULL REFERENCES groups(id),
  is_primary_group boolean NOT NULL DEFAULT false,
  active_flag      boolean NOT NULL DEFAULT true,
  joined_at        timestamptz NOT NULL DEFAULT now(),
  left_at          timestamptz
);

CREATE INDEX IF NOT EXISTS idx_ugm_user ON user_group_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_ugm_group ON user_group_memberships(group_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_ugm_user_group
  ON user_group_memberships(user_id, group_id)
  WHERE active_flag = true;

-- ============================================================
-- 3. cases.group_id 列（P0 §3.5 — 快照继承 Customer.group）
-- ============================================================
ALTER TABLE cases ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES groups(id);

CREATE INDEX IF NOT EXISTS idx_cases_group
  ON cases(org_id, group_id) WHERE group_id IS NOT NULL;

-- ============================================================
-- 4. 历史数据 backfill
--    从 customers.base_profile 中提取已有 group 标识，
--    为每个 (org_id, group_name) 自动创建 groups 行，
--    再回填 cases.group_id。
-- ============================================================

-- 4a: 从 base_profile 提取去重 group 值并插入 groups 表
INSERT INTO groups (org_id, name)
SELECT DISTINCT sub.org_id, sub.group_val
FROM (
  SELECT c.org_id,
         coalesce(
           nullif(trim(c.base_profile->>'group_id'), ''),
           nullif(trim(c.base_profile->>'groupId'), ''),
           nullif(trim(c.base_profile->>'group'), '')
         ) AS group_val
  FROM customers c
) sub
WHERE sub.group_val IS NOT NULL
ON CONFLICT DO NOTHING;

-- 4b: 回填 cases.group_id（仅处理 group_id 为 NULL 的行）
UPDATE cases
SET group_id = g.id
FROM customers c
JOIN LATERAL (
  SELECT coalesce(
    nullif(trim(c.base_profile->>'group_id'), ''),
    nullif(trim(c.base_profile->>'groupId'), ''),
    nullif(trim(c.base_profile->>'group'), '')
  ) AS group_val
) cv ON true
JOIN groups g ON g.org_id = c.org_id AND g.name = cv.group_val
WHERE cases.customer_id = c.id
  AND cases.org_id = c.org_id
  AND cases.group_id IS NULL
  AND cv.group_val IS NOT NULL;

-- ============================================================
-- 5. RLS
-- ============================================================

-- groups: 直接按 org_id 隔离
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS org_isolation ON groups;
CREATE POLICY org_isolation ON groups
  USING (org_id = app_current_org_id())
  WITH CHECK (org_id = app_current_org_id());

-- user_group_memberships: 通过 users.org_id 隔离（表自身无 org_id）
ALTER TABLE user_group_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_group_memberships FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS org_isolation ON user_group_memberships;
CREATE POLICY org_isolation ON user_group_memberships
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = user_group_memberships.user_id
        AND u.org_id = app_current_org_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = user_group_memberships.user_id
        AND u.org_id = app_current_org_id()
    )
  );
