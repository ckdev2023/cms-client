# 07 — Schema ↔ Migration 矩阵 (B-004)

> 范围：`packages/server/src/infra/db/drizzle/schema.ts`（Drizzle 元数据） vs `packages/server/src/infra/db/migrations/*.sql`（SQL 真源）。
> 来源：`grep pgTable`（schema.ts 22 条命中）+ 逐文件 grep `create table` / `alter table` / `enable row level security` / `create policy` / `deleted_at`（迁移目录）。
> 标注：**[H]** High / **[M]** Medium / **[L]** Low confidence。

## 0. 总览

- 迁移文件数：**42 编号**（001..042），其中 007+ 为成对 `*.up.sql` / `*.down.sql`（001..006 为单文件，无 down）。 **[H]**
- Drizzle `schema.ts` 中 `pgTable(...)` 计数：**22**（schema.ts 共 1244 行）。 **[H]**
- 迁移中 `create table` 命中：**29 张表**（含系统表 `schema_migrations`）。 **[H]**
- 关键事实：**~28 张业务表 vs Drizzle 仅声明 22 张** — 至少 **8 张表不在 Drizzle schema 中**（见 §3）。 **[H]**

## 1. Drizzle schema.ts 中的表（22 张）

| # | TS export | DB table | 引入 migration |
|---|-----------|----------|----------------|
| 1 | organizations | organizations | 001_init |
| 2 | users | users | 001_init |
| 3 | customers | customers | 001_init |
| 4 | cases | cases | 001_init |
| 5 | documentItems | document_items | 001_init |
| 6 | companies | companies | 009_core_entities |
| 7 | contactPersons | contact_persons | 009_core_entities |
| 8 | caseParties | case_parties | 009_core_entities |
| 9 | documentFiles | document_files | 009_core_entities |
| 10 | communicationLogs | communication_logs | 009_core_entities |
| 11 | generatedDocuments | generated_documents | 009_core_entities |
| 12 | residencePeriods | residence_periods | 013_business_manager_visa |
| 13 | caseStageHistory | case_stage_history | 015_case_stage_history |
| 14 | documentAssets | document_assets | 017_documents_truth |
| 15 | documentRequirementFileRefs | document_requirement_file_refs | 017_documents_truth |
| 16 | submissionPackages | submission_packages | 017_documents_truth |
| 17 | submissionPackageItems | submission_package_items | 017_documents_truth |
| 18 | validationRuns | validation_runs | 020_validation_review_truth |
| 19 | reviewRecords | review_records | 020_validation_review_truth |
| 20 | groups | groups | 022_groups_and_case_group |
| 21 | userGroupMemberships | user_group_memberships | 022_groups_and_case_group |
| 22 | caseTemplates | case_templates | 023_case_templates |

**[H]** 逐行 grep 比对一致。

## 2. 未在 Drizzle schema.ts 中的业务表（8 张 + 1 系统表）

> 这些表通过 **raw SQL via `tenantDb`** 访问（见 02 / 03 文档对 `tenantDb.ts` 的扇入分析）。

