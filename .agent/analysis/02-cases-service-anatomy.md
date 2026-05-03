# 02 — `cases.service.ts` Anatomy (B-001)

> 文件：`packages/server/src/modules/core/cases/cases.service.ts`
> 总行数：**3457**（含 `eslint-disable max-lines`）
> 工具：`grep -nE`、`view`；行号准确。
> 标注：**[H]** High / **[M]** Medium / **[L]** Low confidence。
> **本文件仅描述事实，不提议拆分实施。**

## 0. 文件级骨架

| 区段 | 行号 | 行数 | 内容 |
|------|------|------|------|
| 文件头 + import | 1–94 | 94 | 35 行 NestJS / pg / 域内类型 / 兄弟模块的 import；详见 §1 **[H]** |
| 顶层常量 + 行映射器 + 私有 helper | 96–1364 | 1269 | `P0_CASE_STAGES`、`DEFAULT_CASE_TRANSITIONS`、`mapCaseRow`、各种行映射器、`buildCaseListFilter*`、`resolve*` helpers **[H]** |
| `class CasesService` | 1365–3324 | 1960 | 实际服务类；构造器 + 15 个公共方法 + 39 个私有/静态方法 **[H]** |
| 文件级私有 helper（class 外） | 3325–3457 | 133 | `writeTimelineInTx`、`insertInitialBillingPlanFromQuote`、`writeCrossGroupTimeline`、`validateDueAt`、`ChecklistItem` / `TimelineInput` 类型 **[H]** |

类外/类内行数比 ≈ 1402 : 1960。

## 1. Imports（来源分布）

35 个 import statement，外部依赖：

| 来源 | 引用对象 | 备注 |
|------|----------|------|
| `@nestjs/common` | `BadRequestException, ForbiddenException, HttpException, Inject, Injectable, InternalServerErrorException, NotFoundException, Optional` | 异常体系直接依赖 Nest **[H]** |
| `pg` | `Pool` | 直接持有连接池 **[H]** |
| `../../../infra/db/customerNameExpr` | `customerNameExpr` | SQL 表达式构造 **[H]** |
| `../model/coreEntities` | `Case`（type） | 领域实体 **[H]** |
| `./cases.types` | 16 个 type + `CASE_WRITE_ERROR_CODES` | 同模块类型聚合 **[H]** |
| `./cases.workflow-step` | `isBmvWorkflowStep, isValidStepTransition, checkParallelBoundary, BmvWorkflowStep` | BMV step state machine **[H]** |
| `./cases.template-bmv` | `BMV_CASE_TYPE` | 常量 **[H]** |
| `./cases.workflow-step-readmodel` | `resolveWorkflowStepSummary, BMV_STEP_LOOKUP` | 读模型 **[H]** |
| `./businessPhase` | `STAGE_TO_PHASE_DEFAULT, assertPhaseTransition, isBusinessPhase, PhaseTransitionError` | 阶段→相位映射 **[H]** |
| `../billing/billingGuards` | `checkFinalPaymentGuard, syncBillingCacheForCase` | 跨域：billing **[H]** |
| `./cases.types-final-payment` | `decideFinalPaymentGuard` | **[H]** |
| `./cases.types-bmv-gate` | `checkBmvCaseCreationGate` | **[H]** |
| `./cases.types-overseas-step` | `OVERSEAS_STEP_CODES, VISA_REJECTED_CLOSURE, OVERSEAS_TIMELINE_ACTIONS, OverseasStepCode` | **[H]** |
| `./cases.types-residence-closeout` | `toResidencePeriodSummary, requiresSuccessCloseoutCheck, checkSuccessCloseoutPreconditions, CaseResidencePeriodSummary` | **[H]** |
| `./cases.types-failure-closeout` | `checkFailureCloseout, canBypassSuccessCloseoutForFailure` | **[H]** |
| `../residence-periods/residencePeriods.service` | `mapResidencePeriodRow` | 跨域：residence-periods **[H]** |
| `../../portal/intake/intake.types` | `requiresBmvCaseCreationGate` | 跨域：portal/intake **[H]**（值得标注：core 反向访问 portal） |
| `../customers/customers.dto-mappers` | `resolveCustomerBmvProfile` | 跨域：customers **[H]** |
| `../auth/permissions.service` | `PermissionsService` | 通过 DI 注入 **[H]** |
| `../billing/billingPlans.service` | `BillingPlansService` | DI 注入 **[H]** |
| `../billing/paymentRecords.service` | `PaymentRecordsService` | DI 注入 **[H]** |
| `./cases.types-billing` | type-only：`CaseBillingTabAggregate, CaseBillingSummaryFull, CaseBillingRiskAckRecord` | **[H]** |
| `../tenancy/{requestContext,uuid,tenantDb}` | `RequestContext, isUuid, createTenantDb, TenantDb, TenantDbTx` | 多租户基座 **[H]** |
| `../../../infra/utils/normalize` | `normalizeObject` | **[H]** |
| `./casesSupplementCount` | `recalcSupplementCount` | **[H]** |

