# 12. 测试 Ownership / 命名规范图谱（B-010）

> 生成阶段：B-010。来源：`find` + `grep` 计数；仅 `packages/*/src/**/*.test.*` + `packages/server/tests/integration-pg/**/*.test.*`，未跑测试。

## 1. Runner 矩阵（High）

| 包 | runner | 入口 / 检测 | src 内 `*.test.*` 计数 |
|----|--------|--------------|------------------------|
| `packages/admin` | **Vitest** | `package.json: "test": "vitest run --coverage"`；366/366 文件 import `vitest` | **366** |
| `packages/server` | **node:test** | `"test": "node --import tsx --test 'src/**/*.test.ts'"`；216/216 文件 import `node:test`；0 文件用 vitest | **216**（+ 2 `tests/integration-pg`）|
| `packages/mobile` | **Jest** | `"test": "jest"`；测试文件用 `@testing-library/react-native` + 全局 `describe` | **15** |

总计 599 测试文件（admin 366 + server 218 + mobile 15）。**runner 异构是事实**，不是误读：admin 与 server 没有共享 runner。

## 2. 顶级目录分布（High）

**admin（top 7）**：`views/cases/model` 112、`views/customers/model` 41、`views/cases` 37、`views/cases/components` 26、`views/customers/components` 18、`views/documents/model` 13、`views/billing/model` 13。
→ cases 簇（model + components + view 根）合计 **175 文件**，占 admin 测试的 **47.8 %**，结构上与 cases.service.ts 巨型模块（B-002）一致，构成"测试侧热点"。

**server（top 5）**：`modules/core/cases` 68、`modules/core/customers` 22、`modules/core/billing` 13、`modules/core/residence-periods` 12、`modules/core/auth` 7。
→ cases 占 server 测试的 **31.5 %**；与 §B-002 量化（cases.service.ts 3456 行）方向一致。

**mobile（15 文件全列出）**：`data/case` 1、`domain/{billing,case,documents,reminder}` 4、`features/{auth,case,documents,home,inbox,profile}/model` 10。每个 feature 仅 1–2 个 viewModel 测试；缺 view 层与 i18n 层覆盖。

## 3. 命名标记分布（High，子串匹配）

| marker | admin | server | mobile | 说明 |
|--------|------:|-------:|-------:|------|
| `bug` | 51 | 14 | 0 | bug ID 修复回归（见 §4）|
| `focused` | 50 | 53 | 0 | 局部关键路径锁定（见 §5）|
| `regression` | 8 | 13 | 0 | 跨场景稳定性回归（含 P1-coe-visa-residence、p1-questionnaire 等批次）|
| `contract` | 21 | 4 | 0 | 跨层 / 跨模块契约（见 §6）|
| `i18n` | 15 | 0 | 0 | 含 5 个 `i18n-contract.test.ts`；server 无 i18n 测试 |
| `adapter` | 62 | 3 | 0 | 仅 admin 有 adapter 命名层（cases / customers）|
| `seam` | 7 | 0 | 0 | `CaseAdapterSupportSeams.*` 系列（见 §7）|
| `smoke` | 0 | 2 (+1) | 0 | server `http-smoke` × 2 + integration-pg `dtoSmoke` × 1 |
| `e2e` | 3 | 0 | 0 | 仅 admin（视图层 e2e 命名）|
| `deeplink` | 2 | 0 | 0 | `query.deeplink-regression` + `detail-deeplink-*` |
| `architecture` | 1 | 0 | 0 | `repositoryRuntime.architecture-guard.test.ts` |
| `security` | 0 | 2 | 0 | server 安全断言（命名层）|
| `boundary` / `invariant` / `ownership` | 0 | 0 | 0 | **无任何文件以这些词命名** → 见 OQ-58 |

## 4. Bug ID 命名规范（High）

- 模式：`<feature>.bug<ID>[-标签].(focused\|regression).test.ts`，例：`cases.service.bug159-group-inheritance.focused.test.ts`、`CaseLogTab.bug129-regression.test.ts`、`customers.query.bug089-regression.test.ts`。
- **admin bug ID 范围**：093, 107, 129, 132–156（密集）, 159, 161, 163, 167–175, 180, 186, 187, 188, 192, 200, 204, 205, 210, 212, 213, 216, 218 → 共 **49 个唯一 ID**。
- **server bug ID 范围**：063, 089, 135, 158, 159, 160, 164, 165, 177, 181, 184, 195, 200, 207 → 共 **14 个唯一 ID**。
- **跨包重叠仅 2 个**：`bug159`（group inheritance）、`bug200`（mid-cancel）。其余 47 admin / 12 server **互斥**。
  - 含义猜测：单一 bug 多在被影响最深的层补一次回归测试；admin/server 同时需要锁定时才双向写。**未观察到**统一 bug 登记表（仓库内未发现 `BUG-*.md` / changelog 索引 → OQ-55）。
- 命名组合可叠加：`*.bug180-stage-s9.focused.test.ts`（bug + focused），含义 = 该修复的关键路径锁定。

## 5. `focused` 系列分布（High）

