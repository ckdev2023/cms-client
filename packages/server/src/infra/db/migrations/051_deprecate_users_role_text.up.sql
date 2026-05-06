-- 051_deprecate_users_role_text: Phase B7 最终切替
-- users.role_id 已完全取代 users.role text；本迁移移除旧列及其 CHECK 约束。
-- 前提条件：
--   - users.role_id 已全量 backfill（migration 050 step 6f）
--   - 所有控制器已由 @RequireRoles 切换至 @RequirePermission
--   - 经过 ≥ 2 个迭代周期观察无回滚需求

-- ============================================================
-- 1. 确保无 NULL role_id（防御性断言）
-- ============================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM users WHERE role_id IS NULL LIMIT 1
  ) THEN
    RAISE EXCEPTION 'Cannot drop users.role: some rows still have role_id = NULL. Run backfill first.';
  END IF;
END $$;

-- ============================================================
-- 2. 使 role_id NOT NULL
-- ============================================================
ALTER TABLE users
  ALTER COLUMN role_id SET NOT NULL;

-- ============================================================
-- 3. 移除 users.role CHECK 约束
-- ============================================================
ALTER TABLE users
  DROP CONSTRAINT IF EXISTS chk_users_role;

-- ============================================================
-- 4. 移除 users.role 列
-- ============================================================
ALTER TABLE users
  DROP COLUMN IF EXISTS role;
