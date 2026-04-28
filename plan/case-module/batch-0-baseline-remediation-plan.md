# 第一阶段（Batch 0）基线门禁修复计划

> 适用阶段：`Batch 0 / 基线冻结`
> 触发来源：执行 `bash scripts/batch-exit-matrix.sh b0` 失败
> 当前结论：`fix (all)` 与 `guard (all)` 均被 `packages/admin` 的 lint 规则阻断；`server:guard` 尚未执行到。

## 1. 目标

本阶段不做功能扩展，只处理**进入后续批次前必须清掉的基线门禁问题**。

完成标准：

1. `bash scripts/batch-exit-matrix.sh b0` 通过
2. `npm run fix` 不再被 `@cms/admin` 的 `lint:fix` 阻断
3. `npm run guard` 至少可顺利跑过 `mobile:guard` 与 `admin:guard`，并继续进入 `server:guard`
4. 不因门禁修复引入业务逻辑变化

## 2. 当前阻塞面

本次失败不是业务测试失败，而是 **admin cases / customers 相关文件的静态门禁失败**。问题主要分为 5 类：

| 类别 | 现象 | 影响 |
|---|---|---|
| `max-lines` | 多个 `.ts` / `.test.ts` / `.vue` 文件超过 500 行 | `fix` 与 `guard` 都会失败 |
| `max-lines-per-function` | `useCaseDetailModel`、`useCaseListModel` 主函数过长 | 阻断 `guard` |
| `complexity` | `adaptReminderDto` 复杂度超限 | 阻断 `guard` |
| `jsdoc/*` | 若干 helper / test helper 缺少描述、`@returns`、`@param` 说明 | 阻断 `fix` 与 `guard` |
| `no-unused-vars` | 少量测试与辅助导入未使用 | 阻断 `fix` 与 `guard` |

## 3. 修复原则

1. **先清门禁噪音，再谈下一阶段测试**：Batch 1 不应建立在脏基线上。
2. **先低风险、后结构性拆分**：优先修未使用变量与 JSDoc，再拆函数与文件。
3. **先运行时代码，后测试文件**：先消除真正影响主链可维护性的热点，再拆大型测试文件。
4. **只做门禁修复，不顺手改业务行为**：避免把 lint 清理演变成重构扩散。
5. **拆分遵守现有架构边界**：业务逻辑仍留在 `model`；不要把 feature 逻辑塞回组件。

## 4. 建议修复顺序

## Phase A：快速清理项（低风险，先做）

目标：先消掉不会改变行为的显性错误，缩小后续结构性问题的噪音。

- 处理 `no-unused-vars`
- 补齐缺失的 JSDoc 描述
- 只在必要位置补注释，不扩散到无关文件

### 优先文件

- `packages/admin/src/views/cases/i18n-regression.focused.test.ts`
- `packages/admin/src/views/cases/model/caseListRepository.focused.test.ts`
- `packages/admin/src/views/cases/model/useCaseDetailModel.qa.test.ts`
- `packages/admin/src/views/cases/model/useCaseListModel.focused.test.ts`
- `packages/admin/src/views/cases/model/useCreateCaseModel.family-bulk-entry.test.ts`
- `packages/admin/src/views/customers/model/CustomerCreateCaseEntryRegression.test.ts`
- `packages/admin/src/views/cases/components/CaseInfoTab.vue`
- `packages/admin/src/views/cases/model/CaseAdapterValidationBilling.ts`
- `packages/admin/src/views/cases/model/CaseAdapterWriteBuilders.ts`
- `packages/admin/src/views/cases/model/useCaseListModel.test.ts`

### 阶段完成标志

- `unused-vars` 与明显 JSDoc 缺口基本清零
- 剩余问题主要集中为文件长度、函数长度、复杂度

## Phase B：运行时代码热点拆分（高优先）

目标：优先处理真正影响后续开发的 cases 主链热点文件。

### 必修文件

- `packages/admin/src/views/cases/model/CaseAdapterDetailAggregate.ts`
- `packages/admin/src/views/cases/model/CaseAdapterSupportSeams.ts`
- `packages/admin/src/views/cases/model/CaseRepository.ts`
- `packages/admin/src/views/cases/model/CaseAdapterWriteBuilders.ts`
- `packages/admin/src/views/cases/model/useCaseDetailModel.ts`
- `packages/admin/src/views/cases/model/useCaseListModel.ts`
- `packages/admin/src/views/cases/components/CaseWorkflowStepSection.vue`

