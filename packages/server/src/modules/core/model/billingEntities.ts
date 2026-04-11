/**
 * P0 收费计划状态枚举（BillingPlan.status）。
 */
export type BillingPlanStatus = "due" | "partial" | "paid" | "overdue";

/**
 * 收费 Gate 效果模式（P0 仅 off/warn，不支持 block）。
 */
export type BillingGateEffectMode = "off" | "warn";

/** @deprecated 使用 BillingPlanStatus。 */
export type BillingRecordStatus = BillingPlanStatus;

/**
 * 回款记录状态枚举（P0 §4）。
 * - `valid` 有效回款，参与汇总
 * - `voided` 作废，不参与汇总
 * - `reversed` 冲正，不参与汇总，指向被冲正原记录
 */
export type PaymentRecordStatus = "valid" | "voided" | "reversed";

/**
 * 回款方式枚举。
 */
export type PaymentMethod = "bank_transfer" | "cash" | "credit_card" | "other";

/**
 * BillingPlan 核心对象（P0 §3.20 收费计划节点）。
 */
export type BillingPlan = {
  id: string;
  orgId: string;
  caseId: string;
  milestoneName: string | null;
  amountDue: number;
  dueDate: string | null;
  status: BillingPlanStatus;
  gateEffectMode: BillingGateEffectMode;
  remark: string | null;
  createdAt: string;
  updatedAt: string;
};

/** @deprecated 使用 BillingPlan。 */
export type BillingRecord = BillingPlan;

/**
 * PaymentRecord 核心对象（P0 §3.20 回款记录，不可物理删除）。
 */
export type PaymentRecord = {
  id: string;
  orgId: string;
  billingPlanId: string;
  caseId: string;
  amountReceived: number;
  receivedAt: string;
  paymentMethod: PaymentMethod | null;
  recordStatus: PaymentRecordStatus;
  /** 存储类型（local_server / saas）。 */
  receiptStorageType: string | null;
  /** 回执引用路径。 */
  receiptRelativePathOrKey: string | null;
  /** 备注。 */
  note: string | null;
  /** 作废/冲正原因码（record_status != valid 时必填）。 */
  voidReasonCode: string | null;
  /** 作废/冲正原因备注。 */
  voidReasonNote: string | null;
  /** 作废/冲正操作人。 */
  voidedBy: string | null;
  /** 作废/冲正时间。 */
  voidedAt: string | null;
  /** 被冲正的原回款记录 ID。 */
  reversedFromPaymentRecordId: string | null;
  recordedBy: string | null;
  createdAt: string;
};
