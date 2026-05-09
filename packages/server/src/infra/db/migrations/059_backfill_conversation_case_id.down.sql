-- 059_backfill_conversation_case_id: 回滚（无法精确还原历史 NULL 状态，仅 best-effort）
-- 因为 backfill 仅写入了与 leads.converted_case_id / converted_customer_id 一致的值，
-- rollback 时将这些「与 lead 完全一致」的链接重置为 NULL，对应只针对回填动作产生的行。
-- 注意：如果业务期间管理员手动设置 case_id 为同一 lead.converted_case_id，rollback 会误删，
-- 在 dev 与该 backfill 窗口内可接受。

UPDATE conversations c
SET case_id = NULL,
    updated_at = now()
FROM leads l
WHERE c.lead_id = l.id
  AND c.case_id IS NOT NULL
  AND c.case_id = l.converted_case_id;

UPDATE conversations c
SET customer_id = NULL,
    updated_at = now()
FROM leads l
WHERE c.lead_id = l.id
  AND c.customer_id IS NOT NULL
  AND c.customer_id = l.converted_customer_id;