观察：
- **跨 core 模块强耦合**：billing(3 个 service) + customers(1) + residence-periods(1) + auth(1) + tenancy(3)。 **[H]**
- **跨 portal 反向耦合 1 处**：从 `core/cases` 反向 import `portal/intake/intake.types`（`requiresBmvCaseCreationGate`）。 **[H]** 是事实，是否违反分层意图待 OQ-17。 **[L] 风险评估**
- 同模块兄弟文件 import 约 12 个（`cases.*`），表明 cases 域已在文件外部做了类型/工具拆分，但服务主体未拆。 **[H]**

## 2. 顶层（class 外）符号清单

> "顶层"即 96–1364 + 3325–3457 区段的所有 `export`/private 定义。

### 2.1 常量（export）
| 行 | 名称 | 作用 |
|----|------|------|
| 100 | `P0_CASE_STAGES` | P0 阶段集合 S1–S9 |
| 123 | `DEFAULT_CASE_TRANSITIONS` | 默认状态机转移表 |
| 153 | `TEMPLATES_RESOLVER` | DI Symbol（被 `app.module.ts` 注入） |
| 549 | `POST_APPROVAL_STAGES` | 审批后阶段集合 |
| 556 | `CASE_COLS` | SQL SELECT 列清单（单行 ~50 字段） |
| 558 | `PHASE_TO_STAGE_SQL` | SQL CASE 表达式（私有） |
| 571 | `CASE_COLS_PREFIXED` | 加前缀版本 |
| 575 | `CUSTOMER_NAME_EXPR` | 私有 |
| 577 | `SUMMARY_JOINS` | SQL JOIN 模板 |
| 584 | `SUMMARY_EXTRA_COLS` | SQL 额外列 |
| 590–592 | `CASE_PRIORITIES`, `CASE_RISK_LEVELS`, `CASE_RESULT_OUTCOMES` | 枚举集合 |

### 2.2 类型（export / 私有）
- export `TemplatesResolver`(136), `CaseQueryRow`(156)
- 私有：`CaseListSummaryRow`(314), `BillingSummaryAggRow`(336), `CaseDetailCountsRow`(352), `LatestSubmissionRow`(415), `LatestReviewRow`(442), `DocProgressByProviderRow`(466), `LatestValidationRow`(485), `OverseasStepEffects`(1194), `PhaseStampEffects`(1227), `PhaseTransitionSideEffects`(1288), `ChecklistItem`(3325), `TimelineInput`(3334)
- export 重导出：529 行 `export type { ... }`

### 2.3 行映射器（mapper，全部 export）
- `mapCaseRow`(269), `mapCaseListSummaryRow`(324), `mapDetailCountsRow`(393), `mapLatestSubmissionRow`(426), `mapLatestReviewRow`(453), `mapDocProgressByProviderRows`(475), `mapLatestValidationRow`(496)
- 还有 `isOverseasStepCode`(1190), `resolveOverseasStepEffects`(1209), `resolvePhaseStampEffects`(1249), `shouldIncrementSupplementCount`(1273), `mapPhaseToTerminalStage`(1283)

