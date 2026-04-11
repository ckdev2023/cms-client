-- 014_case_truth: 对齐 P0 Case 语义 — 缺失字段补齐 + 语义修正
-- 对应 P0/03 §2.7, §6.3F, §15.1; P0/07 §3.5

-- ============================================================
-- 1. 补齐 P0 缺失的 Case 字段
-- ============================================================

-- 结果性质（approved / rejected / withdrawn）
ALTER TABLE cases ADD COLUMN IF NOT EXISTS result_outcome text;

-- 客制化报价金额（从 Lead 转化时继承）
ALTER TABLE cases ADD COLUMN IF NOT EXISTS quote_price numeric(15,2);

-- 收费缓存字段（事实来源为 BillingPlan + PaymentRecord，服务端同步写入）
ALTER TABLE cases ADD COLUMN IF NOT EXISTS deposit_paid_cached boolean NOT NULL DEFAULT false;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS final_payment_paid_cached boolean NOT NULL DEFAULT false;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS billing_unpaid_amount_cached numeric(15,2) NOT NULL DEFAULT 0;

-- 欠款风险确认字段（P0-CONTRACT §13.3: 存储在 Case 实体上）
ALTER TABLE cases ADD COLUMN IF NOT EXISTS billing_risk_acknowledged_by uuid REFERENCES users(id);
ALTER TABLE cases ADD COLUMN IF NOT EXISTS billing_risk_acknowledged_at timestamptz;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS billing_risk_ack_reason_code text;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS billing_risk_ack_reason_note text;

-- 欠款风险确认凭证文件（P0-CONTRACT §13.3: 确认人/原因/凭证/时间/金额）
ALTER TABLE cases ADD COLUMN IF NOT EXISTS billing_risk_ack_evidence_url text;

-- 下签后子阶段时间戳补齐
ALTER TABLE cases ADD COLUMN IF NOT EXISTS overseas_visa_start_at timestamptz;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS entry_confirmed_at timestamptz;

-- ============================================================
-- 2. 索引
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_cases_result_outcome
  ON cases(org_id, result_outcome) WHERE result_outcome IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cases_billing_risk
  ON cases(org_id, billing_risk_acknowledged_at)
  WHERE billing_risk_acknowledged_at IS NULL;

-- NOTE: case_stage_history 表由 015_case_stage_history.up.sql 创建（含 RLS）
