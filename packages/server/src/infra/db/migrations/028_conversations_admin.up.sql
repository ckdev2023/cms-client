-- 028_conversations_admin: 会话域 Admin 扩展 — owner_user_id / last_message_at / 未读三档 / customer_id / case_id + 索引
-- 对应计划 Phase C1；权威：P0/03-业务规则与不变量.md §2.5 + P0/06-页面规格

-- ============================================================
-- 1. conversations 表：补齐 Admin 指派/排序/未读计数/承接对象关联
-- ============================================================

-- owner_user_id：指派员工（P0 语义与 leads.owner_user_id 对齐，旧 assigned_user_id 同义）
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS owner_user_id uuid REFERENCES users(id);

-- last_message_at：最后消息时间，由服务端在 messages insert 后更新（不用触发器，方便事务粘合）
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS last_message_at timestamptz;

-- 未读计数三档：
--   unread_count_staff_tenant：任一员工读后归零，用于"租户收件箱"
--   unread_count_staff_owner：指派员工读后归零，用于"我的会话"
--   unread_count_user：C 端读消息后归零
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS unread_count_staff_tenant int NOT NULL DEFAULT 0;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS unread_count_staff_owner int NOT NULL DEFAULT 0;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS unread_count_user int NOT NULL DEFAULT 0;

-- 承接对象升级：转化为 Customer 后回填 customer_id；进入 Case 后由 transition-to-case 写入 case_id
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES customers(id);
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS case_id uuid REFERENCES cases(id);

-- ============================================================
-- 2. 回填 last_message_at（从现有 messages 聚合）
-- ============================================================

UPDATE conversations c
SET last_message_at = sub.max_created_at
FROM (
  SELECT conversation_id, MAX(created_at) AS max_created_at
  FROM messages
  GROUP BY conversation_id
) sub
WHERE c.id = sub.conversation_id
  AND c.last_message_at IS NULL;

-- ============================================================
-- 3. 索引
-- ============================================================

-- Admin 列表："我的会话" 按 owner + status 过滤
CREATE INDEX IF NOT EXISTS idx_conversations_org_owner_status
  ON conversations(org_id, owner_user_id, status)
  WHERE owner_user_id IS NOT NULL;

-- Admin 列表：默认排序 last_message_at DESC
CREATE INDEX IF NOT EXISTS idx_conversations_org_last_message_at
  ON conversations(org_id, last_message_at DESC)
  WHERE last_message_at IS NOT NULL;

-- 承接对象关联查询
CREATE INDEX IF NOT EXISTS idx_conversations_customer
  ON conversations(customer_id)
  WHERE customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_conversations_case
  ON conversations(case_id)
  WHERE case_id IS NOT NULL;