### 2.4 私有 helpers（class 外）
- 流水线辅助：`resolvePostApprovalStage`(209), `mapCaseExtendedFields`(218), `mapCaseP0Fields`(245), `parseIntSafe`(386), `toTimestampStringOrNull`(515), `toTimestampString`(522)
- 列表过滤构造：`buildCaseListFilter`(601), `hasInvalidCaseListUuidFilter`(608), `buildCaseListFilterPrefixed`(614), `appendVisibilityConditionPrefixed`(672), `appendScopeConditionPrefixed`(702), `pickDefined`(730)
- 案件号生成：`formatCaseYearMonth`(737), `formatCaseNo`(741), `resolveCasePrefix`(745), `isCaseNoConflict`(755)
- 写入字段解析与校验：`resolveCaseUpdateFields`(764), `validateCaseEnums`(810), `resolveRequestedCaseStage`(833), `assertNotArchived`(859), `resolveRequestedTransitionStage`(869), `resolveInitialBusinessPhase`(890), `resolveTransitionBusinessPhase`(902), `assertCloseReasonForNonCompletionArchive`(912), `buildInsertCaseParams`(926)
- 详情聚合 SQL 查询：`queryDetailCaseRow`(970), `queryDetailCounts`(989), `queryLatestValidation`(1016), `queryLatestSubmission`(1033), `queryLatestReview`(1050), `queryDocProgressByProvider`(1069), `queryCurrentResidencePeriod`(1092)
- 字段派生：`deriveBillingSummary`(1112), `deriveDeepLink`(1124)
- workflow step 校验：`validateWorkflowStepTransitionTarget`(1141)
- 阶段转移副作用：`buildPhaseTransitionTimelinePayload`(1295), `settledValueOrUndefined`(1324), `settledValueOrDefault`(1330), `logSettledErrors`(1346)
- class 之后：`writeTimelineInTx`(3345), `insertInitialBillingPlanFromQuote`(3384), `writeCrossGroupTimeline`(3430), `validateDueAt`(3452)

> 顶层 helper 数量 **>40**，跨 9 类职能。是 §3 主观分组的来源。 **[H] 事实，[M] 分组归类是观察归纳**

## 3. `class CasesService`（1365–3324）成员清单

构造器（1373–1386）：注入 `Pool`、`TEMPLATES_RESOLVER`、`PermissionsService?`、`BillingPlansService?`、`PaymentRecordsService?`（后三个 `@Optional`）。 **[H]**

下表按"职责簇"分组。簇划分为本次分析的归纳产物 → **[M]**。
方法的"自身行数 ≈ 下一方法起点 − 当前方法起点"。

### 3.1 簇 A — Create / 引用解析（5 方法 + 1 静态错误转换）
| 起点 | 方法 | ~行数 | 备注 |
|------|------|------|------|
| 1391 | `async create` | 17 | 公共入口 |
| 1408 | `runCreateTransaction` | 55 | 事务体 |
| 1463 | `static PG_CLIENT_ERROR_REASONS`（属性） | 12 | |
| 1475 | `static wrapCreateError` | 37 | PG 错误 → HttpException |
| 1512 | `assertCreateRefs` | 21 | |
| 1533 | `assertBmvCaseCreationGate` | 28 | |
| 1561 | `resolveCreateGroup` | 45 | |
| 1606 | `resolveExplicitGroupId` | 41 | |
| 1647 | `resolveOwnerUserId` | 31 | |
合计 ≈ **287** 行（class 内 14.6%） **[H]**

### 3.2 簇 B — Read（get / list / detail / billingTab）
| 起点 | 方法 | ~行数 |
|------|------|------|
| 1678 | `async get` | 21 |
| 1699 | `assertCanEditCase` | 29 |
| 1728 | `getBillingTabAggregate` | 34 |
| 1762 | `aggregateCaseBillingSummaryFull` | 59 |
| 1821 | `async list` | 42 |
| 1863 | `listSummary` | 50 |
| 1913 | `getDetailAggregate` | 57 |
合计 ≈ **292** 行 **[H]**

### 3.3 簇 C — Update / Soft delete / 风险确认
| 起点 | 方法 | ~行数 |
|------|------|------|
| 1970 | `update` | 57 |
| 2027 | `transition` | 60 |
| 2087 | `softDelete` | 38 |
| 2125 | `acknowledgeBillingRisk` | 61 |
| 2186 | `updatePostApprovalStage` | 54 |
合计 ≈ **270** 行 **[H]**

