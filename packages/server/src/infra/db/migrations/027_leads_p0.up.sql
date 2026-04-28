-- 027_leads_p0: P0 咨询线索域扩展 — 字段补齐 + lead_followups + lead_logs + 索引 + assigned_user_id→owner_user_id 收敛
-- 对应计划 Phase A1；权威：P0/06-页面规格/咨询线索.md + P0/07-数据模型设计.md §3.1

-- ============================================================
-- 1. leads 表：补齐 P0 规格缺失的 ~13 个核心字段
-- ============================================================

ALTER TABLE leads ADD COLUMN IF NOT EXISTS lead_no text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS source_channel text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS referrer text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS intended_case_type text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES groups(id);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS next_action text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS next_follow_up_at timestamptz;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS quote_amount numeric(12,2);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS note text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS lost_reason text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS converted_customer_id uuid REFERENCES customers(id);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS converted_case_id uuid REFERENCES cases(id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_leads_lead_no
  ON leads(lead_no) WHERE lead_no IS NOT NULL;

-- ============================================================
-- 2. assigned_user_id → owner_user_id 收敛
--    portal 写入侧历史数据使用 assigned_user_id；
--    P0 规格统一为 owner_user_id。
--    本迁移 rename 列，并创建兼容视图保留一个版本，
--    下个迁移（028+）再删除兼容视图。
-- ============================================================

ALTER TABLE leads RENAME COLUMN assigned_user_id TO owner_user_id;

-- 兼容视图：查询侧仍能通过 assigned_user_id 访问
CREATE OR REPLACE VIEW leads_v1_compat AS
  SELECT *, owner_user_id AS assigned_user_id
  FROM leads;

-- assigned_org_id 与 org_id 收敛说明：
--   leads 表同时存在 org_id（可为空，建 lead 时未分配）和 assigned_org_id
--   （分配后写入，RLS 策略基于此列）。portal 写入侧默认保持
--   org_id = assigned_org_id 同步写；admin 侧接口统一读 assigned_org_id。
--   后续独立迁移按需清理为单列。

-- ============================================================
-- 3. status CHECK 约束
--    合法值：new / following / pending_sign / signed / converted_case / lost
--    支持 lost→following 复活路径
-- ============================================================

-- 先回填不合法的旧状态值到 'new'，避免 CHECK 冲突
UPDATE leads
SET status = 'new'
WHERE status NOT IN ('new', 'following', 'pending_sign', 'signed', 'converted_case', 'lost');

ALTER TABLE leads
  ADD CONSTRAINT leads_status_chk
  CHECK (status IN ('new', 'following', 'pending_sign', 'signed', 'converted_case', 'lost'));

-- lost_reason 必填约束：status = 'lost' 时 lost_reason 不可为空
ALTER TABLE leads
  ADD CONSTRAINT leads_lost_reason_chk
  CHECK (status <> 'lost' OR lost_reason IS NOT NULL);

-- ============================================================
-- 4. lead_followups 表（跟进记录）
-- ============================================================

CREATE TABLE IF NOT EXISTS lead_followups (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id         uuid NOT NULL REFERENCES leads(id),
  channel         text NOT NULL CHECK (channel IN ('phone', 'email', 'wechat', 'line', 'onsite', 'other')),
  summary         text,
  conclusion      text,
  next_action     text,
  next_follow_up_at timestamptz,
  created_by      uuid REFERENCES users(id),
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 5. lead_logs 表（线索日志 — 页面派生视图）
--    事实源为 timeline_logs，lead_logs 便于详情页快速查询。
--    写入时由服务端同事务双写。
-- ============================================================

CREATE TABLE IF NOT EXISTS lead_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id     uuid NOT NULL REFERENCES leads(id),
  log_type    text NOT NULL,
  payload     jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by  uuid REFERENCES users(id),
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 6. 索引
-- ============================================================

-- leads 主表
CREATE INDEX IF NOT EXISTS idx_leads_owner_status
  ON leads(owner_user_id, status) WHERE owner_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_leads_group_status
  ON leads(group_id, status) WHERE group_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_leads_phone
  ON leads(phone) WHERE phone IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_leads_email
  ON leads(email) WHERE email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_leads_created_at_desc
  ON leads(created_at DESC);

-- lead_followups
CREATE INDEX IF NOT EXISTS idx_lead_followups_lead
  ON lead_followups(lead_id, created_at DESC);

-- lead_logs
CREATE INDEX IF NOT EXISTS idx_lead_logs_lead_created_desc
  ON lead_logs(lead_id, created_at DESC);

-- ============================================================
-- 7. RLS — lead_followups / lead_logs
--    leads 本身已有 RLS（008_portal_rls），此处仅对新表启用。
--    lead_followups / lead_logs 通过 lead_id 关联 leads 表，
--    使用 EXISTS 子查询继承 leads 的 org 隔离。
-- ============================================================

ALTER TABLE lead_followups ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_followups FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS org_isolation ON lead_followups;
CREATE POLICY org_isolation ON lead_followups
  USING (
    EXISTS (
      SELECT 1 FROM leads l
      WHERE l.id = lead_followups.lead_id
        AND l.assigned_org_id = app_current_org_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM leads l
      WHERE l.id = lead_followups.lead_id
        AND l.assigned_org_id = app_current_org_id()
    )
  );

ALTER TABLE lead_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_logs FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS org_isolation ON lead_logs;
CREATE POLICY org_isolation ON lead_logs
  USING (
    EXISTS (
      SELECT 1 FROM leads l
      WHERE l.id = lead_logs.lead_id
        AND l.assigned_org_id = app_current_org_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM leads l
      WHERE l.id = lead_logs.lead_id
        AND l.assigned_org_id = app_current_org_id()
    )
  );
