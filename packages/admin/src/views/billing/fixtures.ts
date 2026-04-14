/**
 * 收费模块 fixtures — T02 冻结，后续并行任务只读引用。
 *
 * 数据来源：prototype/admin/billing/data/billing-demo-data.js + billing-config.js
 * 覆盖全部 4 种回款状态：overdue / partial / due / paid
 */
import type {
  BillingPlanDetail,
  BillingSegment,
  BillingSummaryCardDef,
  BillingSummaryData,
  CaseBillingRow,
  CollectionResult,
  PaymentLogEntry,
  RiskAcknowledgement,
  SelectOption,
  StatusOption,
} from "./types";
import { getActiveGroupOptions } from "../../shared/model/useGroupOptions";

// ---------------------------------------------------------------------------
// 状态选项（枚举 + 样式映射）
// ---------------------------------------------------------------------------

export const BILLING_STATUS_OPTIONS: StatusOption[] = [
  { value: "paid", label: "billing.list.status.paid", badge: "tag-green" },
  { value: "partial", label: "billing.list.status.partial", badge: "tag-blue" },
  { value: "due", label: "billing.list.status.due", badge: "tag-orange" },
  { value: "overdue", label: "billing.list.status.overdue", badge: "tag-red" },
];

export const NODE_STATUS_OPTIONS: StatusOption[] = [
  { value: "due", label: "应收", badge: "tag-orange" },
  { value: "partial", label: "部分回款", badge: "tag-blue" },
  { value: "paid", label: "已结清", badge: "tag-green" },
  { value: "overdue", label: "逾期", badge: "tag-red" },
];

export const PAYMENT_RECORD_STATUS_OPTIONS: StatusOption[] = [
  { value: "valid", label: "有效", badge: "tag-green" },
  { value: "voided", label: "已作废", badge: "tag-red" },
  { value: "reversed", label: "已冲正", badge: "tag-orange" },
];

// ---------------------------------------------------------------------------
// Group / Owner 选项
// ---------------------------------------------------------------------------

export const GROUP_OPTIONS: SelectOption[] = getActiveGroupOptions();

export const OWNER_OPTIONS: (SelectOption & {
  /**
   *
   */
  initials: string;
})[] = [
  { value: "admin", label: "Admin", initials: "AD" },
  { value: "suzuki", label: "Suzuki", initials: "SZ" },
  { value: "tanaka", label: "Tanaka", initials: "TN" },
];

// ---------------------------------------------------------------------------
// 催款跳过原因
// ---------------------------------------------------------------------------

export const COLLECTION_SKIP_REASON_OPTIONS: SelectOption[] = [
  { value: "no-permission", label: "无权限" },
  {
    value: "duplicate-task",
    label: "已存在未完成催款任务（同案同节点同逾期周期）",
  },
  {
    value: "not-overdue",
    label: "不满足逾期条件（节点已结清或到期日未到）",
  },
  {
    value: "no-assignee",
    label: "无可用负责人（案件负责人缺失且 Group 未配置默认负责人）",
  },
  { value: "system-error", label: "创建失败（系统错误/并发冲突）" },
];

// ---------------------------------------------------------------------------
// 分段视图
// ---------------------------------------------------------------------------

export const BILLING_SEGMENTS: {
  /**
   *
   */
  id: BillingSegment; /**
   *
   */
  labelKey: string;
}[] = [
  { id: "billing-list", labelKey: "billing.list.segments.billingList" },
  { id: "payment-log", labelKey: "billing.list.segments.paymentLog" },
];

// ---------------------------------------------------------------------------
// 摘要卡定义
// ---------------------------------------------------------------------------

export const SUMMARY_CARD_DEFS: BillingSummaryCardDef[] = [
  {
    id: "totalDue",
    labelKey: "billing.list.summary.totalDue",
    key: "totalDue",
    variant: "default",
  },
  {
    id: "totalReceived",
    labelKey: "billing.list.summary.totalReceived",
    key: "totalReceived",
    variant: "default",
  },
  {
    id: "totalOutstanding",
    labelKey: "billing.list.summary.totalOutstanding",
    key: "totalOutstanding",
    variant: "primary",
  },
  {
    id: "overdueAmount",
    labelKey: "billing.list.summary.overdueAmount",
    key: "overdueAmount",
    variant: "danger",
  },
];

// ---------------------------------------------------------------------------
// 案件收费列表行 — 覆盖 overdue / partial / due / paid / partial(COE)
// ---------------------------------------------------------------------------