| DB table | 引入 migration | 主要 service 入口 | 备注 |
|----------|----------------|---------------------|------|
| schema_migrations | 001_init | 迁移 runner 自管 | 系统元数据 |
| timeline_logs | 001_init（+ 003_timeline_triggers 触发器） | TimelineService | 跨域 audit/事件流 **[H]** |
| reminders | 001_init（+ 016 alter） | RemindersService | 提醒域 **[H]** |
| feature_flags | 001_init | FeatureFlagsService | flags 模块 **[H]** |
| template_versions | 003_templates | TemplatesService | P0 模板版本 **[H]** |
| template_releases | 003_templates | TemplatesService | 模板发布 **[H]** |
| jobs | 005_jobs | JobsService | 后台作业入队记录 **[H]** |
| app_users | 007_portal | AppUsersService（portal） | C 端用户 **[H]** |
| leads | 007_portal（+ 027 alter / 新增字段） | LeadsService / LeadsAdminService | 线索 **[H]** |
| conversations | 007_portal（+ 028 alter） | Conversations* | C 端会话 **[H]** |
| messages | 007_portal（+ 029 alter） | MessagesService | C 端消息 **[H]** |
| user_documents | 007_portal | UserDocumentsService | C 端用户文档 **[H]** |
| intake_forms | 007_portal（+ 030 form_kind） | IntakeService | 在线问卷 **[H]** |
| tasks | 009_core_entities | TasksService | 任务 **[H]** |
| billing_records | 009_core_entities（+ 016, 018, 040, 041 alter/backfill） | BillingPlansService / BillingCollectionsService / BillingSummaryService | API 名 `billing-plans` / `billing-collections` / `billing-summary` 三个 controller 均落到此表 **[H]** |
| payment_records | 009_core_entities（+ 016 alter） | PaymentRecordsService | 收款记录 **[H]** |
| lead_followups | 027_leads_p0 | LeadsService | 线索跟进 **[H]** |
| lead_logs | 027_leads_p0 | LeadsService / LeadsAdminService | 线索操作日志 **[H]** |

> **观察 O-1**：13 张业务表 **绕过 Drizzle ORM** 直接走 raw SQL；这是一处显著的不一致，可能影响：列变更检测、类型安全、单测 mock 复杂度。**[H]**（已并入 OQ-26）

## 3. RLS 演进时序

| 阶段 | migration | 覆盖表 | 是否 FORCE |
|------|-----------|--------|------------|
| Wave-1 初始 | 002_rls | cases, customers, document_items, feature_flags, reminders, timeline_logs, users | ❌ 仅 ENABLE **[H]** |
| Wave-2 | 004_templates_rls | template_versions, template_releases | ❌ ENABLE only **[H]** |
| Wave-3 | 006_jobs_rls | jobs | ❌ ENABLE only **[H]** |
| Wave-4 portal | 008_portal_rls | conversations, leads, messages, user_documents | ✅ FORCE **[H]** |
| Wave-5 core | 010_core_entities_rls | billing_records, case_parties, communication_logs, companies, contact_persons, document_files, generated_documents, payment_records, tasks | ✅ FORCE **[H]** |
| Wave-6 truth | 019_truth_tables_rls | document_assets, document_requirement_file_refs, residence_periods, submission_package_items, submission_packages | ✅ FORCE **[H]** |
| 单点补丁 | 015_case_stage_history（包含 RLS） | case_stage_history | ✅ FORCE **[H]** |
| 单点补丁 | 022_groups_and_case_group（包含 RLS） | groups, user_group_memberships | ✅ FORCE **[H]** |
| 单点补丁 | 027_leads_p0（包含 RLS） | lead_followups, lead_logs | ✅ FORCE **[H]** |

- **未在 RLS 列表中**：`organizations`、`schema_migrations`、`app_users`、`intake_forms`、`case_templates`。 **[M]**
  - `organizations` 是租户根，自身不需要 org_isolation；
  - `app_users` / `intake_forms` 是 portal 表，**未发现 RLS 启用语句** → 见 OQ-27；
  - `case_templates` 是全局/租户参数表，是否启用 RLS 待确认 → 见 OQ-28。

## 4. soft-delete / audit 演进

- **soft-delete (`deleted_at`)**：仅 011_core_entities_soft_delete 命中，覆盖 **companies + contact_persons** 两张表；其它表均未引入 `deleted_at` 列（基于 grep）。 **[H]**
- **audit / 索引**：012_add_audit_and_indexes
  - `communication_logs.updated_at` 列补齐（NOT NULL DEFAULT now()）
  - 大量 FK btree 索引（cases.{org_id,customer_id,owner_user_id,company_id,assistant_user_id}, communication_logs.*, companies.*, customers.org_id, users.org_id）— 与 Drizzle `.references()` 对齐。 **[H]**

