# 资料中心原型 → 生产代码迁移映射

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

原型 `data/documents-config.js` 中的声明式配置和隐式类型，迁移为 `domain/document/` 下的纯 TypeScript 模块。

### 1.1 实体与值类型

| 原型来源 | 生产文件 | 导出 | 说明 |
|---------|---------|------|------|
| 表格行隐式结构（`documents-table.html` 的列） | `domain/document/DocumentItem.ts` | `DocumentItemSummary` | 跨案件列表摘要 |
| 资料项详情（案件内分组行） | `domain/document/DocumentItem.ts` | `DocumentItem` | 完整资料项实体 |
| 附件版本行 | `domain/document/DocumentItem.ts` | `DocumentFileVersion` | 单个版本记录 |
| 审核记录 | `domain/document/DocumentItem.ts` | `DocumentReviewRecord` | 审核/退回/waived 记录 |
| 催办记录 | `domain/document/DocumentItem.ts` | `DocumentReminderRecord` | 催办留痕 |
| 引用记录 | `domain/document/DocumentItem.ts` | `DocumentVersionReference` | 版本引用关系 |

```typescript
// domain/document/DocumentItem.ts

export type DocumentItemStatus =
  | 'pending'
  | 'uploaded_reviewing'
  | 'approved'
  | 'rejected'
  | 'expired'
  | 'waived';

export type ProviderType =
  | 'main_applicant'
  | 'dependent_guarantor'
  | 'employer_org'
  | 'office_internal';

export type ReviewAction = 'approve' | 'reject' | 'waive';

export type DocumentItemSummary = {
  id: string;
  name: string;
  caseId: string;
  caseName: string;
  caseNo: string;
  provider: ProviderType;
  status: DocumentItemStatus;
  deadline: string | null;
  lastReminderAt: string | null;
  latestVersion: { number: number; filename: string; relativePath: string } | null;
};

export type DocumentItem = {
  id: string;
  itemCode: string;
  name: string;
  caseId: string;
  provider: ProviderType;
  status: DocumentItemStatus;
  description: string | null;
  sampleHint: string | null;
  deadline: string | null;
  versions: DocumentFileVersion[];
  reviewRecords: DocumentReviewRecord[];
  reminderRecords: DocumentReminderRecord[];
  waivedReason: WaivedReason | null;
};

export type DocumentFileVersion = {
  id: string;
  versionNumber: number;
  filename: string;
  relativePath: string;
  storage: 'local_server';
  registeredAt: string;
  registeredBy: string;
  source: VersionSource;
  expiryDate: string | null;
  referenceCount: number;
};

export type VersionSource =
  | { type: 'self_registered' }
  | { type: 'referenced_from'; sourceCaseId: string; sourceCaseNo: string; sourceItemId: string };

export type DocumentReviewRecord = {
  id: string;
  action: ReviewAction;
  reason: string | null;
  waivedReasonCode: string | null;
  reviewedBy: string;
  reviewedAt: string;
};

export type DocumentReminderRecord = {
  id: string;
  sentAt: string;
  sentBy: string;
  channel: 'in_app';
};

export type WaivedReason = {
  code: string;
  note: string;
  waivedBy: string;
  waivedAt: string;
};
```

### 1.2 仓库接口

| 原型来源 | 生产文件 | 导出 | 说明 |
|---------|---------|------|------|
| 表格数据（静态 HTML + demo-data.js） | `domain/document/DocumentRepository.ts` | `DocumentRepository` | 跨案件查询、案件内查询、审核、登记、催办 |

