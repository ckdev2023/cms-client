# 收费与财务页原型 → 生产代码迁移映射

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

原型 `data/billing-config.js` 中的声明式配置和隐式类型，迁移为 `domain/billing/` 下的纯 TypeScript 模块。

### 1.1 实体与值类型

| 原型来源 | 生产文件 | 导出 | 说明 |
|---------|---------|------|------|
| 表格行隐式结构（`billing-table.html` 的 8 列） | `domain/billing/BillingPlan.ts` | `CaseBillingSummary` | 列表用摘要：`id`, `caseName`, `caseNo`, `customer`, `group`, `amountDue`, `amountReceived`, `amountOutstanding`, `status`, `nextNode` |
| 收费节点列表（`billing-plan-panel.html`） | `domain/billing/BillingPlan.ts` | `BillingPlanNode` | `id`, `milestoneName`, `amountDue`, `dueDate`, `status` |
| 回款登记表单（`PAYMENT_FORM_FIELDS` 序列化） | `domain/billing/BillingPlan.ts` | `RegisterPaymentInput` | `amount`, `date`, `billingPlanId`, `receiptPath?`, `note?` |
| 回款流水行（`payment-log-table.html` 8 列） | `domain/billing/BillingPlan.ts` | `PaymentLogEntry` | `id`, `date`, `caseNo`, `caseName`, `customer`, `amount`, `nodeName`, `hasReceipt`, `recordStatus`, `operator` |
| 回款更正入参 | `domain/billing/BillingPlan.ts` | `VoidPaymentInput` | `paymentRecordId`, `reasonCode`, `reasonNote` |
| 风险确认输入 | `domain/billing/BillingPlan.ts` | `RiskAcknowledgement` | `acknowledgedBy`, `acknowledgedAt`, `reasonCode`, `reasonNote`, `receiptPath?` |
| Case 级欠款风险留痕字段（[07 §3.5](../../../../docs/gyoseishoshi_saas_md/P0/07-数据模型设计.md#35-case案件) Case 实体 4 字段） | `domain/case/Case.ts`（已有实体扩展） | `CaseBillingRiskFields` | `billing_risk_acknowledged_by`, `billing_risk_acknowledged_at`, `billing_risk_ack_reason_code`, `billing_risk_ack_reason_note`——由 `BillingRepository.acknowledgeRisk` 写入 Case |
| 风险确认审计事件（[03 §5](../../../../docs/gyoseishoshi_saas_md/P0/03-业务规则与不变量.md#5-审计事件最小集合)） | `domain/audit/AuditLog.ts`（通用） | `AuditActionType` 含 `'billing_risk_acknowledged'` | `object_type: 'case'`, `action_type: 'billing_risk_acknowledged'`, `before_data` / `after_data` 记录确认前后的 4 个 risk 字段 |
| 批量催款结果 | `domain/billing/BillingPlan.ts` | `CollectionResult` | `success`, `skipped`, `failed`, `skipReasons[]` |
| 催款跳过原因（P0 枚举，P0-CONTRACT §6.3） | `domain/billing/BillingPlan.ts` | `CollectionSkipReasonCode` | 5 项枚举联合类型 |

```typescript
// domain/billing/BillingPlan.ts

export type CaseBillingSummary = {
  id: string;
  caseName: string;
  caseNo: string;
  customer: { name: string; type: string };
  group: GroupCode;
  amountDue: number;
  amountReceived: number;
  amountOutstanding: number;
  status: BillingStatus;
  nextNode: BillingNextNode | null;
};

export type BillingNextNode = {
  name: string;
  dueDate: string;
  amount: number;
  overdueDays?: number;
};

export type BillingPlanNode = {
  id: string;
  caseId: string;
  milestoneName: string;
  amountDue: number;
  dueDate: string;
  status: NodeStatus;
  gateEffectMode: "off" | "warn";
  remark?: string;
};

export type PaymentLogEntry = {
  id: string;
  billingPlanId: string;
  caseId: string;
  date: string;
  caseNo: string;
  caseName: string;
  customer: string;
  amount: number;
  nodeName: string;
  hasReceipt: boolean;
  recordStatus: PaymentRecordStatus;
  operator: string;
};

export type RegisterPaymentInput = {
  amount: number;
  date: string;
  billingPlanId: string;
  receiptPath?: string;
  note?: string;
};

export type VoidPaymentInput = {
  paymentRecordId: string;
  reasonCode: string;
  reasonNote: string;
};

export type RiskAcknowledgement = {
  acknowledgedBy: string;
  acknowledgedAt: string;
  reasonCode: string;
  reasonNote: string;
  receiptPath?: string;
};

// Case 实体上的欠款风险留痕字段（§3.5 of 07-数据模型设计.md）
// 由 BillingRepository.acknowledgeRisk 写入 Case 行，同时生成 AuditLog
export type CaseBillingRiskFields = {
  billing_risk_acknowledged_by: string | null;
  billing_risk_acknowledged_at: string | null;
  billing_risk_ack_reason_code: string | null;
  billing_risk_ack_reason_note: string | null;
};

export type CollectionResult = {
  success: number;
  skipped: number;
  failed: number;
  skipReasons: { caseNo: string; reason: string }[];
};

export type BillingStatus = "overdue" | "paid" | "partial" | "due";
export type NodeStatus = "due" | "partial" | "paid" | "overdue";
export type PaymentRecordStatus = "valid" | "voided" | "reversed";
export type CollectionSkipReasonCode =
  | "no-permission"
  | "existing-task"
  | "not-overdue"
  | "no-assignee"
  | "system-error";
export type GroupCode = "tokyo-1" | "tokyo-2" | "osaka";
```

### 1.2 仓库接口

| 原型来源 | 生产文件 | 导出 | 说明 |
|---------|---------|------|------|
| 案件收费列表（原型为静态 HTML 行） | `domain/billing/BillingRepository.ts` | `BillingRepository` | 列表查询、回款登记、更正、催款 |
| 回款流水列表 | `domain/billing/BillingRepository.ts` | `BillingRepository` | 含回款流水查询 |
| 收费计划 CRUD | `domain/billing/BillingRepository.ts` | `BillingRepository` | 含收费计划管理 |

```typescript
// domain/billing/BillingRepository.ts

import type {
  CaseBillingSummary,
  BillingPlanNode,
  PaymentLogEntry,
  RegisterPaymentInput,
  VoidPaymentInput,
  RiskAcknowledgement,
  CollectionResult,
  BillingStatus,
  GroupCode,
} from "./BillingPlan";

export type BillingListParams = {
  status?: BillingStatus;
  group?: GroupCode;
  owner?: string;
  search?: string;
  page?: number;
  pageSize?: number;
};

export type BillingListResult = {
  items: CaseBillingSummary[];
  total: number;
  summary: { totalDue: number; totalReceived: number; totalOutstanding: number; overdueAmount: number };
};

export type PaymentLogParams = {
  caseId?: string;
  page?: number;
  pageSize?: number;
};

export type BillingRepository = {
  listBillingCases(params: BillingListParams): Promise<BillingListResult>;
  listPaymentLogs(params: PaymentLogParams): Promise<{ items: PaymentLogEntry[]; total: number }>;
  getBillingPlan(caseId: string): Promise<BillingPlanNode[]>;
  registerPayment(caseId: string, input: RegisterPaymentInput): Promise<{ id: string }>;
  voidPayment(input: VoidPaymentInput): Promise<void>;
  /** 写入 Case 级 4 字段 + 生成 AuditLog(billing_risk_acknowledged) */
  acknowledgeRisk(caseId: string, ack: RiskAcknowledgement): Promise<void>;
  batchCreateCollectionTasks(caseIds: string[]): Promise<CollectionResult>;
};
```

### 1.3 常量与配置

| 原型来源 (`billing-config.js`) | 生产文件 | 导出 | 说明 |
|------|---------|------|------|
| `BILLING_STATUS_OPTIONS` | `domain/billing/billingConstants.ts` | `BILLING_STATUSES` | `{ value, label, tag }[]` |
| `NODE_STATUS_OPTIONS` | `domain/billing/billingConstants.ts` | `NODE_STATUSES` | `{ value, label }[]` |
| `PAYMENT_RECORD_STATUS` | `domain/billing/billingConstants.ts` | `PAYMENT_RECORD_STATUSES` | `{ value, label, tag }[]` |
| `TABLE_COLUMNS` | `domain/billing/billingConstants.ts` | `BILLING_TABLE_COLUMNS` | 表格列定义 schema |
| `PAYMENT_LOG_COLUMNS` | `domain/billing/billingConstants.ts` | `PAYMENT_LOG_COLUMNS` | 回款流水列定义 |
| `FILTERS` | `domain/billing/billingConstants.ts` | `BILLING_FILTERS` | 筛选器配置 |
| `PAYMENT_FORM_FIELDS` | `domain/billing/billingConstants.ts` | `PAYMENT_FORM_FIELDS` | 回款登记表单 schema |
| `PLAN_FORM_FIELDS` | `domain/billing/billingConstants.ts` | `PLAN_FORM_FIELDS` | 收费计划表单 schema |
| `BULK_ACTIONS` | `domain/billing/billingConstants.ts` | `BILLING_BULK_ACTIONS` | 批量操作定义 |
| `COLLECTION_SKIP_REASONS` | `domain/billing/billingConstants.ts` | `COLLECTION_SKIP_REASONS` | 催款跳过原因枚举 |
| `SEGMENTS` | `domain/billing/billingConstants.ts` | `BILLING_SEGMENTS` | 分段视图定义 |
| `DEFAULT_SORT` | `domain/billing/billingConstants.ts` | `DEFAULT_BILLING_SORT` | 默认排序规则 |
| `TOAST` | `domain/billing/billingConstants.ts` | `BILLING_TOAST_PRESETS` | Toast 文案预设 |
| `SEARCH_PLACEHOLDER` | `domain/billing/billingConstants.ts` | `BILLING_SEARCH_PLACEHOLDER` | 搜索框 placeholder |

### 1.4 Domain 层文件清单

```
domain/billing/
├── BillingPlan.ts                   ← 实体 & 值类型（含 RiskAcknowledgement, CaseBillingRiskFields）
├── BillingRepository.ts             ← 仓库接口（列表 + 回款 + 催款 + 风险确认）
└── billingConstants.ts              ← 常量、列定义、筛选配置、表单 schema

# 跨域依赖（billing 写入，case 读取）
domain/case/Case.ts                  ← 已有实体，扩展 CaseBillingRiskFields（4 字段）
domain/audit/AuditLog.ts             ← 已有实体，action_type 扩展 'billing_risk_acknowledged'
```

---

## 2. Data 层映射

| 原型来源 | 生产文件 | 导出 | 说明 |
|---------|---------|------|------|
| 案件收费列表（`billing-demo-data.js`） | `data/billing/BillingApi.ts` | `createBillingApi(deps)` | 调用 Server `/billing` 端点 |
| 回款流水列表 | `data/billing/BillingApi.ts` | 同上 | `/billing/payment-logs` 端点 |
| 收费计划 | `data/billing/BillingApi.ts` | 同上 | `/billing/plans` 端点 |
| 组合 | `data/billing/createBillingRepository.ts` | `createBillingRepository(deps)` | 实现 `BillingRepository` |

### Data 层文件清单

```
data/billing/
├── BillingApi.ts                        ← createBillingApi({ httpClient, baseUrl, getToken })
└── createBillingRepository.ts           ← 实现 BillingRepository
```

### App Container 注册

在 `app/container/AppContainer.ts` 新增：

```typescript
billingRepository: BillingRepository;
```

---

## 3. Features 层映射（model → ViewModel Hooks）

### 3.1 ViewModel 总览

| 原型脚本 | 生产 Hook | 状态 / 职责 |
|---------|-----------|------------|
| `billing-page.js` | `useBillingListViewModel` | 页面级编排：加载列表、分段视图切换、toast |
| `billing-filters.js` | `useBillingFilters` | 筛选/搜索状态、重置 |
| `billing-bulk-actions.js` | `useBillingBulkActions` | 选中项集合、全选/反选/清除、批量催款执行 |
| `billing-payment-modal.js` | `usePaymentModal` | 弹窗开关、表单值管理、BillingPlan 归集、金额校验、登记/更正提交 |
| `billing-risk-log.js` | `useRiskAckLog` | 风险确认数据加载与展示 |

### 3.2 映射详情

#### `billing-page.js` → `useBillingListViewModel`

```
原型函数/行为                       → Hook 暴露
─────────────────────────────────────────────────
DOMContentLoaded 初始化              → useEffect 首次加载
showToast(title, desc)              → toast state + show/dismiss
segmented control click             → activeSegment state ('billing-list' | 'payment-log')
摘要卡数据加载                       → summary state (totalDue/received/outstanding/overdue)
```

ViewState 定义：

```typescript
export type BillingListViewState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; cases: CaseBillingSummary[]; total: number; summary: BillingSummary }
  | { status: "error"; error: AppError };
```

#### `billing-filters.js` → `useBillingFilters`

```
原型函数                            → Hook 暴露
─────────────────────────────────────────────────
filter select change                → filterParams state
search input                        → search state + debounced change
reset filters button                → resetFilters()
```

#### `billing-bulk-actions.js` → `useBillingBulkActions`

```
原型函数                            → Hook 暴露
─────────────────────────────────────────────────
getSelectableCheckboxes()           → selectableIds: string[] (overdue only)
updateBulkState()                   → selectedIds, isAllSelected, isIndeterminate, selectedCount
selectAll / deselectAll             → toggleSelectAll()
toggle single checkbox              → toggleSelect(caseId)
clear                               → clearSelection()
batchCreateCollection apply         → createCollectionTasks() → repository + toast (三段式) + clear
bar visibility                      → showBulkBar (derived: selectedCount > 0)
```

#### `billing-payment-modal.js` → `usePaymentModal`

```
原型函数                            → Hook 暴露
─────────────────────────────────────────────────
openModal(mode) / closeModal()      → isOpen, mode ('register' | 'void'), open(payment?), close()
form field change                   → formValues (controlled state)
BillingPlan selector                → availableNodes, selectedNodeId
amount validation warning           → amountWarning (derived)
handleRegister / handleVoid         → submit() → repository.register/void + close + toast
```

#### `billing-risk-log.js` → `useRiskAckLog`

```
原型函数                            → Hook 暴露
─────────────────────────────────────────────────
renderRiskAck()                     → riskAck: RiskAcknowledgement | null, loadRiskAck(caseId)
showPanel()                         → isVisible state
closePanel()                        → hide()
—（原型无）                         → hasUnacknowledgedRisk: boolean（派生：Case 有欠款且 billing_risk_acknowledged_at 为空）
—（原型无）                         → confirmRisk(input) → repository.acknowledgeRisk(caseId, ack) → 写入 Case 4 字段 + AuditLog + toast
```

跨域依赖：
- 读取 `Case.billing_risk_acknowledged_*` 4 字段判断是否已确认
- Gate-C 提交前检查 `hasUnacknowledgedRisk`：若为 true 则提示用户先完成风险确认
- 确认后同时写入 Case 行（4 字段）和 AuditLog（`action_type: 'billing_risk_acknowledged'`）

### 3.3 Model 层文件清单

```
features/billing/model/
├── useBillingListViewModel.ts           ← 页面编排 Hook
├── useBillingFilters.ts                 ← 筛选 Hook
├── useBillingBulkActions.ts             ← 批量操作 Hook
├── usePaymentModal.ts                   ← 回款弹窗 Hook
├── useRiskAckLog.ts                     ← 风险确认展示 Hook
├── useBillingListViewModel.test.ts      ← 页面 ViewModel 测试
├── useBillingFilters.test.ts            ← 筛选测试
├── useBillingBulkActions.test.ts        ← 批量操作测试
├── usePaymentModal.test.ts              ← 回款弹窗测试
└── useRiskAckLog.test.ts                ← 风险确认测试
```

---

## 4. Features 层映射（ui → 页面组件）

### 4.1 页面组件总览

| 原型 section | 生产组件 | 所在路径 | Props（核心） |
|-------------|---------|---------|--------------|
| `sections/page-header.html` | `BillingListHeader` | `features/billing/ui/` | `onRegisterPayment` |
| `sections/summary-cards.html` | `BillingSummaryCards` | `features/billing/ui/` | `summary: { totalDue, totalReceived, totalOutstanding, overdueAmount }` |
| `sections/filters-toolbar.html` | `BillingListFilters` | `features/billing/ui/` | `filters`, `search`, `activeSegment`, `onFilterChange`, `onSearchChange`, `onSegmentChange`, `onReset` |
| `sections/billing-table.html` | `BillingTable` | `features/billing/ui/` | `cases`, `selectedIds`, `onToggleSelect`, `onRowClick`, `columns` |
| `sections/billing-table.html` 内 bulk bar | `BillingBulkActionBar` | `features/billing/ui/` | `selectedCount`, `onClear`, `onCreateCollectionTasks`, `isAllSelected`, `isIndeterminate`, `onToggleSelectAll` |
| `sections/payment-log-table.html` | `PaymentLogTable` | `features/billing/ui/` | `logs`, `columns`, `onVoid` |
| `sections/billing-plan-panel.html` | `BillingPlanPanel` | `features/billing/ui/` | `nodes`, `onConfigurePlan`, `onEditPlan`, `isEmpty` |
| `sections/payment-modal.html` | `PaymentModal` | `features/billing/ui/` | `isOpen`, `mode`, `formValues`, `availableNodes`, `amountWarning`, `onFieldChange`, `onSubmit`, `onClose` |
| `sections/risk-ack-panel.html` | `RiskAckPanel` | `features/billing/ui/` | `riskAck`, `hasUnacknowledgedRisk`, `onConfirmRisk`, `auditEntries` |
| `sections/collection-result-toast.html` (Toast) | `Toast` | `shared/ui/` | `title`, `description`, `visible`, `onDismiss` |
| 整页组装（`index.html`） | `BillingListScreen` | `features/billing/ui/` | 入口组件：组合上述子组件 + ViewModel Hooks |

### 4.2 原型 HTML 属性 → 组件 Props 对照

```
原型 DOM 钩子                        → 组件 Props / 事件
─────────────────────────────────────────────────────────
.btn-primary[登记回款] click         → BillingListHeader.onRegisterPayment
.segment-btn click                   → BillingListFilters.onSegmentChange(segmentId)
select[筛选] change                  → BillingListFilters.onFilterChange(key, value)
.search-input input                  → BillingListFilters.onSearchChange(text)
data-action="reset-filters" click    → BillingListFilters.onReset()
#selectAllBilling change             → BillingBulkActionBar.onToggleSelectAll()
data-billing-select change           → BillingTable.onToggleSelect(id)
billing row click                    → BillingTable.onRowClick(caseId)
#bulkClearBtn click                  → BillingBulkActionBar.onClear()
#bulkCollectionBtn click             → BillingBulkActionBar.onCreateCollectionTasks()
payment modal open/close             → PaymentModal.isOpen
modal field change                   → PaymentModal.onFieldChange(key, value)
modal submit                         → PaymentModal.onSubmit()
modal cancel                         → PaymentModal.onClose()
risk ack confirm                     → RiskAckPanel.onConfirmRisk()
#toast show                          → Toast.visible + title + description
```

### 4.3 UI 层文件清单

```
features/billing/ui/
├── BillingListScreen.tsx                ← 页面入口（组装所有子组件 + Hooks）
├── BillingListHeader.tsx                ← 标题 + 登记回款按钮
├── BillingSummaryCards.tsx              ← 4 张摘要卡
├── BillingListFilters.tsx               ← 筛选 + 搜索 + segmented control + 重置
├── BillingTable.tsx                     ← 案件收费表格
├── BillingBulkActionBar.tsx             ← 批量催款操作栏
├── PaymentLogTable.tsx                  ← 回款流水表格
├── BillingPlanPanel.tsx                 ← 收费计划面板
├── PaymentModal.tsx                     ← 登记回款/更正弹窗
└── RiskAckPanel.tsx                     ← 欠款风险确认面板
```

---

## 5. Shared 层映射

### 5.1 共享 UI 组件

| 原型来源 | 生产组件 | 所在路径 | 说明 |
|---------|---------|---------|------|
| `sections/collection-result-toast.html` | `Toast` | `shared/ui/Toast.tsx` | 全局 Toast（已存在，复用） |
| `shared/shell/side-nav.html` | `SideNav` | `shared/ui/SideNav.tsx` | 桌面侧边导航（已存在） |
| `shared/shell/topbar.html` | `TopBar` | `shared/ui/TopBar.tsx` | 顶部工具栏（已存在） |
| `shared/shell/mobile-nav.html` | `MobileNav` | `shared/ui/MobileNav.tsx` | 移动端抽屉导航（已存在） |
| `shared/shell/*.html` 组合 | `AppShell` | `shared/ui/AppShell.tsx` | 页面壳子（已存在） |

### 5.2 共享 Hook

| 原型来源 | 生产 Hook | 所在路径 | 说明 |
|---------|-----------|---------|------|
| `shared/scripts/mobile-nav.js` | `useMobileNav` | `shared/hooks/useMobileNav.ts` | `isOpen`, `open()`, `close()`, Escape 键 |
| `shared/scripts/navigate.js` | 不需要 | — | React Navigation 取代 |

### 5.3 共享样式

| 原型来源 | 生产去向 | 说明 |
|---------|---------|------|
| `shared/styles/tokens.css` | Design tokens → Tamagui theme config 或 `:root` CSS 变量 | 颜色、间距、圆角、字体 |
| `shared/styles/shell.css` | `AppShell`/`SideNav`/`TopBar`/`MobileNav` 内部样式 | 布局网格、导航动画 |
| `shared/styles/components.css` | 各 `shared/ui` 组件内部样式 | 按钮、卡片、表格、弹窗、表单、badge |

---

## 6. 完整文件树总览

```
packages/mobile/src/
│
├── domain/billing/
│   ├── BillingPlan.ts                     ← 实体 & 值类型
│   ├── BillingRepository.ts               ← 仓库接口（列表 + 回款 + 催款 + 风险确认）
│   └── billingConstants.ts                ← 列定义 / 筛选配置 / 表单 schema / Toast 预设
│
├── data/billing/
│   ├── BillingApi.ts                      ← HTTP 端点调用
│   └── createBillingRepository.ts         ← 实现 BillingRepository
│
├── features/billing/
│   ├── model/
│   │   ├── useBillingListViewModel.ts
│   │   ├── useBillingFilters.ts
│   │   ├── useBillingBulkActions.ts
│   │   ├── usePaymentModal.ts
│   │   ├── useRiskAckLog.ts
│   │   └── *.test.ts
│   └── ui/
│       ├── BillingListScreen.tsx          ← 页面入口
│       ├── BillingListHeader.tsx
│       ├── BillingSummaryCards.tsx
│       ├── BillingListFilters.tsx
│       ├── BillingTable.tsx
│       ├── BillingBulkActionBar.tsx
│       ├── PaymentLogTable.tsx
│       ├── BillingPlanPanel.tsx
│       ├── PaymentModal.tsx
│       └── RiskAckPanel.tsx
│
├── shared/
│   ├── ui/
│   │   ├── Toast.tsx                      ← 复用（已存在）
│   │   ├── AppShell.tsx                   ← 复用
│   │   ├── SideNav.tsx                    ← 复用
│   │   ├── TopBar.tsx                     ← 复用
│   │   └── MobileNav.tsx                  ← 复用
│   └── hooks/
│       └── useMobileNav.ts               ← 复用
│
└── app/container/
    └── AppContainer.ts                    ← 新增 billingRepository
```

---

## 7. 迁移顺序建议

| 阶段 | 范围 | 前置条件 |
|------|------|---------|
| **M1** | `domain/billing/` 全部文件 | 无（纯类型，可独立提交） |
| **M2** | `data/billing/` + AppContainer 注册 | M1 + Server 端 Billing API 就绪 |
| **M3** | `features/billing/model/` 五个 Hook + 测试 | M1 + M2 |
| **M4** | `features/billing/ui/` 全部页面组件 | M3 + shared/ui 已就绪 |
| **M5** | 路由注册 + 集成测试 | M4 |

---

## 8. 原型 → 生产差异备忘

| 原型行为 | 生产变化 | 原因 |
|---------|---------|------|
| `window.__billingPage` 全局命名空间 | ES module `import` + DI container | 消除全局状态 |
| `onclick` / `data-action` 事件 | React 事件 prop（`onPress`, `onChange`） | 框架层事件系统 |
| DOM ID 耦合（`#bulkActionBar`, `#toast`） | Props 驱动 + state 控制可见性 | 声明式 UI |
| CSS class 切换（`.active`, `data-segment-active`） | State 驱动 + 动画库 | 响应式状态管理 |
| Segmented control 切换视图 | `activeSegment` state | Hook 管理 |
| 筛选/搜索 DOM 操作 | Hook 中完整实现筛选、搜索、debounce | 原型遗留缺口 |
| 静态 4 条收费行 | API 动态数据 + 空状态处理 | 真实数据源 |
| 回款流水硬编码 | API 动态数据 + 分页 | 真实数据源 |
| 摘要卡金额硬编码 | API 聚合查询或 viewModel 派生 | 真实数据源 |
| 收费计划面板硬编码 | API 数据 | 真实数据源 |
| 批量催款无真实去重 | `case_id + billing_plan_id + overdue_cycle_start` 去重 | P0-CONTRACT §15.4 |
| 风险确认仅展示 | 调用 API 写入 Case 级 4 字段（`billing_risk_acknowledged_by/at/reason_code/reason_note`）+ AuditLog（`action_type: 'billing_risk_acknowledged'`）；Gate-C 提交前检查是否已确认 | P0-CONTRACT §13, [03 §4.3](../../../../docs/gyoseishoshi_saas_md/P0/03-业务规则与不变量.md#43-三道-gate), [07 §3.5](../../../../docs/gyoseishoshi_saas_md/P0/07-数据模型设计.md#35-case案件) |
| 状态枚举命名不一致 | 统一使用 `overdue/paid/partial/due` | P0-CONTRACT §9.4 |
| 无权限控制 | 基于角色的 canEdit/canView 判断 | P0-CONTRACT §18 |

---

## 9. 跨模块映射关系

收费模块与以下模块存在数据/交互依赖：

| 关联模块 | 交互点 | 原型体现 | 生产接口 |
|---------|--------|---------|---------|
| Case（案件详情收费 Tab） | `case-detail-config.js` 中的 `BILLING_STATUS` 枚举 | 状态命名需对齐 | `domain/billing/BillingPlan.ts` 中的 `BillingStatus` 类型共享 |
| Case（欠款风险留痕字段） | `case-detail-config.js` 中 `riskConfirmationRecord` | 风险确认后回写 Case 行 | Case 实体 4 字段：`billing_risk_acknowledged_by/at/reason_code/reason_note`（[07 §3.5](../../../../docs/gyoseishoshi_saas_md/P0/07-数据模型设计.md#35-case案件)）；billing feature 通过 `BillingRepository.acknowledgeRisk` 写入，case feature 读取展示 |
| Case（Gate-C 提交前检查） | Gate-C 软性提示项之一 | 原型在 `case-detail-config.js` validation.warnings 中体现 | Gate-C 执行时读取 `Case.billing_risk_acknowledged_at`：若有欠款但未确认则报 warning；确认后允许生成 SubmissionPackage（[03 §4.3](../../../../docs/gyoseishoshi_saas_md/P0/03-业务规则与不变量.md#43-三道-gate)） |
| Dashboard（仪表盘待回款卡） | `dashboard-config.js` 中的 `pendingBilling` 入口 | "登记回款"文案 | 仪表盘组件引用 `BILLING_SEARCH_PLACEHOLDER` 或直接路由 |
| Dashboard（未确认欠款风险聚合） | 仪表盘风险案件聚合 | 无原型体现 | 工作台应将 `billing_risk_acknowledged_at IS NULL` 且有欠款的案件聚合为风险案件并提示补录（[03 §6](../../../../docs/gyoseishoshi_saas_md/P0/03-业务规则与不变量.md#6-收费与欠款策略)） |
| Task（催款任务） | 催款任务生成、去重 | 无原型体现 | `domain/task/Task.ts` 中 `source_type: 'billing'` + `source_key` |
| AuditLog（审计日志） | 回款登记/作废/风险确认留痕 | 原型 `DEMO_AUDIT_LOG` 含 `risk-acknowledged` 事件 | `AuditLog` 实体，`action_type` 含 billing 相关事件（见下表） |

### 9.1 收费模块审计事件映射

| 原型 demo 事件 | 生产 `action_type` | `object_type` | `before_data` / `after_data` 内容 |
|---------------|-------------------|---------------|----------------------------------|
| `risk-acknowledged` | `billing_risk_acknowledged` | `case` | before: 4 个 risk 字段旧值（首次为 null）；after: `acknowledged_by`, `acknowledged_at`, `reason_code`, `reason_note` |
| `payment-logged` | `billing_payment_created` | `payment_record` | after: `amount`, `date`, `billing_plan_id`, `case_id`, `operator` |
| `payment-voided` | `billing_payment_voided` | `payment_record` | before: 原记录；after: `void_reason_code`, `voided_by`, `voided_at` |
| `payment-reversed` | `billing_payment_reversed` | `payment_record` | before: 原记录；after: `reversed_from_payment_record_id`, `void_reason_code` |
| `collection-created` | `billing_collection_task_created` | `task` | after: `case_id`, `billing_plan_id`, `task_id`, `assignee` |

### 9.2 欠款风险确认页面入口汇总

| 入口 | 页面 | 触发时机 | UI 组件 |
|------|------|---------|---------|
| 财务主页风险确认面板 | `billing/index.html` | 查看按钮 `[data-action="view-risk-ack"]` | `RiskAckPanel`（展示已确认记录 + 审计日志） |
| 案件详情收费 Tab | `case/detail.html` 收费 Tab | 案件有欠款时展示风险确认入口 | `RiskAckPanel`（确认操作 + 展示） |
| Gate-C 提交流程 | `case/detail.html` 校验与提交 Tab | 提交时检测到未确认欠款风险 | Gate-C warning 提示 + 跳转至收费 Tab 风险确认面板 |
| 仪表盘风险案件卡 | `dashboard/index.html` | 聚合未确认欠款案件 | 卡片行动作跳转到对应案件收费 Tab |