export const SAMPLE_BILLING_ROWS: CaseBillingRow[] = [
  {
    id: "bill-002",
    caseName: "技术人文国际 新规",
    caseNo: "CAS-2026-0191",
    client: { name: "Global Tech KK", type: "企业" },
    group: "tokyo-1",
    owner: "admin",
    amountDue: 500000,
    amountReceived: 0,
    amountOutstanding: 500000,
    status: "overdue",
    nextNode: {
      name: "首付款 (100%)",
      dueDate: "已逾期 5 天 (2026-04-04)",
      overdueDays: 5,
    },
  },
  {
    id: "bill-001",
    caseName: "高度人才 (HSP) 申请",
    caseNo: "CAS-2026-0181",
    client: { name: "Michael T.", type: "个人" },
    group: "tokyo-1",
    owner: "suzuki",
    amountDue: 350000,
    amountReceived: 175000,
    amountOutstanding: 175000,
    status: "partial",
    nextNode: { name: "尾款 (50%)", dueDate: "申请获批后 7 天内" },
  },
  {
    id: "bill-004",
    caseName: "就劳签证 变更",
    caseNo: "CAS-2026-0204",
    client: { name: "Li M.", type: "个人" },
    group: "osaka",
    owner: "tanaka",
    amountDue: 120000,
    amountReceived: 0,
    amountOutstanding: 120000,
    status: "due",
    nextNode: { name: "全款 (100%)", dueDate: "资料收集齐后 3 天内" },
  },
  {
    id: "bill-003",
    caseName: "家族滞在签证 续签",
    caseNo: "CAS-2026-0156",
    client: { name: "Sarah W.", type: "个人" },
    group: "tokyo-2",
    owner: "suzuki",
    amountDue: 80000,
    amountReceived: 80000,
    amountOutstanding: 0,
    status: "paid",
    nextNode: null,
  },
  {
    id: "bill-005",
    caseName: "技术人文国际 新規 (COE)",
    caseNo: "CAS-2026-0215",
    client: { name: "王建国", type: "个人" },
    group: "tokyo-1",
    owner: "admin",
    amountDue: 600000,
    amountReceived: 300000,
    amountOutstanding: 300000,
    status: "partial",
    nextNode: { name: "尾款 (COE下発後)", dueDate: "结果获批后 7 天内" },
  },
];

// ---------------------------------------------------------------------------
// 摘要统计
// ---------------------------------------------------------------------------

export const SAMPLE_SUMMARY: BillingSummaryData = {
  totalDue: 1650000,
  totalReceived: 555000,
  totalOutstanding: 1095000,
  overdueAmount: 500000,
};

// ---------------------------------------------------------------------------
// 回款流水 — 覆盖 valid / voided / reversed
// ---------------------------------------------------------------------------

export const SAMPLE_PAYMENT_LOGS: PaymentLogEntry[] = [
  {
    id: "pay-001",
    date: "2026/04/01",
    caseNo: "CAS-2026-0181",
    caseName: "高度人才 (HSP) 申请",
    amount: 175000,
    node: "着手金 (50%)",
    receipt: true,
    recordStatus: "valid",
    operator: "Admin",
    note: "",
  },
  {
    id: "pay-002",
    date: "2026/03/25",
    caseNo: "CAS-2026-0156",
    caseName: "家族滞在签证 续签",
    amount: 80000,
    node: "全款 (100%)",
    receipt: false,
    recordStatus: "valid",
    operator: "Suzuki",
    note: "",
  },
  {
    id: "pay-003",
    date: "2026/03/20",
    caseNo: "CAS-2026-0181",
    caseName: "高度人才 (HSP) 申请",
    amount: 30000,
    node: "着手金 (50%)",
    receipt: false,
    recordStatus: "voided",
    operator: "Admin",
    note: "金额录入错误，已作废",
  },
  {
    id: "pay-004",
    date: "2026/03/18",
    caseNo: "CAS-2026-0156",
    caseName: "家族滞在签证 续签",
    amount: 80000,
    node: "全款 (100%)",
    receipt: true,
    recordStatus: "reversed",
    operator: "Suzuki",
    note: "重复入账，已冲正 → pay-002",
  },
  {
    id: "pay-005",
    date: "2026/03/15",
    caseNo: "CAS-2026-0215",
    caseName: "技术人文国际 新規 (COE)",
    amount: 300000,
    node: "着手金 (签约时)",
    receipt: true,
    recordStatus: "valid",
    operator: "Admin",
    note: "",
  },
];

