# 案件模块集成渐进式测试计划

> 依据：`/Users/ck/.cursor/plans/case-module-integration-plan_a983b26d.plan.md`
> 目的：把 `Batch 0 ~ Batch 5` 的落地顺序转换成可执行、可留痕、可逐批放行的测试节奏。
> 适用范围：`packages/server/src/modules/core/cases*`、`packages/admin/src/views/cases*`，以及 `customers / documents / dashboard / reminders / residence-periods / billing / submission-packages` 相关下游。

## 1. 测试目标

1. **先保底座，再放扩展**：先验证 P0 主链与跨模块稳定，再放行 P1 经营管理签扩展。
2. **先小范围，再批次，再阶段尾**：先 focused test，后 batch 增量回归，最后做阶段汇总复核。
3. **任何契约变更都必须带下游验证**：尤其是 `/api/cases`、detail aggregate DTO、query contract、deep-link 协议。
4. **失败不过夜**：测试失败必须在当前批次修复，不得留到下一批补做。

## 2. 渐进式测试分层

| 层级 | 时机 | 目标 | 通过标准 |
|---|---|---|---|
| **L0 口径审查** | 开工前 | 冻结权限、状态机、DTO、query、deep-link 边界 | 需求/契约无悬空项 |
| **L1 Focused tests** | 子任务开发中 | 锁定单一 builder / adapter / service / composable 责任 | 仅目标测试通过 |
| **L2 Batch 增量回归** | 子任务合并前 | 验证本批热点与同层联动 | 本批增量集全部通过 |
| **L3 下游验证** | 公共契约变更后 | 验证 customer / documents / dashboard 等消费方 | 受影响验证集全部通过 |
| **L4 Exit gate** | 每批收尾 | 固化 `fix -> guard -> incremental` | `scripts/batch-exit-matrix.sh <batch>` 通过 |
| **L5 Phase closeout** | 阶段结束 | 只做汇总复核，不替代前面门禁 | 阶段 checklist 填写完成 |

## 3. 统一执行规则

### 3.1 每批固定顺序

1. 开发中反复执行 `scripts/batch-exit-matrix.sh <batch> --inc`
2. PR / 批次收尾执行 `scripts/batch-exit-matrix.sh <batch>`
3. 阶段尾再执行一次：`npm run fix` -> `npm run guard`

### 3.2 触发下游验证的高风险变更

- `/api/cases` list/detail 响应字段增删改
- `CaseRepository`、`CaseAdapterReaders`、`CaseAdapterMappers`、`CaseAdapterDetailAggregate` 变更
- `query.ts` 的 list query、tab query、case create query、cross-module link 变更
- `Case.stage`、`CaseWorkflowStep`、Gate-A/B/C、`related_submission_id`、`ResidencePeriod`、reminder blueprint 相关规则变更

### 3.3 失败处理规则

- **L1 失败**：停止继续扩散改动，先修本子任务。
- **L2/L3 失败**：回到本批修复，禁止带病进入下一批。
- **L4 失败**：该批不得视为完成。
- **L5 发现缺口**：必须回退到对应 batch 补修，不能在阶段尾“补跑替代”。

## 4. 按批次的渐进式测试节奏

## Batch 0：基线冻结

- **目标**：冻结 P0/P1 边界、BMV 真相源、group 真相源、非目标项。
- **L0 审查重点**：`Case.stage = S1-S9` 与 `CaseWorkflowStep` 分层；P0 warn 与 P1 block 边界；提醒与在留期间归属。
- **L1/L2**：无代码测试。
- **L4**：建议执行 `scripts/batch-exit-matrix.sh b0` 做无副作用验证。
- **放行条件**：后续 server/admin 批次不再边做边定口径。

## Batch 1：P0 server 主链

- **目标**：权限矩阵、Gate 责任、detail aggregate DTO、10 tab 配套 server 契约稳定。
- **L1 优先顺序**：
  1. 权限与读写门禁：`cases.controller.permissions.test.ts`、`cases.regression-service.test.ts`、`cases.regression-parties.test.ts`
  2. Gate / transition / submission：`cases.service.s4-validation.test.ts`、`submissionPackages.service.test.ts`、`submissionPackages.chain-guards.focused.test.ts`
  3. 计费/提醒基础模块：`billingPlans.service.test.ts`、`paymentRecords.service.test.ts`、`reminders.service.test.ts`
- **L2 增量回归**：`npm run server:test`
- **L3 下游验证**：若 detail aggregate DTO 或 read model 变更，先记入 Batch 2 / Batch 3 下游清单。
- **L4**：`scripts/batch-exit-matrix.sh b1`
- **放行条件**：admin 可基于稳定 read/write contract 接入，不再依赖猜测字段。

## Batch 2：P0 admin 主链

- **目标**：cases 模块脱离 fixture/mock，list/detail/create 主链接真。
- **L1 建议拆法**：
  1. `p0-fe-002a ~ 002f`：先测 adapter/builder/repository 基座
  2. `p0-fe-003 ~ 005`：再测 list/detail/create 三条主路径
  3. `p0-fe-006 ~ 008`：最后测 tabs 与 detail write actions
- **L1 重点测试**：`CaseAdapterReaders.test.ts`、`CaseAdapterMappers.test.ts`、`CaseListContractIntegration.test.ts`、`repository.test.ts`
- **L2 增量回归**：`scripts/batch-exit-matrix.sh b2 --inc`
- **L3 下游验证**：最少覆盖 customer related cases 与 customer create entry；详见 `p0-qa-002-02-downstream-validation-set.md`
- **L4**：`scripts/batch-exit-matrix.sh b2`
- **放行条件**：`/api/cases?customerId=`、detail deep-link、create source context 均未破坏现有入口。

