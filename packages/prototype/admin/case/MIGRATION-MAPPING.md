# 案件新建页原型 -> 生产代码迁移映射

> 本文档定义 `packages/prototype/admin/case/create.html` 中的 section、config、script 到未来生产代码的映射关系。

---

## 1 Domain 层映射

原型 `data/case-create-config.js` 中的声明式配置，迁移为 `domain/case/` 下的纯 TypeScript 模块。

| 原型来源 | 生产文件 | 导出 | 说明 |
|---------|---------|------|------|
| 模板定义 | `domain/case/caseTemplateConstants.ts` | `CASE_TEMPLATES` | 家族滞在 / 技人国模板、资料分组、默认动作 |
| 快速新建客户表单隐式结构 | `domain/case/CaseDraft.ts` | `CreateCaseCustomerInput` | 用于主申请人/关联人快速录入 |
| 建案表单隐式结构 | `domain/case/CaseDraft.ts` | `CreateCaseInput` | 模板、申请类型、Group、owner、dueDate、amount 等 |
| 家族批量模式 | `domain/case/CaseDraft.ts` | `FamilyBulkDraft` | 默认对象与关系绑定草稿 |

建议文件：

```text
domain/case/
├── CaseDraft.ts
├── CaseTemplateRepository.ts
└── caseTemplateConstants.ts
```

## 2 Data 层映射

| 原型来源 | 生产文件 | 导出 | 说明 |
|---------|---------|------|------|
| 静态模板 / 客户示例 | `data/case/CaseTemplateApi.ts` | `createCaseTemplateApi()` | 模板、可选客户、负责人来源改为真实接口 |
| 建案提交按钮 | `data/case/createCaseRepository.ts` | `createCaseRepository()` | 真实创建 Case、CaseParty、Checklist |
| 快速新建客户 modal | `data/customer/createCustomerRepository.ts` | 复用或扩展 | 原型中的快速新建最终落到客户仓库 |

## 3 Model 层映射

| 原型脚本 | 生产 Hook | 职责 |
|---------|-----------|------|
| `scripts/case-create-page.js` | `features/case/model/useCreateCaseViewModel.ts` | 模板切换、stepper、可用态、汇总、提交 |
| `scripts/case-create-modal.js` | `features/case/model/useCasePartyPicker.ts` | 快速新建主申请人/关联人 modal |

推荐状态拆分：

```text
features/case/model/
├── useCreateCaseViewModel.ts
├── useCasePartyPicker.ts
├── useCreateCaseViewModel.test.ts
└── useCasePartyPicker.test.ts
```

## 4 UI 层映射

| 原型 section | 生产组件 | 所在层级 |
|-------------|---------|---------|
| `sections/create-header.html` | `CreateCaseHeader` | `features/case/ui` |
| `sections/create-stepper.html` | `CreateCaseStepper` | `features/case/ui` |
| `sections/business-form.html` | `CreateCaseBusinessForm` | `features/case/ui` |
| `sections/related-parties.html` | `CreateCasePartiesSection` | `features/case/ui` |
| `sections/assignment-review.html` | `CreateCaseAssignmentSection` + `CreateCaseReviewSection` | `features/case/ui` |
| `sections/customer-modal.html` | `CasePartyQuickCreateModal` | `features/case/ui` |
| `sections/toast.html` | `Toast` | `shared/ui` |
| `create.html` 整页组装 | `CreateCaseScreen` | `features/case/ui` |

## 5 Shared 层映射

| 原型来源 | 生产去向 | 说明 |
|---------|---------|------|
| `shared/styles/tokens.css` | 设计 token / theme | 颜色、圆角、阴影 |
| `shared/styles/components.css` | `shared/ui` 基础组件 | 按钮、输入框、card、toast、modal |
| `shared/styles/shell.css` | `AppShell` / `TopBar` / `SideNav` | 页面壳层 |
| `shared/scripts/mobile-nav.js` | `shared/hooks/useMobileNav.ts` | 移动端导航开关 |
| `shared/scripts/navigate.js` | 路由层 | 原型 `data-navigate` 在生产交给路由系统 |

## 6 迁移顺序建议

1. 先抽 `domain/case` 中的建案输入与模板常量
2. 再实现 `data/case` 的模板与创建仓库
3. 编写 `useCreateCaseViewModel`
4. 拆 `CreateCaseScreen` 与子组件
5. 最后把快速新建客户 modal 与真实客户仓库串起来

## 7 原型与生产差异

| 原型行为 | 生产变化 |
|---------|---------|
| `window.CaseCreateConfig` 全局配置 | 改为 TS 常量 + DI |
| `window.CaseCreatePageApi` 全局通信 | 改为 ViewModel state + props |
| 创建案件仅 banner/toast | 改为真实 `createCase()` 提交 |
| 资料模板 checkbox 静态展示 | 改为真实 checklist 草稿 |
| `#family-bulk` 仅切默认模板 | 改为真正的批量 Case 创建流程 |
# 案件页原型 -> 生产代码迁移映射

