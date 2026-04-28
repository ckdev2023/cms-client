# BMV 真相源迁移 / Backfill / 回归方案

> **冻结日期**：2026-04-25
> **状态**：Batch 0 基线冻结
> **Todo ID**：`p1-sv-000-03-migration-backfill-and-regression-plan`
> **用途**：为 P1 落地期间 BMV 真相源的 DDL 变更、历史数据回填与回归验证提供可执行方案，避免历史数据口径漂移。
> **上游文档**：
> - [p1-sv-000-01-bmv-source-of-truth-freeze](./p1-sv-000-01-bmv-source-of-truth-freeze.md)
> - [p1-sv-000-02-bmv-schema-and-readwrite-ownership](./p1-sv-000-02-bmv-schema-and-readwrite-ownership.md)
> **权威来源**：
> - [P0/07-数据模型设计 §7](../../docs/gyoseishoshi_saas_md/P0/07-数据模型设计.md)
> - [P1/02-经营管理签技术落地清单 §3](../../docs/gyoseishoshi_saas_md/P1/02-经营管理签技术落地清单.md)

---

## 0. 速查

| 维度 | 内容 | 对应节 |
|------|------|--------|
| 需要的新 migration | 3 个 DDL migration + 1 个 seed migration | §1 |
| 已有 BMV 字段状态 | cases 表 BMV 字段已由 013/014 创建；无需 backfill | §2 |
| 待建表 | `case_templates` + `case_workflow_steps` + `cases` 新增 2 列 | §1.1–1.3 |
| Backfill 策略 | 仅需 seed CaseTemplate 行；现有数据无需回填 | §3 |
| 回归验证 | 8 个回归检查点 | §4 |
| 风险与缓解 | 4 个风险项 | §5 |

---

## 1. 需要的新 Migration

### 1.1 Migration 023: `case_templates` 表

**目标**：创建 `case_templates` 表，承载 P0 两类预置模板和 P1 经营管理签模板。

```sql
-- 023_case_templates.up.sql
create table if not exists case_templates (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id),
  template_name text not null,
  case_type text not null,
  application_type text,
  requirement_blueprint jsonb,
  default_tasks_blueprint jsonb,
  validation_ruleset_ref jsonb,
  review_required_flag boolean not null default false,
  billing_gate_mode text not null default 'warn',
  workflow_steps_blueprint jsonb,
  extra_fields_schema jsonb,
  reminder_schedule_blueprint jsonb,
  active_flag boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_case_templates_org
  on case_templates(org_id);
create index if not exists idx_case_templates_case_type
  on case_templates(org_id, case_type);
```

**Down**：`drop table if exists case_templates;`

**RLS**：复用现有 `tenant_isolation_policy` 模式（`org_id = current_setting('app.org_id')::uuid`）。

### 1.2 Migration 024: `case_workflow_steps` 表 + `cases` 新增列

**目标**：创建 `case_workflow_steps` 表，并在 `cases` 表补 `current_workflow_step` 和 `extra_fields` 列。

```sql
-- 024_case_workflow_steps.up.sql
create table if not exists case_workflow_steps (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id),
  case_id uuid not null references cases(id),
  template_id uuid references case_templates(id),
  step_code text not null,
  step_label text not null,
  parent_stage text,
  status text not null default 'active',
  entered_at timestamptz,
  exited_at timestamptz,
  entered_by uuid references users(id),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_case_workflow_steps_case
  on case_workflow_steps(case_id);
create index if not exists idx_case_workflow_steps_case_status
  on case_workflow_steps(case_id, status);
create unique index if not exists idx_case_workflow_steps_case_step_active
  on case_workflow_steps(case_id, step_code) where status = 'active';
create index if not exists idx_case_workflow_steps_org
  on case_workflow_steps(org_id);

-- cases 表补 P1 冗余列
alter table cases add column if not exists current_workflow_step text;
alter table cases add column if not exists extra_fields jsonb;
```

**Down**：
```sql
alter table cases drop column if exists extra_fields;
alter table cases drop column if exists current_workflow_step;
drop table if exists case_workflow_steps;
```

**RLS**：同 023，复用 `tenant_isolation_policy` 模式。

### 1.3 Migration 025: BMV 模板 Seed

**目标**：为每个组织 seed 经营管理签模板行（含 `workflow_steps_blueprint`、`extra_fields_schema`）。

**策略**：seed migration 使用 `INSERT ... ON CONFLICT DO NOTHING`，确保幂等。P0 两类模板（家族滞在、技人国）的三个 blueprint 字段均为 `null`。

