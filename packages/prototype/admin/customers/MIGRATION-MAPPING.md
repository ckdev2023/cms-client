# 客户页原型 → 生产代码迁移映射

> 本文档定义原型中每个 section、config、script 到未来生产代码的一一映射关系。
>
> 生产代码遵循仓库已有的四层架构（`domain` → `data` → `features/{model,ui}` → `shared/ui`），
> 参考 `packages/mobile/src/features/case/` 和 `packages/mobile/src/domain/case/` 的现有模式。
>
> **前提约束**
>
> - `domain` 层纯 TypeScript：类型、实体、接口、常量，不依赖 UI 框架。
> - `features` 层 `model/` 放 ViewModel Hook（`useXxxViewModel`），`ui/` 放页面组件。
> - `data` 层实现 `domain` 接口：`createXxxRepository` + `XxxApi`。
> - `shared/ui` 放跨功能复用组件；feature 不直接引用 `tamagui`。
> - feature 之间不互相依赖，跨 feature 通过 `domain` / `shared` 协作。

---

## 1. Domain 层映射

原型 `data/customer-config.js` 中的声明式配置和隐式类型，迁移为 `domain/customer/` 下的纯 TypeScript 模块。

### 1.1 实体与值类型

| 原型来源 | 生产文件 | 导出 | 说明 |
|---------|---------|------|------|
| 表格行隐式结构（`sections/table.html` 中的 `<tr>` 列） | `domain/customer/Customer.ts` | `CustomerSummary` | 列表用摘要：`id`, `displayName`, `legalName`, `kana`, `activeCases`, `lastContact`, `owner`, `referrer`, `group` |
| 弹窗表单隐式结构（`FORM_FIELDS` 序列化） | `domain/customer/Customer.ts` | `CreateCustomerInput` | 新建客户入参：对应 `SERIALIZE_FIELDS` + `FORM_FIELDS` 的 key 集合 |
| 草稿 localStorage 值 | `domain/customer/Customer.ts` | `CustomerDraft` | `CreateCustomerInput` & `{ draftId, updatedAt }` |
| 去重命中卡片（`#dedupeHint` 内容） | `domain/customer/Customer.ts` | `DuplicateCandidate` | `{ id, legalName, phone?, email?, group }` |

```typescript
// domain/customer/Customer.ts

export type CustomerSummary = {
  id: string;
  displayName: string | null;
  legalName: string;
  kana: string | null;
  activeCases: number;
  lastContact: { date: string; channel: string } | null;
  owner: { id: string; name: string } | null;
  referrer: string | null;
  group: GroupCode;
};

export type CreateCustomerInput = {
  displayName?: string;
  group: GroupCode;
  legalName: string;
  kana?: string;
  gender?: Gender;
  birthDate?: string;
  phone?: string;
  email?: string;
  referrer?: string;
  avatar?: string;
  note?: string;
};

export type CustomerDraft = CreateCustomerInput & {
  draftId: string;
  updatedAt: string;
};

export type DuplicateCandidate = {
  id: string;
  legalName: string;
  phone: string | null;
  email: string | null;
  group: GroupCode;
};

export type GroupCode = "tokyo-1" | "tokyo-2" | "osaka";
export type Gender = "男" | "女";
export type ScopeOption = "mine" | "group" | "all";
```

### 1.2 仓库接口

| 原型来源 | 生产文件 | 导出 | 说明 |
|---------|---------|------|------|
| 表格数据（原型为静态 HTML 行） | `domain/customer/CustomerRepository.ts` | `CustomerRepository` | 列表查询、创建、去重检查 |
| 草稿 CRUD（`customer-drafts.js` 的 `getDrafts/setDrafts/upsertDraft/removeDraft`） | `domain/customer/CustomerDraftRepository.ts` | `CustomerDraftRepository` | 草稿持久化接口（生产实现不限于 localStorage） |

