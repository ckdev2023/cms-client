-- BUG-181: 建案路径只写 cases.quote_price 但未同步插入一行 billing_records，
--   导致历史 case 在 admin Billing tab 上 Total fees `—`、Outstanding `¥0`，
--   与 cases.quote_price 强不一致。runtime 修复见
--   packages/server/src/modules/core/cases/cases.service.ts
--   `insertInitialBillingPlanFromQuote()`，本迁移负责回填存量 case。
--
-- 回填规则：
--   - case.quote_price > 0
--   - 该 case 当前 billing_records 为空（避免与 BMV signing_deposit 等已有 plan 冲突）
--
-- milestone_name 选择 '案件報酬'：刻意避开 deposit / final 关键词，确保不会触发
--   billingGuards.isDepositMilestone / isFinalPaymentMilestone（保证存量 case
--   原有 deposit/final 守卫语义不变）。
--
-- status='due' + gate_effect_mode='warn' 与 runtime 修复保持一致。
-- 幂等：NOT EXISTS 子查询确保已有任意 billing_records 行的 case 不重复回填。
INSERT INTO billing_records
  (id, org_id, case_id, milestone_name, amount_due, status, gate_effect_mode, created_at, updated_at)
SELECT
  gen_random_uuid(),
  c.org_id,
  c.id,
  '案件報酬',
  c.quote_price,
  'due',
  'warn',
  now(),
  now()
FROM cases c
WHERE c.quote_price IS NOT NULL
  AND c.quote_price > 0
  AND NOT EXISTS (
    SELECT 1 FROM billing_records br WHERE br.case_id = c.id
  );

-- 同步 cases 表 billing_unpaid_amount_cached：
--   存量 case 在回填后 amount_due = quote_price 且无 payment_records，
--   缓存字段也需要一致才能让 admin Billing tab / Cases list "Outstanding" 列即时正确。
UPDATE cases c
SET billing_unpaid_amount_cached = c.quote_price,
    updated_at = now()
WHERE EXISTS (
  SELECT 1 FROM billing_records br
  WHERE br.case_id = c.id
    AND br.milestone_name = '案件報酬'
    AND br.created_at >= now() - interval '5 minutes'
);
