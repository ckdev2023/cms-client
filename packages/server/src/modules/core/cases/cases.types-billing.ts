// 案件视角 Billing 读写契约（billing-plans / payment-records / guards / risk-ack）。
// P0 边界：gate_effect_mode HTTP 层 off|warn；P1 解锁 block（DB CHECK 已就绪）。
// P1 追加可选属性叠加，不删除/改名现有属性。

import type {
  BillingGateEffectMode,
  BillingPlanStatus,
  PaymentMethod,
  PaymentRecordStatus,
} from "../model/billingEntities";

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

/**
 * 案件视角收费计划 DTO — 与 `BillingPlan` 核心实体同构。
 *
 * admin adapter 消费此结构映射为收费 tab 的节点行。
 * 字段语义：
 * - `milestoneName`：收费节点名称（签约金 / 尾款 / 结果后报酬 等）
 * - `status`：due | partial | paid | overdue
 * - `gateEffectMode`：off | warn | block
 *   P0 HTTP 层限制 off | warn；block 由 P1 解锁（DB CHECK 已就绪）。
 * - `amountDue`：应收金额（≥ 0）
 * - `dueDate`：预定收费日（YYYY-MM-DD 或 null）
 * - `paidAmount`：已收金额（聚合自关联 valid PaymentRecord）
 * - `unpaidAmount`：未收金额（amountDue - paidAmount，≥ 0）
 *
 * 列表场景扩展字段（org-wide list 端点 mapper 注入，详情场景不携带）：
 * - `caseNo` / `caseName` / `customerName`：关联案件/客户冗余展示
 * - `groupId` / `ownerUserId` / `ownerDisplayName`：负责人/分组冗余展示
 */
export type CaseBillingPlanDto = {
  id: string;
  caseId: string;
  milestoneName: string | null;
  amountDue: number;
  dueDate: string | null;
  status: BillingPlanStatus;
  gateEffectMode: BillingGateEffectMode;
  remark: string | null;
  paidAmount: number;
  unpaidAmount: number;
  createdAt: string;
  updatedAt: string;

  caseNo?: string | null;
  caseName?: string | null;
  customerName?: string | null;
  groupId?: string | null;
  ownerUserId?: string | null;
  ownerDisplayName?: string | null;
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

/**
 * 案件视角回款记录 DTO — 与 `PaymentRecord` 核心实体同构。
 *
 * admin adapter 消费此结构映射为收费 tab 的回款行。
 * 字段语义：
 * - `recordStatus`：valid | voided | reversed
 * - `paymentMethod`：bank_transfer | cash | credit_card | other
 * - `recordedByDisplayName`：登记人展示名（聚合查询追加）
 * - `voidedBy` / `voidedByDisplayName` / `voidedAt`：
 *   当 `recordStatus='voided'` 时表示作废操作人/时间；
 *   当 `recordStatus='reversed'` 时复用同一列表示冲正操作人/时间（D10 决议：
 *   方案 A 复用 voided_* 列承载 voided/reversed 两态，不新增独立列）。
 *   前端 PaymentLogTable 应按 `recordStatus` 分支渲染标签与颜色。
 *
 * 列表场景扩展字段（org-wide list 端点 mapper 注入，详情场景不携带）：
 * - `caseNo` / `caseName`：关联案件冗余展示
 * - `milestoneName`：关联收费节点名称冗余展示
 */
export type CasePaymentRecordDto = {
  id: string;
  billingPlanId: string;
  caseId: string;
  amountReceived: number;
  receivedAt: string;
  paymentMethod: PaymentMethod | null;
  recordStatus: PaymentRecordStatus;
  receiptStorageType: string | null;
  receiptRelativePathOrKey: string | null;
  note: string | null;
  voidReasonCode: string | null;
  voidReasonNote: string | null;
  /**
   * 作废/冲正操作人 ID。
   * `recordStatus='reversed'` 时表示冲正操作人（D10 复用语义）。
   */
  voidedBy: string | null;
  /**
   * 作废/冲正操作人展示名。
   * `recordStatus='reversed'` 时表示冲正操作人展示名（D10 复用语义）。
   */
  voidedByDisplayName: string | null;
  /**
   * 作废/冲正时间。
   * `recordStatus='reversed'` 时表示冲正时间（D10 复用语义）。
   */
  voidedAt: string | null;
  reversedFromPaymentRecordId: string | null;
  recordedBy: string | null;
  recordedByDisplayName: string | null;
  createdAt: string;

  caseNo?: string | null;
  caseName?: string | null;
  milestoneName?: string | null;
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

/**
 * 全组织收费列表汇总 DTO。
 *
 * 映射端点：`GET /api/billing-summary` 返回值。
 *
 * 字段语义：
 * - `totalDue`：命中过滤条件的 billing_records.amount_due 之和
 * - `totalReceived`：命中过滤条件的 valid payment_records.amount_received 之和
 * - `totalOutstanding`：max(totalDue - totalReceived, 0)
 * - `overdueAmount`：实时计算（D2 决议）——
 *   `sum(br.amount_due - paid) where br.due_date < now()
 *    and br.status in ('due','partial','overdue')`，
 *   paid 子聚合仅计入 record_status='valid'，不依赖 status='overdue' 是否被人工标过
 */
export type BillingListSummaryDto = {
  totalDue: number;
  totalReceived: number;
  totalOutstanding: number;
  overdueAmount: number;
};

// ─── 里程碑命名约定 ────────────────────────────────────────────

/** P0 里程碑分类 — billingGuards 字符串匹配依据；P1 改用 milestone_type 枚举。 */
export type CaseBillingMilestoneHint = "deposit" | "final_payment" | "custom";