```typescript
// domain/customer/CustomerRepository.ts

import type {
  CustomerSummary,
  CreateCustomerInput,
  DuplicateCandidate,
  GroupCode,
  ScopeOption,
} from "./Customer";

export type CustomerListParams = {
  scope: ScopeOption;
  search?: string;
  group?: GroupCode;
  owner?: string;
  activeCases?: "has" | "none";
  page?: number;
  pageSize?: number;
};

export type CustomerListResult = {
  items: CustomerSummary[];
  total: number;
};

export type CustomerRepository = {
  listCustomers(params: CustomerListParams): Promise<CustomerListResult>;
  createCustomer(input: CreateCustomerInput): Promise<{ id: string }>;
  checkDuplicates(phone?: string, email?: string): Promise<DuplicateCandidate[]>;
  bulkAssignOwner(customerIds: string[], ownerId: string): Promise<void>;
  bulkChangeGroup(customerIds: string[], group: GroupCode): Promise<void>;
};
```

```typescript
// domain/customer/CustomerDraftRepository.ts

import type { CustomerDraft } from "./Customer";

export type CustomerDraftRepository = {
  listDrafts(): Promise<CustomerDraft[]>;
  upsertDraft(draft: CustomerDraft): Promise<void>;
  removeDraft(draftId: string): Promise<void>;
};
```

### 1.2A `REQ-P0-01` Customer 承接数据契约

> 目标：冻结从 Lead 转客户时，Customer 侧必须接住的来源、去重决策与 Group 继承信息。

| 主题 | 最小字段 / 约束 | 说明 |
|------|----------------|------|
| 来源线索 | `sourceLeadId` | 标识该 Customer 来自哪条 Lead 转化 |
| Group 继承 | `group` 默认取 `Lead.group` | 若用户改组，则必须附带 `groupOverrideReason` |
| 去重覆盖 | `duplicateDecision.matchedEntityType`、`duplicateDecision.matchedEntityId`、`duplicateDecision.continueReason`、`duplicateDecision.confirmedAt` | 命中重复但仍继续创建时必填 |
| P0 默认策略 | `no_auto_merge` + `no_auto_reuse` | Customer 创建前只提示，不自动合并/复用 |
| 创建后留痕 | Customer timeline / audit 必须能回链 `sourceLeadId` 与 duplicate override 信息 | 供后续 traceability 与审计使用 |

- `createCustomer(input)` 的返回仍保持最小 `{ id }`，避免把原型优化扩展成不必要的接口变更。
- 真正新增的是输入契约与留痕内容，而不是额外的页面流程。

### 1.3 常量与配置

| 原型来源 (`customer-config.js`) | 生产文件 | 导出 | 说明 |
|------|---------|------|------|
| `GROUPS` | `domain/customer/customerConstants.ts` | `GROUPS` | `{ value, label }[]` |
| `OWNERS` | `domain/customer/customerConstants.ts` | `OWNERS` | `{ value, label, initials }[]`（生产环境应从 API 动态获取） |
| `GROUP_LABEL_MAP` | `domain/customer/customerConstants.ts` | `GROUP_LABEL_MAP` | `Record<GroupCode, string>` |
| `SCOPE_OPTIONS` | `domain/customer/customerConstants.ts` | `SCOPE_OPTIONS` | 数据范围选项 |
| `TABLE_COLUMNS` | `domain/customer/customerConstants.ts` | `CUSTOMER_TABLE_COLUMNS` | 表格列定义 schema |
| `FILTERS` | `domain/customer/customerConstants.ts` | `CUSTOMER_FILTERS` | 筛选器配置 schema |
| `FORM_FIELDS` | `domain/customer/customerConstants.ts` | `CREATE_CUSTOMER_FORM_FIELDS` | 表单字段 schema |
| `SERIALIZE_FIELDS` | 不再需要 | — | 类型系统保证序列化字段 |
| `CREATE_REQUIRED_IDS` | `domain/customer/customerConstants.ts` | `CREATE_REQUIRED_FIELD_KEYS` | 创建必填字段 key 集合 |
| `CREATE_CONTACT_IDS` | `domain/customer/customerConstants.ts` | `CREATE_CONTACT_FIELD_KEYS` | 条件必填（电话/邮箱二选一） |
| `DEDUPE_TRIGGER_IDS` | `domain/customer/customerConstants.ts` | `DEDUPE_TRIGGER_FIELD_KEYS` | 触发去重检查的字段 |
| `BULK_ACTIONS` | `domain/customer/customerConstants.ts` | `CUSTOMER_BULK_ACTIONS` | 批量操作定义 |
| `TOAST` | `domain/customer/customerConstants.ts` | `CUSTOMER_TOAST_PRESETS` | Toast 文案预设 |
| `STORAGE_KEY`, `DRAFT_ROW_ID_PREFIX` | `domain/customer/customerConstants.ts` | `DRAFT_STORAGE_KEY`, `DRAFT_ROW_ID_PREFIX` | 草稿存储 key |
| `SEARCH_PLACEHOLDER` | `domain/customer/customerConstants.ts` | `CUSTOMER_SEARCH_PLACEHOLDER` | 搜索框 placeholder |

