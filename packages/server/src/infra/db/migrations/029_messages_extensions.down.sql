-- 029_messages_extensions rollback

ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_visible_scope_chk;
ALTER TABLE messages DROP COLUMN IF EXISTS visible_scope;

ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_kind_chk;
ALTER TABLE messages DROP COLUMN IF EXISTS kind;
