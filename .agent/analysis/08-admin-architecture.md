# 08 — Admin 实际架构边界（B-005）

> 数据来源：`packages/admin/.dependency-cruiser.js`、`repositoryRuntime.architecture-guard.test.ts`、`views/crossModuleGates.test.ts`、`router/settingsIntegration.test.ts`、`shared/api/repositoryRuntime.ts`、目录树扫描。
> 标注：**[H]** High / **[M]** Medium / **[L]** Low confidence。

## 1. 实际目录形态（事实）**[H]**

```
packages/admin/src/
├── auth/                   # 登录会话（adminSessionController）
├── i18n/                   # vue-i18n 聚合 + messages/
├── router/                 # vue-router + authGuard
├── shell/                  # AppShell / SideNav / TopBar / nav-config
├── shared/
│   ├── api/                # repositoryRuntime.ts, searchRepository.ts（仅 2 个）
│   ├── model/              # 无状态格式化 + 跨 feature hook（formatCurrency / useOrgSettings / useGroupOptions / ...）
│   └── ui/                 # Button / Card / Chip / PageHeader / SearchField / SegmentedControl / Toast / ToggleSwitch（13 个文件）
└── views/                  # 10 个业务"feature"
    ├── auth/               # LoginView + model
    ├── billing/            # +components, fixtures, model, types, CONTRACT.md, i18n-contract.test
    ├── cases/              # 最重；含 fixtures-* 多份, types-detail, query.*, constants*, P0/P1 矩阵 md
    ├── conversations/
    ├── customers/
    ├── dashboard/
    ├── documents/
    ├── leads/
    ├── settings/
    ├── tasks/
    └── crossModuleGates.test.ts   # 跨 feature 集成测试（root 级）
```

**关键观察**：admin 不存在 `features/`、`domain/`、`data/`、`infra/` 目录。**[H]**

## 2. dependency-cruiser 规则的"实活"分析 **[H]**

`packages/admin/.dependency-cruiser.js` 共声明 11 条规则。按目录是否存在分类：

| 规则 | from / to | 状态 | 说明 |
|------|-----------|------|------|
| `no-circular` | * → circular | **活** | 通用 |
| `features-no-data-or-infra` | `^src/features` → `^src/(data\|infra)` | **休眠** | `features/`、`data/`、`infra/` 三个目录在 admin 中均不存在 |
| `features-no-cross-dependency` | `^src/features/(X)` → `^src/features/(non-X)` | **休眠** | 同上 |
| `domain-no-local-outside-domain-or-shared` | `^src/domain` → 非 domain/shared | **休眠** | `domain/` 不存在 |
| `domain-no-shared-ui` | `^src/domain` → `^src/shared/ui` | **休眠** | 同上 |
| `domain-no-npm` (warn) | `^src/domain` → npm | **休眠** | 同上 |
| `shared-no-local-outside-shared` | `^src/shared` → 非 shared | **活** | shared/api 不能依赖 views 等；与 vitest 静态扫描互补 |
| `infra-no-app-or-features-or-domain-or-data` | `^src/infra` → ... | **休眠** | `infra/` 不存在 |
| `data-no-app-or-features` | `^src/data` → ... | **休眠** | `data/` 不存在 |
| `data-no-shared-ui` | `^src/data` → `^src/shared/ui` | **休眠** | 同上 |
| `billing-no-cases` | `^src/views/billing` → `^src/views/cases` | **活** | 唯一的 view↔view 显式禁令 |

**结论**：admin **没有** mobile 那种 feature/domain/data 强分层；7/11 条规则因目录不存在而不发挥作用。实活规则只有 4 条（`no-circular`、`shared-no-local-outside-shared`、`billing-no-cases`，加 `domain-no-npm` 的 warn 也休眠）。 **[H]**

## 3. 真实跨 view 依赖（违反"feature 互不依赖"理想，但不违反现行规则）**[H]**

源码内非测试文件中实际存在的 view → view import：