### 1.4 Domain 层文件清单

```
domain/customer/
├── Customer.ts                   ← 实体 & 值类型
├── CustomerRepository.ts         ← 仓库接口（API 侧）
├── CustomerDraftRepository.ts    ← 草稿仓库接口
└── customerConstants.ts          ← 常量、列定义、筛选配置、表单 schema
```

---

## 2. Data 层映射

| 原型来源 | 生产文件 | 导出 | 说明 |
|---------|---------|------|------|
| 表格静态 HTML 行（原型模拟数据） | `data/customer/CustomerApi.ts` | `createCustomerApi(deps)` | 调用 Server `/customers` 等端点 |
| `customer-drafts.js` 的 localStorage 操作 | `data/customer/CustomerDraftStorage.ts` | `createCustomerDraftRepository(deps)` | 实现 `CustomerDraftRepository`，生产可用 KVStorage 或 API |
| 两者组合 | `data/customer/createCustomerRepository.ts` | `createCustomerRepository(deps)` | 实现 `CustomerRepository`，组合 API + storage |

### Data 层文件清单

```
data/customer/
├── CustomerApi.ts                    ← createCustomerApi({ httpClient, baseUrl, getToken })
├── createCustomerRepository.ts       ← 实现 CustomerRepository
└── CustomerDraftStorage.ts           ← 实现 CustomerDraftRepository
```

### App Container 注册

在 `app/container/AppContainer.ts` 新增：

```typescript
customerRepository: CustomerRepository;
customerDraftRepository: CustomerDraftRepository;
```

---

## 3. Features 层映射（model → ViewModel Hooks）

### 3.1 ViewModel 总览

| 原型脚本 | 生产 Hook | 状态 / 职责 |
|---------|-----------|------------|
| `customer-page.js` | `useCustomerListViewModel` | 页面级编排：加载列表、筛选/搜索、scope 切换、分页；编排 modal / bulk / draft 子状态 |
| `customer-modal.js` | `useCreateCustomerModal` | 弹窗开关、表单值管理、必填校验 (`updateCreateEnabled`)、去重检查 (`updateDedupeHint`)、创建提交 |
| `customer-drafts.js` | `useCustomerDrafts` | 草稿列表、新增/恢复/删除草稿、草稿行渲染数据 |
| `customer-bulk-actions.js` | `useCustomerBulkActions` | 选中项集合、全选/反选/清除、批量指派/调组执行 |

### 3.2 映射详情

#### `customer-page.js` → `useCustomerListViewModel`

```
原型函数/行为                       → Hook 暴露
─────────────────────────────────────────────────
DOMContentLoaded 初始化              → useEffect 首次加载
showToast(title, desc)              → toast state + show/dismiss
modal.setup()                       → useCreateCustomerModal() 组合
bulk.setup(showToast)               → useCustomerBulkActions() 组合
#new hash → openModal               → 路由 query 参数检测，或 useEffect 检查 hash
renderAllDrafts()                   → useCustomerDrafts().drafts 渲染
segmented control 切换               → scope state + refetch
filter select change                → filterParams state + refetch
search input                        → search state + debounced refetch
reset filters button                → resetFilters()
```

参考现有模式 `useCaseListViewModel`，ViewState 定义：

```typescript
export type CustomerListViewState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; customers: CustomerSummary[]; total: number }
  | { status: "error"; error: AppError };
```

#### `customer-modal.js` → `useCreateCustomerModal`