```typescript
// domain/document/DocumentRepository.ts

import type {
  DocumentItemSummary,
  DocumentItem,
  DocumentItemStatus,
  ProviderType,
  ReviewAction,
  DocumentFileVersion,
} from './DocumentItem';

export type DocumentListParams = {
  status?: DocumentItemStatus;
  caseId?: string;
  provider?: ProviderType;
  search?: string;
  page?: number;
  pageSize?: number;
};

export type DocumentListResult = {
  items: DocumentItemSummary[];
  total: number;
  stats: {
    pendingReview: number;
    missing: number;
    expired: number;
    sharedExpiryRisk: number;
  };
};

export type CaseDocumentsResult = {
  groups: Array<{
    provider: ProviderType;
    total: number;
    completed: number;
    items: DocumentItem[];
  }>;
  overallProgress: { collected: number; total: number; percent: number };
};

export type RegisterInput = {
  caseId: string;
  itemId: string;
  relativePath: string;
  filename: string;
};

export type ReviewInput = {
  itemId: string;
  action: ReviewAction;
  reason?: string;
  waivedReasonCode?: string;
};

export type ReferenceInput = {
  itemId: string;
  sourceVersionId: string;
};

export type ReusableVersion = {
  versionId: string;
  caseNo: string;
  itemName: string;
  versionNumber: number;
  filename: string;
  status: 'approved';
  expiryDate: string | null;
};

export type DocumentRepository = {
  listDocuments(params: DocumentListParams): Promise<DocumentListResult>;
  getCaseDocuments(caseId: string): Promise<CaseDocumentsResult>;
  registerVersion(input: RegisterInput): Promise<DocumentFileVersion>;
  reviewItem(input: ReviewInput): Promise<void>;
  sendReminder(itemId: string): Promise<void>;
  bulkSendReminder(itemIds: string[]): Promise<{ success: number; skipped: number }>;
  bulkApprove(itemIds: string[]): Promise<{ success: number; skipped: number }>;
  bulkWaive(itemIds: string[], reasonCode: string, reasonNote: string): Promise<{ success: number; skipped: number }>;
  findReusableVersions(itemId: string): Promise<ReusableVersion[]>;
  referenceVersion(input: ReferenceInput): Promise<void>;
  addDocumentItem(caseId: string, name: string, provider: ProviderType): Promise<{ id: string }>;
};
```

### 1.3 常量与配置

| 原型来源 (`documents-config.js`) | 生产文件 | 导出 | 说明 |
|------|---------|------|------|
| `DOCUMENT_STATUS` | `domain/document/documentConstants.ts` | `DOCUMENT_STATUS_CONFIG` | 状态枚举 + badge + label |
| `DOCUMENT_PROVIDER` | `domain/document/documentConstants.ts` | `PROVIDER_CONFIG` | 提供方枚举 + label |
| `DOCUMENT_TABLE_COLUMNS` | `domain/document/documentConstants.ts` | `DOCUMENT_TABLE_COLUMNS` | 列定义 schema |
| `DOCUMENT_FILTERS` | `domain/document/documentConstants.ts` | `DOCUMENT_FILTERS` | 筛选器配置 |
| `DOCUMENT_BULK_ACTIONS` | `domain/document/documentConstants.ts` | `DOCUMENT_BULK_ACTIONS` | 批量动作定义 |
| `DOCUMENT_TOAST_PRESETS` | `domain/document/documentConstants.ts` | `DOCUMENT_TOAST_PRESETS` | Toast 预设 |
| `RELATIVE_PATH_PATTERN` | `domain/document/documentConstants.ts` | `RELATIVE_PATH_PATTERN` | 路径校验正则 |
| `RELATIVE_PATH_HINT` | `domain/document/documentConstants.ts` | `RELATIVE_PATH_HINT` | 路径格式提示 |
| `WAIVED_REASON_CODES` | `domain/document/documentConstants.ts` | `WAIVED_REASON_CODES` | waived 原因码枚举 |
| `REVIEW_ACTIONS` | `domain/document/documentConstants.ts` | `REVIEW_ACTIONS` | 审核动作枚举 |

### 1.4 Domain 层文件清单

```
domain/document/
├── DocumentItem.ts              ← 实体 & 值类型
├── DocumentRepository.ts        ← 仓库接口
└── documentConstants.ts         ← 常量、列定义、筛选配置、Toast 预设、路径规则
```

---

## 2. Data 层映射

| 原型来源 | 生产文件 | 导出 | 说明 |
|---------|---------|------|------|
| 表格静态 HTML 行 + demo-data.js | `data/document/DocumentApi.ts` | `createDocumentApi(deps)` | 调用 Server `/document-items`, `/document-versions` 等端点 |
| 两者组合 | `data/document/createDocumentRepository.ts` | `createDocumentRepository(deps)` | 实现 `DocumentRepository` |

### Data 层文件清单

```
data/document/
├── DocumentApi.ts                   ← createDocumentApi({ httpClient, baseUrl, getToken })
└── createDocumentRepository.ts      ← 实现 DocumentRepository
```

### App Container 注册

在 `app/container/AppContainer.ts` 新增：

```typescript
documentRepository: DocumentRepository;
```

---

## 3. Features 层映射（model → ViewModel Hooks）

### 3.1 ViewModel 总览

