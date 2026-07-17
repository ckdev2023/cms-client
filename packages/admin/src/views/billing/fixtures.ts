/**
 * 收费模块配置常量。
 *
 * SAMPLE_* 数据已删除，列表/流水数据由 BillingRepository hooks 提供。
 * OWNER_OPTIONS 已删除，负责人选项由 useOwnerOptions 提供（单源）。
 */
import type {
  BillingSegment,
  BillingSummaryCardDef,
  StatusOption,
} from "./types";

// ---------------------------------------------------------------------------
// 状态选项（枚举 + 样式映射）
// ---------------------------------------------------------------------------

export const BILLING_STATUS_OPTIONS: StatusOption[] = [
  { value: "paid", label: "billing.list.status.paid", badge: "tag-green" },
  { value: "partial", label: "billing.list.status.partial", badge: "tag-blue" },
  { value: "due", label: "billing.list.status.due", badge: "tag-orange" },
  { value: "overdue", label: "billing.list.status.overdue", badge: "tag-red" },
];

// ---------------------------------------------------------------------------
// 催款跳过原因
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// 分段视图
// ---------------------------------------------------------------------------

export const BILLING_SEGMENTS: {
  /**
   *
   */
  id: BillingSegment;
  /**
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
// 默认排序优先级
// ---------------------------------------------------------------------------