```
原型函数                            → Hook 暴露
─────────────────────────────────────────────────
openModal() / closeModal()          → isOpen, open(), close()
serializeState() / applyState()     → formValues (controlled state)
updateCreateEnabled()               → canCreate (derived: legalName + group + (phone | email))
updateDedupeHint()                  → duplicates: DuplicateCandidate[] (API call on phone/email change)
handleCreate                        → submit() → customerRepository.createCustomer + close + toast
handleSaveDraft                     → saveDraft() → customerDraftRepository.upsertDraft + close + toast
currentDraftId                      → activeDraftId (null = new, string = editing draft)
backdrop click → close              → UI 层处理 (onBackdropPress → close)
```

#### `customer-drafts.js` → `useCustomerDrafts`

```
原型函数                            → Hook 暴露
─────────────────────────────────────────────────
getDrafts() / setDrafts()           → drafts: CustomerDraft[] (from repository)
upsertDraft(draft)                  → saveDraft(draft)
removeDraft(draftId)                → removeDraft(draftId)
renderDraftRow / renderAllDrafts    → drafts 数据 → UI 层负责渲染
escapeHtml / getNowLabel            → 不需要（框架层处理 XSS；date 用 formatter）
kind === 'family' 过滤              → domain 层类型保证
data-action="resume-draft" 点击     → resumeDraft(draftId) → 填充 modal formValues
```

#### `customer-bulk-actions.js` → `useCustomerBulkActions`

```
原型函数                            → Hook 暴露
─────────────────────────────────────────────────
getSelectableCustomerCheckboxes()   → selectableIds: string[] (排除草稿行)
updateBulkState()                   → selectedIds, isAllSelected, isIndeterminate, selectedCount
selectAll / deselectAll             → toggleSelectAll()
toggle single checkbox              → toggleSelect(customerId)
clear                               → clearSelection()
bulkAssign apply                    → assignOwner(ownerId) → repository + toast + clearSelection
bulkGroup apply                     → changeGroup(groupCode) → repository + toast + clearSelection
bar visibility                      → showBulkBar (derived: selectedCount > 0)
```

### 3.3 Model 层文件清单

```
features/customer/model/
├── useCustomerListViewModel.ts       ← 页面编排 Hook
├── useCreateCustomerModal.ts         ← 弹窗 Hook
├── useCustomerDrafts.ts              ← 草稿 Hook
├── useCustomerBulkActions.ts         ← 批量操作 Hook
├── useCustomerListViewModel.test.ts  ← 页面 ViewModel 测试
├── useCreateCustomerModal.test.ts    ← 弹窗测试
├── useCustomerDrafts.test.ts         ← 草稿测试
└── useCustomerBulkActions.test.ts    ← 批量操作测试
```

---

## 4. Features 层映射（ui → 页面组件）

### 4.1 页面组件总览

| 原型 section | 生产组件 | 所在路径 | Props（核心） |
|-------------|---------|---------|--------------|
| `sections/header.html` | `CustomerListHeader` | `features/customer/ui/` | `onAddCustomer` |
| `sections/filters.html` | `CustomerListFilters` | `features/customer/ui/` | `scope`, `filters`, `search`, `onScopeChange`, `onFilterChange`, `onSearchChange`, `onReset` |
| `sections/table.html` | `CustomerTable` | `features/customer/ui/` | `customers`, `drafts`, `selectedIds`, `onToggleSelect`, `onResumeDraft`, `columns` |
| `sections/table.html` 内 bulk bar | `CustomerBulkActionBar` | `features/customer/ui/` | `selectedCount`, `onClear`, `onAssign`, `onChangeGroup`, `isAllSelected`, `isIndeterminate`, `onToggleSelectAll` |
| `sections/pagination.html` | `Pagination` | `shared/ui/` | `total`, `page`, `pageSize`, `onPageChange` |
| `sections/create-modal.html` | `CreateCustomerModal` | `features/customer/ui/` | `isOpen`, `formValues`, `canCreate`, `duplicates`, `onFieldChange`, `onSubmit`, `onSaveDraft`, `onClose` |
| `sections/toast.html` | `Toast` | `shared/ui/` | `title`, `description`, `visible`, `onDismiss` |
| 整页组装（`index.html`） | `CustomerListScreen` | `features/customer/ui/` | 入口组件：组合上述子组件 + ViewModel Hooks |