### 修复方向

- 将大型 adapter 按 slice / concern 拆到独立模块
- 将长函数按“读模型组装 / UI 状态 / 写操作编排 / 路由同步”拆成小 helper
- 将组件内过长逻辑移到 `model` 或局部纯函数，不把业务逻辑继续堆在 `.vue`
- 将 `adaptReminderDto` 的条件分支拆为更小的语义函数，降低复杂度

### 阶段完成标志

- 运行时代码不再触发 `max-lines` / `max-lines-per-function` / `complexity`
- 不引入 API 签名漂移

## Phase C：大型测试文件拆分（中优先）

目标：在运行时代码稳定后，拆掉超长 focused/regression 测试文件。

### 重点文件

- `CaseAdapterDetailAggregate.bmv-contract.test.ts`
- `CaseAdapterDetailAggregate.bmv-failure-path.test.ts`
- `CaseAdapterDetailAggregate.overview-info-focused.test.ts`
- `CaseAdapterSupportSeams.tasks-deadlines-focused.test.ts`
- `CaseAdapterSupportSeams.test.ts`
- `CaseCommsLogsAdapter.focused.test.ts`
- `CaseRepository.consumer-readiness.test.ts`
- `CaseRepository.focused.test.ts`
- `useCaseDetailCloseout.focused.test.ts`
- `useCaseDetailModel.focused.test.ts`
- `useCaseDetailModel.test.ts`
- `useCaseDetailWriteActions.coe-residence-reminder.focused.test.ts`
- `useCaseDetailWriteActions.exception-paths.focused.test.ts`
- `useCaseDetailWriteActions.survey-quote.focused.test.ts`
- `useCaseListModel.focused.test.ts`
- `useCaseListModel.test.ts`
- `useCreateCaseModel.customer-entry-regression.test.ts`
- `useCreateCaseModel.family-bulk-defaults.test.ts`
- `useCreateCaseModel.family-bulk-entry.test.ts`
- `p1-downstream-validation-set.test.ts`
- `query.family-entry-contract.test.ts`
- `customers/model/CustomerCreateCaseEntryRegression.test.ts`

### 修复方向

- 按场景或责任拆成多个 focused test 文件
- 保持原测试归属语义，不把一个测试文件拆成难以理解的碎片
- 拆分后优先保证命名与既有 `*.focused.test.ts` / `*.regression.test.ts` 风格一致

## Phase D：边角超长文件收尾（中低优先）

### 文件

- `packages/admin/src/views/cases/constantsBmvSteps.focused.test.ts`
- `packages/admin/src/views/customers/components/CustomerContactsTab.vue`

### 处理方式

- 若只是测试样例过大，则按场景拆文件
- 若是组件过长，则优先抽局部展示组件或纯渲染 helper

## 5. 每个阶段的复测方式

每完成一个 phase，按最小成本复测：

1. `npm --workspace @cms/admin run lint`
2. 必要时再跑 `npm --workspace @cms/admin run guard`
3. 全部 phase 完成后，再跑：`bash scripts/batch-exit-matrix.sh b0`

## 6. 进入第二阶段前的放行条件

只有以下条件全部满足，才进入第二阶段测试：

- `bash scripts/batch-exit-matrix.sh b0` 通过
- `admin:guard` 不再被 lint 规则阻断
- `server:guard` 至少被真正执行到一次
- 没有把 Batch 0 修复扩散成 Batch 1 功能改造

## 7. 风险提醒

| 风险 | 说明 | 控制方式 |
|---|---|---|
| 过度重构 | 为了压行数顺手重写 model / adapter | 每次只围绕门禁问题拆分 |
| 测试归属漂移 | 拆测试时把契约测试、回归测试混在一起 | 保持现有 focused / regression / contract 命名边界 |
| 架构越层 | 把 model 逻辑塞回 `.vue` 组件 | 运行时代码拆分时坚持 `model` 为主 |
| 误判通过 | 只跑局部 lint，未验证完整 batch | 最终必须回到 `scripts/batch-exit-matrix.sh b0` |

## 8. 本文档用途

本文档定义的是 **“第一阶段先怎么修”**。

- 测试节奏总览：`case-module-integration-progressive-test-plan.md`
- 批次门禁矩阵：`p0-qa-002-01-batch-exit-command-matrix.md`
- 下一步测试入口：在本计划完成并复测通过后，进入 `Batch 1`