### 3.4 簇 D — Billing Gate（散布）
| 起点 | 方法 | ~行数 |
|------|------|------|
| 2240 | `assertPostApprovalBillingGate` | 9 |
| 2249 | `runCoeSendBillingGate` | 36 |
| 2285 | `hasFinalPaymentBillingRecords` | 19 |
| 2534 | `assertCoeSendBillingGate` | 9 |
| 2543 | `assertClosedSuccessGate` | 28 |
| 2605 | `assertWorkflowStepBillingGate` | 56 |
合计 ≈ **157** 行；**该簇与簇 E、F 在源代码上交错** **[H]**

### 3.5 簇 E — Workflow step transitions（BMV）
| 起点 | 方法 | ~行数 |
|------|------|------|
| 2304 | `transitionWorkflowStep` | 71 |
| 2571 | `writeOverseasStepTimeline` | 34 |
合计 ≈ **105** 行 **[H]**

### 3.6 簇 F — Phase transitions（businessPhase）
| 起点 | 方法 | ~行数 |
|------|------|------|
| 2375 | `transitionPhase` | 51 |
| 2426 | `assertCloseReasonForFailedPhase` | 12 |
| 2438 | `buildPhaseTransitionEffects` | 23 |
| 2461 | `assertValidPhaseTransitionInput` | 17 |
| 2478 | `executePhaseTransitionUpdate` | 56 |
合计 ≈ **159** 行 **[H]**

### 3.7 簇 G — Validation gates（resolveChecklist + validate*）
| 起点 | 方法 | ~行数 |
|------|------|------|
| 2661 | `resolveChecklistItems` | 53 |
| 2714 | `validateTransition` | 36 |
| 2750 | `validateTransitionGate` | 33 |
| 2783 | `validateReadyForDocumentPreparation` | 28 |
| 2811 | `validateReadyForInternalReview` | 26 |
| 2837 | `getLatestValidationRun` | 25 |
| 2862 | `getLatestReviewRecord` | 26 |
| 2888 | `validateReadyForSubmission` | 14 |
| 2902 | `validateGateC` | 19 |
| 2921 | `validateSuccessCloseout` | 35 |
| 2956 | `assertLatestValidationRunPassed` | 58 |
| 3014 | `isValidationRunStale` | 24 |
| 3038 | `isReviewRequired` | 20 |
合计 ≈ **397** 行（最大簇，class 内 ~20%） **[H]**

### 3.8 簇 H — DB 写入辅助
| 起点 | 方法 | ~行数 |
|------|------|------|
| 3058 | `insertCase` | 19 |
| 3077 | `insertCaseWithAutoNumber` | 17 |
| 3094 | `generateCaseNo` | 17 |
| 3111 | `executeUpdateCase` | 57 |
| 3168 | `insertDocumentItems` | 26 |
| 3194 | `insertInitialTasks` | 65 |
| 3259 | `resolveCustomerGroupId` | 26 |
合计 ≈ **227** 行 **[H]**

### 3.9 簇 I — 杂项 / 守护
| 起点 | 方法 | ~行数 |
|------|------|------|
| 3285 | `incrementSupplementCount` | 11 |
| 3296 | `static ALLOWED_ASSERT_TABLES` | 10 |
| 3306 | `assertBelongsToOrg` | 18 |
合计 ≈ **39** 行 **[H]**

### 3.10 簇规模总览（class 1960 行内分布）

| 簇 | ~行数 | 占比 |
|----|------|------|
| A Create | 287 | 14.6% |
| B Read | 292 | 14.9% |
| C Update/Transition (legacy) | 270 | 13.8% |
| D Billing Gate（散布） | 157 | 8.0% |
| E Workflow step | 105 | 5.4% |
| F Phase transition | 159 | 8.1% |
| G Validation gates | 397 | 20.3% |
| H DB writers | 227 | 11.6% |
| I 杂项 | 39 | 2.0% |
| 构造器 + 注释 + 空行 | 残 ~27 | <2% |

> 单类内最大簇为 **G(Validation gates) 397 行** + **B(Read) 292 行** + **A(Create) 287 行**；任何切片都需要至少跨 5 个簇互动。 **[M] 归纳；簇粒度行数 [H]**

## 4. 对外形态

`CasesService` 暴露给 controller 的公共方法（共 15 个）：
`create / get / assertCanEditCase / getBillingTabAggregate / list / listSummary / getDetailAggregate / update / transition / softDelete / acknowledgeBillingRisk / updatePostApprovalStage / transitionWorkflowStep / transitionPhase / incrementSupplementCount` **[H]**