| 原型脚本 | 生产 Hook | 状态 / 职责 |
|---------|-----------|------------|
| `documents-page.js` | `useDocumentCenterViewModel` | 页面编排：加载列表、摘要卡、筛选/搜索、编排 modal / bulk / risk 子状态 |
| `documents-filters.js` | `useDocumentFilters` | 筛选状态管理、搜索防抖、重置 |
| `documents-bulk-actions.js` | `useDocumentBulkActions` | 选中项集合、全选/反选/清除、批量催办/审核/waived 执行 |
| `documents-review-modal.js` | `useDocumentReviewModal` | 审核弹窗开关、通过/退回/waived 切换、原因校验、提交 |
| `documents-register-modal.js` | `useDocumentRegisterModal` | 登记弹窗开关、`relative_path` 校验、版本登记提交 |
| `documents-risk-log.js` | `useDocumentRiskLog` | 风险面板展开/折叠、共享版本过期数据加载 |

### 3.2 映射详情

#### `documents-page.js` → `useDocumentCenterViewModel`

```
原型函数/行为                       → Hook 暴露
─────────────────────────────────────────────────
DOMContentLoaded 初始化              → useEffect 首次加载
showToast(title, desc)              → toast state + show/dismiss
摘要卡渲染                           → stats (from listDocuments result)
filters.setup()                     → useDocumentFilters() 组合
bulk.setup(showToast)               → useDocumentBulkActions() 组合
review modal                        → useDocumentReviewModal() 组合
register modal                      → useDocumentRegisterModal() 组合
risk panel                          → useDocumentRiskLog() 组合
```

ViewState 定义：

```typescript
export type DocumentCenterViewState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; items: DocumentItemSummary[]; total: number; stats: DocumentListResult['stats'] }
  | { status: 'error'; error: AppError };
```

#### `documents-filters.js` → `useDocumentFilters`

```
原型函数                            → Hook 暴露
─────────────────────────────────────────────────
status select change                → filterParams.status
case select change                  → filterParams.caseId
provider select change              → filterParams.provider
search input                        → search (debounced)
reset button                        → resetFilters()
filter 联动重新加载列表              → onFilterChange callback (triggers refetch)
```

#### `documents-bulk-actions.js` → `useDocumentBulkActions`

```
原型函数                            → Hook 暴露
─────────────────────────────────────────────────
getSelectableCheckboxes()           → selectableIds: string[]
updateBulkState()                   → selectedIds, isAllSelected, isIndeterminate, selectedCount
selectAll / deselectAll             → toggleSelectAll()
toggle single checkbox              → toggleSelect(itemId)
clear                               → clearSelection()
bulkReminder apply                  → sendBulkReminder() → repository + toast + clear
bulkApprove apply                   → approveBulk() → repository + toast + clear
bulkWaive apply                     → waiveBulk(reasonCode, note) → repository + toast + clear
bar visibility                      → showBulkBar (derived: selectedCount > 0)
```

#### `documents-review-modal.js` → `useDocumentReviewModal`

```
原型函数                            → Hook 暴露
─────────────────────────────────────────────────
openReviewModal(itemId)             → isOpen, targetItemId, open(itemId), close()
action radio change                 → selectedAction: ReviewAction
reason textarea input               → reason: string
waived code select                  → waivedReasonCode: string | null
canSubmit derived                   → canSubmit (action selected + conditional reason)
submit()                            → submit() → repository.reviewItem + close + toast
```

#### `documents-register-modal.js` → `useDocumentRegisterModal`

```
原型函数                            → Hook 暴露
─────────────────────────────────────────────────
openRegisterModal(itemId?)          → isOpen, open(itemId?), close()
case select                         → selectedCaseId
item select                         → selectedItemId
relativePath input                  → relativePath: string
filename input                      → filename: string
validateRelativePath()              → pathError: string | null (derived)
previewFullPath()                   → fullPathPreview: string (derived from root + relativePath)
canSubmit derived                   → canSubmit (case + item + path valid + filename)
submit()                            → submit() → repository.registerVersion + close + toast
```

#### `documents-risk-log.js` → `useDocumentRiskLog`

```
原型函数                            → Hook 暴露
─────────────────────────────────────────────────
togglePanel()                       → isExpanded, toggle()
renderRiskItems()                   → riskItems: SharedExpiryRisk[] (from API or stats)
```

### 3.3 案件详情资料 Tab