| 调用方 | 被调用方 | 符号 |
|--------|----------|------|
| `views/customers/CustomerDetailView.vue` | `views/cases/query` | `buildCaseCreateRoute`, `CaseCreateQueryParams` |
| `views/tasks/TaskListView.vue` | `views/cases/constants` | `getCaseTypeI18nKey` |
| `views/leads/LeadDetailView.vue` | `views/conversations/ConversationDetailView.vue` | 默认导出（组件级嵌入） |
| `views/dashboard/QuickActionsPanel.vue` | `views/cases/query` | `buildCaseCreateRoute` |

**事实**：`cases` 是被反复借用的"事实上的共享 hub"；`conversations` 直接被组件级嵌入到 `leads`。**[H]**
**风险**：未来若计划把 admin 推向 mobile 风格分层，这 4 处需要先迁移到 `shared/`。 **[M]**

## 4. 双层架构守门：dependency-cruiser ⊕ vitest 运行时静态扫描 **[H]**

`packages/admin/src/repositoryRuntime.architecture-guard.test.ts` 与 dep-cruiser 形成两道闸：

- **运行时契约断言**（`describe("architecture guard — repositoryRuntime")`）：
  - `views/cases/model/CaseRepositorySupport`：apiPath 默认 `/api/cases`，writeErrorCode `CASE_WRITE_ERROR`，errorName `CaseRepositoryError`
  - `views/billing/model/BillingRepositorySupport`：apiPath 默认 `/api`，writeErrorCode `BILLING_WRITE_ERROR`，errorName `BillingRepositoryError`
  - `shared/api/repositoryRuntime#createRepositoryRuntime`：**不**提供 apiPath / getToken 默认值（强制各 wrapper 注入）
  - 各 feature 的 `*RepositoryError` 必须 `instanceof RepositoryError`
- **静态导入扫描**（`describe("architecture guard — import boundaries")`）：
  - `views/billing/**` 不得 import `views/cases` 任何路径（与 dep-cruiser `billing-no-cases` 同义，但解析方式独立——基于词法 path.resolve）
  - `shared/api/**` 不得 import `views/**`（与 dep-cruiser `shared-no-local-outside-shared` 部分重叠）

**意义**：admin 把"边界"分成两类——**dep-cruiser 卡通用图结构**，**vitest 卡 feature 运行时契约**。后者是 `shared/api/repositoryRuntime.ts` 作为高扇入 hub 的关键防线。 **[H]**

## 5. 跨 view 的"允许的"协作模式（来自 `views/crossModuleGates.test.ts`）**[H]**

该文件 (~400 行) 系统地断言以下"允许"的跨 feature 集成：

1. **documents ← shared/model/useOrgSettings**：`useRegisterDocumentModel` 通过依赖注入接收 `isStorageRootConfigured` 闭包；存储根未配置时禁止打开注册弹窗。
2. **cases.constants ← shared/model/useGroupOptions**：`CASE_GROUP_OPTIONS` 必须等于 `getActiveGroupOptions()`，禁用组（如 `osaka`）必须被剔除。
3. **customers.model ← shared/model/useGroupOptions**：`useCustomerBasicInfoModel` 当客户处于禁用组时，下拉框追加显示禁用组（带"已停用"后缀），其它情况隐藏。
4. **customers.model ← BMV gate**：`buildCustomerCreateCaseGateViewModel` 基于 `bmvProfile.signStatus / intakeStatus` 决定单建 / 批量建案入口是否禁用，用 i18n key（`customers.detail.actions.createCaseGate.needsSign`）作 blockedReason。
5. **leads ← shared/model/groupOptions**：`resolveGroupLabel` 渲染 disabled group 标签。
6. **shared 数据完整性**：`ALL_OPTIONS` 唯一 value、至少 1 个 disabled、至少 2 个 active。

**模式**：跨 feature 协作主要走 **shared/model 的 hook + DI 闭包**。直接跨 view import 见 §3，是异常而非主路径。 **[H]**

## 6. 路由 / 导航 / 守卫的协作（来自 `router/settingsIntegration.test.ts`）**[H]**

