// 案件视角 Billing 读写契约（billing-plans / payment-records / guards / risk-ack）。
// P0 边界：gate_effect_mode HTTP 层 off|warn；P1 解锁 block（DB CHECK 已就绪）。
// P1 追加可选属性叠加，不删除/改名现有属性。

import type {
  BillingGateEffectMode,
  BillingPlanStatus,
  PaymentMethod,
} from "../model/billingEntities";
// S5 解环：这三个 DTO 由 billing 的 service 生产，已归位 billing 模块。
// 此处 re-export 保持 cases 既有对外契约（cases.types / public 仍导出它们）。
import type {
  BillingListSummaryDto,
  CaseBillingPlanDto,
  CasePaymentRecordDto,
} from "../billing/billing.dto-types";

export type { BillingListSummaryDto, CaseBillingPlanDto, CasePaymentRecordDto };

// ─── 错误码 ────────────────────────────────────────────────────

export const BILLING_ERROR_CODES = {
  BP_CASE_NOT_FOUND: "BP_CASE_NOT_FOUND",
  BP_NOT_FOUND: "BP_NOT_FOUND",
  BP_CASE_S9_READONLY: "BP_CASE_S9_READONLY",
  BP_INVALID_AMOUNT: "BP_INVALID_AMOUNT",
  BP_INVALID_GATE_MODE: "BP_INVALID_GATE_MODE",
  BP_ALREADY_PAID: "BP_ALREADY_PAID",
  BP_TRANSITION_NOT_ALLOWED: "BP_TRANSITION_NOT_ALLOWED",

  PR_BILLING_PLAN_NOT_FOUND: "PR_BILLING_PLAN_NOT_FOUND",
  PR_NOT_FOUND: "PR_NOT_FOUND",
  PR_INVALID_AMOUNT: "PR_INVALID_AMOUNT",
  PR_INVALID_PAYMENT_METHOD: "PR_INVALID_PAYMENT_METHOD",
  PR_VOID_NOT_VALID: "PR_VOID_NOT_VALID",
  PR_VOID_REQUIRES_MANAGER: "PR_VOID_REQUIRES_MANAGER",
  PR_VOID_REASON_REQUIRED: "PR_VOID_REASON_REQUIRED",
} as const;

/**
 *
 */
export type BillingErrorCode =
  (typeof BILLING_ERROR_CODES)[keyof typeof BILLING_ERROR_CODES];

// ─── BillingPlan 读模型 ────────────────────────────────────────

/** 映射端点：`GET /api/billing-plans?caseId=:caseId` */
export type CaseBillingPlanListInput = {
  caseId: string;
  page?: number;
  limit?: number;
};

/** 案件视角收费计划列表响应。 */
export type CaseBillingPlanListResult = {
  items: CaseBillingPlanDto[];
  total: number;
};

// ─── BillingPlan 写模型 ────────────────────────────────────────

/**
 * 映射端点：`POST /api/billing-plans`
 * gateEffectMode 接受 off | warn | block（D9：P0 HTTP 层仅放行 off | warn）。
 */
export type CaseBillingPlanCreateInput = {
  caseId: string;
  milestoneName?: string | null;
  amountDue: number;
  dueDate?: string | null;
  gateEffectMode?: "off" | "warn" | "block";
  remark?: string | null;
};

/**
 * 映射端点：`PATCH /api/billing-plans/:id`
 * status=paid 不可更新；gateEffectMode 接受 off | warn | block（D9）。
 */
export type CaseBillingPlanUpdateInput = {
  milestoneName?: string | null;
  amountDue?: number;
  dueDate?: string | null;
  gateEffectMode?: "off" | "warn" | "block";
  remark?: string | null;
};

/** 映射端点：`POST /api/billing-plans/:id/transition` */
export type CaseBillingPlanTransitionInput = {
  toStatus: BillingPlanStatus;
};

// ─── PaymentRecord 读模型 ──────────────────────────────────────

/** 映射端点：`GET /api/payment-records?caseId=:caseId`，按 billingPlanId 或 caseId 过滤。 */
export type CasePaymentRecordListInput = {
  billingPlanId?: string;
  caseId?: string;
  page?: number;
  limit?: number;
};

/** 案件视角回款记录列表响应。 */
export type CasePaymentRecordListResult = {
  items: CasePaymentRecordDto[];
  total: number;
};

// ─── PaymentRecord 写模型 ──────────────────────────────────────

/** 映射端点：`POST /api/payment-records`，登记后自动重算父 BillingPlan.status。 */
export type CasePaymentRecordCreateInput = {
  billingPlanId: string;
  amountReceived: number;
  receivedAt: string;
  paymentMethod?: PaymentMethod | null;
  note?: string | null;
};

/** 映射端点：`POST /api/payment-records/:id/void`，仅 manager + valid 可操作。 */
export type CasePaymentRecordVoidInput = {
  reasonCode: string;
  reasonNote?: string | null;
};

// ─── BillingGuard 读模型 ───────────────────────────────────────