| 原型部分 | 生产 Hook | 说明 |
|---------|-----------|------|
| `case-detail-page.js`（资料 Tab 相关函数） | `useCaseDocumentsViewModel` | 案件内资料清单加载、按提供方分组、进度计算 |
| 资料行内动作（审核/登记/催办） | 复用 `useDocumentReviewModal` + `useDocumentRegisterModal` | 通过 feature 公共 API 调用 |

### 3.4 Model 层文件清单

```
features/document/model/
├── useDocumentCenterViewModel.ts       ← 跨案件页面编排 Hook
├── useDocumentFilters.ts               ← 筛选 Hook
├── useDocumentBulkActions.ts           ← 批量操作 Hook
├── useDocumentReviewModal.ts           ← 审核弹窗 Hook
├── useDocumentRegisterModal.ts         ← 登记弹窗 Hook
├── useDocumentRiskLog.ts              ← 风险面板 Hook
├── useDocumentCenterViewModel.test.ts
├── useDocumentReviewModal.test.ts
├── useDocumentRegisterModal.test.ts
└── useDocumentBulkActions.test.ts

features/case/model/
├── useCaseDocumentsViewModel.ts        ← 案件内资料清单 Hook（新增）
└── useCaseDocumentsViewModel.test.ts
```

---

## 4. Features 层映射（ui → 页面组件）

### 4.1 跨案件资料中心（次级入口）

| 原型 section | 生产组件 | 所在路径 | Props（核心） |
|-------------|---------|---------|--------------|
| `sections/page-header.html` | `DocumentCenterHeader` | `features/document/ui/` | `onRegister`, `onBulkRemind` |
| `sections/summary-cards.html` | `DocumentSummaryCards` | `features/document/ui/` | `stats` |
| `sections/filters-toolbar.html` | `DocumentFilters` | `features/document/ui/` | `filters`, `search`, `onFilterChange`, `onSearchChange`, `onReset` |
| `sections/documents-table.html` | `DocumentTable` | `features/document/ui/` | `items`, `selectedIds`, `onToggleSelect`, `columns` |
| `sections/documents-table.html` bulk bar | `DocumentBulkActionBar` | `features/document/ui/` | `selectedCount`, `onClear`, `onBulkRemind`, `onBulkApprove`, `onBulkWaive`, `isAllSelected`, `isIndeterminate`, `onToggleSelectAll` |
| `sections/review-modal.html` | `DocumentReviewModal` | `features/document/ui/` | `isOpen`, `targetItem`, `selectedAction`, `reason`, `onActionChange`, `onReasonChange`, `onSubmit`, `onClose` |
| `sections/register-modal.html` | `DocumentRegisterModal` | `features/document/ui/` | `isOpen`, `cases`, `items`, `relativePath`, `filename`, `pathError`, `fullPathPreview`, `canSubmit`, `onFieldChange`, `onSubmit`, `onClose` |
| `sections/risk-log-panel.html` | `DocumentRiskPanel` | `features/document/ui/` | `isExpanded`, `riskItems`, `onToggle` |
| `sections/toast.html` | `Toast` | `shared/ui/` | 共享组件 |
| 整页组装 (`index.html`) | `DocumentCenterScreen` | `features/document/ui/` | 入口组件 |

### 4.2 案件详情资料清单 Tab

| 原型 section | 生产组件 | 所在路径 | Props（核心） |
|-------------|---------|---------|--------------|
| `case/sections/detail-documents.html` | `CaseDocumentsTab` | `features/case/ui/` | `caseId`, `groups`, `progress`, `onRegister`, `onReview`, `onRemind`, `onWaive`, `onReference` |
| 提供方分组子组件 | `DocumentProviderGroup` | `features/document/ui/` | `provider`, `items`, `completed`, `total`, 行内动作回调 |
| 资料项行子组件 | `DocumentItemRow` | `features/document/ui/` | `item`, `onReview`, `onRegister`, `onRemind`, `onWaive`, `onReference` |

### 4.3 原型 HTML 属性 → 组件 Props 对照

