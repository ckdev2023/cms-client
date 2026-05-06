-- 050_roles_permissions_tables: Phase B1 角色定義・権限コード・ユーザー級覆盖三表 + system 角色 backfill
-- B1 データモデル（roles / role_permissions / user_permission_overrides）

-- ============================================================
-- 1. roles 表
-- ============================================================
CREATE TABLE IF NOT EXISTS roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id),
  code text NOT NULL,
  name text NOT NULL,
  description text,
  is_system boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(org_id, code)
);

CREATE INDEX IF NOT EXISTS idx_roles_org ON roles(org_id);

-- ============================================================
-- 2. role_permissions 表
-- ============================================================
CREATE TABLE IF NOT EXISTS role_permissions (
  role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission text NOT NULL,
  PRIMARY KEY(role_id, permission)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_id);

-- ============================================================
-- 3. user_permission_overrides 表
-- ============================================================
CREATE TABLE IF NOT EXISTS user_permission_overrides (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission text NOT NULL,
  effect text NOT NULL CHECK (effect IN ('grant', 'deny')),
  reason text,
  granted_by uuid NOT NULL REFERENCES users(id),
  granted_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  PRIMARY KEY(user_id, permission)
);

CREATE INDEX IF NOT EXISTS idx_upo_user ON user_permission_overrides(user_id);
CREATE INDEX IF NOT EXISTS idx_upo_expires ON user_permission_overrides(expires_at)
  WHERE expires_at IS NOT NULL;

-- ============================================================
-- 4. users.role_id 双写列（Phase B 过渡期）
-- ============================================================
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS role_id uuid REFERENCES roles(id);

-- ============================================================
-- 5. RLS
-- ============================================================
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS org_isolation ON roles;
CREATE POLICY org_isolation ON roles
  USING (org_id = app_current_org_id())
  WITH CHECK (org_id = app_current_org_id());

ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS org_isolation ON role_permissions;
CREATE POLICY org_isolation ON role_permissions
  USING (role_id IN (SELECT id FROM roles WHERE org_id = app_current_org_id()))
  WITH CHECK (role_id IN (SELECT id FROM roles WHERE org_id = app_current_org_id()));

ALTER TABLE user_permission_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permission_overrides FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS org_isolation ON user_permission_overrides;
CREATE POLICY org_isolation ON user_permission_overrides
  USING (user_id IN (SELECT id FROM users WHERE org_id = app_current_org_id()))
  WITH CHECK (user_id IN (SELECT id FROM users WHERE org_id = app_current_org_id()));

-- ============================================================
-- 6. System 角色 backfill（每个 org 初始化 4 个内建角色）
-- ============================================================

-- 6a. 插入 4 个 system 角色到每个 org
INSERT INTO roles (org_id, code, name, description, is_system)
SELECT o.id, v.code, v.name, v.description, true
FROM organizations o
CROSS JOIN (VALUES
  ('owner',   'Owner',   'Full administrative access'),
  ('manager', 'Manager', 'Team and case management'),
  ('staff',   'Staff',   'Day-to-day case operations'),
  ('viewer',  'Viewer',  'Read-only access')
) AS v(code, name, description)
WHERE NOT EXISTS (
  SELECT 1 FROM roles r WHERE r.org_id = o.id AND r.code = v.code
);

-- 6b. Backfill role_permissions for owner (全部权限)
INSERT INTO role_permissions (role_id, permission)
SELECT r.id, p.perm
FROM roles r
CROSS JOIN (VALUES
  ('case.view'), ('case.edit'), ('case.export'), ('case.audit'),
  ('case.create'), ('case.finalize'),
  ('customer.view'), ('customer.edit'),
  ('group.view'), ('group.manage'),
  ('user.view'), ('user.manage'), ('role.assign'),
  ('permission.override'),
  ('settings.write')
) AS p(perm)
WHERE r.code = 'owner' AND r.is_system = true
ON CONFLICT (role_id, permission) DO NOTHING;

-- 6c. Backfill role_permissions for manager
INSERT INTO role_permissions (role_id, permission)
SELECT r.id, p.perm
FROM roles r
CROSS JOIN (VALUES
  ('case.view'), ('case.edit'), ('case.export'), ('case.audit'),
  ('case.create'), ('case.finalize'),
  ('customer.view'), ('customer.edit'),
  ('group.view'), ('group.manage'),
  ('user.view'), ('user.manage'), ('role.assign'),
  ('settings.write')
) AS p(perm)
WHERE r.code = 'manager' AND r.is_system = true
ON CONFLICT (role_id, permission) DO NOTHING;

-- 6d. Backfill role_permissions for staff
INSERT INTO role_permissions (role_id, permission)
SELECT r.id, p.perm
FROM roles r
CROSS JOIN (VALUES
  ('case.view'), ('case.edit'), ('case.export'), ('case.audit'),
  ('case.create'), ('case.finalize'),
  ('customer.view'), ('customer.edit'),
  ('group.view'),
  ('user.view')
) AS p(perm)
WHERE r.code = 'staff' AND r.is_system = true
ON CONFLICT (role_id, permission) DO NOTHING;

-- 6e. Backfill role_permissions for viewer
INSERT INTO role_permissions (role_id, permission)
SELECT r.id, p.perm
FROM roles r
CROSS JOIN (VALUES
  ('case.view'),
  ('customer.view'),
  ('group.view'),
  ('user.view')
) AS p(perm)
WHERE r.code = 'viewer' AND r.is_system = true
ON CONFLICT (role_id, permission) DO NOTHING;

-- 6f. Backfill users.role_id from users.role text
UPDATE users u
SET role_id = r.id
FROM roles r
WHERE r.org_id = u.org_id
  AND r.code = u.role
  AND r.is_system = true
  AND u.role_id IS NULL;
