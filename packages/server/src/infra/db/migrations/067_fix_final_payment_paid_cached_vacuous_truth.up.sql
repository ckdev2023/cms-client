-- 修复 syncBillingCacheForCase 历史行为：当 billing_records 中不存在名称匹配
-- 「尾款 / final / 結果」的里程碑时，JS 对空数组调用 .every() 会得到 true，
-- 错误地将 final_payment_paid_cached 写成 true，导致 business_phase=WAITING_PAYMENT
-- 与 aggregate billing.finalPaymentPaid 语义冲突（Chrome MCP 走查：田中花子家族滞在案）。
--
-- 规则与 billingGuards.isFinalPaymentMilestone + syncBillingCacheForCase 对齐：
--   - 无尾款类里程碑行 → false
--   - 有则全部为 paid → true，否则 false
UPDATE cases c
SET
  final_payment_paid_cached = COALESCE(
    (
      SELECT bool_and(br.status = 'paid')
      FROM billing_records br
      WHERE br.case_id = c.id
        AND (
          lower(br.milestone_name) LIKE '%尾款%'
          OR lower(br.milestone_name) LIKE '%final%'
          OR lower(br.milestone_name) LIKE '%結果%'
        )
    ),
    false
  ),
  updated_at = now()
WHERE coalesce(c.metadata->>'_status', '') IS DISTINCT FROM 'deleted';
