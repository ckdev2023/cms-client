# P0 Batch Exit Command Matrix

> Task ID: `p0-qa-002-01-batch-exit-command-matrix`
> 每批 PR 必须执行的门禁命令固化为可执行矩阵；阶段尾只做汇总复核，不替代各批门禁。

## 通用退出序列

每批 / 每个 PR 合入前，按以下固定顺序执行：

```
1. npm run fix          # format + lint:fix
2. npm run guard        # deps → typecheck → lint → test → build
3. 增量测试（见下方矩阵）
```

- `npm run fix` = `npm run mobile:fix && npm run admin:fix && npm --workspace server run fix`
- `npm run guard` = `npm run mobile:guard && npm run admin:guard && npm run server:guard`
- 其中 `admin:guard` = `check:deps → typecheck → lint → vitest run --coverage → build`

## 按批次的增量测试矩阵

| Batch | 范围 | 通用门禁 | 增量测试命令 | 验证重点 |
|-------|------|---------|-------------|---------|
| **Batch 0** 基线冻结 | 文档冻结，无代码改动 | — | — | 口径审查，无代码门禁 |
| **Batch 1** P0 server 主链 | `packages/server` | `npm run fix` → `npm run guard` | `npm --workspace server run test` | 权限矩阵、Gate 顺序、DTO 冻结、migration/backfill |
| **Batch 2** P0 admin 主链 | `packages/admin/src/views/cases` | `npm run fix` → `npm run guard` | `npx vitest run --coverage src/views/cases/` | adapter/builder/repository 接线、list/detail/create 主链、customer 下游冒烟 |
| **Batch 3** P0 跨模块收口 | `cases` + `customers` + `documents` + `dashboard` | `npm run fix` → `npm run guard` | 见下方 Batch 3 细分 | 深链协议一致、customer 回链、下游验证集 |
| **Batch 4** P1-A Step 1–14 | server + admin (P1 模板/问卷/报价/子步骤) | `npm run fix` → `npm run guard` | `npm --workspace server run test` + `npx vitest run --coverage src/views/cases/` | BMV 真相源、workflow step、补正循环 |
| **Batch 5** P1-B Step 15–20 | server + admin (P1 收费/COE/返签/提醒/结案) | `npm run fix` → `npm run guard` | `npm --workspace server run test` + `npx vitest run --coverage src/views/cases/` | 尾款 block、返签路径、ResidencePeriod、自动提醒 |

## Batch 2 增量测试细分

Batch 2 子任务量大，按子阶段进一步细分增量测试：

