# 咨询线索列表页原型 → 生产代码迁移映射

> 本文档定义 `packages/prototype/admin/leads-message/index.html` 中各 section、data、script 到真实代码的映射关系。
>
> 生产代码遵循仓库现有的四层架构：`domain -> data -> features/{model,ui} -> shared`。
> 当前仓库中尚无 lead 相关的生产代码，本文列出的生产路径均为首次创建。

---

## 1 Domain 层映射

原型 `data/leads-config.js` 中的声明式配置与示例数据，迁移为 `domain/lead/` 下的纯 TypeScript 模块。

### 1.1 实体与值类型

| 原型来源 | 生产文件 | 导出 | 说明 |
|---------|---------|------|------|
| 表格行结构（编号/姓名/电话/邮箱/来源/状态/Group/负责人/下一步/跟进时间/更新时间） | `domain/lead/Lead.ts` | `LeadSummary` | 列表页展示所需字段 |
| `LEAD_STATUSES`（6 种状态 + 配色映射） | `domain/lead/leadConstants.ts` | `LeadStatus`, `LEAD_STATUS_META` | 枚举 + 文案/样式映射 |
| `CREATE_FORM_FIELDS`（新建弹窗 12 字段 schema） | `domain/lead/Lead.ts` | `CreateLeadInput` | 新建线索输入结构 |
| `DEDUP_SAMPLES`（去重提示样例） | `domain/lead/LeadDedupService.ts` | `DedupMatch`, `DedupResult` | 去重匹配结果类型 |
| `BATCH_ACTIONS`（批量动作定义） | `domain/lead/Lead.ts` | `AssignOwnerInput`, `UpdateFollowUpInput`, `UpdateStatusInput` | 批量动作入参 |
| `FILTER_OPTIONS`（筛选维度） | `domain/lead/Lead.ts` | `LeadListFilters` | 列表筛选参数 |
| `DEMO_LEADS`（8 行示例数据） | N/A（测试 fixtures） | — | 原型样本转为测试 fixture |

### 1.2 仓库接口

| 原型来源 | 生产文件 | 导出 | 说明 |
|---------|---------|------|------|
| 列表筛选 | `domain/lead/LeadRepository.ts` | `listLeads(filters)` | 返回 `LeadSummary[]` |
| 新建线索 | `domain/lead/LeadRepository.ts` | `createLead(input)` | 返回 `LeadSummary` |
| 去重匹配 | `domain/lead/LeadRepository.ts` | `checkDuplicate(phone?, email?)` | 返回 `DedupResult` |
| 批量指派负责人 | `domain/lead/LeadRepository.ts` | `batchAssignOwner(ids, ownerId)` | — |
| 批量调整跟进时间 | `domain/lead/LeadRepository.ts` | `batchUpdateFollowUp(ids, datetime)` | — |
| 批量标记状态 | `domain/lead/LeadRepository.ts` | `batchUpdateStatus(ids, status)` | — |

建议文件：

```text
domain/lead/
├── Lead.ts
├── LeadRepository.ts
├── LeadDedupService.ts
└── leadConstants.ts
```

---

## 2 Data 层映射

| 原型来源 | 生产文件 | 导出 | 说明 |
|---------|---------|------|------|
| `data/leads-config.js` 的静态示例数据 | `data/lead/LeadApi.ts` | `createLeadApi(deps)` | 列表、新建、去重、批量动作接口 |
| 内存筛选与批量修改 | `data/lead/createLeadRepository.ts` | `createLeadRepository(deps)` | 实现 `LeadRepository` |
| 静态负责人/Group 字典 | API / 组织服务 | — | 原型硬编码，生产走组织成员数据源 |
| 去重预设规则 | `data/lead/createLeadRepository.ts` | — | 生产走服务端匹配 |

### App Container

`leadRepository` 将作为新 feature 注入 app container。与 `customerRepository`、`caseRepository` 平级，无 feature 到 feature 直连。

---

## 3 Features 层映射（model）

### 3.1 `scripts/leads-page.js` → `useLeadListViewModel`

