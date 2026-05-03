-- 043_reminders_drop_legacy_nullable
-- entity_type / entity_id 是 001_init 遗留列，016 已将语义迁移到 target_type / target_id，
-- 但 entity_* 仍保留 NOT NULL；新代码只写 target_*，INSERT 时 PG 23502 报错。
-- 本迁移：
--   1. 将 entity_type / entity_id 改为 NULLABLE（兼容遗留读取）
--   2. 将 target_type / target_id 加 NOT NULL（P0 真值约束）
--   3. 添加 trigger 自动同步 target_* → entity_*（双向兼容遗留查询）

BEGIN;

-- ============================================================
-- 1. 回填 target_* 空行（幂等：016 已做过一次，此处兜底）
-- ============================================================
UPDATE reminders
   SET target_type = entity_type,
       target_id   = entity_id::uuid
 WHERE target_type IS NULL
   AND entity_type IS NOT NULL;

-- ============================================================
-- 2. entity_type / entity_id → NULLABLE
-- ============================================================
ALTER TABLE reminders ALTER COLUMN entity_type DROP NOT NULL;
ALTER TABLE reminders ALTER COLUMN entity_id   DROP NOT NULL;

-- ============================================================
-- 3. target_type / target_id → NOT NULL
-- ============================================================
ALTER TABLE reminders ALTER COLUMN target_type SET NOT NULL;
ALTER TABLE reminders ALTER COLUMN target_id   SET NOT NULL;

-- ============================================================
-- 4. 同步 trigger：INSERT / UPDATE 时 target_* → entity_*
-- ============================================================
CREATE OR REPLACE FUNCTION fn_reminders_sync_entity_from_target()
RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.entity_type := NEW.target_type;
  NEW.entity_id   := NEW.target_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reminders_sync_entity ON reminders;

CREATE TRIGGER trg_reminders_sync_entity
  BEFORE INSERT OR UPDATE OF target_type, target_id
  ON reminders
  FOR EACH ROW
  EXECUTE FUNCTION fn_reminders_sync_entity_from_target();

-- ============================================================
-- 5. 回填 entity_* 以匹配 target_*（trigger 仅影响新写入）
-- ============================================================
UPDATE reminders
   SET entity_type = target_type,
       entity_id   = target_id
 WHERE entity_type IS DISTINCT FROM target_type
    OR entity_id   IS DISTINCT FROM target_id;

COMMIT;