```sql
-- 025_seed_case_templates.up.sql
-- 此 migration 为组织 seed 预置模板；
-- 生产环境若组织数量大，应改为应用层 seed 脚本。

-- P0 模板（blueprint 为 null，降级运行）
insert into case_templates (org_id, template_name, case_type, application_type, billing_gate_mode)
select o.id, '家族滞在', 'family_stay', null, 'warn'
from organizations o
where not exists (
  select 1 from case_templates ct
  where ct.org_id = o.id and ct.case_type = 'family_stay'
);

insert into case_templates (org_id, template_name, case_type, application_type, billing_gate_mode)
select o.id, '技術・人文知識・国際業務', 'engineer_specialist', null, 'warn'
from organizations o
where not exists (
  select 1 from case_templates ct
  where ct.org_id = o.id and ct.case_type = 'engineer_specialist'
);

-- P1 经营管理签模板（含 blueprint）
-- workflow_steps_blueprint / extra_fields_schema / reminder_schedule_blueprint
-- 具体 JSON 内容由 p1-sv-001-01 定义
```

**Down**：`delete from case_templates where case_type in ('family_stay', 'engineer_specialist', 'business_manager');`

### 1.4 执行顺序与依赖

```
022_groups_and_case_group（已有）
  ↓
023_case_templates（新增）
  ↓
024_case_workflow_steps（新增，依赖 023 的 case_templates 表）
  ↓
025_seed_case_templates（新增，依赖 023）
```

---

## 2. 已有 BMV 字段现状

### 2.1 013/014 创建的字段

以下字段已由 migration 013 和 014 创建在 `cases` 表上，**无需回填**：

| 列 | Migration | 默认值 | 现有数据状态 |
|-----|-----------|--------|------------|
| `stage` | 013 | `null` | P0 案件已正常写入 S1–S9 |
| `post_approval_stage` | 013 | `'none'` | 非 BMV 案件维持 `none` |
| `application_flow_type` | 013 | `'standard'` | 非 BMV 案件维持 `standard` |
| `visa_plan` | 013 | `null` | 非 BMV 案件维持 `null` |
| `supplement_count` | 013 | `0` | 非 BMV 案件维持 `0` |
| `coe_issued_at` | 013 | `null` | 非 BMV 案件维持 `null` |
| `coe_expiry_date` | 013 | `null` | 非 BMV 案件维持 `null` |
| `coe_sent_at` | 013 | `null` | 非 BMV 案件维持 `null` |
| `close_reason` | 013 | `null` | P0 结案案件可能已有值 |
| `result_outcome` | 014 | `null` | P0 已出结果案件可能已有值 |
| `quote_price` | 014 | `null` | P0 案件可能已有值 |
| `overseas_visa_start_at` | 014 | `null` | 非 BMV 案件维持 `null` |
| `entry_confirmed_at` | 014 | `null` | 非 BMV 案件维持 `null` |

### 2.2 Customer bmvProfile

`base_profile.bmvProfile` JSONB 键已有实现（`customers.bmv.ts`）。对于从未触发 BMV action 的客户，该键不存在；`resolveCustomerBmvProfile` 读取时返回 `null`，UI 展示为"未开始"。**无需回填**。

### 2.3 residence_periods 表

已由 013 创建。现有数据可能已有 P0 手动录入的记录。**无需回填**；P1 启用自动提醒链路时，只对新写入的记录触发 Reminder 生成。

---

## 3. Backfill 策略

### 3.1 需要 Backfill 的场景

| 场景 | 策略 | 时机 |
|------|------|------|
| `case_templates` 表空表 → 需要 seed | migration 025 seed 预置模板行 | migration 执行时 |
| 已有 P0 案件无 `case_type → template_id` 关联 | 不回填；P0 案件不绑定 template | — |
| 已有 ResidencePeriod 无 Reminder | 不回填；P1 启用后只对新记录触发 | — |

### 3.2 不需要 Backfill 的场景

| 场景 | 原因 |
|------|------|
| 已有案件的 `current_workflow_step` / `extra_fields` 为 null | P0 案件不启用业务子步骤 |
| 已有客户的 `bmvProfile` 不存在 | `resolveCustomerBmvProfile` 已处理缺失情况 |
| 已有案件的 BMV 字段（visa_plan 等）为 null | 非 BMV 案件正确地维持 null |

---

## 4. 回归验证检查点

### 4.1 Migration 执行后检查