// ---------------------------------------------------------------------------
// 收费计划 — 按 billing row ID 索引
// ---------------------------------------------------------------------------

export const SAMPLE_BILLING_PLANS: Record<string, BillingPlanDetail> = {
  "bill-001": {
    billingId: "bill-001",
    caseNo: "CAS-2026-0181",
    caseName: "高度人才 (HSP) 申请",
    totalDue: 350000,
    totalReceived: 175000,
    totalOutstanding: 175000,
    nodes: [
      {
        id: "node-001",
        name: "着手金 (50%)",
        amount: 175000,
        dueDate: "2026/04/01",
        status: "paid",
      },
      {
        id: "node-002",
        name: "尾款 (50%)",
        amount: 175000,
        dueDate: "申请获批后 7 天内",
        status: "due",
      },
    ],
    nextNode: { name: "尾款 (50%)", dueDate: "申请获批后 7 天内" },
  },
  "bill-002": {
    billingId: "bill-002",
    caseNo: "CAS-2026-0191",
    caseName: "技术人文国际 新规",
    totalDue: 500000,
    totalReceived: 0,
    totalOutstanding: 500000,
    nodes: [
      {
        id: "node-003",
        name: "首付款 (100%)",
        amount: 500000,
        dueDate: "2026/04/04",
        status: "overdue",
      },
    ],
    nextNode: {
      name: "首付款 (100%)",
      dueDate: "已逾期 5 天 (2026-04-04)",
    },
  },
  "bill-003": {
    billingId: "bill-003",
    caseNo: "CAS-2026-0156",
    caseName: "家族滞在签证 续签",
    totalDue: 80000,
    totalReceived: 80000,
    totalOutstanding: 0,
    nodes: [
      {
        id: "node-004",
        name: "全款 (100%)",
        amount: 80000,
        dueDate: "2026/03/25",
        status: "paid",
      },
    ],
    nextNode: null,
  },
  "bill-004": {
    billingId: "bill-004",
    caseNo: "CAS-2026-0204",
    caseName: "就劳签证 变更",
    totalDue: 120000,
    totalReceived: 0,
    totalOutstanding: 120000,
    nodes: [
      {
        id: "node-005",
        name: "全款 (100%)",
        amount: 120000,
        dueDate: "资料收集齐后 3 天内",
        status: "due",
      },
    ],
    nextNode: { name: "全款 (100%)", dueDate: "资料收集齐后 3 天内" },
  },
  "bill-005": {
    billingId: "bill-005",
    caseNo: "CAS-2026-0215",
    caseName: "技术人文国际 新規 (COE)",
    totalDue: 600000,
    totalReceived: 300000,
    totalOutstanding: 300000,
    nodes: [
      {
        id: "node-006",
        name: "着手金 (签约时)",
        amount: 300000,
        dueDate: "2026/03/15",
        status: "paid",
      },
      {
        id: "node-007",
        name: "尾款 (COE下発後)",
        amount: 300000,
        dueDate: "结果获批后 7 天内",
        status: "due",
      },
    ],
    nextNode: { name: "尾款 (COE下発後)", dueDate: "结果获批后 7 天内" },
  },
};

// ---------------------------------------------------------------------------
// 风险确认记录
// ---------------------------------------------------------------------------

export const SAMPLE_RISK_ACK: RiskAcknowledgement = {
  confirmedBy: "Manager",
  confirmedAt: "2026/04/08 09:00",
  reasonCode: "客户承诺本周内付清",
  reasonNote: "因期限紧迫优先提交",
  receipt: false,
  amount: 120000,
  caseNo: "CAS-2026-0204",
  caseName: "就劳签证 变更",
};

// ---------------------------------------------------------------------------
// 批量催款结果
// ---------------------------------------------------------------------------

export const SAMPLE_COLLECTION_RESULT: CollectionResult = {
  success: 1,
  skipped: 1,
  failed: 0,
  details: [
    { caseNo: "CAS-2026-0191", result: "success", taskId: "TSK-0099" },
    { caseNo: "CAS-2026-0204", result: "skipped", reason: "not-overdue" },
  ],
};

// ---------------------------------------------------------------------------
// 默认排序优先级
// ---------------------------------------------------------------------------

export const DEFAULT_SORT_PRIORITY: Record<string, number> = {
  overdue: 0,
  partial: 1,
  due: 2,
  paid: 3,
};
