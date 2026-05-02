-- BUG-186 修复：`insertInitialBillingPlanFromQuote` 与 migration 040 回填时
--   写入了本地化文案 `案件報酬`，导致 admin Billing tab 在 en-US / zh-CN 下
--   直接渲染日文 raw（TYPE 列）。runtime 修复见
--   packages/server/src/modules/core/cases/cases.service.ts
--   `INITIAL_QUOTE_BILLING_MILESTONE = "case_fee"`，本迁移负责把存量
--   `billing_records.milestone_name = '案件報酬'` 回填为稳定的 i18n code
--   `case_fee`，admin 侧走 `billing.milestone.case_fee` 做三语本地化。
--
-- 幂等：`WHERE milestone_name = '案件報酬'`；第二次执行会 UPDATE 0 rows。
-- 与 040 的关系：040 仍使用 `案件報酬` 字面量 INSERT（已发布，不可回改），
--   041 顺序在 040 之后、每次执行都会把 040 遗留的 `案件報酬` 拉回到 `case_fee`。
UPDATE billing_records
SET
  milestone_name = 'case_fee',
  updated_at = now()
WHERE milestone_name = '案件報酬';