| # | 检查项 | SQL / 命令 | 预期结果 |
|---|--------|-----------|---------|
| R1 | `case_templates` 表存在且结构正确 | `\d case_templates` | 含所有 §1.1 定义的列 |
| R2 | `case_workflow_steps` 表存在且结构正确 | `\d case_workflow_steps` | 含所有 §1.2 定义的列 |
| R3 | `cases` 表新增列存在 | `select current_workflow_step, extra_fields from cases limit 1` | 列存在，值为 null |
| R4 | P0 模板已 seed | `select count(*) from case_templates where case_type in ('family_stay', 'engineer_specialist')` | 每组织 2 行 |
| R5 | RLS 生效 | 用不同 org_id 查询 case_templates | 只能看到本组织数据 |

### 4.2 功能回归检查

| # | 检查项 | 测试方式 | 预期结果 |
|---|--------|---------|---------|
| R6 | P0 案件 CRUD 不受影响 | 运行现有 `cases.service.test.ts` | 全部通过 |
| R7 | Customer BMV action 不受影响 | 运行现有 `customers.bmv.test.ts`（如有） | 全部通过 |
| R8 | `npm run guard` 通过 | `npm run fix && npm run guard` | 零失败 |

### 4.3 口径漂移检查

| # | 风险 | 验证方式 |
|---|------|---------|
| D1 | P0 案件意外绑定 template | `select count(*) from cases where current_workflow_step is not null` → 应为 0 |
| D2 | 已有客户 bmvProfile 被意外修改 | 对比 migration 前后 `select base_profile from customers limit 10` |
| D3 | 已有 billing 缓存字段被意外修改 | 对比 migration 前后 `select deposit_paid_cached, final_payment_paid_cached from cases where deposit_paid_cached = true` |

---

## 5. 风险与缓解

| # | 风险 | 严重性 | 缓解 |
|---|------|--------|------|
| 1 | Migration 024 ALTER TABLE 在大表上可能锁表 | Medium | `alter table ... add column if not exists` 是 PG 的低锁操作（nullable 列无默认值），对生产流量影响极低 |
| 2 | Seed migration 在多组织环境下运行时间不可控 | Low | 使用 `INSERT ... WHERE NOT EXISTS` 确保幂等；若组织数量大改为应用层 seed |
| 3 | Drizzle schema 与 migration 不同步导致类型错误 | Medium | migration 提交后立即同步 `schema.ts` 和 `coreEntities.ts`；`npm run guard` 门禁 |
| 4 | P1 模板 blueprint JSON 结构未经校验即写入 | Medium | seed migration 使用 hardcoded JSON；后续通过 service 层 Zod schema 校验运行时写入 |

---

## 5.1 P0 Lead/Conv 対接計画交叉引用

> **関連計画**：咨询会话 P0/P1 対接計画（Cursor Plan `咨询会话p0p1対接_da523116`）

対接計画 Phase A–D 引入 4 个新 migration（`027_leads_p0`、`028_conversations_admin`、`029_messages_extensions`、`030_intake_form_kind`），编号顺延于本文 §1 定义的 023–025 序列之后。

| 対接計画 Migration | 依赖本文的节 | 约束说明 |
|-------------------|-------------|---------|
| `027_leads_p0.up.sql`（Phase A1） | §1.4（执行顺序） | 编号 027 排在 025 seed 之后；不修改 023–025 已落的表 |
| `028_conversations_admin.up.sql`（Phase C1） | §2.2（Customer bmvProfile 无需回填） | conversations 新增 `customer_id/case_id` 列，不触发 customers 表回填 |
| `029_messages_extensions.up.sql`（Phase C2） | — | 独立于 BMV schema，不影响本文已有的回归检查点 |
| `030_intake_form_kind.up.sql`（Phase D1） | §4.1（回归检查 R6–R8） | 新增 `form_kind` 列后，必须通过本文 R6（P0 案件 CRUD 不受影响）+ R8（`npm run guard`） |

---

## 6. 执行清单

| 步骤 | 动作 | 关联 Todo |
|------|------|----------|
| 1 | 创建 023 migration（`case_templates` 表） | `p1-sv-001-01` |
| 2 | 同步 Drizzle `schema.ts` 和 `coreEntities.ts` | `p1-sv-001-01` |
| 3 | 运行回归检查 R1–R5 | `p1-sv-001-01` 收尾 |
| 4 | 创建 024 migration（`case_workflow_steps` + `cases` 列） | 后续 Batch 4 |
| 5 | 创建 025 seed migration（P0 + P1 模板数据） | 后续 Batch 4 |
| 6 | 运行回归检查 R6–R8 + D1–D3 | 后续 Batch 4 收尾 |
| 7 | `npm run fix && npm run guard` | 每个 migration PR 必须 |
