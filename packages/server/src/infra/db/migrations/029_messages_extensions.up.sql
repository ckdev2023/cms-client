-- 029_messages_extensions: messages 表扩展 kind + visible_scope
-- 对应计划 Phase C2；权威：P0/03-业务规则与不变量.md §2.5

-- ============================================================
-- 1. kind — 消息类型
--    text:          普通文字消息（默认）
--    system_event:  系统事件（状态变更、指派通知等）
--    intake_link:   进件表单链接
--    quote_link:    报价链接
--    sign_link:     签约链接
-- ============================================================

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'text';

ALTER TABLE messages
  ADD CONSTRAINT messages_kind_chk
  CHECK (kind IN ('text', 'system_event', 'intake_link', 'quote_link', 'sign_link'));

-- ============================================================
-- 2. visible_scope — 可见范围（P0 §2.5 强制留位）
--    client_visible: C 端可见（默认）
--    internal_only:  仅内部可见（C 端不展示）
-- ============================================================

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS visible_scope text NOT NULL DEFAULT 'client_visible';

ALTER TABLE messages
  ADD CONSTRAINT messages_visible_scope_chk
  CHECK (visible_scope IN ('internal_only', 'client_visible'));

-- ============================================================
-- 3. 老数据回填默认值
--    ADD COLUMN ... DEFAULT 已为现有行写入默认值（PG 11+），
--    此 UPDATE 作为防御性保障确保无 NULL 残留。
-- ============================================================

UPDATE messages SET kind = 'text'             WHERE kind IS NULL;
UPDATE messages SET visible_scope = 'client_visible' WHERE visible_scope IS NULL;