> 本文档定义 `packages/prototype/admin/case/` 中各个 section、data、script 到真实代码的映射关系。
>
> 生产代码遵循仓库现有的四层架构：`domain -> data -> features/{model,ui} -> shared`。
> 现有锚点包括：
>
> - `packages/mobile/src/domain/case/Case.ts`
> - `packages/mobile/src/domain/case/CaseRepository.ts`
> - `packages/mobile/src/data/case/CaseApi.ts`
> - `packages/mobile/src/data/case/createCaseRepository.ts`
> - `packages/mobile/src/features/case/model/useCaseListViewModel.ts`
> - `packages/mobile/src/features/case/ui/CaseListScreen.tsx`

---

## 1 Domain 层映射

原型 `data/case-list.js` 中隐含的列表结构，应逐步提升为 `domain/case/` 下的纯 TypeScript 类型与查询参数。

### 1.1 实体与值类型

| 原型来源 | 生产文件 | 导出 | 说明 |
|---------|---------|------|------|
| 列表行结构（案件编号/名称/负责人/阶段/风险/截止日等） | `domain/case/Case.ts` | `CaseSummary` | 扩展现有 `CaseSummary`，覆盖列表展示所需字段 |
| 列表筛选输入 | `domain/case/Case.ts` 或 `CaseRepository.ts` | `CaseListFilters` | `scope/search/stage/owner/group/risk/validation` |
| 批量动作入参 | `domain/case/Case.ts` | `AssignOwnerInput` / `AssignCollaboratorInput` / `UpdateDueDateInput` / `CreateTaskInput` | 为批量动作建模 |
| summary card 聚合值 | `domain/case/Case.ts` | `CaseListSummary` | 活跃案件数、失败校验数、近 7 日截止数、未收金额 |

### 1.2 仓库接口

| 原型来源 | 生产文件 | 导出 | 说明 |
|---------|---------|------|------|
| 列表筛选与汇总 | `domain/case/CaseRepository.ts` | `listCases(filters)` | 扩展现有 `listMyCases()` 为更通用列表查询 |
| 批量动作 | `domain/case/CaseRepository.ts` | `assignOwner`, `assignCollaborator`, `updateDueDate`, `createFollowupTask` | 替代原型内存修改 |
| 详情入口 | `domain/case/CaseRepository.ts` | `getCaseDetail(caseId)` | 已存在 |

---

## 2 Data 层映射

| 原型来源 | 生产文件 | 导出 | 说明 |
|---------|---------|------|------|
| `data/case-list.js` 中的示例案件 | `data/case/CaseApi.ts` | `createCaseApi(deps)` | 真实环境通过 API 拉取列表、详情与批量动作 |
| `scripts/case-page.js` 中的内存批量修改 | `data/case/createCaseRepository.ts` | `createCaseRepository(deps)` | 实现仓库接口，屏蔽 HTTP 细节 |
| 静态负责人字典 | API / 字典端点 或组织服务 | — | 原型中本地硬编码，生产应走组织成员数据源 |

### App Container

当前 `caseRepository` 已在 app container 中使用；如扩展批量动作或复杂筛选，继续在现有依赖注入链上扩充即可，无需新增 feature 到 feature 的直连。

---

## 3 Features 层映射（model）

### 3.1 `scripts/case-page.js` -> `useCaseListViewModel`

原型当前把多个能力域集中在一个脚本中；生产实现优先落入现有 `features/case/model/useCaseListViewModel.ts`，必要时再抽辅助 hooks。

| 原型行为 | 生产 Hook 暴露 |
|---------|---------------|
| 页面首次加载 | `useEffect` 拉取列表 |
| `scope` 切换 | `scope`, `setScope()` |
| 搜索与筛选 | `filters`, `setFilters()`, `resetFilters()` |
| summary 统计 | `summary` derived state |
| 表格选择 | `selectedIds`, `toggleSelect`, `toggleSelectAll`, `clearSelection` |
| 批量指派负责人 | `assignOwner()` |
| 批量指派协作者 | `assignCollaborator()` |
| 批量调整截止日 | `updateDueDate()` |
| 批量生成任务 | `createBulkTask()` |
| toast | `toastState` 或 `useToast()` 组合 |

### 3.2 可选细拆方向

如果后续 `useCaseListViewModel` 体积增长过快，可进一步拆：

- `useCaseListFilters`
- `useCaseBulkActions`
- `useCaseListSummary`

这些拆分都应由 `useCaseListViewModel` 编排，而不是让 UI 组件直接依赖 data 层。

---

## 4 Features 层映射（ui）

### 4.1 页面组件总览

