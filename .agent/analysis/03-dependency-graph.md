# 03 — Dependency Graph (B-002)

> 工具：每个 workspace 自带 `dependency-cruiser` 配置 + `--output-type json`。
> 数据源：`/tmp/depcruise-{server,admin,mobile}.json`（瞬态，未入仓）。
> 标注：**[H]** High / **[M]** Medium / **[L]** Low confidence。

## 0. 总体概览

| Workspace | 模块数 | 循环依赖边 | 孤儿模块 | 未解析依赖 | 规则违例 |
|-----------|------|------|------|------|------|
| server    | 432 | 0 | 11 | 0 | 0 |
| admin     | 752 | 0 | 4 | 0 | 0 |
| mobile    | 86  | 0 | 16 | 0 | 0 |

**所有规则违例与循环依赖均为 0。** **[H]**

> 说明：fan-in = "有多少个 src 模块 import 此文件"；fan-out = "此文件 import 多少个 src 模块"。
> 计数来源：每个 module 节点的 `dependencies` 数组（去除 `coreModule` 与 `couldNotResolve`）。 **[H]**

## 1. server（432 模块）

### 1.1 Top fan-in（被引用最多）

| Fan-in | 文件 | 备注 |
|--------|------|------|
| 45 | `src/modules/core/cases/cases.service.ts` | 与 B-001 一致：行数最大 **且** 扇入第一 **[H]** |
| 43 | `src/modules/core/auth/auth.decorators.ts` | 全局装饰器集合 **[H]** |
| 43 | `src/modules/core/tenancy/tenantDb.ts` | 多租户数据基座 **[H]** |
| 27 | `src/modules/core/cases/cases.types.ts` | cases 域类型枢纽 **[H]** |
| 24 | `src/modules/core/timeline/timeline.service.ts` | 几乎所有写域写 timeline **[H]** |
| 23 | `src/modules/core/cases/cases.template-bmv.ts` | BMV 模板常量 **[H]** |
| 19 | `src/modules/core/auth/permissions.service.ts` | 跨域权限 **[H]** |
| 17 | `src/modules/core/cases/bmvTemplateConfig.ts` | |
| 15 | `src/modules/core/customers/customers.service.ts` | |
| 15 | `src/modules/core/cases/cases.workflow-step.ts` | |
| 13 | `src/modules/portal/model/portalEntities.ts` | portal 域实体枢纽 **[H]** |
| 11 | `src/modules/core/residence-periods/residencePeriods.service.ts` | |
| 11 | `src/modules/core/tenancy/uuid.ts` | |
| 11 | `src/modules/core/customers/customers.dto-mappers.ts` | |
| 10 | `src/modules/core/cases/cases.controller.ts` | （主要由测试 import） |
| 10 | `src/modules/core/document-items/documentItems.service.ts` | |
| 10 | `src/modules/portal/auth/appUserAuth.guard.ts` | |

### 1.2 Top fan-out（依赖最多）

| Fan-out | 文件 | 备注 |
|---------|------|------|
| 89 | `src/app.module.ts` | DI 装配中央 **[H]** |
| 22 | `src/modules/core/cases/cases.service.ts` | 与 B-001 §1 import 列表一致 **[H]** |
| 15 | `src/worker.ts` | Worker 也独立装配大量服务 **[H]** |
| 12 | `src/modules/core/customers/customers.service.ts` | |
| 9  | `cases.regression-p1-coe-visa-residence.read-model.test.ts` | 测试 |
| 7  | `customers.controller.ts` | |
| 7  | `leads.admin.service.ts` | |
| 7  | `search.service.ts` | |

### 1.3 Server 关键观察

- **核心枢纽**：`cases.service`、`auth.decorators`、`tenantDb` 三者 fan-in 都 ≥43，是真正的"碰一动百"。 **[H]**
- **B-001 已识别的 cases.service.ts 中央地位**被 fan-in 数据确认（45 入度 + 22 出度，对内对外皆是 hub）。 **[H]**
- `app.module.ts` fan-out=89 一处装配几乎所有依赖；这与"NestJS 单 root module"模式一致，但意味着任何新增 controller/service 都改这一文件。 **[H]**
- `worker.ts` 自带 fan-out=15，独立于 `app.module`，需在后续核对：worker 与 web 模块装配是否一致。 **[M]** → OQ-19