注意三种"状态变更入口"并存：
- `transition`（旧 stage 直转，2027）
- `transitionWorkflowStep`（BMV 工作流 step，2304）
- `transitionPhase`（业务相位 phase，2375）
> 是否存在调用合并 / 优先级关系，未在本轮验证（详见 backlog B-008+）。 **[L]**

## 5. 入度（被谁使用）

未量化（属 B-002 任务）。本轮仅记录：
- `app.module.ts` 通过 DI 装配该 service。 **[H]**
- 在 `cases.controller.ts`（489 行）内被调用入口数 — 待 B-008 中精确统计。 **[L]**

## 6. 观察（中性记录，**非建议**）

- O-1：3 种状态机入口（stage / phase / workflow-step）共存于一个 service，与 `businessPhase.ts` + `cases.workflow-step.ts` 的拆分文件名暗合，但服务层未做对应分离。 **[M]**
- O-2：跨域 import 至少 5 个生产 service（permissions / billingPlans / paymentRecords + 兄弟 service mapResidencePeriodRow + portal/intake.types）。 **[H]**
- O-3：顶层（类外）已存在大量 mapper / SQL 模板 / 业务规则常量（1268 行），与类内 1960 行近似比例 1:1.5。任何拆分实践都要先决定"顶层 helper 怎么走"。 **[M]**
- O-4：构造器中三个 service 为 `@Optional`，提示运行/测试装配存在 partial wiring 模式。 **[H]**

## 7. 未确认 / 增项

→ 已新增 **OQ-17 / OQ-18 / OQ-19**（见 `06-open-questions.md`）。
→ 扩展 backlog 任务：**B-008+**（cases ↔ templates / portal-intake 反向依赖语义）、**B-002 高优先**。

---

## 附录 A — Templates ↔ Cases 耦合点（B-008）

> 数据来源：`cases.service.ts`、`submissionPackages.service.ts`、`cases.template-bmv.ts`、`app.module.ts`、`modules/templates/*`。
> 标注：**[H]** High / **[M]** Medium / **[L]** Low confidence。

### A.1 耦合形态：Port-Adapter（依赖反转）**[H]**

`cases.service.ts` **不**直接导入 `TemplatesService`；而是定义"最小契约接口"+ Symbol 令牌，由 `app.module.ts` 在装配时绑定：

```ts
// cases.service.ts:135-150
export type TemplatesResolver = {
  resolve(ctx: RequestContext, input: { kind: string; key: string; entityId?: string })
    : Promise<
        | { mode: "legacy"; used: false }
        | { mode: "template"; used: false; reason: string }
        | { mode: "template"; used: true; version: number; config: Record<string, unknown> }
      >;
};
export const TEMPLATES_RESOLVER = Symbol("TEMPLATES_RESOLVER");  // line 153
```

`app.module.ts:217-218`：
```ts
{ provide: TEMPLATES_RESOLVER, useExisting: TemplatesService }
```

**意义**：`modules/core/cases → modules/templates` **没有 import 边**；耦合通过容器解析。 **[H]**

### A.2 注入点（2 处）**[H]**

| 文件 | 行 | 注入字段 |
|------|---|----------|
| `cases.service.ts` | 1375 | `@Inject(TEMPLATES_RESOLVER) private readonly templatesResolver: TemplatesResolver` |
| `submission-packages/submissionPackages.service.ts` | 254 | 同上（接口与令牌均从 `cases.service.ts` 导出） |

submission-packages **直接 import 自 cases**：`import { TEMPLATES_RESOLVER, TemplatesResolver } from "../cases/cases.service"`（submissionPackages.service.ts:17）→ submission-packages 在结构上已对 cases 域类型形成事实依赖。 **[M] 风险 → OQ-42。**

### A.3 调用点（5 处）与 kind 分布 **[H]**