| 子阶段 | 改动热点 | 增量测试命令 | 通过标准 |
|--------|---------|-------------|---------|
| `p0-fe-002a` 边界冻结 | `CaseAdapterTypes`, `CaseAdapterShared`, `TEST-OWNERSHIP.md` | `npx vitest run src/views/cases/model/CaseAdapter*.test.ts` | 类型编译通过，已有 adapter 测试不回归 |
| `p0-fe-002b` list query + summary | `CaseAdapterReaders`, `CaseAdapterMappers`, `query.ts` | `npx vitest run src/views/cases/model/CaseAdapterReaders*.test.ts src/views/cases/model/CaseAdapterMappers*.test.ts src/views/cases/model/CaseListContractIntegration.test.ts src/views/cases/model/CaseListSummaryDownstream.test.ts src/views/cases/query.test.ts` | 查询序列化、字段映射、summary 聚合、customer 下游最小集 |
| `p0-fe-002c` detail aggregate | `CaseAdapterDetailAggregate` | `npx vitest run src/views/cases/model/CaseAdapterDetailAggregate*.test.ts` | 主链字段、空态、只读态、deeplink 字段 |
| `p0-fe-002d` write builders | `CaseAdapterWriteBuilders` | `npx vitest run src/views/cases/model/CaseAdapterWriteBuilders*.test.ts` | 序列化规则、空值/null/undefined 处理 |
| `p0-fe-002e` support seams | `CaseAdapterSupportSeams` | `npx vitest run src/views/cases/model/CaseAdapterSupportSeams*.test.ts` | seam 边界、类型出口 |
| `p0-fe-002f` repository integration | `CaseRepository` | `npx vitest run src/views/cases/model/CaseRepository*.test.ts` | 接线、auth header、错误分类、consumer readiness |
| `p0-fe-003-*` list 接真 | `useCaseListModel`, `CaseListView` | `npx vitest run src/views/cases/model/useCaseListModel*.test.ts src/views/cases/model/caseListRepository*.test.ts` | 分页、筛选、server item 顺序 |
| `p0-fe-004-*` detail 接真 | `useCaseDetailModel`, `CaseDetailView` | `npx vitest run src/views/cases/model/useCaseDetailModel*.test.ts` | 加载生命周期、tab 状态、customer 回链 |
| `p0-fe-005-*` create 接真 | `useCreateCaseModel`, `CaseCreateView` | `npx vitest run src/views/cases/model/useCreateCaseModel*.test.ts` | submit 流、payload 构造、错误归一化 |
| `p0-fe-006a` overview/info tabs | 组件 + `CaseAdapterDetailAggregate` | `npx vitest run src/views/cases/model/CaseAdapterDetailAggregate.overview*.test.ts src/views/cases/model/CaseAdapterDetailAggregate.info*.test.ts` | overview/info 消费字段、只读规则 |
| `p0-fe-006b` docs/forms/validation/billing tabs | 组件 + `CaseAdapterSupportSeams` | `npx vitest run src/views/cases/model/CaseAdapterSupportSeams.docs*.test.ts src/views/cases/model/CaseAdapterSupportSeams.validation*.test.ts` | 空态降级、gate 规则、计费格式 |
| `p0-fe-006c` messages/log tabs | 组件 + `CaseCommsLogsAdapter` | `npx vitest run src/views/cases/model/CaseCommsLogsAdapter*.test.ts src/views/cases/model/CaseRepository.comms-log.test.ts` | 消息/日志 DTO 映射、端点构造 |
| `p0-fe-006d` tasks/deadlines tabs | 组件 + `CaseAdapterSupportSeams` | `npx vitest run src/views/cases/model/CaseAdapterSupportSeams.tasks*.test.ts` | 任务筛选、deadline 着色、计数器刷新 |
| `p0-fe-008` detail write actions | 详情页写操作组件 | `npx vitest run src/views/cases/model/CaseAdapterWriteBuilders.actions.test.ts src/views/cases/model/CaseAdapterMutationResults.test.ts` | transition/ack/post-approval payload |

## Batch 3 增量测试细分

| 子阶段 | 改动热点 | 增量测试命令 | 验证重点 |
|--------|---------|-------------|---------|
| `p0-fe-009` ~ `p0-fe-010` customer 关联案件 | `useCustomerCasesModel`, `CustomerCasesTab` | `npx vitest run src/views/customers/model/useCustomerCasesModel*.test.ts src/views/customers/model/CustomerCasesQueryContract.test.ts` | query contract、adapter 字段、导航行为 |
| `p0-fe-011` customer 建案联动 | `CustomerDetailView`, `useCreateCaseModel` | `npx vitest run src/views/customers/model/CustomerCreateCaseEntryContract.test.ts src/views/customers/model/CustomerCreateCaseEntryRegression.test.ts src/views/cases/model/useCreateCaseModel.customer*.test.ts` | customerId/family bulk 入参、query 结构 |
| `p0-fe-012` 深链统一 | `query.ts`, `DocumentTableRow`, `QuickActionsPanel`, `SharedExpiryRiskPanel` | `npx vitest run src/views/cases/query.cross-module*.test.ts src/views/cases/query.deeplink-regression.test.ts src/views/dashboard/QuickActionsPanel.test.ts` | 深链协议全站一致 |
| `p0-qa-001` cases 模块 QA | 全 cases 模块 | `npx vitest run src/views/cases/` | 全面回归 |
| `p0-qa-002` 跨模块 QA | cases + customers + documents + dashboard | 参见 `p0-qa-002-02-downstream-validation-set.md` | 下游验证集全通过 |

## 执行规则

1. **每批结束前必须通过全部三步**：`npm run fix` → `npm run guard` → 增量测试。缺任何一步不得合入。
2. **增量测试范围只能扩大不能缩小**：若一批改动触及了更多文件，必须扩大增量测试范围。
3. **门禁失败必须当批修复**：不允许"记录问题留到下一批"。若当批无法修复，该批不得合入。
4. **阶段尾汇总复核不替代各批门禁**：参见 `p0-qa-002-03-phase-closeout-checklist.md`。
5. **记录每次失败**：失败命令、错误摘要、修复动作、回归结果必须留痕。
