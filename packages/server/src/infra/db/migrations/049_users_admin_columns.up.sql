-- 049_users_admin_columns: Phase A1 用户管理辅助列与 CHECK 约束
-- 为 Phase A（用户管理 + 角色分配）做数据层准备

-- ============================================================
-- 1. role / status CHECK 约束
-- ============================================================
ALTER TABLE users
  ADD CONSTRAINT chk_users_role
    CHECK (role IN ('owner', 'manager', 'staff', 'viewer'));

ALTER TABLE users
  ADD CONSTRAINT chk_users_status
    CHECK (status IN ('active', 'disabled', 'pending'));

-- ============================================================
-- 2. 辅助列
-- ============================================================
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES users(id);

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS disabled_at timestamptz;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS password_set_at timestamptz;