### 1.4 Server 孤儿模块（11）

| 文件 | 推测 |
|------|------|
| `cases/cases.controller-bodies.ts` | controller 的 body schema 抽离；可能仅作类型，被 controller 通过非 import 方式引用？ **[L]** |
| `cases/cases.types-comms-timeline.ts` | type-only 文件，可能被仅以 `import type` 引用且 depcruise 未计入？ **[L]** |
| `cases/cases.types-task-deadline.ts` | 同上 **[L]** |
| `cases/cases.types-workflow-step.ts` | 同上 **[L]** |
| `groups/groups.types.ts` | type-only **[L]** |
| `model/billingEntities.ts`, `model/caseTemplateTypes.ts`, `model/documentEntities.ts` | 共享 entity 集合，疑似 type-only **[L]** |
| `custom/tenant-a/dtoMapping.ts`, `exporters.ts`, `notifications.ts` | 租户定制；当前未在 `app.module.ts` 中注册 → 疑似未连线 **[M]** |

→ 进入 OQ-20（type-only 的 depcruise 行为）与 OQ-21（tenant-a 是否真的未连线）。

## 2. admin（752 模块）

### 2.1 Top fan-in

| Fan-in | 文件 | 备注 |
|--------|------|------|
| 69 | `src/i18n/index.ts` | 几乎每个测试与组件都 `useI18n` **[H]** |
| 69 | `src/shared/ui/Button.vue` | 共享按钮组件 **[H]** |
| 66 | `src/views/cases/constants.ts` | cases 常量枢纽 **[H]** |
| 39 | `src/views/cases/query.ts` | cases 数据查询入口 **[H]** |
| 38 | `src/shared/ui/Chip.vue` | |
| 37 | `src/shared/ui/Card.vue` | |
| 33 | `src/views/customers/model/CustomerRepository.ts` | |
| 31 | `src/shared/model/useGroupOptions.ts` | |
| 31 | `src/views/cases/model/CaseAdapterDetailAggregate.ts` | |
| 29 | `src/views/cases/model/useCreateCaseModel.ts` | |
| 25 | `src/auth/model/adminSession.ts` | |
| 25 | `src/views/cases/fixtures-create.ts` | |
| 24 | `src/views/cases/model/CaseAdapterTypes.ts` | |
| 22 | `src/views/cases/types-detail.ts` | 与 04-risk-hotspots 中 1500 行类型集中点一致 **[H]** |

### 2.2 Top fan-out

| Fan-out | 文件 |
|---------|------|
| 25 | `src/views/billing/BillingListView.vue` |
| 24 | `src/views/documents/DocumentListView.vue` |
| 23 | `src/views/leads/LeadsListView.vue` |
| 22 | `src/views/cases/CaseCreateView.vue` |
| 22 | `src/views/cases/CaseDetailView.vue` |
| 21 | `src/views/customers/CustomerListView.vue` |
| 19 | `src/router/index.ts` |
| 17 | `src/views/customers/CustomerDetailView.vue` |
| 16 | `src/views/cases/components/CaseOverviewTab.vue` |
| 15 | `src/views/settings/SettingsView.vue` |

### 2.3 Admin 关键观察

- **i18n 与 shared/ui 是底座**：fan-in 双 69 表示"全局常量级"角色，任何破坏性改动都要审视全 admin。 **[H]**
- **cases 域是次中央**：`constants.ts`(66) + `query.ts`(39) + `CaseAdapterDetailAggregate.ts`(31) + `useCreateCaseModel.ts`(29) + `fixtures-create.ts`(25) + `CaseAdapterTypes.ts`(24) + `types-detail.ts`(22) → cases 域文件占据 fan-in Top10 中 4 席。这是 admin 内的"小 cases.service"。 **[H]**
- View 层 fan-out 普遍 20+，与 04-risk-hotspots 中 `CaseDetailView.vue`(685 行) 等大组件一致；说明 admin views 直接从 `views/<feature>/*` 树状大量导入，没有 facade 层。 **[M]**
- 4 个孤儿：`dummy.test.ts`、`route-meta.d.ts`（声明文件）、`useCreateCaseModelPreselect.ts`（疑似遗留）、`DocumentListStateBanner.vue`（疑似遗留）。 **[M]** → OQ-22

## 3. mobile（86 模块）

### 3.1 Top fan-in