| 原型行为 | 生产 Hook 暴露 |
|---------|---------------|
| 页面首次加载 | `useEffect` 拉取列表 |
| `scope` 切换（我的/本组/全所） | `scope`, `setScope()` |
| 搜索与筛选 | `filters`, `setFilters()`, `resetFilters()` |
| 表格选择 | `selectedIds`, `toggleSelect`, `toggleSelectAll`, `clearSelection` |
| 批量指派负责人 | `batchAssignOwner()` |
| 批量调整跟进时间 | `batchUpdateFollowUp()` |
| 批量标记状态 | `batchUpdateStatus()` |
| 行点击跳转 | `navigateToDetail(leadId)` |
| `#new` hash 检测 | `shouldOpenCreateModal` derived state |
| toast | `toastState` 或 `useToast()` 组合 |

### 3.2 `scripts/leads-create-modal.js` → `useCreateLeadModal` + `useLeadDedup`

| 原型行为 | 生产 Hook 暴露 |
|---------|---------------|
| 弹窗开关 | `isOpen`, `open()`, `close()` |
| 必填校验 | `validate()` — 姓名 + 电话/邮箱至少一项 |
| 来源="介绍"时显示介绍人 | `showReferrer` derived state |
| 去重提示 | `dedupResult`, `checkDuplicate()` |
| 创建线索 | `createLead(input)` + toast |
| 继续创建（去重确认） | `confirmCreate()` |

### 3.3 可选细拆方向

如 `useLeadListViewModel` 体积增长过快，可进一步拆：

- `useLeadListFilters` — 筛选维度管理
- `useLeadBulkActions` — 批量选择与批量动作
- `useLeadDedup` — 去重逻辑独立

这些拆分都应由 `useLeadListViewModel` 编排，而不是让 UI 组件直接依赖 data 层。

---

## 4 Features 层映射（ui）

### 4.1 页面组件总览

| 原型 section | 生产组件 | 所在路径 | 说明 |
|-------------|---------|---------|------|
| `sections/header.html` | `LeadListHeader` | `features/lead/ui/` | 页面标题与新建线索入口 |
| `sections/filters.html` | `LeadListFilters` | `features/lead/ui/` | scope、筛选器、搜索、重置 |
| `sections/table.html` | `LeadTable` + `LeadBulkActionBar` | `features/lead/ui/` | 11 列表格、批量操作、空状态 |
| `sections/create-modal.html` | `CreateLeadModal` | `features/lead/ui/` | 新建弹窗 + 去重提示面板 |
| `sections/toast.html` | `Toast` | `shared/ui/` | 操作反馈 |
| `index.html` 整页组装 | `LeadListScreen` | `features/lead/ui/LeadListScreen.tsx` | 页面入口 |

### 4.2 DOM 钩子到组件 Props 的对照

| 原型 DOM 钩子 | 组件 Props / 事件 |
|--------------|-------------------|
| `data-scope-btn` | `LeadListFilters.onScopeChange(scope)` |
| `leadSearch` | `LeadListFilters.onSearchChange(text)` |
| `filterStatus/filterOwner/filterGroup/filterBusinessType` | `LeadListFilters.onFilterChange(key, value)` |
| `data-action="reset-filters"` | `LeadListFilters.onReset()` |
| `selectAllLeads` | `LeadBulkActionBar.onToggleSelectAll()` |
| `data-lead-select` | `LeadTable.onToggleSelect(leadId)` |
| `bulkClearBtn` | `LeadBulkActionBar.onClear()` |
| `bulkAssignApplyBtn` | `LeadBulkActionBar.onAssignOwner(ownerId)` |
| `bulkFollowUpApplyBtn` | `LeadBulkActionBar.onUpdateFollowUp(datetime)` |
| `bulkStatusApplyBtn` | `LeadBulkActionBar.onUpdateStatus(status)` |
| `createLeadModal` | `CreateLeadModal.open`, `onClose`, `onSubmit` |
| `dedupHint` | `DedupPanel.match`, `onContinue`, `onView` |
| `toastTitle` / `toastDesc` | `Toast.title` / `Toast.description` |

---

## 5 Shared 层映射

