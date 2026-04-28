# BMV 字段 Schema 落点、读模型归属与双写禁止边界

> **冻结日期**：2026-04-25
> **状态**：Batch 0 基线冻结
> **Todo ID**：`p1-sv-000-02-bmv-schema-and-readwrite-ownership`
> **用途**：明确经营管理签（BMV）相关字段的 DB schema 落点（DDL / JSON / 通用配置）、server 读模型聚合归属、admin 读模型消费边界与双写禁止规则。后续 Batch 4（P1-A）和 Batch 5（P1-B）在修改 schema 或新增读模型前必须引用本文。
> **前置文档**：[p1-sv-000-01-bmv-source-of-truth-freeze](./p1-sv-000-01-bmv-source-of-truth-freeze.md)
> **上游基线**：[p0-authority-baseline §9](./p0-authority-baseline.md)、[p0-sv-002a-case-group-source-of-truth](./p0-sv-002a-case-group-source-of-truth.md)
> **权威来源**：
> - [P0/07-数据模型设计 §3.5 / §3.8 / §3.9 / §3.24 / §3.25 / §7](../../docs/gyoseishoshi_saas_md/P0/07-数据模型设计.md)
> - [P1/02-经营管理签技术落地清单 §3](../../docs/gyoseishoshi_saas_md/P1/02-经营管理签技术落地清单.md)
> - migration `013_business_manager_visa.up.sql`
> - [Phase 4: P1-001 bmvProfile persistence](../../plan/customer-module/05-phase-4/P1-001-bmv-profile-persistence.md)

---

## 0. 速查

| 维度 | 冻结口径 | 对应节 |
|------|---------|--------|
| Schema 分层 | DDL 列（cases 表）、JSONB 嵌套（customers.base_profile）、通用配置（template_versions）、待创建表（case_workflow_steps） | §1 |
| Server 读模型归属 | 3 个聚合 DTO 各自拥有唯一组装者 | §2 |
| Admin 读模型消费 | adapter 层消费 server DTO，不直接查 DB | §3 |
| 双写禁止细则 | 12 项具体禁令（补充 000-01 的 7 项总则） | §4 |
| P0 → P1 扩展协议 | P1 追加字段不删改 P0 已有属性 | §5 |
| 现有 schema 盘点 | 4 层 schema 现状与缺口 | §6 |

---

## 1. Schema 落点

### 1.1 Schema 分层总览