```
原型 DOM 钩子                        → 组件 Props / 事件
─────────────────────────────────────────────────────────
data-navigate="../documents.html"    → DocumentCenterHeader.onRegister
data-action="bulk-remind"            → DocumentBulkActionBar.onBulkRemind
data-action="review"                 → DocumentItemRow.onReview(itemId)
data-action="register"               → DocumentItemRow.onRegister(itemId)
data-action="remind"                 → DocumentItemRow.onRemind(itemId)
data-action="waive"                  → DocumentItemRow.onWaive(itemId)
data-action="reference"              → DocumentItemRow.onReference(itemId)
data-action="copy-path"              → inline handler → clipboard.writeText
#reviewModal open/close              → DocumentReviewModal.isOpen
#registerModal open/close            → DocumentRegisterModal.isOpen
#riskPanel toggle                    → DocumentRiskPanel.isExpanded
select[status] change                → DocumentFilters.onFilterChange('status', value)
select[case] change                  → DocumentFilters.onFilterChange('caseId', value)
select[provider] change              → DocumentFilters.onFilterChange('provider', value)
.search-input input                  → DocumentFilters.onSearchChange(text)
data-action="reset-filters"          → DocumentFilters.onReset()
#selectAll change                    → DocumentBulkActionBar.onToggleSelectAll()
data-doc-select change               → DocumentTable.onToggleSelect(id)
#bulkClearBtn click                  → DocumentBulkActionBar.onClear()
#toast show                          → Toast.visible + title + description
```

### 4.4 UI 层文件清单

```
features/document/ui/
├── DocumentCenterScreen.tsx        ← 跨案件页面入口
├── DocumentCenterHeader.tsx        ← 标题 + CTA
├── DocumentSummaryCards.tsx        ← 摘要卡
├── DocumentFilters.tsx             ← 筛选 + 搜索 + 重置
├── DocumentTable.tsx               ← 资料表格
├── DocumentBulkActionBar.tsx       ← 批量操作栏
├── DocumentReviewModal.tsx         ← 审核弹窗
├── DocumentRegisterModal.tsx       ← 登记弹窗
├── DocumentRiskPanel.tsx           ← 风险面板
├── DocumentProviderGroup.tsx       ← 提供方分组（案件详情复用）
└── DocumentItemRow.tsx             ← 资料项行（跨案件/案件内复用）

features/case/ui/
├── CaseDocumentsTab.tsx            ← 案件详情资料清单 Tab（新增）
└── ... (existing case UI files)
```

---

## 5. Shared 层映射

资料中心模块不新增共享组件。以下为已存在的共享资源复用清单：

### 5.1 共享 UI 组件（已存在）

| 原型来源 | 生产组件 | 说明 |
|---------|---------|------|
| `sections/toast.html` | `Toast` (`shared/ui/Toast.tsx`) | 全局 Toast |
| `shared/shell/*.html` | `AppShell` / `SideNav` / `TopBar` / `MobileNav` | 页面壳子 |

### 5.2 可能新增的共享组件

| 需求 | 候选组件 | 说明 |
|------|---------|------|
| 复制到剪贴板按钮 | `CopyButton` (`shared/ui/CopyButton.tsx`) | `relative_path` 复制 + tooltip 反馈 |
| 进度条 | `ProgressBar` (`shared/ui/ProgressBar.tsx`) | 资料完成率进度条（如果仪表盘也复用） |

### 5.3 共享样式（已存在）

| 原型来源 | 生产去向 | 说明 |
|---------|---------|------|
| `shared/styles/tokens.css` | Tamagui theme / CSS 变量 | 颜色、间距、圆角、字体 |
| `shared/styles/shell.css` | `AppShell` 组件内部样式 | 布局网格 |
| `shared/styles/components.css` | 各 `shared/ui` 组件样式 | 按钮、卡片、表格、弹窗、badge |

---

## 6. 完整文件树总览

