/**
 * P0 收费计划状态枚举（§3.20）。
 */
export type BillingPlanStatus = "due" | "partial" | "paid" | "overdue";

/**
 * P0 Gate 效果模式（§3.20）。P0 仅支持 off / warn。
 */
export type BillingGateEffectMode = "off" | "warn";

/**
 * P0 回款记录状态枚举（§3.20）。
 * - valid: 参与汇总
 * - voided: 已作废，不参与汇总
 * - reversed: 已冲正，不参与汇总
 */
export type PaymentRecordStatus = "valid" | "voided" | "reversed";

/**
 * P0 回款方式枚举。
 */
export type PaymentMethod = "bank_transfer" | "cash" | "credit_card" | "other";

/**
 * 收费计划实体（P0 BillingPlan §3.20）。
 */
export type BillingPlan = {
  /** ID。 */
  id: string;
  /** 案件 ID。 */
  caseId: string;
  /** 里程碑名称（签約 / 提出前 / 結果後 等）。 */
  milestoneName: string | null;
  /** 应收金额。 */
  amountDue: number;
  /** 到期日（可选）。 */
  dueDate: string | null;
  /** 状态。 */
  status: BillingPlanStatus;
  /** Gate 效果模式（P0 默认 warn）。 */
  gateEffectMode: BillingGateEffectMode;
  /** 备注。 */
  remark: string | null;
  /** 创建时间。 */
  createdAt: string;
  /** 更新时间。 */
  updatedAt: string;
};

/**
 * 回款记录实体（P0 PaymentRecord §3.20，不可物理删除）。
 */
export type PaymentRecord = {
  /** ID。 */
  id: string;
  /** 归属收费计划 ID。 */
  billingPlanId: string;
  /** 案件 ID。 */
  caseId: string;
  /** 回款金额。 */
  amountReceived: number;
  /** 回款时间。 */
  receivedAt: string;
  /** 回款方式。 */
  paymentMethod: PaymentMethod | null;
  /** 记录状态：valid 参与汇总 / voided 作废 / reversed 冲正。 */
  recordStatus: PaymentRecordStatus;
  /** 备注。 */
  note: string | null;
  /** 作废/冲正原因码（recordStatus != valid 时必填）。 */
  voidReasonCode: string | null;
  /** 作废/冲正操作人。 */
  voidedBy: string | null;
  /** 作废/冲正时间。 */
  voidedAt: string | null;
  /** 记录人。 */
  recordedBy: string | null;
  /** 创建时间。 */
  createdAt: string;
};

/**
 * 案件收费汇总（用于 UI 展示）。
 */
export type CaseBillingSummary = {
  /** 总应收。 */
  totalDue: number;
  /** 总已收（仅 valid 记录）。 */
  totalReceived: number;
  /** 未收金额。 */
  unpaidAmount: number;
  /** 签约金是否已结清。 */
  depositPaid: boolean;
  /** 尾款是否已结清。 */
  finalPaymentPaid: boolean;
};