| Fan-in | 文件 |
|--------|------|
| 22 | `src/app/container/AppContainerContext.tsx` |
| 11 | `src/shared/ui/index.tsx` |
| 10 | `src/shared/errors/toAppError.ts` |
| 9  | `src/shared/errors/AppError.ts` |
| 3  | `features/auth/model/useLoginViewModel.ts` |
| 3  | `domain/documents/DocumentStatusRules.ts` |

### 3.2 Top fan-out

| Fan-out | 文件 |
|---------|------|
| 9 | `src/app/container/createAppContainer.ts` |
| 5 | `src/app/navigation/MainTabs.tsx` |
| 4 | `src/app/navigation/RootNavigator.tsx` |
| 3 | `src/app/App.tsx` |

### 3.3 Mobile 关键观察

- DI 容器 `AppContainerContext.tsx` fan-in=22，是分层架构落地的真实证据：所有 feature 通过 container 取 repository。 **[H]**
- `shared/ui/index.tsx` fan-in=11 是 Tamagui 唯一出口（与 AGENTS.md "feature 不得直接依赖 tamagui" 一致）。 **[H]**
- 16 个孤儿全部集中在 `domain/*` 接口与 `infra/log/Logger.ts`、`infra/storage/KVStorage.ts`：这些是 type-only 的接口/抽象类。
  - **推测**：实现方使用结构化匹配而非 `implements` 直接 import 接口；或仅在 test 中通过 `as` 引用。 **[M]**
  - 这一点对"分层是否真的强制"是个**信号**：domain 接口若无 import 引用，仅靠命名规范保证一致 → 进入 OQ-23。 **[M]**

## 4. 跨包总结（Top 共用基础设施 / 风险层级）

| 层级 | server | admin | mobile |
|------|--------|-------|--------|
| **核心 hub**（fan-in ≥40） | cases.service.ts (45)<br>auth.decorators.ts (43)<br>tenantDb.ts (43) | i18n/index.ts (69)<br>shared/ui/Button.vue (69)<br>views/cases/constants.ts (66) | AppContainerContext.tsx (22)<br>shared/ui/index.tsx (11) |
| **域内枢纽** | timeline / cases.types / cases.template-bmv / permissions / customers.service | views/cases/query.ts / CustomerRepository.ts / Card.vue / Chip.vue / useGroupOptions.ts | toAppError / AppError |
| **装配中心**（fan-out 极高） | app.module.ts (89)<br>worker.ts (15) | 视图（每个大 view 20+） | createAppContainer.ts (9) |

### 4.1 与 04-risk-hotspots 的相互验证

| 04 中标注的 hotspot | 03 数据交叉验证 |
|---------------------|-------------|
| `cases.service.ts` | fan-in 45（server #1），fan-out 22（server #2） — 完全确认 **[H]** |
| `app.module.ts` | fan-out 89 — 确认中央装配 **[H]** |
| `views/cases/types-detail.ts`(1500L) | fan-in 22 — 确认是 cases 域类型枢纽 **[H]** |
| `shell/AppShell` 等导航壳 | 未进入 admin Top fan-in（被路由间接使用，非直 import）；说明导航壳的中央性是"运行时"层面而非"静态依赖"。 **[M]** |
| `infra/db/drizzle/schema.ts`(1244L) | server Top fan-in 中**未出现**（被 service 间接使用，模块未直 import schema） — 静态依赖少 ≠ 风险低；它的风险来源是 migration 同步与单文件规模 **[H]** |

## 5. 不确定项 / 待验证

- 见新增 OQ-19 / OQ-20 / OQ-21 / OQ-22 / OQ-23（详见 `06-open-questions.md`）。
- depcruise 默认对 `import type` 的处理需在配置层确认是否被计入图谱。 **[L]** 当前结论已假设它们被计入；但 mobile/server 的 type-only "孤儿"分布显示行为可能不一致。

## 6. 数据保留

- 原始 JSON 仅保存在 `/tmp/depcruise-{server,admin,mobile}.json`，**未入仓**。如需复算：
  - `cd packages/<pkg> && npx depcruise --config .dependency-cruiser.{js,cjs} --output-type json src > /tmp/depcruise-<pkg>.json`
  - 分析脚本见 `scripts/_tmp_depcruise_analyze.mjs`、`scripts/_tmp_depcruise_extras.mjs`（瞬态，task 完成后会删除）。