| 原型来源 | 生产去向 | 说明 |
|---------|---------|------|
| `shared/styles/tokens.css` | shared theme / design tokens | 已是统一 token 来源 |
| `shared/styles/components.css` | shared UI components | 按钮、卡片、表格、modal、toast |
| `shared/styles/shell.css` | `AppShell` / 导航壳层样式 | 已被多页复用 |
| `shared/scripts/mobile-nav.js` | `shared/hooks/useMobileNav.ts` | 生产中应由状态驱动 |
| `shared/scripts/navigate.js` | 导航框架 | React Navigation 或现有导航层替代 |
| toast HTML | `shared/ui/Toast` | 可在多模块复用 |
| modal 壳（新建弹窗） | `shared/ui/Modal` | modal 基础壳复用，内容属于线索业务 |

---

## 6 完整文件树总览（建议形态）

```text
packages/mobile/src/
├── domain/lead/
│   ├── Lead.ts                        ← LeadSummary, CreateLeadInput, LeadListFilters
│   ├── LeadRepository.ts             ← listLeads, createLead, batchAssignOwner, ...
│   ├── LeadDedupService.ts           ← DedupMatch, DedupResult, checkDuplicate
│   └── leadConstants.ts              ← LeadStatus 枚举, LEAD_STATUS_META
├── data/lead/
│   ├── LeadApi.ts                     ← 列表/新建/去重/批量动作 API
│   └── createLeadRepository.ts        ← 实现 LeadRepository
├── features/lead/
│   ├── model/
│   │   ├── useLeadListViewModel.ts
│   │   ├── useCreateLeadModal.ts
│   │   └── useLeadDedup.ts
│   └── ui/
│       ├── LeadListScreen.tsx
│       ├── LeadListHeader.tsx
│       ├── LeadListFilters.tsx
│       ├── LeadTable.tsx
│       ├── LeadBulkActionBar.tsx
│       └── CreateLeadModal.tsx
└── shared/
    ├── ui/
    │   ├── AppShell.tsx
    │   ├── Toast.tsx
    │   └── Modal.tsx
    └── hooks/
        └── useMobileNav.ts
```

---

## 7 迁移顺序建议

| 阶段 | 范围 | 前置条件 |
|------|------|---------|
| M1 | 创建 `domain/lead/` 实体、仓库接口、常量、去重类型 | 无 |
| M2 | 实现 `data/lead/` 的 API 与仓库 | M1 |
| M3 | 实现 `useLeadListViewModel` + `useCreateLeadModal` + `useLeadDedup` | M1 + M2 |
| M4 | 从 `LeadListScreen` 拆出 header/filters/table/bulk-action/modal 子组件 | M3 |
| M5 | 接入真实去重服务与批量写操作 | M4 |

---

## 8 原型 → 生产差异备忘

| 原型行为 | 生产变化 | 原因 |
|---------|---------|------|
| `window.LeadsConfig` 全局配置 | TS 常量 + DI | 类型安全与可测试 |
| 静态 `DEMO_LEADS` | API / repository 查询 | 真实数据源 |
| 前端 DOM 筛选 | ViewModel + repository 查询参数 | 可测试、可扩展 |
| 内存批量动作 | repository 写操作 + toast 反馈 | 替代示例行为 |
| 去重按预设规则命中 | 服务端匹配 | 真实数据库匹配 |
| 新建线索仅 DOM 追加行 | 真实 `createLead()` 提交 | 落库 + 去重 |
| 行点击 `detail.html?id=demo` | 路由参数 `leadId` 查询真实详情 | 真实导航 |
| 静态分页 footer | 真正分页或 infinite list | 真实数据规模需要 |
| 单页 DOM 渲染 | 声明式组件渲染 | 减少 DOM 字符串拼接与 ID 耦合 |

---

## 9 旧入口与主导航风险（Deferred）

| 风险项 | 当前状态 | 缓解措施 |
|--------|---------|---------|
| 旧 `leads-messages.html` 与新模块并存 | 两个入口指向不同页面 | 本轮不改旧入口；后续导航统一任务处理重定向/下线 |
| 主导航（侧边栏/Topbar）未统一改为新路径 | 其他页面的侧边栏仍指向 `leads-messages.html` | 新模块自身导航正确；全局统一后续处理 |
| 旧 `leads-messages.html` 可复用点有限 | 仅电话/邮箱至少填一项校验、部分弹窗结构、状态文案 | 已在 SPEC-GAP-MATRIX.md 中标注 |
