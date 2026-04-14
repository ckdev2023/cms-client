/**
 * 收费模块核心类型 — T02 冻结，后续并行任务只读引用。
 *
 * 枚举 key 以数据模型 §3.20 为权威（overdue/paid/partial/due）。
 * 枚举 label 以 P0 规格 §5.2 为权威（逾期/已结清/部分回款/未回款）。
 */

// ---------------------------------------------------------------------------
// 枚举 & 联合类型
// ---------------------------------------------------------------------------

/**
 *
 */
export type BillingStatus = "overdue" | "paid" | "partial" | "due";

/**
 *
 */
export type NodeStatus = "due" | "partial" | "paid" | "overdue";

/**
 *
 */
export type PaymentRecordStatus = "valid" | "voided" | "reversed";

/**
 *
 */
export type CollectionSkipReasonCode =
  | "no-permission"
  | "duplicate-task"
  | "not-overdue"
  | "no-assignee"
  | "system-error";

/**
 *
 */
export type GroupCode = "tokyo-1" | "tokyo-2" | "osaka";

/**
 *
 */
export type BillingSegment = "billing-list" | "payment-log";

/**
 *
 */
export type GateEffectMode = "off" | "warn";

// ---------------------------------------------------------------------------
// 筛选
// ---------------------------------------------------------------------------

/**
 *
 */
export type BillingStatusFilter = "" | BillingStatus;
/**
 *
 */
export type BillingGroupFilter = "" | string;
/**
 *
 */
export type BillingOwnerFilter = "" | string;

/**
 *
 */
export interface BillingFiltersState {
  /**
   *
   */
  status: BillingStatusFilter;
  /**
   *
   */
  group: BillingGroupFilter;
  /**
   *
   */
  owner: BillingOwnerFilter;
  /**
   *
   */
  search: string;
}

// ---------------------------------------------------------------------------
// 摘要卡
// ---------------------------------------------------------------------------

/**
 *
 */
export type SummaryCardVariant = "default" | "primary" | "danger";

/**
 *
 */
export interface BillingSummaryCardDef {
  /**
   *
   */
  id: string;
  /**
   *
   */
  labelKey: string;
  /**
   *
   */
  key: keyof BillingSummaryData;
  /**
   *
   */
  variant: SummaryCardVariant;
}

/**
 *
 */
export interface BillingSummaryData {
  /**
   *
   */
  totalDue: number;
  /**
   *
   */
  totalReceived: number;
  /**
   *
   */
  totalOutstanding: number;
  /**
   *
   */
  overdueAmount: number;
}

// ---------------------------------------------------------------------------
// 案件收费列表行
// ---------------------------------------------------------------------------

/**
 *
 */
export interface BillingNextNode {
  /**
   *
   */
  name: string;
  /**
   *
   */
  dueDate: string;
  /**
   *
   */
  amount?: number;
  /**
   *
   */
  overdueDays?: number;
}

/**
 *
 */
export interface CaseBillingRow {
  /**
   *
   */
  id: string;
  /**
   *
   */
  caseName: string;
  /**
   *
   */
  caseNo: string;
  /**
   *
   */
  client: {
    /**
     *
     */
    name: string; /**
     *
     */
    type: string;
  };
  /**
   *
   */
  group: GroupCode;
  /**
   *
   */
  owner: string;
  /**
   *
   */
  amountDue: number;
  /**
   *
   */
  amountReceived: number;
  /**
   *
   */
  amountOutstanding: number;
  /**
   *
   */
  status: BillingStatus;
  /**
   *
   */
  nextNode: BillingNextNode | null;
}

// ---------------------------------------------------------------------------
// 回款流水
// ---------------------------------------------------------------------------

/**
 *
 */
export interface PaymentLogEntry {
  /**
   *
   */
  id: string;
  /**
   *
   */
  date: string;
  /**
   *
   */
  caseNo: string;
  /**
   *
   */
  caseName: string;
  /**
   *
   */
  amount: number;
  /**
   *
   */
  node: string;
  /**
   *
   */
  receipt: boolean;
  /**
   *
   */
  recordStatus: PaymentRecordStatus;
  /**
   *
   */
  operator: string;
  /**
   *
   */
  note: string;
}

// ---------------------------------------------------------------------------
// 收费计划节点
// ---------------------------------------------------------------------------

/**
 *
 */
export interface BillingPlanNode {
  /**
   *
   */
  id: string;
  /**
   *
   */
  name: string;
  /**
   *
   */
  amount: number;
  /**
   *
   */
  dueDate: string;
  /**
   *
   */
  status: NodeStatus;
}

/**
 *
 */
export interface BillingPlanDetail {
  /**
   *
   */
  billingId: string;
  /**
   *
   */
  caseNo: string;
  /**
   *
   */
  caseName: string;
  /**
   *
   */
  totalDue: number;
  /**
   *
   */
  totalReceived: number;
  /**
   *
   */
  totalOutstanding: number;
  /**
   *
   */
  nodes: BillingPlanNode[];
  /**
   *
   */
  nextNode: BillingNextNode | null;
}

// ---------------------------------------------------------------------------
// 登记回款弹窗
// ---------------------------------------------------------------------------

/**
 *
 */
export interface RegisterPaymentFormFields {
  /**
   *
   */
  amount: string;
  /**
   *
   */
  date: string;
  /**
   *
   */
  billingPlanId: string;
  /**
   *
   */
  receipt: string;
  /**
   *
   */
  note: string;
}

// ---------------------------------------------------------------------------
// 批量催款结果
// ---------------------------------------------------------------------------

/**
 *
 */
export interface CollectionResultDetail {
  /**
   *
   */
  caseNo: string;
  /**
   *
   */
  result: "success" | "skipped" | "failed";
  /**
   *
   */
  reason?: CollectionSkipReasonCode;
  /**
   *
   */
  taskId?: string;
}

/**
 *
 */
export interface CollectionResult {
  /**
   *
   */
  success: number;
  /**
   *
   */
  skipped: number;
  /**
   *
   */
  failed: number;
  /**
   *
   */
  details: CollectionResultDetail[];
}

// ---------------------------------------------------------------------------
// 风险确认
// ---------------------------------------------------------------------------

/**
 *
 */
export interface RiskAcknowledgement {
  /**
   *
   */
  confirmedBy: string;
  /**
   *
   */
  confirmedAt: string;
  /**
   *
   */
  reasonCode: string;
  /**
   *
   */
  reasonNote: string;
  /**
   *
   */
  receipt: boolean;
  /**
   *
   */
  amount: number;
  /**
   *
   */
  caseNo: string;
  /**
   *
   */
  caseName: string;
}

// ---------------------------------------------------------------------------
// 通用选项
// ---------------------------------------------------------------------------

/**
 *
 */
export interface SelectOption {
  /**
   *
   */
  value: string;
  /**
   *
   */
  label: string;
}

/**
 *
 */
export interface StatusOption extends SelectOption {
  /**
   *
   */
  badge: string;
}