| 原型 section | 生产组件 | 所在路径 | 说明 |
|-------------|---------|---------|------|
| `sections/header.html` | `CaseListHeader` | `features/case/ui/` | 页面标题与建案入口 |
| `sections/summary-cards.html` | `CaseListSummaryCards` | `features/case/ui/` | 4 张 summary card |
| `sections/filters.html` | `CaseListFilters` | `features/case/ui/` | scope、筛选器、搜索、重置 |
| `sections/table.html` | `CaseTable` + `CaseBulkActionBar` | `features/case/ui/` | 列表、批量操作、分页摘要 |
| `sections/toast.html` | `Toast` | `shared/ui/` | 操作反馈 |
| 整页组装（`index.html`） | `CaseListScreen` | `features/case/ui/CaseListScreen.tsx` | 已存在页面入口，可渐进式拆子组件 |

### 4.2 DOM 钩子到组件 Props 的对照

| 原型 DOM 钩子 | 组件 Props / 事件 |
|--------------|-------------------|
| `data-scope-btn` | `CaseListFilters.onScopeChange(scope)` |
| `searchInput` | `CaseListFilters.onSearchChange(text)` |
| `filterStage/filterOwner/filterGroup/filterRisk/filterValidation` | `CaseListFilters.onFilterChange(key, value)` |
| `resetFiltersBtn` | `CaseListFilters.onReset()` |
| `selectAllCases` | `CaseBulkActionBar.onToggleSelectAll()` |
| `data-case-select` | `CaseTable.onToggleSelect(caseId)` |
| `bulkClearBtn` | `CaseBulkActionBar.onClear()` |
| `bulkOwnerApplyBtn` | `CaseBulkActionBar.onAssignOwner(ownerId)` |
| `bulkCollaboratorApplyBtn` | `CaseBulkActionBar.onAssignCollaborator(collaboratorId)` |
| `bulkDueDateApplyBtn` | `CaseBulkActionBar.onUpdateDueDate(date)` |
| `bulkTaskApplyBtn` | `CaseBulkActionBar.onCreateTask(taskType)` |
| `toastTitle` / `toastDesc` | `Toast.title` / `Toast.description` |

---

## 5 Shared 层映射

| 原型来源 | 生产去向 | 说明 |
|---------|---------|------|
| `shared/styles/tokens.css` | shared theme / design tokens | 已是统一 token 来源 |
| `shared/styles/components.css` | shared UI components | 通用按钮、卡片、表格、表单样式 |
| `shared/styles/shell.css` | `AppShell` / 导航壳层样式 | 已被多页复用 |
| `mobile-nav` / `side-nav` / `topbar` HTML | `shared/ui/AppShell` 及子组件 | 不属于案件业务 |
| `shared/scripts/mobile-nav.js` | `shared/hooks/useMobileNav` | 生产中应由状态驱动 |
| `shared/scripts/navigate.js` | 导航框架 | React Navigation 或现有导航层替代 |
| `sections/toast.html` | `shared/ui/Toast` | 可在多模块复用 |

---

## 6 完整文件树总览（建议形态）

```
packages/mobile/src/
├── domain/case/
│   ├── Case.ts
│   └── CaseRepository.ts
├── data/case/
│   ├── CaseApi.ts
│   └── createCaseRepository.ts
├── features/case/
│   ├── model/
│   │   ├── useCaseListViewModel.ts
│   │   └── useCaseDetailViewModel.ts
│   └── ui/
│       ├── CaseListScreen.tsx
│       ├── CaseDetailScreen.tsx
│       ├── CaseListHeader.tsx
│       ├── CaseListSummaryCards.tsx
│       ├── CaseListFilters.tsx
│       ├── CaseTable.tsx
│       └── CaseBulkActionBar.tsx
└── shared/
    ├── ui/Toast.tsx
    └── hooks/useMobileNav.ts
```

---

## 7 迁移顺序建议

| 阶段 | 范围 | 前置条件 |
|------|------|---------|
| M1 | 扩展 `domain/case` 的列表字段与筛选/批量动作类型 | 无 |
| M2 | 扩展 `CaseApi` / `createCaseRepository` 支持列表筛选与批量动作 | M1 |
| M3 | 扩展 `useCaseListViewModel` 管理筛选、统计、选择与批量动作 | M1 + M2 |
| M4 | 从 `CaseListScreen` 中拆出 header/summary/filters/table 子组件 | M3 |
| M5 | 接入详情、任务、收费等更深能力 | M4 |

---

## 8 原型 -> 生产差异备忘

| 原型行为 | 生产变化 | 原因 |
|---------|---------|------|
| 静态 `owners` 与 `cases` | API / repository 查询 | 真实数据源 |
| 内存筛选 | ViewModel + repository 查询参数 | 可测试、可扩展 |
| 内存批量动作 | repository 写操作 + toast 反馈 | 替代示例行为 |
| 固定 `today` 基准 | 使用真实当前时间或服务端返回的 SLA 字段 | 避免演示逻辑渗入生产 |
| 静态分页 footer | 真正分页或 infinite list | 真实数据规模需要 |
| 单页 DOM 渲染 | 声明式组件渲染 | 减少 DOM 字符串拼接与 ID 耦合 |