### 4.2 原型 HTML 属性 → 组件 Props 对照

```
原型 DOM 钩子                        → 组件 Props / 事件
─────────────────────────────────────────────────────────
#btnAddCustomer onclick              → CustomerListHeader.onAddCustomer
data-scope-btn click                 → CustomerListFilters.onScopeChange(scope)
.search-input input                  → CustomerListFilters.onSearchChange(text)
select[筛选] change                  → CustomerListFilters.onFilterChange(key, value)
data-action="reset-filters" click    → CustomerListFilters.onReset()
#selectAllCustomers change           → CustomerBulkActionBar.onToggleSelectAll()
data-customer-select change          → CustomerTable.onToggleSelect(id)
#bulkClearBtn click                  → CustomerBulkActionBar.onClear()
#bulkAssignSelect + apply btn        → CustomerBulkActionBar.onAssign(ownerId)
#bulkGroupSelect + apply btn         → CustomerBulkActionBar.onChangeGroup(groupCode)
data-action="resume-draft" click     → CustomerTable.onResumeDraft(draftId)
#addCustomerModal open/close         → CreateCustomerModal.isOpen
quick* input/select                  → CreateCustomerModal.onFieldChange(key, value)
#createCustomerBtn click             → CreateCustomerModal.onSubmit()
#saveDraftBtn click                  → CreateCustomerModal.onSaveDraft()
modal cancel / backdrop              → CreateCustomerModal.onClose()
#toast show                          → Toast.visible + title + description
```

### 4.3 UI 层文件清单

```
features/customer/ui/
├── CustomerListScreen.tsx            ← 页面入口（组装所有子组件 + Hooks）
├── CustomerListHeader.tsx            ← 标题 + 添加按钮
├── CustomerListFilters.tsx           ← scope + 搜索 + 筛选 + 重置
├── CustomerTable.tsx                 ← 表格（含草稿行）
├── CustomerBulkActionBar.tsx         ← 批量操作栏
└── CreateCustomerModal.tsx           ← 新建客户弹窗（含去重提示）
```

---

## 5. Shared 层映射

### 5.1 共享 UI 组件

| 原型来源 | 生产组件 | 所在路径 | 说明 |
|---------|---------|---------|------|
| `sections/toast.html` | `Toast` | `shared/ui/Toast.tsx` | 全局 Toast 通知 |
| `sections/pagination.html` | `Pagination` | `shared/ui/Pagination.tsx` | 通用分页控件 |
| `shared/shell/side-nav.html` | `SideNav` | `shared/ui/SideNav.tsx` | 桌面侧边导航 |
| `shared/shell/topbar.html` | `TopBar` | `shared/ui/TopBar.tsx` | 顶部工具栏 |
| `shared/shell/mobile-nav.html` | `MobileNav` | `shared/ui/MobileNav.tsx` | 移动端抽屉导航 |
| `shared/shell/*.html` 组合 | `AppShell` | `shared/ui/AppShell.tsx` | 页面壳子：SideNav + TopBar + MobileNav + content slot |

### 5.2 共享 Hook

| 原型来源 | 生产 Hook | 所在路径 | 说明 |
|---------|-----------|---------|------|
| `shared/scripts/mobile-nav.js` | `useMobileNav` | `shared/hooks/useMobileNav.ts` | `isOpen`, `open()`, `close()`, Escape 键监听 |
| `shared/scripts/navigate.js` | 不需要 | — | 路由框架（React Navigation）取代 `data-navigate` + `location.href` |

### 5.3 共享样式

| 原型来源 | 生产去向 | 说明 |
|---------|---------|------|
| `shared/styles/tokens.css` | Design tokens → Tamagui theme config 或 `:root` CSS 变量 | 颜色、间距、圆角、字体 |
| `shared/styles/shell.css` | `AppShell` / `SideNav` / `TopBar` / `MobileNav` 组件内部样式 | 布局网格、导航动画 |
| `shared/styles/components.css` | 各 `shared/ui` 组件内部样式，或 Tamagui styled components | 按钮、卡片、表格、弹窗、表单、badge |