```
┌─────────────────────────────────────────────────────────────┐
│ Layer 1: DDL 列 (cases table)                               │
│   visa_plan, quote_price, supplement_count,                 │
│   post_approval_stage, application_flow_type,               │
│   coe_issued_at, coe_expiry_date, coe_sent_at,             │
│   close_reason, overseas_visa_start_at, entry_confirmed_at  │
├─────────────────────────────────────────────────────────────┤
│ Layer 2: JSONB 嵌套 (customers.base_profile.bmvProfile)     │
│   questionnaireStatus, quoteStatus, signStatus,             │
│   intakeStatus (derived), timestamps, note                  │
├─────────────────────────────────────────────────────────────┤
│ Layer 3: 通用配置 (template_versions / template_releases)   │
│   workflow_steps_blueprint, extra_fields_schema,            │
│   requirement_blueprint, reminder_schedule_blueprint,       │
│   billing_gate_mode, review_required_flag                   │
├─────────────────────────────────────────────────────────────┤
│ Layer 4: DDL 表 (residence_periods — 已存在)                │
│   visa_type, status_of_residence, period_years,             │
│   valid_from, valid_until, card_number, is_current          │
├─────────────────────────────────────────────────────────────┤
│ Layer 5: DDL 表 (case_workflow_steps — P1 待创建)           │
│   step_code, status, parent_stage, started_at, completed_at │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Layer 1：cases 表 DDL 列

| DB 列名 | Drizzle 定义 | TS Entity 属性 | DDL 来源 | 读写状态 |
|---------|-------------|---------------|---------|---------|
| `visa_plan` | `text("visa_plan")` | `Case.visaPlan: string \| null` | 013 migration | 读：✅ `mapCaseRow` / 写：⚠️ 无 API |
| `quote_price` | `numeric("quote_price", { precision: 15, scale: 2 })` | `Case.quotePrice: number \| null` | 013 migration | 读：✅ / 写：✅ create/update |
| `supplement_count` | `integer("supplement_count").notNull().default(0)` | `Case.supplementCount: number` | 013 migration | 读：✅ / 写：⚠️ 无 API |
| `post_approval_stage` | `text("post_approval_stage").notNull().default("none")` | `Case.postApprovalStage: string \| null` | 013 migration | 读：✅ / 写：✅ dedicated endpoint |
| `application_flow_type` | `text("application_flow_type").notNull().default("standard")` | `Case.applicationFlowType: string \| null` | 013 migration | 读：✅ / 写：⚠️ 无 API |
| `coe_issued_at` | `timestamp("coe_issued_at", { withTimezone: true })` | `Case.coeIssuedAt: string \| null` | 013 migration | 读：✅ / 写：⚠️ 无直接 API |
| `coe_expiry_date` | `date("coe_expiry_date", { mode: "string" })` | `Case.coeExpiryDate: string \| null` | 013 migration | 读：✅ / 写：⚠️ 无直接 API |
| `coe_sent_at` | `timestamp("coe_sent_at", { withTimezone: true })` | `Case.coeSentAt: string \| null` | 013 migration | 读：✅ / 写：✅ 联动 via `updatePostApprovalStage` |
| `close_reason` | `text("close_reason")` | `Case.closeReason: string \| null` | 013 migration | 读：✅ / 写：✅ via `transition` (S9) |
| `overseas_visa_start_at` | `timestamp(...)` | `Case.overseasVisaStartAt: string \| null` | 013 migration | 读：✅ / 写：✅ 联动 via `updatePostApprovalStage` |
| `entry_confirmed_at` | `timestamp(...)` | `Case.entryConfirmedAt: string \| null` | 013 migration | 读：✅ / 写：✅ 联动 via `updatePostApprovalStage` |

**Schema 一致性**：Drizzle `schema.ts` 与 migration 013 的列定义一致；`coreEntities.ts` 的 `Case` 类型与 `mapCaseRow()` 的映射一致。`CaseQueryRow` 的 `CASE_COLS` 涵盖所有 BMV 列。

### 1.3 Layer 2：customers.base_profile JSONB

| JSON path | TS 类型 | 读取路径 | 写入路径 |
|-----------|--------|---------|---------|
| `base_profile.bmvProfile.questionnaireStatus` | `CustomerBmvQuestionnaireStatus` | `resolveCustomerBmvProfile()` | `patchBmvProfile()` in `customers.bmv.ts` |
| `base_profile.bmvProfile.quoteStatus` | `CustomerBmvQuoteStatus` | 同上 | 同上 |
| `base_profile.bmvProfile.signStatus` | `CustomerBmvSignStatus` | 同上 | 同上 |
| `base_profile.bmvProfile.intakeStatus` | `CustomerBmvIntakeStatus` | 派生（`resolveBmvIntakeStatus`） | 禁止直接写入 |
| `base_profile.bmvProfile.questionnaireSentAt` | `string \| null` | 同上 | 同上 |
| `base_profile.bmvProfile.questionnaireReturnedAt` | `string \| null` | 同上 | 同上 |
| `base_profile.bmvProfile.quoteGeneratedAt` | `string \| null` | 同上 | 同上 |
| `base_profile.bmvProfile.quoteConfirmedAt` | `string \| null` | 同上 | 同上 |
| `base_profile.bmvProfile.signedAt` | `string \| null` | 同上 | 同上 |
| `base_profile.bmvProfile.note` | `string \| null` | 同上 | 同上 |

**写入 SQL**：`jsonb_set(coalesce(base_profile, '{}'::jsonb) - 'bmv_profile', '{bmvProfile}', $2::jsonb, true)` — 同时清除历史 snake_case key `bmv_profile`，写入 camelCase key `bmvProfile`。

**兼容读取**：`resolveCustomerBmvProfile()` 按优先级读取 `bmvProfile` > `bmv_profile`，确保历史数据可读。

### 1.4 Layer 3：通用配置表 (template_versions / template_releases)

| 配置字段 | 寄宿方式 | kind | key |
|---------|---------|------|-----|
| `workflow_steps_blueprint` | `config` JSON 内 | `"case_type"` | 经管签 type code |
| `extra_fields_schema` | `config` JSON 内 | `"case_type"` | 经管签 type code |
| `requirement_blueprint` | `config` JSON 内 | `"document_checklist"` | 经管签 type code |
| `reminder_schedule_blueprint` | `config` JSON 内 | `"reminder_rule_set"` | 经管签 type code |
| `billing_gate_mode` | `config` JSON 内 | `"case_type"` | 经管签 type code |
| `review_required_flag` | `config` JSON 内 | `"case_type"` | 经管签 type code |

**现状**：`TemplatesService` 以 `kind + key` + 可选 `entityId` 解析配置。P0 已使用 `"document_checklist"` 和 `"state_flow"` 和 `"case_type"` kind。P1 在同一机制下扩展 `config` 字段，不需要新表。

### 1.5 Layer 4：residence_periods 表

| DB 列名 | 类型 | 约束 |
|---------|------|------|
| `id` | `uuid` | PK |
| `org_id` | `uuid` | FK → organizations |
| `case_id` | `uuid` | FK → cases |
| `customer_id` | `uuid` | FK → customers |
| `visa_type` | `text` | NOT NULL |
| `status_of_residence` | `text` | NOT NULL |
| `period_years` | `integer` | nullable |
| `period_label` | `text` | nullable |
| `valid_from` | `date` | NOT NULL |
| `valid_until` | `date` | NOT NULL |
| `card_number` | `text` | nullable |
| `is_current` | `boolean` | NOT NULL, default false |
| `notes` | `text` | nullable |
| `created_by` | `uuid` | FK → users |
| `created_at` / `updated_at` | `timestamptz` | auto |

**现状**：表和 CRUD API 已存在。缺少写入时联动 `Customer.residence_expiry_date` 的逻辑。

### 1.6 Layer 5：case_workflow_steps 表（P1 待创建）

> 引用：07 §3.24

| 计划列名 | 类型 | 说明 |
|---------|------|------|
| `id` | `uuid` | PK |
| `org_id` | `uuid` | FK → organizations |
| `case_id` | `uuid` | FK → cases |
| `template_id` | `uuid \| null` | 来源模板引用 |
| `step_code` | `text` | 步骤标识 |
| `parent_stage` | `text` | 对应 P0 管理层阶段（S1-S9） |
| `status` | `text` | 步骤状态 |
| `sort_order` | `integer` | 排序 |
| `started_at` | `timestamptz` | nullable |
| `completed_at` | `timestamptz` | nullable |
| `created_at` / `updated_at` | `timestamptz` | auto |

**现状**：表不存在。Batch 4 `p1-sv-002` 创建。

---

## 2. Server 读模型归属

### 2.1 读模型聚合 DTO 与唯一组装者

| 读模型 DTO | 唯一组装者 | BMV 字段出口 | P1 扩展点 |
|-----------|-----------|-------------|----------|
| `CustomerSummaryDto` / `CustomerDetailDto` | `customers.dto-mappers.mapCustomerToSummaryDto()` / `mapCustomerToDetailDto()` | `bmvProfile: CustomerBmvProfile \| null` | 无需扩展（字段已稳定） |
| `CaseDetailAggregateDto` | `cases.service.getDetailAggregate()` | `case` 子对象携带所有 BMV DDL 列 | P1 追加 `workflowSteps?: CaseWorkflowStepDto[]`、`residencePeriod?: ResidencePeriodDto` |
| `CaseListItemDto` (via summary) | `cases.service.listCasesSummary()` | `case` 行携带 BMV 列（`quotePrice`, `postApprovalStage` 等） | P1 可追加 `currentWorkflowStep?: string` |

### 2.2 读模型聚合规则

| 规则 | 口径 |
|------|------|
| **单一组装者** | 每个 DTO 类型有且只有一个 service 方法负责组装。admin adapter 禁止从多个端点拼装同一 DTO 的字段。 |
| **P0 属性只增不删** | P1 追加字段时，`CaseDetailAggregateDto` 的 P0 已有属性（`case` / `counts` / `latestValidation` / `latestSubmission` / `latestReview` / `documentProgressByProvider` / `billing` / `deepLink`）不得删除或改名。 |
| **P1 扩展通过可选属性** | 新增字段使用 `?` 可选标记，确保 P0 consumer 无需感知变更。 |
| **聚合内不跨层读取** | `CaseDetailAggregateDto` 不嵌套 `CustomerBmvProfile`；客户级承接状态由客户详情 DTO 独立提供。 |

### 2.3 各 server 模块的 BMV 字段读写职责

| Server 模块 | 读职责 | 写职责 | BMV 字段范围 |
|------------|--------|--------|-------------|
| `customers.service` | 客户列表/详情 DTO 中的 `bmvProfile` | 通过 `customers.bmv.ts` 的 3 个动作函数写入 | Layer 2 全部字段 |
| `customers.dto-mappers` | `resolveCustomerBmvProfile()` 读取 + 默认值合成 | 不直接写入 | Layer 2 读取层 |
| `cases.service` | 案件列表/详情/聚合中的 BMV DDL 列 | `updatePostApprovalStage()`、`transition()`、create/update 中的 `quotePrice` | Layer 1 已实现子集 |
| `cases.controller` | 暴露 API endpoint | 透传到 service | 同上 |
| `residence-periods` 模块 | CRUD 读取 | CRUD 写入 | Layer 4 全部字段 |
| `TemplatesService` | `resolve()` 读取配置 | `createVersion()` / `publishRelease()` 写入 | Layer 3 全部字段 |

---

## 3. Admin 读模型消费边界

### 3.1 admin → server 读取协议

| admin 消费点 | server 端点 | 消费的 BMV 字段 | adapter 入口 |
|-------------|-----------|---------------|-------------|
| 客户详情 BMV 卡片 | `GET /customers/:id` | `bmvProfile.*` | `CustomerAdapterReaders` |
| 建案签约门禁 | `GET /customers/:id` | `bmvProfile.signStatus` | `useCreateCaseModel` |
| 案件详情 overview（下签后） | `GET /cases/:id` (aggregate) | `case.postApprovalStage`, `case.coeSentAt`, `case.entryConfirmedAt` | `CaseAdapterDetailAggregate` |
| 案件详情 在留期间（P1） | `GET /cases/:id` (aggregate, P1 扩展) | `residencePeriod.*`（P1 待追加） | `CaseAdapterDetailAggregate`（P1 扩展） |
| 案件详情 业务子步骤（P1） | `GET /cases/:id` (aggregate, P1 扩展) | `workflowSteps.*`（P1 待追加） | `CaseAdapterDetailAggregate`（P1 扩展） |
| 案件列表 | `GET /cases?view=summary` | `case.quotePrice`, `case.postApprovalStage` | `CaseAdapterMappers.adaptCaseListItemDto` |

### 3.2 admin 读模型不变量

| 规则 | 口径 |
|------|------|
| **Adapter 单一数据源** | 每个 admin view model 只消费一个 server DTO 类型。`useCaseDetailModel` 消费 `CaseDetailAggregateDto`；不额外调用 `GET /customers/:id` 来补充案件详情内的客户数据。 |
| **跨模块数据通过 deepLink** | 案件详情中的客户名称、组名等通过 `CaseDetailAggregateDto.deepLink` 获取，不单独请求客户接口。 |
| **P1 字段使用可选读取** | admin adapter 对 P1 BMV 字段做可选读取（`?.` / `?? null`），确保 P0 运行时不因 P1 字段缺失而崩溃。 |
| **不缓存 bmvProfile** | admin 不在 Vuex/Pinia 等全局 store 中缓存 `bmvProfile`；每次需要时从 server DTO 读取。 |

### 3.3 admin 类型镜像契约

| admin 类型文件 | 镜像的 server 类型 | 同步规则 |
|--------------|-------------------|---------|
| `types-bmv.ts` → `CustomerBmvProfile` | `customers.types.ts` → `CustomerBmvProfile` | 字段名、类型、枚举值必须一致；admin 侧 `resolveBmvIntakeStatus()` 逻辑与 server `resolveCustomerBmvIntakeStatus()` 一致 |
| `types-detail.ts` → `PostApprovalFlow` | `cases.types.ts` → `Case.postApprovalStage` + adapter 展开 | adapter 负责从 `postApprovalStage` 值构建 UI model |
| `types-detail.ts` → `ResidencePeriod` | `residence-periods` 模块 → `ResidencePeriodDto` | P1 追加到 aggregate DTO 后对齐 |
| `types-detail.ts` → `ReminderSchedule` | `reminders` 模块 → `ReminderDto[]` | P1 追加到 aggregate DTO 后对齐 |
| `CaseAdapterTypes.ts` → `CaseCreateInput` / `CaseUpdateInput` | `cases.types.ts` → `CaseCreateInput` / `CaseUpdateInput` | 字段名、可选性必须一致 |

---

## 4. 双写禁止细则

> 补充 [000-01 §7](./p1-sv-000-01-bmv-source-of-truth-freeze.md#7-双写禁止清单) 的 7 项总则，此处细化到具体代码路径。

### 4.1 承接层（Customer）禁令

| # | 禁令 | 违规代码路径示例 | 正确路径 |
|---|------|----------------|---------|
| S1 | admin 不得通过 `PATCH /customers/:id` 的 `base_profile` 字段直接写入 `bmvProfile` | `axios.patch('/customers/x', { baseProfile: { bmvProfile: {...} } })` | 使用 `POST /customers/:id/bmv/send-questionnaire` 等专用端点 |
| S2 | server `customers.service.update()` 不得接受 `bmvProfile` 作为通用 patch 字段 | 在 `updateCustomer()` 中解构 `bmvProfile` 并写入 | BMV 写入只通过 `customers.bmv.ts` 的 3 个动作函数 |
| S3 | 前端不得在 localStorage / sessionStorage / Vuex store 中维护 bmvProfile 状态并用于门禁判断 | `if (localBmvProfile.signStatus === 'signed') allowCreate()` | 每次从 `GET /customers/:id` 读取最新 `bmvProfile` |
| S4 | `intakeStatus` 不得被任何路径直接写入 DB | `jsonb_set(base_profile, '{bmvProfile,intakeStatus}', '"ready"')` | `intakeStatus` 始终由 `resolveBmvIntakeStatus()` 从三个子状态推导 |

### 4.2 案件层（Case）禁令

| # | 禁令 | 违规代码路径示例 | 正确路径 |
|---|------|----------------|---------|
| S5 | `cases.controller` 的通用 `PATCH /cases/:id` 不得接受 `post_approval_stage` | `body: { postApprovalStage: 'coe_sent' }` 通过 update endpoint | 使用 `POST /cases/:id/post-approval-stage` 专用端点 |
| S6 | `extra_fields` 不得通过 `metadata` 字段绕道写入 | `metadata: { extra_fields: { visa_plan: '5年' } }` | P1 实现时通过 `CaseTemplate.extra_fields_schema` 校验后写入 `extra_fields` 列 |
| S7 | `supplement_count` 不得通过 `PATCH /cases/:id` 直接设置 | `body: { supplementCount: 3 }` | P1 实现时通过补正提交联动递增 |
| S8 | 案件 BMV 列变更不得跳过 timeline 写入 | 直接 `UPDATE cases SET post_approval_stage = ...` 不写 timeline | 所有 BMV 列变更必须经过 service 方法 + `writeTimelineInTx()` |

### 4.3 跨层禁令

| # | 禁令 | 违规代码路径示例 | 正确路径 |
|---|------|----------------|---------|
| S9 | 建案成功后不得反向更新 `Customer.bmvProfile` | `cases.service.create()` 内调用 `patchBmvProfile()` 推进客户承接状态 | 客户承接状态在建案前已由签约动作锁定 |
| S10 | `CaseDetailAggregateDto` 不得嵌套 `CustomerBmvProfile` | `aggregate.customerBmvProfile = await getCustomerBmvProfile()` | 客户承接状态由客户详情 DTO 独立提供 |
| S11 | admin 不得从两个 DTO 拼装同一 view 的 BMV 数据 | `detail.bmvStatus = customerDto.bmvProfile.status + caseAggregate.postApproval` | 案件详情只消费 `CaseDetailAggregateDto`；客户详情只消费 `CustomerDetailDto` |
| S12 | `ResidencePeriod` 写入后不得由 admin 自行同步 `Customer.residence_expiry_date` | admin 读完 `POST /residence-periods` 后自行调 `PATCH /customers/:id` 更新到期日 | server `POST /residence-periods` 联动更新（P1 待实现） |

---

## 5. P0 → P1 扩展协议

### 5.1 Server DTO 扩展

| 规则 | 口径 |
|------|------|
| **属性只增不删** | `CaseDetailAggregateDto` 的 P0 8 个顶层 slice（`case` / `counts` / `latestValidation` / `latestSubmission` / `latestReview` / `documentProgressByProvider` / `billing` / `deepLink`）不得删除或改名 |
| **P1 属性可选** | P1 新增属性使用 `?:` 声明，如 `workflowSteps?: CaseWorkflowStepDto[]` |
| **Case entity 属性扩展** | `Case` 类型上的 BMV 列已存在且均为 `\| null`；P1 只需补写入 API，不需改 entity 类型 |
| **枚举扩展追加** | `POST_APPROVAL_STAGES` 等枚举值可追加新成员，不得删除已有成员 |

### 5.2 Admin adapter 扩展

| 规则 | 口径 |
|------|------|
| **可选读取** | adapter 对 P1 新增 DTO 属性使用 `?.` 访问或 `?? null` 降级 |
| **类型追加** | admin `CaseDetail` 已有 `postApprovalFlow?: PostApprovalFlow \| null`、`residencePeriod?: ResidencePeriod \| null`、`reminderSchedule?: ReminderSchedule \| null`；P1 激活这些字段的真实数据填充 |
| **不提前实现** | P1 字段的 adapter 逻辑在 Batch 4/5 实现，不在 P0 批次提前占位 |
| **test backward compat** | P1 adapter 测试必须包含"P0 DTO 无 P1 字段时不崩溃"的回归断言 |

### 5.3 Migration 扩展

| 规则 | 口径 |
|------|------|
| **不回写 013** | 013 migration 已发布；P1 新增列使用新 migration 编号 |
| **Drizzle schema 同步** | 新增列必须同步更新 `schema.ts` 与 `coreEntities.ts` |
| **新表使用新 migration** | `case_workflow_steps` 使用新 migration（如 014 或更高编号） |

---

## 6. 现有 Schema 盘点与缺口

### 6.1 Layer 1（cases DDL 列）

| 列 | DDL ✅ | Drizzle ✅ | Entity ✅ | mapRow ✅ | 读 API ✅ | 写 API | 缺口 |
|----|--------|-----------|----------|----------|----------|--------|------|
| `visa_plan` | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | P1 补写入端点 |
| `quote_price` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ create/update | — |
| `supplement_count` | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | P1 补递增联动 |
| `post_approval_stage` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ dedicated | — |
| `application_flow_type` | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | P1 补写入端点 |
| `coe_issued_at` | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | P1 补写入 |
| `coe_expiry_date` | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | P1 补写入 |
| `coe_sent_at` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ 联动 | — |
| `close_reason` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ transition | — |
| `overseas_visa_start_at` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ 联动 | — |
| `entry_confirmed_at` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ 联动 | — |

### 6.2 Layer 2（customers JSONB）

| JSON path | server type ✅ | dto-mappers ✅ | bmv actions ✅ | admin type ✅ | 缺口 |
|-----------|---------------|---------------|---------------|-------------|------|
| `bmvProfile.*` 全部 10 字段 | ✅ `CustomerBmvProfile` | ✅ `resolveCustomerBmvProfile` | ✅ 3 个动作函数 | ✅ `types-bmv.ts` | — |

### 6.3 Layer 3（通用配置）

| 配置能力 | TemplatesService ✅ | 经管签 seed 数据 | 缺口 |
|---------|--------------------|--------------|----|
| `document_checklist` | ✅ | ⚠️ 无经管签专属模板 | P1 补 |
| `state_flow` | ✅ | ⚠️ 无经管签专属流转 | P1 补 |
| `case_type` | ✅ | ⚠️ 无经管签专属配置 | P1 补 |
| `reminder_rule_set` | ✅ 机制已有 | ⚠️ 无经管签提醒规则 | P1 补 |
| `workflow_steps_blueprint` | ❌ 无解析逻辑 | — | P1 补 |
| `extra_fields_schema` | ❌ 无校验逻辑 | — | P1 补 |

### 6.4 Layer 4（residence_periods 表）

| 能力 | 现状 | 缺口 |
|------|------|------|
| CRUD API | ✅ | — |
| `is_current` 管理 | ⚠️ 无自动排他逻辑 | P1 补（新记录 `is_current=true` 时旧记录自动 `false`） |
| → `Customer.residence_expiry_date` 同步 | ❌ | P1 补 |
| → 自动提醒生成 | ❌ | P1 补 |

### 6.5 Layer 5（case_workflow_steps 表）

| 能力 | 现状 | 缺口 |
|------|------|------|
| DDL | ❌ | P1 Batch 4 创建 |
| Entity / Service / Controller | ❌ | P1 Batch 4 创建 |
| `cases.current_workflow_step` 同步 | ❌ | P1 Batch 4 补 |
| `post_approval_stage` 迁移 | ❌ | P1 Batch 4 定义迁移策略 |

---

## 7. 下游引用清单

| 下游 Todo / 批次 | 依赖本文的节 |
|-----------------|-------------|
| `p1-sv-001-01` ~ `p1-sv-005-03`（P1-A server） | §1.4（模板配置 schema）、§1.6（workflow_steps DDL）、§2（读模型归属）、§4.2（案件层禁令）、§5.3（migration 扩展） |
| `p1-sv-006-01` ~ `p1-sv-011-03`（P1-B server） | §1.2（COE 列写入缺口）、§1.5（residence_periods）、§4.3 S12（联动禁令）、§6.4（residence 缺口） |
| `p1-fe-001-01` ~ `p1-fe-005-03`（P1 admin） | §3（admin 消费边界）、§4.1 S1/S3（承接层禁令）、§5.2（adapter 扩展） |
| `p0-fe-002c`（detail aggregate adapter） | §2.1（aggregate DTO 组装者）、§5.1（P1 扩展协议） |
| `p0-fe-002d`（write payload builders） | §1.2（哪些列已有写 API）、§4.2 S5/S7（写入禁令） |

---

## 7.1 P0 Lead/Conv 対接計画交叉引用

> **関連計画**：咨询会话 P0/P1 対接計画（Cursor Plan `咨询会话p0p1対接_da523116`）

対接計画覆盖 P0 Lead Admin 接口（Phase A–B）、P0 会话 Admin 接口（Phase C）、P1 BMV 签约前承接→转案件（Phase D）与 Admin 前端対齐（Phase E–G）。以下节为対接計画的上游约束：

| 対接計画阶段 | 依赖本文的节 | 约束说明 |
|------------|-------------|---------|
| Phase D2（数据落点决议） | §1.3（Layer 2 JSONB 落点）、§4.1 S1/S2（承接层禁令） | `bmvProfile` 沿用 JSONB 嵌套，対接計画不新增顶层列 |
| Phase D3（聚合 GET /admin/customers/:id/bmv） | §2.1（读模型 DTO 唯一组装者）、§3.1（admin → server 读取协议） | 聚合端点由 server `customers.bmv.ts` 组装，admin 不从多端点拼装 |
| Phase E（Admin Lead 仓储） | §3.2（admin 读模型不变量：单一数据源） | `useLeadDetailModel` 只消费一个 server DTO 类型 |
| Phase G（Admin BMV 対齐） | §3.3（admin 类型镜像契约）、§4.3 S10/S11（跨层禁令） | admin `CustomerBmvProfile` 类型与 server 一致；不跨 DTO 拼装 |

---

## 8. 冻结确认

| # | 冻结项 | 状态 | 待解决项 |
|---|--------|------|---------|
| 1 | cases 表 BMV 列 schema 落点 | ✅ 冻结 | 写入 API 缺口见 §6.1 |
| 2 | customers JSONB bmvProfile schema | ✅ 冻结 | — |
| 3 | 通用配置表寄宿方式 | ✅ 冻结 | 经管签 seed 数据待补 |
| 4 | residence_periods 表 schema | ✅ 冻结 | 联动逻辑待补 |
| 5 | case_workflow_steps 计划 schema | ✅ 冻结 | 表待创建 |
| 6 | Server 读模型聚合归属 | ✅ 冻结 | — |
| 7 | Admin 读模型消费边界 | ✅ 冻结 | — |
| 8 | 双写禁止细则（S1-S12） | ✅ 冻结 | — |
| 9 | P0 → P1 扩展协议 | ✅ 冻结 | — |
| 10 | Migration 扩展规则 | ✅ 冻结 | — |

所有 10 项已冻结。后续 Batch 4–5 实施必须以本文为准。