```
packages/mobile/src/
│
├── domain/document/
│   ├── DocumentItem.ts                  ← 实体 & 值类型
│   ├── DocumentRepository.ts            ← 仓库接口
│   └── documentConstants.ts             ← 状态枚举 / 提供方 / 列定义 / 路径规则 / Toast
│
├── data/document/
│   ├── DocumentApi.ts                   ← HTTP 端点调用
│   └── createDocumentRepository.ts      ← 实现 DocumentRepository
│
├── features/document/
│   ├── model/
│   │   ├── useDocumentCenterViewModel.ts
│   │   ├── useDocumentFilters.ts
│   │   ├── useDocumentBulkActions.ts
│   │   ├── useDocumentReviewModal.ts
│   │   ├── useDocumentRegisterModal.ts
│   │   ├── useDocumentRiskLog.ts
│   │   └── *.test.ts
│   └── ui/
│       ├── DocumentCenterScreen.tsx     ← 跨案件页面入口
│       ├── DocumentCenterHeader.tsx
│       ├── DocumentSummaryCards.tsx
│       ├── DocumentFilters.tsx
│       ├── DocumentTable.tsx
│       ├── DocumentBulkActionBar.tsx
│       ├── DocumentReviewModal.tsx
│       ├── DocumentRegisterModal.tsx
│       ├── DocumentRiskPanel.tsx
│       ├── DocumentProviderGroup.tsx
│       └── DocumentItemRow.tsx
│
├── features/case/
│   ├── model/
│   │   ├── useCaseDocumentsViewModel.ts ← 新增
│   │   └── useCaseDocumentsViewModel.test.ts
│   └── ui/
│       ├── CaseDocumentsTab.tsx         ← 新增
│       └── ... (existing)
│
├── shared/
│   ├── ui/
│   │   ├── Toast.tsx                    ← 已存在或新增
│   │   ├── CopyButton.tsx              ← 新增候选
│   │   ├── ProgressBar.tsx             ← 新增候选
│   │   └── ... (existing)
│   └── hooks/
│       └── ... (existing)
│
└── app/container/
    └── AppContainer.ts                  ← 新增 documentRepository
```

---

## 7. 迁移顺序建议

| 阶段 | 范围 | 前置条件 |
|------|------|---------|
| **M1** | `domain/document/` 全部文件 | 无（纯类型，可独立提交） |
| **M2** | `data/document/` + AppContainer 注册 | M1 + Server 端 Document API 就绪 |
| **M3** | `features/document/model/` 6 个 Hook + 测试 | M1 + M2 |
| **M4** | `shared/ui/` 新增组件（CopyButton, ProgressBar） | 无（可与 M1-M3 并行） |
| **M5** | `features/document/ui/` 跨案件页面组件 | M3 + M4 |
| **M6** | `features/case/model/` + `features/case/ui/` 资料清单 Tab | M3 |
| **M7** | 路由注册 + 集成测试 | M5 + M6 |

---

## 8. 原型 → 生产差异备忘

| 原型行为 | 生产变化 | 原因 |
|---------|---------|------|
| `window.__documentsPage` 全局挂载 | ES module `import` + DI container | 消除全局状态 |
| `onclick` / `data-action` 事件 | React 事件 prop（`onPress`, `onChange`） | 框架层事件系统 |
| DOM ID 耦合（`#reviewModal`, `#registerModal`, `#toast`） | Props 驱动 + state 控制可见性 | 声明式 UI |
| `innerHTML` 渲染表格行 | React 组件渲染 | 安全性 + 声明式 |
| `RELATIVE_PATH_PATTERN` 前端正则校验 | 前端校验 + 后端二次校验 | 防绕过 |
| 硬编码根目录拼接预览 | 从系统设置 API 获取根目录 | 真实数据源 |
| 摘要卡硬编码数字 | 从 API 聚合统计 | 真实数据源 |
| 过期联动仅静态标注 | 后端触发状态流转 + 前端实时刷新 | 数据一致性 |
| 引用版本仅 UI 演示 | 后端创建引用记录 + 校验可复用条件 | 业务完整性 |
| 静态 demo 数据 | API 动态数据 + 空状态处理 | 真实数据源 |
| CSS class 切换控制弹窗 | State 驱动 + 动画库 | 响应式状态管理 |
| 筛选/搜索仅客户端过滤 | Hook 中完整实现服务端筛选 + 客户端 debounce | 大数据量支持 |
| `clipboard.writeText` 复制 | 封装为 `CopyButton` 组件（含降级处理） | 兼容性 |

---

## 9. 跨模块依赖说明

| 生产模块 | 依赖方向 | 说明 |
|---------|---------|------|
| `features/document` → `domain/document` | 标准依赖 | Hook 读取 domain 类型和仓库接口 |
| `features/case` → `domain/document` | 跨 feature 通过 domain | 案件详情需要 `DocumentItem` 类型 |
| `features/case` → `features/document` | **禁止** | 案件 feature 不直接 import document feature |
| `features/case/ui/CaseDocumentsTab` 复用 `features/document/ui/DocumentProviderGroup` | 通过 shared 或公共 API | 提供方分组组件可提升为公共组件或通过 props 传递 |

**解决方案**：`DocumentProviderGroup` 和 `DocumentItemRow` 如果被案件详情 Tab 复用，应提升到 `shared/ui/` 或定义为 `features/document` 的公共 API（通过 barrel export），由案件 feature 通过 import 路径白名单访问。