/** 收费守卫检查结果 — null=无需守卫，settled=true=通过，settled=false=未结清。 */
export type CaseBillingGuardResult =
  | null
  | { settled: true }
  | {
      settled: false;
      unpaid: number;
      gateEffectMode: BillingGateEffectMode;
    };

/** 收费汇总缓存 — syncBillingCacheForCase() 写入 Case 缓存字段。 */
export type CaseBillingCacheSyncFields = {
  depositPaid: boolean;
  finalPaymentPaid: boolean;
  unpaidAmount: number;
};

// ─── RiskAck 读写模型 ──────────────────────────────────────────

/** 映射端点：`POST /api/cases/:id/billing-risk-ack`，S9 只读时不可操作。 */
export type CaseBillingRiskAckInput = {
  reasonCode: string;
  reasonNote?: string;
  evidenceUrl?: string;
};

/** 欠款风险确认结果 DTO — acknowledgedAt 非 null 表示已完成。 */
export type CaseBillingRiskAckRecord = {
  acknowledged: boolean;
  acknowledgedAt: string | null;
  acknowledgedBy: string | null;
  acknowledgedByDisplayName: string | null;
  reasonCode: string | null;
  reasonNote: string | null;
  evidenceUrl: string | null;
};

// ─── CaseBillingSummary（CaseDetailAggregateDto 子结构）────────

/** 收费汇总简版 — 向后兼容；新代码推荐 CaseBillingSummaryFull。 */
export type CaseBillingSummary = {
  quotePrice: number | null;
  depositPaid: boolean;
  finalPaymentPaid: boolean;
  /** 是否存在 milestone 名称匹配尾款关键词的 billing_records（与 syncBillingCache / COE 守卫一致）。 */
  finalPaymentMilestoneMatched: boolean;
  unpaidAmount: number;
  billingRiskAcknowledged: boolean;
  billingRiskAcknowledgedAt: string | null;
  billingRiskAckReasonCode: string | null;
};

// ─── Billing Summary（案件详情聚合子结构）──────────────────────

/** 收费汇总完整形状 — P1 扩展追加 invoiceSummary 等字段。 */
export type CaseBillingSummaryFull = {
  quotePrice: number | null;
  totalDue: number;
  totalReceived: number;
  unpaidAmount: number;
  depositPaid: boolean;
  finalPaymentPaid: boolean;
  billingRiskAck: CaseBillingRiskAckRecord;
  planCount: number;
  paymentCount: number;
  overduePlanCount: number;
};

// ─── Billing Tab 聚合视图 ──────────────────────────────────────

/** 案件 billing tab 一次性聚合：summary + plans + recentPayments。 */
export type CaseBillingTabAggregate = {
  summary: CaseBillingSummaryFull;
  plans: CaseBillingPlanDto[];
  /**
   * 最多 50 条，按 receivedAt 倒序，含 voided/reversed（用于审计展示）。
   * 超出 50 条时前端切到 `/api/payment-records?caseId=...` 端点分页（D8）。
   */
  recentPayments: CasePaymentRecordDto[];
  recentPaymentsTotal: number;
};

// ─── Timeline action 与 entity_type 枚举 ───────────────────────

/**
 * 收费相关 timeline action 枚举 — 对齐 timeline_logs.action 列。
 *
 * timeline_logs.action 列为 free-form text（001_init.sql:100），
 * 无 enum/check 约束，新增 action 字面量无需 DB 迁移。
 *
 * entity_type=billing_plan 时：
 * - billing_plan.created
 * - billing_plan.updated
 * - billing_plan.transitioned
 *
 * entity_type=payment_record 时：
 * - payment_record.created
 * - payment_record.voided
 * - payment_record.reversed — 冲正回款（D1 方案 A：原地翻状态）
 *
 * entity_type=case 时：
 * - case.billing_risk_acknowledged — 欠款风险确认
 * - case.collection_task_created — 批量催款生成 task（D4）
 */
export type CaseBillingTimelineAction =
  | "billing_plan.created"
  | "billing_plan.updated"
  | "billing_plan.transitioned"
  | "payment_record.created"
  | "payment_record.voided"
  | "payment_record.reversed"
  | "case.billing_risk_acknowledged"
  | "case.collection_task_created";

// ─── Billing List Summary（全组织列表汇总）─────────────────────

/**
 * 全组织收费列表汇总查询参数。
 *
 * 映射端点：`GET /api/billing-summary?status=...&groupId=...&ownerId=...&q=...&from=...&to=...`
 *
 * 所有字段可选；不传时返回全组织汇总。
 */
export type CaseBillingSummaryRangeQuery = {
  status?: BillingPlanStatus;
  groupId?: string;
  ownerId?: string;
  q?: string;
  from?: string;
  to?: string;
};

// ─── 里程碑命名约定 ────────────────────────────────────────────

/** P0 里程碑分类 — billingGuards 字符串匹配依据；P1 改用 milestone_type 枚举。 */
export type CaseBillingMilestoneHint = "deposit" | "final_payment" | "custom";
