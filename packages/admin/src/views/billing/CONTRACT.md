# Billing 模块边界契约

> T02 产出 — 定义 T03/T04/T05 各自允许触碰的组件和 hooks，防止并行任务文件冲突。

## 冻结文件（任何并行任务不可修改）

| 文件                  | 冻结内容                 |
| --------------------- | ------------------------ |
| `types.ts`            | 全部类型定义             |
| `fixtures.ts`         | 全部 demo 数据与选项常量 |
| `BillingListView.vue` | 总装壳（T06 最终替换）   |
| `CONTRACT.md`         | 本文档                   |

## T03 — 摘要卡与筛选区

### 允许修改

| 文件                                 | 范围             |
| ------------------------------------ | ---------------- |
| `components/BillingSummaryCards.vue` | 完整实现         |
| `components/BillingFilters.vue`      | 完整实现         |
| `model/useBillingFilters.ts`         | 完善筛选逻辑细节 |

### 只读引用

- `types.ts` — 导入 `BillingFiltersState`, `BillingSummaryData`, `BillingSummaryCardDef`, `BillingSegment`, `SelectOption`, `StatusOption`
- `fixtures.ts` — 导入 `BILLING_STATUS_OPTIONS`, `GROUP_OPTIONS`, `OWNER_OPTIONS`, `BILLING_SEGMENTS`, `SUMMARY_CARD_DEFS`, `SAMPLE_SUMMARY`, `SAMPLE_BILLING_ROWS`

### 禁止触碰

- `components/BillingTable.vue`
- `components/BillingBulkActionBar.vue`
- `components/PaymentLogTable.vue`
- `components/PaymentModal.vue`
- `model/useBillingSelection.ts`
- `model/usePaymentModal.ts`
- `model/useRiskAckLog.ts`

---

## T04 — 主表格与批量催款

### 允许修改

| 文件                                  | 范围             |
| ------------------------------------- | ---------------- |
| `components/BillingTable.vue`         | 完整实现         |
| `components/BillingBulkActionBar.vue` | 完整实现         |
| `components/BillingPagination.vue`    | 完整实现         |
| `model/useBillingSelection.ts`        | 完善选择逻辑细节 |

### 只读引用

- `types.ts` — 导入 `CaseBillingRow`, `BillingStatus`, `BillingNextNode`, `CollectionResult`, `CollectionSkipReasonCode`, `StatusOption`
- `fixtures.ts` — 导入 `SAMPLE_BILLING_ROWS`, `BILLING_STATUS_OPTIONS`, `COLLECTION_SKIP_REASON_OPTIONS`, `SAMPLE_COLLECTION_RESULT`, `DEFAULT_SORT_PRIORITY`

### 禁止触碰

- `components/BillingSummaryCards.vue`
- `components/BillingFilters.vue`
- `components/PaymentLogTable.vue`
- `components/PaymentModal.vue`
- `model/useBillingFilters.ts`
- `model/usePaymentModal.ts`
- `model/useRiskAckLog.ts`

---

## T05 — 回款流水与登记回款弹窗

### 允许修改

| 文件                             | 范围                 |
| -------------------------------- | -------------------- |
| `components/PaymentLogTable.vue` | 完整实现             |
| `components/PaymentModal.vue`    | 完整实现             |
| `components/BillingToast.vue`    | 完整实现             |
| `model/usePaymentModal.ts`       | 完善弹窗逻辑细节     |
| `model/useBillingToast.ts`       | 完善 toast 逻辑细节  |
| `model/useRiskAckLog.ts`         | 完善风险确认逻辑细节 |

### 只读引用

- `types.ts` — 导入 `PaymentLogEntry`, `PaymentRecordStatus`, `RegisterPaymentFormFields`, `BillingPlanNode`, `RiskAcknowledgement`, `StatusOption`
- `fixtures.ts` — 导入 `SAMPLE_PAYMENT_LOGS`, `SAMPLE_BILLING_PLANS`, `SAMPLE_RISK_ACK`, `PAYMENT_RECORD_STATUS_OPTIONS`, `NODE_STATUS_OPTIONS`

### 禁止触碰

- `components/BillingSummaryCards.vue`
- `components/BillingFilters.vue`
- `components/BillingTable.vue`
- `components/BillingBulkActionBar.vue`
- `model/useBillingFilters.ts`
- `model/useBillingSelection.ts`

---

## T06 — 页面总装与路由替换

T06 是唯一允许修改 `BillingListView.vue` 的任务。同时负责：

- 替换 `packages/admin/src/router/index.ts` 中的 billing 路由占位
- 将 T03/T04/T05 的组件和 hooks 装配到总装壳中
- 确认所有组件能正确组合和渲染

---

## 目录结构总览

```
packages/admin/src/views/billing/
├── BillingListView.vue          # 总装壳（T02 创建, T06 最终装配）
├── types.ts                     # 核心类型（T02 冻结）
├── fixtures.ts                  # Demo 数据（T02 冻结）
├── CONTRACT.md                  # 本文档（T02 冻结）
├── components/
│   ├── BillingSummaryCards.vue   # T03
│   ├── BillingFilters.vue       # T03
│   ├── BillingTable.vue         # T04
│   ├── BillingBulkActionBar.vue # T04
│   ├── BillingPagination.vue    # T04
│   ├── PaymentLogTable.vue      # T05
│   ├── PaymentModal.vue         # T05
│   └── BillingToast.vue         # T05
└── model/
    ├── useBillingFilters.ts     # T03
    ├── useBillingSelection.ts   # T04
    ├── useBillingToast.ts       # T05
    ├── usePaymentModal.ts       # T05
    └── useRiskAckLog.ts         # T05
```
