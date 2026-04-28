# BMV 字段真相源、唯一写入口与唯一聚合入口冻结

> **冻结日期**：2026-04-25
> **状态**：Batch 0 基线冻结
> **Todo ID**：`p1-sv-000-01-bmv-source-of-truth-freeze`
> **用途**：冻结经营管理签（BMV）相关字段在 `Customer` / `Case` / `CaseTemplate` / `CaseWorkflowStep` / `ResidencePeriod` / `BillingPlan` 间的真相源（谁持有）、唯一写入口（谁写）与唯一聚合入口（谁读/聚合给前端）。后续 Batch 1–5 实施必须引用本文，不得自行发明口径或双写。
> **上游基线**：
> - [p0-authority-baseline §9](./p0-authority-baseline.md#9-p0p1-边界冻结)
> - [p0-sv-002a-case-group-source-of-truth](./p0-sv-002a-case-group-source-of-truth.md)
> **权威来源**：
> - [P1/01-经营管理签扩展范围与落地计划](../../docs/gyoseishoshi_saas_md/P1/01-经营管理签扩展范围与落地计划.md)
> - [P1/02-经营管理签技术落地清单](../../docs/gyoseishoshi_saas_md/P1/02-经营管理签技术落地清单.md)
> - [P0/07-数据模型设计 §3.5](../../docs/gyoseishoshi_saas_md/P0/07-数据模型设计.md)
> - [p0-authority-baseline §9.3](./p0-authority-baseline.md#93-p1-预定义-schemap0-表已建但逻辑不启用)

---

## 0. 速查

| 维度 | 冻结口径 | 对应节 |
|------|---------|--------|
| P0/P1 边界 | P0 表已建的 BMV 列写 null 不启用逻辑；P1 通过追加可选字段叠加 | §1 |
| 签约前承接真相源 | `Customer.baseProfile.bmvProfile`（JSONB 嵌套） | §2 |
| 案件级 BMV 字段 | `Case` 表 6 个 013 迁移列 + 5 个下签后列 | §3 |
| 模板蓝图真相源 | `CaseTemplate` 的 `config` blob 内 4 个蓝图 key | §4 |
| 业务子步骤真相源 | `CaseWorkflowStep` 表（P1 新建） | §5 |
| 在留期间真相源 | `ResidencePeriod` 表（已建） | §6 |
| 收费门禁真相源 | `BillingPlan.gateEffectMode` + P1 `gateTriggerStep` | §7 |
| 问卷数据真相源 | P1 `DocumentRequirement.survey_data` | §8 |
| 写入口矩阵 | 每个字段有且仅有一个服务端写入口 | §9 |
| 聚合入口矩阵 | 每个字段有且仅有一个聚合 DTO 出口给前端 | §10 |
| 禁止双写 | 12 条双写禁令 | §11 |
| 服务端缺口 | 8 项 P1-Pending 缺口 | §12 |

---

## 1. P0/P1 分层原则

> 引用：p0-authority-baseline §9

### 1.1 核心分层

| 层级 | BMV 口径 |
|------|---------|
| **P0 做** | `Case.stage = S1–S9`、Gate-A/B/C、收费 warn、手动 Reminder |
| **P1 做** | `CaseWorkflowStep` 业务子步骤、`extra_fields` 模板专属字段、COE 硬阻断、`ResidencePeriod` + 自动提醒 |
| **P0 预留** | DB 列已建但逻辑不启用（§1.2） |

### 1.2 P0 预留 / P1 启用的 Schema（从 p0-authority-baseline §9.3 继承）

| 字段 / 表 | 所属表 | P0 状态 | P1 启用时机 |
|-----------|--------|---------|------------|
| `current_workflow_step` | `cases` | 写 null | P1 Batch 4 |
| `extra_fields` | `cases` | 写 null | P1 Batch 4 |
| `workflow_steps_blueprint` | `CaseTemplate.config` | 不填充 | P1 Batch 4 `p1-sv-001-01` |
| `extra_fields_schema` | `CaseTemplate.config` | 不填充 | P1 Batch 4 `p1-sv-001-01` |
| `reminder_schedule_blueprint` | `CaseTemplate.config` | 不填充 | P1 Batch 5 `p1-sv-009` |
| `survey_data` | `DocumentRequirement` | 不写入 | P1 Batch 4 `p1-sv-002` |
| `gate_trigger_step` | `BillingPlan` | 不写入 | P1 Batch 5 `p1-sv-006` |
| `CaseWorkflowStep`（整表） | — | 不创建行 | P1 Batch 4 `p1-sv-003` |
| `ResidencePeriod`（整表） | — | CRUD 已实现 | P1 Batch 5 扩展聚合与提醒 |

---

## 2. 签约前承接：Customer BMV Profile

> 引用：P1/01 §2 Step 1–5

### 2.1 真相源

| 字段 | 真相源位置 | 存储形式 |
|------|-----------|---------|
| `questionnaireStatus` | `Customer.baseProfile.bmvProfile` | JSONB 嵌套 |
| `quoteStatus` | 同上 | JSONB 嵌套 |
| `signStatus` | 同上 | JSONB 嵌套 |
| `intakeStatus` | 同上（派生值，server 计算后写入） | JSONB 嵌套 |
| `questionnaireSentAt` | 同上 | JSONB 嵌套 |
| `questionnaireReturnedAt` | 同上 | JSONB 嵌套 |
| `quoteGeneratedAt` | 同上 | JSONB 嵌套 |
| `quoteConfirmedAt` | 同上 | JSONB 嵌套 |
| `signedAt` | 同上 | JSONB 嵌套 |
| `note` | 同上 | JSONB 嵌套 |

**类型定义**：
- server: `CustomerBmvProfile` in `customers.types.ts`
- admin: `CustomerBmvProfile` in `views/customers/types-bmv.ts`

### 2.2 唯一写入口

| 写入动作 | HTTP 端点 | 服务端函数 | 写入字段 |
|---------|----------|-----------|---------|
| 发送问卷 | `POST /api/customers/:id/bmv/questionnaire/send` | `sendBmvQuestionnaire()` in `customers.bmv.ts` | `questionnaireStatus → sent`、`questionnaireSentAt` |
| 生成报价 | `POST /api/customers/:id/bmv/quote/generate` | `generateBmvQuote()` in `customers.bmv.ts` | `questionnaireStatus → returned`、`questionnaireReturnedAt`、`quoteStatus → generated`、`quoteGeneratedAt`、`signStatus → pending` |
| 记录签约 | `POST /api/customers/:id/bmv/sign/record` | `recordBmvSign()` in `customers.bmv.ts` | `quoteStatus → confirmed`、`quoteConfirmedAt`、`signStatus → signed`、`signedAt` |

**写入机制**：通过 `jsonb_set(base_profile, '{bmvProfile}', …)` 原子更新，同时剥离旧 key `bmv_profile`。

### 2.3 唯一聚合入口

| 聚合出口 | 聚合层 | 消费方 |
|---------|--------|--------|
| `CustomerSummaryDto.bmvProfile` | `mapCustomerToSummaryDto()` in `customers.dto-mappers.ts` | admin 列表 |
| `CustomerDetailDto.bmvProfile` | `mapCustomerToDetailDto()` in `customers.dto-mappers.ts` | admin 详情 |
| BMV action 返回值 | `adaptCustomerBmvActionResult()` in admin `CustomerAdapterMutationResults.ts` | admin 操作后刷新 |

### 2.4 不变量

- `bmvProfile` **只存在于 Customer**，不复制到 Case。
- `intakeStatus` 是派生值：server 端通过 `resolveBmvIntakeStatus()` 从三个子状态推导；admin 端有等效 fallback `resolveBmvIntakeStatus()` in `types-bmv.ts`。
- admin 建案门禁 (`useCustomerCreateCaseGateModel`) 读取 `bmvProfile.signStatus === "signed"` && `intakeStatus === "ready_for_case_creation"` 控制建案入口，**不额外写入 Case**。

---

## 3. 案件级 BMV 字段

> 引用：P0/07 §3.5、migration `013_business_manager_visa.up.sql`

### 3.1 真相源（Case 表 BMV 相关列）

| 字段 | Case 实体属性 | 类型 | P0 写入 | P1 写入 | 来源说明 |
|------|-------------|------|---------|---------|---------|
| `visa_plan` | `visaPlan` | `string \| null` | ❌ 不写 | ✅ P1 建案/更新时写入 | 签证方案，由问卷/报价阶段确定 |
| `quote_price` | `quotePrice` | `number \| null` | ✅ create/update | ✅ 继续使用 | 报价金额，create/update 均可设 |
| `supplement_count` | `supplementCount` | `number` | ❌ 不写（DB 默认 0） | ✅ P1 补正循环递增 | 补正次数计数器 |
| `post_approval_stage` | `postApprovalStage` | `string \| null` | ✅ 专用端点 | ✅ 继续使用 | 下签后子阶段 |
| `application_flow_type` | `applicationFlowType` | `string \| null` | 部分写入 | ✅ P1 扩展 | 申请流程类型 |
| `close_reason` | `closeReason` | `string \| null` | ✅ transition 时 | ✅ 继续使用 | 结案原因 |
| `coe_issued_at` | `coeIssuedAt` | `string \| null` | ❌ 不写 | ✅ P1 下签后链路 | COE 签发时间 |
| `coe_expiry_date` | `coeExpiryDate` | `string \| null` | ❌ 不写 | ✅ P1 下签后链路 | COE 到期日 |
| `coe_sent_at` | `coeSentAt` | `string \| null` | ❌ 不写 | ✅ P1 下签后链路 | COE 发送时间 |
| `overseas_visa_start_at` | `overseasVisaStartAt` | `string \| null` | ✅ update 可设 | ✅ 继续使用 | 海外返签开始时间 |
| `entry_confirmed_at` | `entryConfirmedAt` | `string \| null` | ✅ update 可设 | ✅ 继续使用 | 入境确认时间 |
| `residence_expiry_date` | `residenceExpiryDate` | `string \| null` | ✅ create/update | ✅ 继续使用 | 在留到期日（冗余快照） |

### 3.2 唯一写入口

| 字段 | P0 唯一写入口 | P1 唯一写入口 |
|------|-------------|-------------|
| `visaPlan` | —（不写） | `cases.service.create()` / `cases.service.update()` |
| `quotePrice` | `cases.service.create()` / `cases.service.update()` 的 `CaseCreateInput.quotePrice` / `CaseUpdateInput.quotePrice` | 同 P0 |
| `supplementCount` | —（不写，DB 默认 0） | 补正提交包创建时 `cases.service` 递增（须新增） |
| `postApprovalStage` | `POST /cases/:id/post-approval-stage` → `updatePostApprovalStage()` | 同 P0 |
| `closeReason` | `POST /cases/:id/transition` → `CaseTransitionInput.closeReason` | 同 P0 |
| `coeIssuedAt` | —（不写） | `cases.service.update()` 或 post-approval 链路 |
| `coeExpiryDate` | —（不写） | `cases.service.update()` 或 post-approval 链路 |
| `coeSentAt` | —（不写） | `cases.service.update()` 或 post-approval 链路 |
| `overseasVisaStartAt` | `cases.service.update()` / `updatePostApprovalStage()` | 同 P0 |
| `entryConfirmedAt` | `cases.service.update()` / `updatePostApprovalStage()` | 同 P0 |
| `residenceExpiryDate` | `cases.service.create()` / `cases.service.update()` | 同 P0 |

### 3.3 唯一聚合入口

| 聚合出口 | 聚合层 | 消费方 |
|---------|--------|--------|
| `CaseListItemDto`（含完整 Case 字段） | `cases.service.list()` | admin 列表 |
| `CaseDetailAggregateDto.case`（含完整 Case 实体） | `cases.service.getDetailAggregate()` | admin 详情全 tab |

### 3.4 不变量

- `visaPlan` / `supplementCount` / `coeIssuedAt` / `coeExpiryDate` / `coeSentAt` 在 P0 **列已建但不写入**，前端读到 null / 0 是预期行为。
- `quotePrice` 在 Case 上是**独立真相源**，不从 `Customer.bmvProfile` 复制。Customer 侧的报价流程是签约前承接；Case 建案后 `quotePrice` 属于案件自身的定价快照。
- `residenceExpiryDate` 在 Case 上是**冗余快照**；P1 落地 `ResidencePeriod` 后，权威值来自 `ResidencePeriod.validUntil`。Case 上的 `residenceExpiryDate` 可作为列表级快速筛选，但不应作为判断在留有效性的真相源。
- `postApprovalStage` 合法值：`waiting_final_payment | coe_sent | overseas_visa_applying | entry_success`。此字段是 Case 上的子阶段快照，**不替代** P1 的 `CaseWorkflowStep`；P1 落地后 `postApprovalStage` 改为由 `CaseWorkflowStep` 推进时同步更新。
- `supplementCount` 只递增不递减；P1 中每次创建 `supplement` 类型 `SubmissionPackage` 时 +1。

---

## 4. 模板蓝图：CaseTemplate

> 引用：P1/01 §3 M1

### 4.1 真相源

当前 server 模板系统使用通用 `TemplateVersionRow.config: Record<string, unknown>` blob。P1 经营管理签模板将在 `config` 内填充以下蓝图 key：

| 蓝图 key | 类型（P1 规划） | 含义 |
|---------|---------------|------|
| `workflow_steps_blueprint` | `WorkflowStepBlueprint[]` | 经营管理签业务子步骤定义（Step 列表、顺序、触发规则） |
| `extra_fields_schema` | `ExtraFieldSchema[]` | 模板专属字段定义（`visa_plan`、`coe_issued_date` 等字段名、类型、校验） |
| `requirement_blueprint` | `RequirementBlueprint[]` | 经营管理签资料清单蓝图（含 questionnaire 类别资料项） |
| `reminder_schedule_blueprint` | `ReminderScheduleBlueprint[]` | 在留到期提醒蓝图（180 / 90 / 30 天偏移规则） |

### 4.2 唯一写入口

| 写入动作 | 唯一写入口 | 时机 |
|---------|-----------|------|
| 蓝图定义 | `templates.service` 创建/更新 template version（P1 新增 `p1-sv-001-01`） | 系统初始化或管理员编辑模板 |

### 4.3 唯一聚合入口

| 聚合出口 | 聚合层 | 消费方 |
|---------|--------|--------|
| `TemplateVersionRow.config` | `templates.service.resolve()` / `templates.resolver` | `cases.service` 建案时读取蓝图生成 workflow steps / extra fields / 资料清单 / 提醒 |

### 4.4 不变量

- 蓝图是**模板级只读配置**：建案后实例化为 `CaseWorkflowStep` 行、`Case.extra_fields` 值、`DocumentRequirement` 行、`Reminder` 行。实例化后的值独立于模板，模板变更不回写已创建案件。
- `TemplateVersionRow` 使用版本化发布（`kind=case_type`）；同一模板可并存多个版本，建案时取 `currentVersion`。
- P0 不填充上述 4 个 key，`config` blob 仅含 `case_type` / `state_flow` / `document_checklist` 等 P0 通用配置。

---

## 5. 业务子步骤：CaseWorkflowStep

> 引用：P1/01 §3 M5

### 5.1 真相源

`CaseWorkflowStep` 为 P1 新建表。每行代表一个案件实例的业务子步骤记录。

| 字段（规划） | 类型 | 含义 |
|-------------|------|------|
| `id` | uuid | PK |
| `case_id` | uuid | FK → cases |
| `step_code` | string | 子步骤标识（如 `WAITING_MATERIAL`、`COE_SENT`） |
| `status` | string | `pending \| active \| completed \| skipped` |
| `started_at` | timestamp? | 进入时间 |
| `completed_at` | timestamp? | 完成时间 |
| `sort_order` | number | 排序序号（来自 `workflow_steps_blueprint`） |

**P1 子步骤枚举**（来自 P1/01 §3 M5）：

```
WAITING_MATERIAL, MATERIAL_PREPARING, REVIEWING, APPLYING,
UNDER_REVIEW, NEED_SUPPLEMENT, SUPPLEMENT_PROCESSING, APPROVED,
WAITING_PAYMENT, COE_SENT, VISA_APPLYING, ENTRY_SUCCESS,
VISA_REJECTED, RESIDENCE_PERIOD_RECORDED, RENEWAL_REMINDER_SCHEDULED
```

### 5.2 唯一写入口

| 写入动作 | 唯一写入口 | 时机 |
|---------|-----------|------|
| 实例化 | `cases.service.create()` 建案时从 `workflow_steps_blueprint` 批量 INSERT | 建案 |
| 推进 | `cases.service.advanceWorkflowStep()` 或同等专用方法 | 业务操作触发 |

### 5.3 唯一聚合入口

| 聚合出口 | 聚合层 | 消费方 |
|---------|--------|--------|
| `CaseDetailAggregateDto` 未来追加的 `workflowSteps` 摘要 | `cases.service.getDetailAggregate()` P1 扩展 | admin 详情/概览 |
| `Case.current_workflow_step` | Case 表冗余字段（由 service 推进时同步写入） | admin 列表快速展示 |

### 5.4 不变量

- `CaseWorkflowStep` 与 `Case.stage(S1–S9)` **并行共存**，不互相覆盖。`stage` 继续驱动报表、仪表盘、Gate；`CaseWorkflowStep` 承载经营管理签业务细节。
- `Case.current_workflow_step` 是冗余快照，由 service 推进 `CaseWorkflowStep` 时同步写入，**不允许直接 PATCH**。
- 非经营管理签模板的案件没有 `CaseWorkflowStep` 行；`Case.current_workflow_step` 为 null。

---

## 6. 在留期间：ResidencePeriod

> 引用：P1/01 §3 M8、migration `013_business_manager_visa.up.sql`

### 6.1 真相源

`ResidencePeriod` 表已由 013 migration 创建，server CRUD 已实现。

| 字段 | 实体属性 | 类型 | 含义 |
|------|---------|------|------|
| `valid_from` | `validFrom` | `string` (date) | 在留期间开始 |
| `valid_until` | `validUntil` | `string` (date) | 在留期间结束 |
| `period_years` | `periodYears` | `number \| null` | 在留年限 |
| `period_label` | `periodLabel` | `string \| null` | 在留年限标签 |
| `card_number` | `cardNumber` | `string \| null` | 在留卡号 |
| `visa_type` | `visaType` | `string` | 签证种类 |
| `status_of_residence` | `statusOfResidence` | `string` | 在留资格 |
| `is_current` | `isCurrent` | `boolean` | 是否当前有效 |
| `case_id` | `caseId` | `string` | FK → cases |
| `customer_id` | `customerId` | `string` | FK → customers |

### 6.2 唯一写入口

| 写入动作 | HTTP 端点 | 服务端函数 |
|---------|----------|-----------|
| 创建 | `POST /api/residence-periods` | `ResidencePeriodsService.create()` |
| 更新 | `PATCH /api/residence-periods/:id` | `ResidencePeriodsService.update()` |
| 切换 is_current | 创建新记录时自动切换 | `ResidencePeriodsService.create()` 内部事务 |

### 6.3 唯一聚合入口

| 聚合出口 | 聚合层 | 消费方 |
|---------|--------|--------|
| `GET /api/residence-periods?caseId=:caseId` | `ResidencePeriodsService.list()` | admin detail tab |
| P1 扩展: `CaseDetailAggregateDto` 追加 `currentResidencePeriod` 摘要 | `cases.service.getDetailAggregate()` P1 扩展 | admin 概览 |

### 6.4 不变量

- `ResidencePeriod` 是**在留期间的权威真相源**。`Case.residenceExpiryDate` 仅为列表级冗余快照。
- P1 自动提醒（180/90/30 天）的触发源是 `ResidencePeriod.validUntil`（`isCurrent=true` 的记录），**不是** `Case.residenceExpiryDate`。
- `ResidencePeriod` 创建时自动将同 case+customer 的旧记录 `isCurrent` 设为 false。
- `ResidencePeriod` 与 `Case` 通过 `caseId` 关联；与 `Customer` 通过 `customerId` 关联。同一客户多案件可各有独立在留记录。

### 6.5 字段名映射（P1 规划名 → 实际 DB 列）

| P1 规划文档名 | 实际 DB 列 / 实体属性 | 差异说明 |
|-------------|---------------------|---------|
| `period_start` | `valid_from` / `validFrom` | 实际列名不同 |
| `period_end` | `valid_until` / `validUntil` | 实际列名不同 |
| `residence_years` | `period_years` / `periodYears` | 实际列名不同 |
| `card_number` | `card_number` / `cardNumber` | 一致 |
| `entry_date` | **不存在于 ResidencePeriod**；入境时间为 `Case.entryConfirmedAt` | 两个实体，两个字段 |

---

## 7. 收费门禁：BillingPlan

> 引用：p0-authority-baseline §9.2、cases.types-billing.ts

### 7.1 真相源

| 字段 | 实体 | 类型 | P0 写入 | P1 写入 |
|------|------|------|---------|---------|
| `gateEffectMode` | `BillingPlan` | `"off" \| "warn" \| "block"` | ✅ 仅 `off` / `warn` | ✅ 增加 `block` |
| `gateTriggerStep` | `BillingPlan`（P1 新增列） | `string \| null` | ❌ 不写 | ✅ P1 设为 `COE_SENT` |

### 7.2 唯一写入口

| 字段 | P0 唯一写入口 | P1 唯一写入口 |
|------|-------------|-------------|
| `gateEffectMode` | `billingPlans.service.create()` / `.update()` | 同 P0 |
| `gateTriggerStep` | —（不写） | `billingPlans.service.create()` / `.update()` P1 扩展 |

### 7.3 唯一聚合入口

| 聚合出口 | 聚合层 | 消费方 |
|---------|--------|--------|
| `CaseBillingPlanDto.gateEffectMode` | `billingPlans.service.list()` | admin billing tab |
| `CaseBillingSummary` (聚合 guard 结果) | `billingGuards.ts` → `CaseDetailAggregateDto.billing` | admin 概览/校验 |

### 7.4 不变量

- P0 的 COE 相关推进**不检查**收费门禁（因为 P0 无 COE 步骤）。
- P1 引入 `block` 时，`billingGuards.ts` 须增加 `gateTriggerStep === "COE_SENT"` 的硬阻断判断，在推进 `CaseWorkflowStep` 到 `COE_SENT` 前校验 `finalPaymentPaidCached === true`。
- `gateEffectMode` 的值由 `BillingPlan` 持有，**不写入 Case 表**。

---

## 8. 问卷数据：DocumentRequirement.survey_data

> 引用：P1/01 §3 M2

### 8.1 真相源

| 字段 | 所属表 | 类型（P1 规划） | 含义 |
|------|--------|---------------|------|
| `survey_data` | `DocumentRequirement`（通过 `category=questionnaire` 识别） | `JSONB` | 问卷回收的结构化数据 |

### 8.2 唯一写入口

| 写入动作 | 唯一写入口 | 时机 |
|---------|-----------|------|
| 问卷回收 | P1 `document-items.service` 或 `intake` 模块（须在 P1 Batch 4 `p1-sv-002` 中确定） | 客户提交问卷 |

### 8.3 唯一聚合入口

| 聚合出口 | 聚合层 | 消费方 |
|---------|--------|--------|
| `DocumentRequirement` 列表中 `category=questionnaire` 的记录 | `document-items.service.list()` | admin documents tab / case detail |

### 8.4 不变量

- `survey_data` **只存在于 DocumentRequirement**（问卷类资料项），不复制到 Case 或 Customer。
- 问卷类资料项与普通资料项**统一参与完成率、审核、催办**（P1/01 §3 M3）。
- `Customer.bmvProfile` 中的 `questionnaireStatus` 记录的是**问卷流程的签约前承接状态**，不包含问卷内容数据。内容数据在 `survey_data`。

---

## 9. 写入口矩阵（总览）

| # | 字段/对象 | 唯一写入口 | 写入层 | P0/P1 |
|---|---------|-----------|--------|-------|
| W1 | `Customer.bmvProfile.questionnaireStatus` | `sendBmvQuestionnaire()` | `customers.bmv.ts` | P0 已实现 |
| W2 | `Customer.bmvProfile.quoteStatus` | `generateBmvQuote()` | `customers.bmv.ts` | P0 已实现 |
| W3 | `Customer.bmvProfile.signStatus` | `recordBmvSign()` | `customers.bmv.ts` | P0 已实现 |
| W4 | `Case.quotePrice` | `cases.service.create()` / `.update()` | `cases.service.ts` | P0 已实现 |
| W5 | `Case.visaPlan` | `cases.service.create()` / `.update()` | `cases.service.ts` | P1 启用 |
| W6 | `Case.supplementCount` | 补正提交包创建时递增 | `cases.service.ts` | P1 启用 |
| W7 | `Case.postApprovalStage` | `updatePostApprovalStage()` | `cases.service.ts` | P0 已实现 |
| W8 | `Case.coeIssuedAt` / `coeExpiryDate` / `coeSentAt` | post-approval 链路或 update | `cases.service.ts` | P1 启用 |
| W9 | `Case.overseasVisaStartAt` / `entryConfirmedAt` | `update()` / `updatePostApprovalStage()` | `cases.service.ts` | P0 已实现 |
| W10 | `CaseWorkflowStep` 行 | `create()` 实例化 + `advanceWorkflowStep()` 推进 | `cases.service.ts` | P1 新建 |
| W11 | `CaseTemplate.config.*_blueprint` | `templates.service` 创建/更新版本 | `templates.service.ts` | P1 填充 |
| W12 | `ResidencePeriod` 行 | `ResidencePeriodsService.create()` / `.update()` | `residencePeriods.service.ts` | P0 已实现 |
| W13 | `BillingPlan.gateEffectMode` | `billingPlans.service.create()` / `.update()` | `billingPlans.service.ts` | P0 已实现 |
| W14 | `BillingPlan.gateTriggerStep` | `billingPlans.service.create()` / `.update()` | `billingPlans.service.ts` | P1 启用 |
| W15 | `DocumentRequirement.survey_data` | `document-items.service` 或 `intake` 模块 | 待定 | P1 新建 |

---

## 10. 聚合入口矩阵（总览）

| # | 消费场景 | 唯一聚合入口 | 聚合层 |
|---|---------|-------------|--------|
| A1 | admin 客户列表 BMV 承接状态 | `CustomerSummaryDto.bmvProfile` | `customers.dto-mappers.ts` |
| A2 | admin 客户详情 BMV 承接卡 | `CustomerDetailDto.bmvProfile` | `customers.dto-mappers.ts` |
| A3 | admin 建案门禁判断 | `CustomerDetailDto.bmvProfile` 的 `signStatus` + `intakeStatus` | admin `useCustomerCreateCaseGateModel.ts` (纯前端派生) |
| A4 | admin 案件列表 BMV 字段 | `CaseListItemDto`（含完整 Case） | `cases.service.list()` |
| A5 | admin 案件详情 BMV 字段 | `CaseDetailAggregateDto.case` | `cases.service.getDetailAggregate()` |
| A6 | admin 在留期间 tab | `GET /api/residence-periods?caseId=` | `residencePeriods.service.list()` |
| A7 | admin 收费门禁展示 | `CaseDetailAggregateDto.billing` | `billingGuards.ts` → `cases.service.getDetailAggregate()` |
| A8 | admin 业务子步骤展示 (P1) | `CaseDetailAggregateDto` 追加 `workflowSteps` | `cases.service.getDetailAggregate()` P1 扩展 |
| A9 | admin 问卷数据展示 (P1) | `DocumentRequirement` 列表 `category=questionnaire` | `document-items.service.list()` |

---

## 11. 双写禁令

| # | 禁令 | 理由 |
|---|------|------|
| D1 | `Customer.bmvProfile` 的问卷/报价/签约状态**不复制到 Case** | Customer 是签约前承接层；Case 建案后有自己的报价快照 `quotePrice` |
| D2 | `Case.quotePrice` **不回写 Customer.bmvProfile** | Case 定价独立于客户签约前报价流程 |
| D3 | `Case.visaPlan` **不存在于 Customer** | 签证方案属于案件级决策 |
| D4 | `CaseWorkflowStep` 推进**不直接写 Case.stage** | stage 由 `transition` 端点驱动；workflow step 并行不互覆 |
| D5 | `Case.current_workflow_step` **不允许直接 PATCH** | 只能由 `advanceWorkflowStep()` 同步写入 |
| D6 | `ResidencePeriod.validUntil` 变更时**不自动回写 Case.residenceExpiryDate** | Case 上的值是冗余快照；如需同步，须走显式同步路径并审计 |
| D7 | 自动提醒触发源是 `ResidencePeriod.validUntil`，**不是 Case.residenceExpiryDate** | 避免过期快照触发错误提醒 |
| D8 | `BillingPlan.gateEffectMode` **不写入 Case 表** | 门禁规则属于收费计划，不属于案件 |
| D9 | `BillingPlan.gateTriggerStep` **不写入 CaseWorkflowStep** | 触发步骤标识属于收费规则配置 |
| D10 | `CaseTemplate.config` 蓝图变更**不回写已创建案件的实例数据** | 模板是配置源，实例化后各自独立 |
| D11 | `DocumentRequirement.survey_data` **不复制到 Case.extra_fields** | 问卷数据归属资料项，不归属案件顶层 |
| D12 | admin 端 `resolveBmvIntakeStatus()` **只作前端 fallback 展示**，不回写 server | server 是 intakeStatus 的唯一写入口 |

---

## 12. 服务端缺口

| # | 缺口 | 严重度 | 现状 | 冻结口径 | 影响批次 |
|---|------|--------|------|---------|---------|
| G1 | `Case.visaPlan` / `supplementCount` 无写入路径 | **P1-Pending** | DB 列存在但 `insertCase` / `executeUpdateCase` SQL 未包含 | P1 Batch 4 时在 `CaseCreateInput` / `CaseUpdateInput` 增加可选字段，并在 SQL 中包含 | Batch 4 `p1-sv-001` |
| G2 | `CaseWorkflowStep` 表不存在 | **P1-Pending** | 无 DDL、无 TypeScript entity | P1 Batch 4 创建表、entity、service | Batch 4 `p1-sv-003` |
| G3 | `Case.current_workflow_step` / `Case.extra_fields` 列已预留但无写入逻辑 | **P1-Pending** | 列是否已在 013 migration 中存在待确认 | P1 Batch 4 在 `advanceWorkflowStep()` 中同步写入 | Batch 4 `p1-sv-003` |
| G4 | `CaseTemplate.config` 蓝图 key 未填充 | **P1-Pending** | `config` blob 无经营管理签蓝图内容 | P1 Batch 4 seed 数据或管理端创建 | Batch 4 `p1-sv-001-01` |
| G5 | `BillingPlan.gateTriggerStep` 列不存在 | **P1-Pending** | 仅注释提及 | P1 Batch 5 新增 migration + 字段 | Batch 5 `p1-sv-006` |
| G6 | `DocumentRequirement.survey_data` 列不存在 | **P1-Pending** | 仅 p0-authority-baseline §9.3 列出 | P1 Batch 4 新增 migration + 字段 | Batch 4 `p1-sv-002` |
| G7 | `supplementCount` 递增逻辑不存在 | **P1-Pending** | DB 默认 0，无递增路径 | P1 Batch 4 在补正提交包创建时原子递增 | Batch 4 `p1-sv-004` |
| G8 | `CaseDetailAggregateDto` 未包含 P1 扩展字段 | **P1-Pending** | 当前只含 P0 字段 | P1 Batch 4 追加 `workflowSteps` / `currentResidencePeriod` 等可选字段 | Batch 4 / 5 |

---

## 13. 下游引用清单

| 下游 Todo / 批次 | 依赖本文的节 |
|-----------------|-------------|
| `p1-sv-001-01` 经营管理签模板创建 | §4（模板蓝图）、§11 D10（不回写实例） |
| `p1-sv-002` 问卷与报价 | §8（survey_data）、§2（Customer BMV Profile）、§11 D1/D11 |
| `p1-sv-003` 业务子步骤 | §5（CaseWorkflowStep）、§11 D4/D5 |
| `p1-sv-004` 补正循环 | §3.2 W6（supplementCount 递增） |
| `p1-sv-006` COE 硬阻断 | §7（BillingPlan gate）、§3 W8（COE 时间戳） |
| `p1-sv-009` 在留期间与提醒 | §6（ResidencePeriod）、§11 D6/D7 |
| `p1-fe-001`–`p1-fe-005` P1 admin 落地 | §10（聚合入口矩阵 A8/A9） |
| `p0-fe-002c` detail aggregate adapter | §3.3（Case BMV 字段通过 aggregate DTO 输出）、§10 A5 |
| `p0-fe-002b` list query adapter | §3.3（Case BMV 字段通过 list DTO 输出）、§10 A4 |
| Batch 2 全体 customer adapter | §2（Customer BMV Profile 聚合）、§10 A1/A2/A3 |

---

## 14. 冻结确认

| # | 冻结项 | 状态 | 待解决项 |
|---|--------|------|---------|
| 1 | Customer BMV Profile 真相源与写入口 | ✅ 冻结 | — |
| 2 | Case BMV 字段真相源与写入口 | ✅ 冻结 | P1 启用 visaPlan/supplementCount 写入路径（G1） |
| 3 | CaseTemplate 蓝图真相源 | ✅ 冻结 | P1 填充蓝图内容（G4） |
| 4 | CaseWorkflowStep 真相源 | ✅ 冻结 | P1 创建表与 service（G2） |
| 5 | ResidencePeriod 真相源 | ✅ 冻结 | P1 扩展聚合与提醒链路 |
| 6 | BillingPlan 门禁真相源 | ✅ 冻结 | P1 新增 gateTriggerStep 列（G5） |
| 7 | DocumentRequirement.survey_data 真相源 | ✅ 冻结 | P1 新增列与写入口（G6） |
| 8 | 唯一写入口矩阵 | ✅ 冻结 | — |
| 9 | 唯一聚合入口矩阵 | ✅ 冻结 | — |
| 10 | 双写禁令 | ✅ 冻结 | — |

所有 10 项已冻结。后续 Batch 1–5 实施必须以本文为准。

---

## 14.1 P0 Lead/Conv 対接計画交叉引用

> **関連計画**：咨询会话 P0/P1 対接計画（Cursor Plan `咨询会话p0p1対接_da523116`）

対接計画覆盖 P0 Lead Admin 接口（Phase A–B）、P0 会话 Admin 接口（Phase C）、P1 BMV 签约前承接→转案件（Phase D）与 Admin 前端対齐（Phase E–G）。以下节为対接計画的上游约束：

| 対接計画阶段 | 依赖本文的节 | 约束说明 |
|------------|-------------|---------|
| Phase D3（save-survey / quote-modify / transition-to-case） | §2（Customer BMV Profile 写入口）、§9 W1–W3（写入口矩阵）、§11 D1（不复制到 Case） | 新增 4 个动词必须通过 `customers.bmv.ts` 统一写入，不得绕道 |
| Phase D4（confirm-sign 联动 Billing） | §7（BillingPlan 门禁）、§9 W13（gateEffectMode 写入口） | 签约定金 BillingPlan 的 `gateEffectMode` 仅由 `billingPlans.service` 写入 |
| Phase D5（transition-to-case 字段映射） | §3（Case BMV 字段）、§11 D2/D3（不回写 Customer / visaPlan 属于 Case） | 建案时 `quotePrice` 写入 Case 作为独立快照，不从 Customer 复制后续变更 |
| Phase G1（CustomerBmvIntakeCard 字段対齐） | §10 A1/A2（聚合入口矩阵）、§2.3（唯一聚合入口） | admin 卡片只消费 `CustomerDetailDto.bmvProfile`，不直接解析 `base_profile` |
| Phase G2（门禁与错误码） | §2.4（不变量：intakeStatus 派生值）、§11 D12（admin 不回写 server） | admin 门禁为前端 fallback 展示，server `cases.pre-sign-gate` 为硬门禁 |

---

## 15. 追加设计决策

### 15.1 D2：`customers.bmv_profile` 数据落点冻结（Phase D2）

> **冻结日期**：2026-04-27
> **Todo ID**：`phase-d2-bmv-storage-decision`
> **关联计划**：咨询会话 P0/P1 对接计划 §2.3、§Phase D2

**决议内容**：

1. **保持现状**：BMV 承接数据持久化于 `customers.base_profile` JSONB 的 `bmvProfile` 键。写入路径为 `customers.bmv.ts` 的 `patchBmvProfile()` 函数（通过 `jsonb_set(base_profile, '{bmvProfile}', …)` 原子更新）。
2. **不新增顶层列**：不在 `customers` 表上新增 `bmv_profile` 等顶层列。JSONB 嵌套满足当前查询与索引需求。
3. **顶层 DTO view**：在 `customers.types.ts` 新增 `CustomerBmvView` 类型，作为 `GET /admin/customers/:id/bmv` 聚合端点（Phase D3）的响应骨架。`CustomerSummaryDto.bmvProfile` 与 `CustomerDetailDto.bmvProfile` 继续作为列表/详情页的读路径。消费方不应直接解析 `base_profile` JSONB。
4. **避免双源**：`bmvProfile` 数据只有一个写入源（`customers.bmv.ts`）和一个读取解析层（`resolveCustomerBmvProfile()` in `customers.dto-mappers.ts`）。admin 端 `resolveBmvIntakeStatus()` 仅作前端 fallback 展示派生（参见 §11 D12）。

**理由**：

- `customers.bmv.ts` 已落地 `sendBmvQuestionnaire / generateBmvQuote / recordBmvSign` 三个动词，写入路径稳定。
- `resolveCustomerBmvProfile()` 已处理 `bmv_profile`（snake_case 旧 key）与 `bmvProfile`（camelCase 当前 key）双向兼容。
- 新增顶层列会引入迁移成本、双写风险，且 JSONB 内嵌对 admin 查询场景已足够。
- 如未来因性能或查询模式需要迁移至顶层列，由独立计划执行，本决议不承担该责任。
