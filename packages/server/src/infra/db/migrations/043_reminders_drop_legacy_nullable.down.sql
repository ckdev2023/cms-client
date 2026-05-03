-- 043_reminders_drop_legacy_nullable rollback
-- 还原 entity_type / entity_id 为 NOT NULL，移除 target_* NOT NULL 约束与同步 trigger。

BEGIN;

-- ============================================================
-- 1. 回填 entity_* 确保无 NULL（防止还原 NOT NULL 时失败）
-- ============================================================
UPDATE reminders
   SET entity_type = COALESCE(entity_type, target_type),
       entity_id   = COALESCE(entity_id, target_id)
 WHERE entity_type IS NULL
    OR entity_id   IS NULL;

-- ============================================================
-- 2. 还原 entity_type / entity_id → NOT NULL
-- ============================================================
ALTER TABLE reminders ALTER COLUMN entity_type SET NOT NULL;
ALTER TABLE reminders ALTER COLUMN entity_id   SET NOT NULL;

-- ============================================================
-- 3. 还原 target_type / target_id → NULLABLE
-- ============================================================
ALTER TABLE reminders ALTER COLUMN target_type DROP NOT NULL;
ALTER TABLE reminders ALTER COLUMN target_id   DROP NOT NULL;

-- ============================================================
-- 4. 移除同步 trigger 与函数
-- ============================================================
DROP TRIGGER IF EXISTS trg_reminders_sync_entity ON reminders;
DROP FUNCTION IF EXISTS fn_reminders_sync_entity_from_target();

COMMIT;
