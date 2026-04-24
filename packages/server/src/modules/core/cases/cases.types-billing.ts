// ────────────────────────────────────────────────────────────────
// BillingPlan / PaymentRecord / BillingGuard / RiskAck
// 案件视角读写契约 — 冻结契约
//
// 案件详情 billing tab 消费 billing-plans 与 payment-records 列表端点；
// overview / validation tab 消费 billing summary / guard 结果；
// cases controller 消费 risk-ack 输入。
//
// 以下类型描述 admin adapter 消费的 DTO 形状，
// 与现有 REST 端点的返回值一一对应。
//
// 映射关系：
//   billing-plans  → billing_records 表 (P0 §3.20)
//   payment-records → payment_records 表 (P0 §3.20)
//   billing-guards → billingGuards.ts 聚合逻辑
//   risk-ack       → cases controller billing-risk-ack 端点
//
// P0 边界：
//   - gate_effect_mode 仅通过 HTTP 设置 off | warn；
//     block 由 P1 COE 步骤级硬阻断引入（gate_trigger_step=COE_SENT）。
//   - P0 收费阻断默认 warn：允许带欠提交但必须风险确认留痕。
//   - P1 扩展 gate_trigger_step、invoice 明细等字段，
//     通过追加可选属性方式叠加，不删除/改名现有属性。
// ────────────────────────────────────────────────────────────────

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

/**
 * 案件视角收费计划列表查询参数。
 *
 * 映射端点：`GET /api/billing-plans?caseId=:caseId`
 */
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
 *   P0 仅通过 HTTP 设置 off | warn；block 保留给 P1 COE 硬阻断。
 * - `amountDue`：应收金额（≥ 0）
 * - `dueDate`：预定收费日（YYYY-MM-DD 或 null）
 * - `paidAmount`：已收金额（聚合自关联 valid PaymentRecord）
 * - `unpaidAmount`：未收金额（amountDue - paidAmount，≥ 0）
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
};

/**
 * 案件视角收费计划列表响应。
 */
export type CaseBillingPlanListResult = {
  items: CaseBillingPlanDto[];
  total: number;
};

// ─── BillingPlan 写模型 ────────────────────────────────────────

/**
 * 从案件 billing tab 创建收费计划节点。
 *
 * 映射端点：`POST /api/billing-plans`
 *
 * P0 约束：
 * - amountDue ≥ 0
 * - gateEffectMode 仅接受 off | warn（P0 HTTP 层限制）
 * - 新建时 status 固定为 due
 */
export type CaseBillingPlanCreateInput = {
  caseId: string;
  milestoneName?: string | null;
  amountDue: number;
  dueDate?: string | null;
  gateEffectMode?: "off" | "warn";
  remark?: string | null;
};

/**
 * 从案件 billing tab 更新收费计划非状态字段。
 *
 * 映射端点：`PATCH /api/billing-plans/:id`
 *
 * P0 约束：
 * - status = paid 的节点不可更新
 * - gateEffectMode 仅接受 off | warn（P0 HTTP 层限制）
 */
export type CaseBillingPlanUpdateInput = {
  milestoneName?: string | null;
  amountDue?: number;
  dueDate?: string | null;
  gateEffectMode?: "off" | "warn";
  remark?: string | null;
};

/**
 * 收费计划状态变更（用于手动标记 overdue 等场景）。
 *
 * 映射端点：`POST /api/billing-plans/:id/transition`
 *
 * 合法路径：
 *   due → partial | paid | overdue
 *   partial → paid | overdue
 *   overdue → partial | paid
 */
export type CaseBillingPlanTransitionInput = {
  toStatus: BillingPlanStatus;
};

// ─── PaymentRecord 读模型 ──────────────────────────────────────

/**
 * 案件视角回款记录列表查询参数。
 *
 * 映射端点：`GET /api/payment-records?caseId=:caseId`
 *
 * 支持按 billingPlanId 或 caseId 过滤（至少提供一个）。
 */
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
 * - `voidedByDisplayName`：作废操作人展示名（聚合查询追加）
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
  voidedBy: string | null;
  voidedByDisplayName: string | null;
  voidedAt: string | null;
  reversedFromPaymentRecordId: string | null;
  recordedBy: string | null;
  recordedByDisplayName: string | null;
  createdAt: string;
};

/**
 * 案件视角回款记录列表响应。
 */
export type CasePaymentRecordListResult = {
  items: CasePaymentRecordDto[];
  total: number;
};

// ─── PaymentRecord 写模型 ──────────────────────────────────────

/**
 * 从案件 billing tab 登记回款（P0-CONTRACT-DETAIL §12：「登記回款」）。
 *
 * 映射端点：`POST /api/payment-records`
 *
 * P0 约束：
 * - amountReceived > 0
 * - billingPlanId 必须存在且属于当前组织
 * - paymentMethod 合法值：bank_transfer | cash | credit_card | other
 * - 登记后自动重算父 BillingPlan.status
 */
export type CasePaymentRecordCreateInput = {
  billingPlanId: string;
  amountReceived: number;
  receivedAt: string;
  paymentMethod?: PaymentMethod | null;
  note?: string | null;
};

/**
 * 作废回款记录（P0 §6.2 软删除，不物理删除）。
 *
 * 映射端点：`POST /api/payment-records/:id/void`
 *
 * P0 约束：
 * - 仅 manager 角色可操作
 * - 仅 recordStatus = valid 的记录可作废
 * - 作废后自动重算父 BillingPlan.status
 */
export type CasePaymentRecordVoidInput = {
  reasonCode: string;
  reasonNote?: string | null;
};