## Batch 3：P0 跨模块收口

- **目标**：customers / documents / dashboard 指向 cases 的入口、回链与 query contract 统一。
- **L1 重点测试**：
  - customer 下游：`useCustomerCasesModel*.test.ts`、`CustomerCasesQueryContract.test.ts`
  - 建案入口：`CustomerCreateCaseEntryContract.test.ts`、`useCreateCaseModel.customer*.test.ts`
  - 深链协议：`query.cross-module*.test.ts`、`query.deeplink-regression.test.ts`
- **L2 增量回归**：`scripts/batch-exit-matrix.sh b3 --inc`
- **L3 下游验证**：必须完整执行 VS-1 ~ VS-5
- **L4**：`scripts/batch-exit-matrix.sh b3`
- **放行条件**：cases 不再是孤岛模块，跨模块入口与返回链路统一。

## Batch 4：P1-A 经营管理签 Step 1–14

- **目标**：模板底座、问卷/报价、签约前门禁、业务子步骤、补正循环闭环。
- **L1 server 优先集**：`bmvTemplateConfig.test.ts`、`cases.template-bmv.test.ts`、`cases.pre-sign-gate.focused.test.ts`、`cases.questionnaire-docs.focused.test.ts`、`cases.workflow-step.focused.test.ts`、`cases.regression-p1-questionnaire-supplement.test.ts`、`cases.bmv-submission-cycle.focused.test.ts`
- **L1 admin 优先集**：`p1-qa-step-mapping-adapter.focused.test.ts`、`CaseAdapterDetailAggregate.survey-quote.test.ts`、`useCaseDetailWriteActions.survey-quote.focused.test.ts`
- **L2 增量回归**：`scripts/batch-exit-matrix.sh b4 --inc`
- **L3 下游验证**：除 cases 主链外，至少回归 customer related cases，确认 P1 扩展未污染 P0 list/detail contract。
- **L4**：`scripts/batch-exit-matrix.sh b4`
- **放行条件**：`CaseWorkflowStep` 与 `S1-S9` 并行展示，且补正循环与提交链路可验证。

## Batch 5：P1-B 经营管理签 Step 15–20

- **目标**：尾款 block、COE、海外返签、在留期间、自动提醒、成功/失败结案闭环。
- **L1 server 优先集**：`cases.final-payment-coe-guard.focused.test.ts`、`cases.coe-block-guard.focused.test.ts`、`cases.overseas-step-branching.focused.test.ts`、`cases.regression-p1-coe-visa-residence.test.ts`、`cases.regression-p1-reminder-closeout.test.ts`、`cases.success-closeout-gate.focused.test.ts`、`cases.closeout-rules.focused.test.ts`、`residencePeriods.focused.test.ts`
- **L1 admin 优先集**：`p1-qa-button-guard-matrix.focused.test.ts`、`p1-qa-write-actions-error-mapping.focused.test.ts`、`CaseAdapterDetailAggregate.residence-reminder.test.ts`、`CaseAdapterDetailAggregate.bmv-failure-path.test.ts`、`useCaseDetailWriteActions.coe-residence-reminder.focused.test.ts`、`useCaseDetailWriteActions.exception-paths.focused.test.ts`
- **L2 增量回归**：`scripts/batch-exit-matrix.sh b5 --inc`
- **L3 下游验证**：完整回归 cases + customers + documents + dashboard，确认 P1 结案与提醒链路没有破坏 P0 入口。
- **L4**：`scripts/batch-exit-matrix.sh b5`
- **放行条件**：成功/失败结案均有服务端判定与前端反馈，提醒失败能阻断成功结案。

## 5. 阶段尾复核顺序

### 5.1 P0 结束时

1. 先确认 Batch 1 ~ Batch 3 的门禁记录齐全
2. 再填写 `p0-qa-002-03-phase-closeout-checklist.md`
3. 最后执行一次 `npm run fix` -> `npm run guard`

### 5.2 P1 结束时

1. 先确认 Batch 4 ~ Batch 5 的门禁记录齐全
2. 再填写 `p1-qa-002-03-phase-closeout-checklist.md`
3. 最后执行一次 `npm run fix` -> `npm run guard`

## 6. 留痕要求

每个 batch 至少沉淀以下信息：

| 留痕项 | 内容 |
|---|---|
| 改动范围 | 本批改动的模块 / 文件热点 |
| L1 结果 | 运行了哪些 focused tests，哪些新增 / 更新 |
| L2 结果 | `--inc` 增量回归是否通过 |
| L3 结果 | 受影响下游验证集执行情况 |
| L4 结果 | `scripts/batch-exit-matrix.sh <batch>` 结果 |
| 风险备注 | 未关闭风险、是否阻断下一批 |

## 7. 计划与现有 QA 资产的关系

- 本文档定义 **“按什么节奏测”**。
- `p0-qa-002-01-batch-exit-command-matrix.md` 定义 **“每批退出时跑什么命令”**。
- `p0-qa-002-02-downstream-validation-set.md` 定义 **“cases 公共契约变更后验哪些下游”**。
- `p0-qa-002-03-phase-closeout-checklist.md` 与 `p1-qa-002-03-phase-closeout-checklist.md` 定义 **“阶段尾如何汇总复核”**。

## 8. 一句话执行建议

开发期只跑最小 focused tests；子任务完成后跑 `--inc`；批次收尾跑完整 exit gate；阶段结束再做 checklist 汇总复核。