| 调用文件 | 行 | 方法 | kind | key | 用途 |
|---------|---|------|------|-----|------|
| `cases.service.ts` | 2665 | `resolveChecklistItems` | `document_checklist` | `caseTypeCode` | 取案件资料清单 blueprint（首选） |
| `cases.service.ts` | 2671 | `resolveChecklistItems` | `case_type` | `caseTypeCode` | 同上回退（读 `requirementBlueprint` 字段） |
| `cases.service.ts` | 2721 | `validateTransition` | `state_flow` | `caseTypeCode`（+entityId） | 校验 stage 迁移是否在 `allowedTransitions` 内 |
| `cases.service.ts` | 3042 | `isReviewRequired` | `case_type` | `caseTypeCode`（+entityId） | 读 `review_required_flag` |
| `submissionPackages.service.ts` | 809 | `isReviewRequired` | `case_type` | `caseTypeCode`（+entityId） | 同上（语义重复） |

**全仓 kind 集合**：`{"case_type", "document_checklist", "state_flow"}`（共 3 类）。 **[H]**

### A.4 BMV 模板蓝图（cases.template-bmv.ts）**[H]**

`cases/cases.template-bmv.ts`（被 03-dependency-graph 标注为 fan-in=23）承担**配置真相源**而非运行时调用：

- `BMV_CASE_TYPE = "business_manager_visa"`、`isBmvCaseTypeCode(code)` 前缀匹配 `biz_mgmt%`（与 migration 038 一致）。
- 导出 `BMV_WORKFLOW_STEPS_BLUEPRINT`、`BMV_EXTRA_FIELDS_BLUEPRINT`、`BMV_REQUIREMENT_BLUEPRINT` 等纯数据。
- 文件头注释明示："此文件供 `TemplatesService.createVersion()` 或 seed 脚本使用"。
- **运行时**：cases.service.ts 通过 `templatesResolver.resolve()` 读已落库的版本化模板配置；BMV 蓝图本身不在请求路径上。

**意义**：BMV 蓝图是**写时**素材（seed / migration 038 + 后续），与 §A.3 的**读时**resolver 调用完全解耦。 **[H]**

### A.5 模板 mode 语义（对 cases 行为的影响） **[H]**

- `mode: "legacy"` → cases 走旧默认逻辑（如 `validateTransition` 用 `STAGE_TRANSITIONS_DEFAULT` 表，第 122 行附近）。
- `mode: "template", used: false, reason: ...` → 模板存在但当前未启用；同样退到默认。
- `mode: "template", used: true` → 强制使用模板的 `config.allowedTransitions` / `config.items` / `review_required_flag`。

**关键观察**：cases 业务在 4 个不同 cluster（CRUD checklist / Stage Transitions / Validation / Review）共享同一对模板的 `legacy↔template` 切换路径。任何 `mode` 判定改动会跨 4 个簇起作用。 **[H] 风险**

### A.6 反向依赖：templates 对 cases？**[H]**

- `modules/templates/templates.{controller,service,model}.ts` **不** import `cases/*`（grep 验证无匹配）。
- 但 `submissionPackages.service.ts` import `cases/cases.service.ts`（拿 `TEMPLATES_RESOLVER` 令牌），构成 `submission-packages → cases` 边（不属于 templates）。

→ **方向是单向的**：cases / submission-packages 经端口反向依赖 templates；templates 不知道 cases 存在。 **[H]**

### A.7 风险 / 待决问题

- **R1** `TEMPLATES_RESOLVER` 与 `TemplatesResolver` 类型在 `cases.service.ts` 中导出，泄漏了 cases 域作为"端口宿主"的角色。若把端口移到独立 `core/model` 或 `core/templates/contract.ts` 更纯。 **[M]** → OQ-43。
- **R2** `submission-packages` import `cases/cases.service.ts` 仅为拿令牌，但实际上引入了对 cases 整个 service 文件的图依赖（见 03-dependency-graph 中 cases.service fan-in=45）。 **[M]** → OQ-42。
- **R3** `kind` 字符串字面量（`"case_type"` / `"document_checklist"` / `"state_flow"`）散布于 5 处调用，未集中到 const enum；新增 kind 时容易拼写漂移。 **[M]** → OQ-44。
- **R4** `resolveChecklistItems` 读 `config.items` 与 `config.requirementBlueprint` 两个字段（兜底逻辑），暗示模板 schema 曾有迁移；模板 config 没有强类型约束（`Record<string, unknown>`），靠运行时 narrow。 **[M]** → OQ-45。
- **R5** 同名方法 `isReviewRequired` 在 cases.service 与 submissionPackages.service **重复实现**（行 3038 / 行 804），逻辑一致；任一改动需双侧同步。 **[H] 风险** → OQ-46。

