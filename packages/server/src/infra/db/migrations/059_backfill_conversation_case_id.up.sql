-- 059_backfill_conversation_case_id: 回填 conversations.case_id
-- 在 leads.admin.convert-case 修复之前（旧版本 backfillConversationCustomer 只更新 customer_id），
-- 已转化的 lead 对应的 conversations 行 case_id 仍为 NULL，导致会话详情「关联案件」显示为空。
-- 这里基于 leads.converted_case_id 一次性回填：仅当 conversation 的 case_id 为 NULL
-- 且对应 lead 已经 converted_case_id 时回填，避免覆盖管理员手动重新挂接的 case_id。

UPDATE conversations c
SET case_id = l.converted_case_id,
    updated_at = now()
FROM leads l
WHERE c.lead_id = l.id
  AND c.case_id IS NULL
  AND l.converted_case_id IS NOT NULL;

-- 同步顺手补一遍 customer_id：避免 lead 已 converted_customer_id 但 conversation 仍未挂接客户的情况。
UPDATE conversations c
SET customer_id = l.converted_customer_id,
    updated_at = now()
FROM leads l
WHERE c.lead_id = l.id
  AND c.customer_id IS NULL
  AND l.converted_customer_id IS NOT NULL;