## 5. truth-alignment / 业务语义演进

> 命名一致采用 `*_truth.up.sql` 表示"对齐 P0 数据真源"。

| migration | 主旨 | 影响表 |
|-----------|------|--------|
| 014_case_truth | P0 case 字段补齐与语义修正 | cases |
| 016_billing_reminders_truth | billing/payment/reminder P0 对齐 | billing_records, payment_records, reminders |
| 017_documents_truth | 文档资产/需求引用/提交包 表族 | document_assets, document_requirement_file_refs, submission_packages, submission_package_items, document_items, document_files |
| 018_billing_gate_block | 计费阻断门 | billing_records |
| 020_validation_review_truth | 验收/复核 | validation_runs, review_records, submission_packages |

## 6. 单点 alter / 字段演进（25..036）

- 024_case_workflow_step — `cases` 增加 workflow step
- 025_document_items_survey_data — `document_items` 增加 survey 数据
- 026_residence_period_extensions — `residence_periods` 扩展
- 028_conversations_admin — `conversations` 后台镜像所需列
- 029_messages_extensions — `messages` 扩展
- 030_intake_form_kind — `intake_forms.form_kind`
- 031_billing_admin_indexes — billing 相关索引
- 032_business_phase — `cases.business_phase`（双层状态机引入）**[H]**
- 033_customer_numbers — `customers.base_profile.customerNumber` 唯一索引
- 036_document_assets_uniqueness — `document_assets` 唯一索引

## 7. backfill 系列（034..042）

- 034 backfill_customer_profile / 035 phase_terminal_stage_backfill / 037 backfill_cases_group_id_v2 / 038 backfill_customer_bmv_profile / 039 backfill_primary_applicant_case_parties / 040 backfill_billing_plans_from_quote_price / 042 phase_stage_consistency_backfill。
- 041_rename_case_fee_milestone：`案件報酬` → `case_fee`，BUG-186 修复（i18n raw 渲染漏出）。
- 与 003_timeline_triggers 一并构成"**纯 SQL 业务逻辑**"风险源 → 见 04-risk-hotspots.md / OQ-29。

## 8. 关键不一致与待确认（已入 OQ）

- **OQ-26**（新）：13 张业务表（含 portal、billing/payment、tasks、reminders、timeline_logs、jobs、templates）**未在 Drizzle schema.ts** 中声明；后续是否要统一？影响 `npm run guard`、column drift 检测策略。
- **OQ-27**（新）：`app_users` / `intake_forms` 是否启用 RLS？grep 未命中；与 portal 其它表 FORCE RLS 形成对比。
- **OQ-28**（新）：`case_templates`（023）是否启用 RLS？需要查看 023_case_templates.up.sql 全文。
- **OQ-29**（新）：003_timeline_triggers.sql 内含 PL/pgSQL 触发器，构成"DB 端业务逻辑"，需单独审计。
- **OQ-30**（新）：billing API 三 controller（billing-plans / billing-collections / billing-summary）共用单表 `billing_records` — 是否存在按 view 拆分的隐式假设？

## 9. 观察（中性）

- O-1：truth 系列（014/016/017/018/020）+ backfill 系列（034..042）显示**业务语义经历过显著重写**；现 schema 是 P0 收敛版。 **[H]**
- O-2：RLS 引入分 6 波；早期仅 ENABLE，第 4 波（008 portal）开始一律 FORCE。这是**租户隔离硬度的提升节点**。 **[H]**
- O-3：`schema.ts` 仅覆盖通过 Drizzle ORM 操作的表；raw SQL 表的 schema 真源**只在 migration 文件中**，无类型对齐保护。**[H]**
- O-4：13 张未声明表对应的 service 数量与 03/05 文档中 service 行数热点高度重合（cases.service / billing / portal 系列）→ 与 cases.service.ts 巨大体量原因相符（大量 raw SQL）。 **[H]**