---

## 6. 完整文件树总览

```
packages/mobile/src/
│
├── domain/customer/
│   ├── Customer.ts                     ← 实体 & 值类型
│   ├── CustomerRepository.ts           ← API 仓库接口
│   ├── CustomerDraftRepository.ts      ← 草稿仓库接口
│   └── customerConstants.ts            ← 列定义 / 筛选配置 / 表单 schema / Toast 预设
│
├── data/customer/
│   ├── CustomerApi.ts                  ← HTTP 端点调用
│   ├── createCustomerRepository.ts     ← 实现 CustomerRepository
│   └── CustomerDraftStorage.ts         ← 实现 CustomerDraftRepository
│
├── features/customer/
│   ├── model/
│   │   ├── useCustomerListViewModel.ts
│   │   ├── useCreateCustomerModal.ts
│   │   ├── useCustomerDrafts.ts
│   │   ├── useCustomerBulkActions.ts
│   │   └── *.test.ts
│   └── ui/
│       ├── CustomerListScreen.tsx      ← 页面入口
│       ├── CustomerListHeader.tsx
│       ├── CustomerListFilters.tsx
│       ├── CustomerTable.tsx
│       ├── CustomerBulkActionBar.tsx
│       └── CreateCustomerModal.tsx
│
├── shared/
│   ├── ui/
│   │   ├── index.tsx                   ← 现有 barrel（扩展）
│   │   ├── Toast.tsx                   ← 新增
│   │   ├── Pagination.tsx              ← 新增
│   │   ├── AppShell.tsx                ← 新增
│   │   ├── SideNav.tsx                 ← 新增
│   │   ├── TopBar.tsx                  ← 新增
│   │   └── MobileNav.tsx              ← 新增
│   └── hooks/
│       └── useMobileNav.ts            ← 新增
│
└── app/container/
    └── AppContainer.ts                 ← 新增 customerRepository, customerDraftRepository
```

---

## 7. 迁移顺序建议

| 阶段 | 范围 | 前置条件 |
|------|------|---------|
| **M1** | `domain/customer/` 全部文件 | 无（纯类型，可独立提交） |
| **M2** | `data/customer/` + AppContainer 注册 | M1 + Server 端 Customer API 就绪 |
| **M3** | `features/customer/model/` 四个 Hook + 测试 | M1 + M2 |
| **M4** | `shared/ui/` 新增组件（Toast, Pagination, AppShell 等） | 无（可与 M1-M3 并行） |
| **M5** | `features/customer/ui/` 全部页面组件 | M3 + M4 |
| **M6** | 路由注册 + 集成测试 | M5 |

---

## 8. 原型 → 生产差异备忘

| 原型行为 | 生产变化 | 原因 |
|---------|---------|------|
| `window.CustomerConfig` 全局挂载 | ES module `import` + DI container | 消除全局状态 |
| `localStorage` 草稿存储 | `CustomerDraftRepository` 接口（实现可选 KVStorage / API） | 存储方案独立于业务逻辑 |
| `onclick` / `data-action` 事件 | React 事件 prop（`onPress`, `onChange`） | 框架层事件系统 |
| DOM ID 耦合（`#bulkActionBar`, `#toast`） | Props 驱动 + state 控制可见性 | 声明式 UI |
| `innerHTML` 渲染草稿行 | React 组件渲染 | 安全性 + 声明式 |
| `escapeHtml` 手动转义 | React 自动转义 | 框架内置 XSS 防护 |
| CSS class 切换（`.show`, `data-nav-open`） | State 驱动 + 动画库 | 响应式状态管理 |
| `#new` URL hash 打开弹窗 | 路由参数或导航 state（`navigation.navigate('CustomerList', { openCreate: true })`） | 路由框架标准做法 |
| 筛选/搜索仅 HTML 占位（无 JS 实现） | Hook 中完整实现筛选、搜索、debounce | 原型遗留缺口 |
| 静态 3 条示例数据 | API 动态数据 + 空状态处理 | 真实数据源 |