- **admin focused 50 文件**：`views/cases/model` 37、`views/cases` 5、`views/documents` 4、`views/customers/model` 2、`views/dashboard` 1、`views/cases/components` 1 → cases 占 **86 %**。
- **server focused 53 文件**：`modules/core/cases` 32、`residence-periods` 7、`customers` 5、`submission-packages` 3、`document-items` 2、其他（generated-documents、dashboard、case-parties、billing 各 1）→ cases 占 **60 %**。
- 语义（依据 TEST-OWNERSHIP.md 命名约定）：`*.focused.test.ts` 锁定**关键路径 / 边界条件 / 不变量**，与全量功能测试（如 `useCaseListModel.test.ts`）配对存在；矩阵中明示"focused 不重测全量映射，仅守护 S9 readonly、stale-fetch、loading lifecycle 等关键场景"。

## 6. Contract 测试族（High）

总计 25 个：admin 21（含 5 个 i18n-contract）+ server 4。三类：

- **跨层契约**（admin）：`CaseListContractIntegration`、`CaseAdapterDetailAggregate.{overview,info,bmv,bmv-failure-button,bmv-post-approval-readonly}-contract`、`CaseRepository.request-contract.focused`、`caseParties.contract`。
- **跨模块契约**（admin）：`query.cross-module-link-contract`、`query.bmv-entry-contract`、`query.family-entry-contract`、`useCustomerCasesModel.{query,navigation}-contract`、`CustomerCasesQueryContract`、`CustomerCreateCaseEntryContract`。
- **server 契约**：`reminderBlueprintContract`（residence-periods）、`cases.controller.write-contract`、`cases.workflow-step.contract.focused`、`cases.regression-p1-questionnaire-supplement.contracts`。
- **i18n 契约**：5 文件已在 §11 详述（billing/customers/conversations/leads/settings）。

## 7. Seam / Boundary 守护（High）

- `CaseAdapterSupportSeams.test.ts` + `boundary contract (p0-fe-002e-03)` 是**唯一**强制 seam 实现状态的守护（TEST-OWNERSHIP.md L75 明示"seam 返回非 null 即失败"）。
- `*.guards-*.focused.test.ts`（admin 3 个：coe-residence-reminder、survey-quote、p1-qa-button-guard-matrix）+ server `cases.{coe-block,final-payment-coe}-guard.focused.test.ts`（3 个）+ `submissionPackages.chain-guards.focused.test.ts` → 业务 gate 守护命名固定为 `*.guards-*` 或 `*-guard*.focused`。
- `repositoryRuntime.architecture-guard.test.ts`（admin 唯一架构守护）+ `crossModuleGates.test.ts` → 与 dependency-cruiser 平行的运行时守护（B-005）。

## 8. TEST-OWNERSHIP.md 治理样本（High）

- **唯一存在位置**：`packages/admin/src/views/cases/TEST-OWNERSHIP.md`（118 行；server / mobile / customers / billing 等模块**无对应文件** → OQ-56）。
- 4 条 ownership 原则：① 每层仅测自己 public API；② 不重复覆盖；③ composable 注入 stub；④ fixture 仅验数据形状。
- 矩阵覆盖 cases 模块 ~38 个测试文件，每行字段：`Owner layer / Exercises / Must NOT exercise`，对每个 `Must NOT` 给出指针 `(→ sibling test)` → **手写**的层间引用图，未自动生成。
- 冻结点机制：每条带 `frozen by p0-fe-XXX-YY` 任务 ID（共 11 个 frozen 锚点）→ 该文件本身是**契约文档**，修改需更新批次 ID。
- "Known dual-function note"：`matchesCaseFilters` 双实现（repository.ts vs useCaseListModel.ts）的合法性声明 → 已知缺陷的显式记录。

## 9. 关键缺口（Open Questions 抽样）

- OQ-55：跨包 bug 登记是否有统一来源？admin/server bug ID 47/12 互斥的策略是否有意为之？
- OQ-56：TEST-OWNERSHIP.md 仅 cases 模块存在；customers/billing/documents/leads 缺同类治理文件，是规范"按模块自决"还是 cases 是模板？
- OQ-57：mobile 0 个 i18n 测试 + 0 个 contract 测试 + runner 与 admin/server 完全异构 → 是否计划补 contract 层？
- OQ-58：仓库内无 `*.boundary.test.*` / `*.invariant.test.*` / `*.ownership.test.*` 命名族；架构守护**仅** dependency-cruiser + 1 个 `architecture-guard` + `crossModuleGates`，缺测试侧的边界自检？
- OQ-59：server `*.regression-p1-*` 系列（11 个）vs admin 无对应 P1 命名 → 服务端是否独立维护"P1 阶段守护批次"？

## 10. 置信度

| 项 | 置信度 |
|----|--------|
| Runner 矩阵 / 测试文件计数 / 顶级目录分布 | High（直接 grep import） |
| 命名标记分布 | High（子串匹配确定）|
| TEST-OWNERSHIP.md 内容与冻结锚点 | High（直读）|
| Bug ID 跨包互斥语义 | Medium（无登记表佐证）|
| seam/boundary 守护是否完整 | Medium（仅观察命名 + cases 模块矩阵）|
