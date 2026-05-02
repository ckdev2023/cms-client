/**
 * 收费模块配置常量。
 *
 * SAMPLE_* 数据已删除，列表/流水数据由 BillingRepository hooks 提供。
 * OWNER_OPTIONS 已删除，负责人选项由 useOwnerOptions 提供（单源）。
 */
import type {
  BillingSegment,
  BillingSummaryCardDef,
  SelectOption,
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
// 催款跳过原因
// ---------------------------------------------------------------------------

export const COLLECTION_SKIP_REASON_OPTIONS: SelectOption[] = [
  { value: "no-permission", label: "无权限" },
  { value: "case-not-found", label: "案件不存在或已删除" },
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

export const DEFAULT_SORT_PRIORITY: Record<string, number> = {
  overdue: 0,
  partial: 1,
  due: 2,
  paid: 3,
};