// ─── BillingGuard 读模型 ───────────────────────────────────────

/**
 * 案件视角收费守卫检查结果 — Gate-C 与下签后阶段消费。
 *
 * 来源：billingGuards.checkFinalPaymentGuard()
 *
 * 语义：
 * - `null`：无需守卫（无尾款节点或全部 gate_effect_mode=off）
 * - `settled=true`：尾款已结清，守卫通过
 * - `settled=false`：尾款未结清
 *   - `gateEffectMode=block`：P1 硬阻断，不得推进
 *   - `gateEffectMode=warn`：P0 允许继续但必须风险确认留痕
 */
export type CaseBillingGuardResult =
  | null
  | { settled: true }
  | {
      settled: false;
      unpaid: number;
      gateEffectMode: BillingGateEffectMode;
    };

/**
 * 案件视角收费汇总缓存 — 从 billing_records + payment_records 聚合同步。
 *
 * 来源：billingGuards.syncBillingCacheForCase()
 *
 * 写入 Case 缓存字段：
 * - deposit_paid_cached
 * - final_payment_paid_cached
 * - billing_unpaid_amount_cached
 *
 * admin 消费路径：CaseDetailAggregateDto.billing (CaseBillingSummary)
 */
export type CaseBillingCacheSyncFields = {
  depositPaid: boolean;
  finalPaymentPaid: boolean;
  unpaidAmount: number;
};

// ─── RiskAck 读写模型 ──────────────────────────────────────────

/**
 * 欠款风险确认请求参数。
 *
 * 映射端点：`POST /api/cases/:id/billing-risk-ack`
 *
 * P0 业务规则（§6 / §4.2-4.3）：
 * - Gate-C 欠款特别规则：若带欠继续提交，必须完成风险确认留痕
 * - 确认后写入 Case 本体字段并记录 timeline
 * - S9 全局只读时不允许操作
 *
 * 确认后影响：
 * - Case.billingRiskAcknowledgedAt 非 null
 * - Case.billingRiskAcknowledgedBy = 操作人
 * - Case.billingRiskAckReasonCode = reasonCode
 * - Timeline action: case.billing_risk_acknowledged
 */
export type CaseBillingRiskAckInput = {
  reasonCode: string;
  reasonNote?: string;
  evidenceUrl?: string;
};

/**
 * 欠款风险确认结果 DTO — 案件详情 overview / billing tab 展示。
 *
 * 当 acknowledgedAt 非 null 时表示已完成风险确认。
 * admin adapter 消费此结构映射为 `RiskConfirmationRecord`。
 */
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

/**
 * 收费汇总 — CaseDetailAggregateDto.billing 的简版形状。
 *
 * 此类型保持与既有 CaseDetailAggregateDto 的向后兼容；
 * 新代码推荐使用 CaseBillingSummaryFull 获取完整字段。
 */
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

/**
 * 收费汇总 — CaseDetailAggregateDto.billing 的完整形状。
 *
 * 对齐 P0-CONTRACT-DETAIL §12 / §17：
 * - quotePrice：报价总额（Case.quote_price）
 * - totalDue：应收总额（所有 BillingPlan.amountDue 之和）
 * - totalReceived：已收总额（所有 valid PaymentRecord.amountReceived 之和）
 * - unpaidAmount：未收总额（totalDue - totalReceived, ≥ 0）
 * - depositPaid：签约金已结清
 * - finalPaymentPaid：尾款已结清
 * - billingRiskAck：风险确认记录
 * - planCount：收费节点数
 * - paymentCount：回款记录数（含 voided）
 * - overduePlanCount：逾期节点数
 *
 * P1 扩展追加 invoiceSummary 等字段。
 */
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

/**
 * 案件 billing tab 一次性加载所需的聚合数据。
 *
 * 设计意图：减少 billing tab 首屏请求数，
 * 一个端点返回 summary + plans + recentPayments。
 *
 * P0 备选方案：admin 也可分别调 billing-plans + payment-records，
 * 此聚合类型作为后续优化的契约预留。
 */
export type CaseBillingTabAggregate = {
  summary: CaseBillingSummaryFull;
  plans: CaseBillingPlanDto[];
  recentPayments: CasePaymentRecordDto[];
};

// ─── Timeline action 与 entity_type 枚举 ───────────────────────

/**
 * 收费相关 timeline action 枚举 — 对齐 timeline_logs.action 列。
 *
 * entity_type=billing_plan 时：
 * - billing_plan.created
 * - billing_plan.updated
 * - billing_plan.transitioned
 *
 * entity_type=payment_record 时：
 * - payment_record.created
 * - payment_record.voided
 *
 * entity_type=case 时（风险确认）：
 * - case.billing_risk_acknowledged
 */
export type CaseBillingTimelineAction =
  | "billing_plan.created"
  | "billing_plan.updated"
  | "billing_plan.transitioned"
  | "payment_record.created"
  | "payment_record.voided"
  | "case.billing_risk_acknowledged";

// ─── 里程碑命名约定 ────────────────────────────────────────────

/**
 * P0 里程碑名称匹配规则 — billingGuards 内部判断依据。
 *
 * 签约金（deposit）：milestone_name 包含「签約」「deposit」「着手」
 * 尾款（final payment）：milestone_name 包含「尾款」「final」「結果」
 *
 * admin 创建收费节点时应引导用户使用上述关键词，
 * 或后续 P1 使用 milestone_type 枚举替代字符串匹配。
 */
export type CaseBillingMilestoneHint = "deposit" | "final_payment" | "custom";
