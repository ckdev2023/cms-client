-- 051_deprecate_users_role_text rollback
-- 恢复 users.role text 列，从 roles 表回填，并恢复 CHECK 约束。

-- 1. 重新添加 role 列
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS role text;

-- 2. 从 roles 表回填 role text
UPDATE users u
SET role = r.code
FROM roles r
WHERE r.id = u.role_id
  AND u.role IS NULL;

-- 3. 设为 NOT NULL
ALTER TABLE users
  ALTER COLUMN role SET NOT NULL;

-- 4. 恢复 CHECK 约束
ALTER TABLE users
  ADD CONSTRAINT chk_users_role
    CHECK (role IN ('owner', 'manager', 'staff', 'viewer'));

-- 5. 恢复 role_id 为 nullable
ALTER TABLE users
  ALTER COLUMN role_id DROP NOT NULL;