- `router/index.ts` 给每条路由打 `meta.{requiresAuth, requiresAdmin, navKey, groupKey}`。
- `router/authGuard.ts#resolveAdminAuthGuard(to, isAuthenticated, isAdmin)` 三段决策：未登录→`{name:"login", query:{redirect}}`；非 admin→`{name:"dashboard"}`；admin→`true`。
- `shell/nav-config.ts` 提供 `navGroups` / `findNavItem(key)` / `getVisibleNavGroups(isAdmin)`，按 `adminOnly` 过滤；i18n key `shell.nav.items.<key>` 必须三语对齐（zh/en/ja）。
- 三方契约：**route.meta.navKey ↔ nav-config item.key ↔ i18n key** 同步——任一失同步则 `settingsIntegration.test.ts` 中的 24 个 it 全失败。

## 7. 与 mobile 的对比（结构性差异速查表） **[H]**

| 维度 | mobile | admin |
|------|--------|-------|
| 顶层分层目录 | app / features / domain / data / infra / shared | shell / router / auth / i18n / views / shared |
| feature 内部 | model + 子模块（domain 接口由 data 实现） | model + components + types + fixtures + 测试 |
| 跨 feature 禁令 | `features-no-cross-dependency`（活） + `checkFeatureBoundaries.cjs` | 仅 `billing-no-cases`（活） |
| 业务实体类型 | `domain/<entity>/types.ts` | `views/<feature>/types*.ts` |
| 数据实现 | `data/<feature>/...`（实现 domain 接口） | `views/<feature>/model/*Repository.ts` 直连 HTTP |
| 容器 / DI | `app/container/AppContainer` 全应用容器 | 无统一容器；shared/api 工厂 + 各 feature wrapper |
| UI 边界 | feature 必须经 `shared/ui` 才能用 tamagui | shared/ui 可选；views 可直接写 `<style>`、可直 import vue 组件 |

> 对照来源：`backlog.md` B-006 待详细列 mobile 规则；本表 mobile 列 confidence = **[M]**（待 B-006 量化）。

## 8. 风险摘要 → 回填指引 **[H]**

- **R1 / 强分层规则休眠**：dep-cruiser 中 7 条与不存在目录相关的规则当前不起作用；若日后引入 `features/`、`domain/`、`data/` 而无人重审规则，可能错把"伪强分层"当成"已强分层"。 → 进入 OQ-31。
- **R2 / cases 是事实上的跨 feature hub**：4 处 view→view import 全部指向 cases；任何 cases 重构都会触发 customers / tasks / dashboard 三个 feature 的连锁修改。 → 4 区已是 hot zone（参 04-risk-hotspots.md §A）。
- **R3 / 双门冗余**：`billing-no-cases`（dep-cruiser）+ vitest 静态扫描在做同一件事；维护时容易只更新一处。 → OQ-32。
- **R4 / shared/model 渐成事实领域层**：`useOrgSettings` / `useGroupOptions` / `useOwnerOptions` 等 hook 已承担"跨 feature 业务规则"，但与 mobile 的 `domain/` 没有等价结构。 → OQ-33。
- **R5 / 路由-导航-i18n 三方契约由测试保证**：删一个 navKey 或漏译一份 i18n 都会被 `settingsIntegration.test.ts` 抓到，但同类测试是否覆盖所有 nav item 未确认（仅 `settings`）。 → OQ-34。

## 9. 未确认 / 待 backlog 验证 **[L]**

- 是否所有 `views/<feature>/<feature>.View.vue` 都遵循"VM 在 model/ 下、组件不直发 HTTP"的约定（仅用 fixtures + repository 注入）？
- `shared/model/useOwnerOptions` / `useVisaTypeOptions` 是否也有跨 feature 用法（推测有，未量化）？
- `shared-no-local-outside-shared` 与 vitest "shared/api 不得 import views" 在覆盖范围上是否完全等价（只跑过 dep-cruiser 才能定）？
