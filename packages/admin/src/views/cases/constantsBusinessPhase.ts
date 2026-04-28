// ─── Business Phases (双層状態機) ────────────────────────────────

export const BUSINESS_PHASES = [
  "CONSULTING",
  "CONTRACTED",
  "WAITING_MATERIAL",
  "MATERIAL_PREPARING",
  "REVIEWING",
  "APPLYING",
  "UNDER_REVIEW",
  "NEED_SUPPLEMENT",
  "SUPPLEMENT_PROCESSING",
  "APPROVED",
  "REJECTED",
  "WAITING_PAYMENT",
  "COE_SENT",
  "VISA_APPLYING",
  "SUCCESS",
  "VISA_REJECTED",
  "RESIDENCE_PERIOD_RECORDED",
  "RENEWAL_REMINDER_SCHEDULED",
  "CLOSED_SUCCESS",
  "CLOSED_FAILED",
] as const;

/** 业务维度阶段枚举值类型。 */
export type BusinessPhaseId = (typeof BUSINESS_PHASES)[number];

/**
 *
 */
export interface BusinessPhaseDef {
  /**
   *
   */
  code: BusinessPhaseId;
  /**
   *
   */
  label: string;
  /**
   *
   */
  i18nKey: string;
  /**
   *
   */
  badge: string;
}

const PHASE_DEFS: Record<BusinessPhaseId, BusinessPhaseDef> = {
  CONSULTING: {
    code: "CONSULTING",
    label: "咨询中",
    i18nKey: "cases.constants.phases.CONSULTING",
    badge: "badge-gray",
  },
  CONTRACTED: {
    code: "CONTRACTED",
    label: "已签约",
    i18nKey: "cases.constants.phases.CONTRACTED",
    badge: "badge-green",
  },
  WAITING_MATERIAL: {
    code: "WAITING_MATERIAL",
    label: "等待资料",
    i18nKey: "cases.constants.phases.WAITING_MATERIAL",
    badge: "badge-orange",
  },
  MATERIAL_PREPARING: {
    code: "MATERIAL_PREPARING",
    label: "资料准备中",
    i18nKey: "cases.constants.phases.MATERIAL_PREPARING",
    badge: "badge-blue",
  },
  REVIEWING: {
    code: "REVIEWING",
    label: "审查中",
    i18nKey: "cases.constants.phases.REVIEWING",
    badge: "badge-blue",
  },
  APPLYING: {
    code: "APPLYING",
    label: "申请中",
    i18nKey: "cases.constants.phases.APPLYING",
    badge: "badge-blue",
  },
  UNDER_REVIEW: {
    code: "UNDER_REVIEW",
    label: "审查中（入管）",
    i18nKey: "cases.constants.phases.UNDER_REVIEW",
    badge: "badge-orange",
  },
  NEED_SUPPLEMENT: {
    code: "NEED_SUPPLEMENT",
    label: "需要补充",
    i18nKey: "cases.constants.phases.NEED_SUPPLEMENT",
    badge: "badge-orange",
  },
  SUPPLEMENT_PROCESSING: {
    code: "SUPPLEMENT_PROCESSING",
    label: "补充处理中",
    i18nKey: "cases.constants.phases.SUPPLEMENT_PROCESSING",
    badge: "badge-orange",
  },
  APPROVED: {
    code: "APPROVED",
    label: "已批准",
    i18nKey: "cases.constants.phases.APPROVED",
    badge: "badge-green",
  },
  REJECTED: {
    code: "REJECTED",
    label: "已拒否",
    i18nKey: "cases.constants.phases.REJECTED",
    badge: "badge-red",
  },
  WAITING_PAYMENT: {
    code: "WAITING_PAYMENT",
    label: "等待尾款",
    i18nKey: "cases.constants.phases.WAITING_PAYMENT",
    badge: "badge-orange",
  },
  COE_SENT: {
    code: "COE_SENT",
    label: "在留发送",
    i18nKey: "cases.constants.phases.COE_SENT",
    badge: "badge-blue",
  },
  VISA_APPLYING: {
    code: "VISA_APPLYING",
    label: "签证申请中",
    i18nKey: "cases.constants.phases.VISA_APPLYING",
    badge: "badge-blue",
  },
  SUCCESS: {
    code: "SUCCESS",
    label: "成功",
    i18nKey: "cases.constants.phases.SUCCESS",
    badge: "badge-green",
  },
  VISA_REJECTED: {
    code: "VISA_REJECTED",
    label: "签证拒否",
    i18nKey: "cases.constants.phases.VISA_REJECTED",
    badge: "badge-red",
  },
  RESIDENCE_PERIOD_RECORDED: {
    code: "RESIDENCE_PERIOD_RECORDED",
    label: "在留期间登记",
    i18nKey: "cases.constants.phases.RESIDENCE_PERIOD_RECORDED",
    badge: "badge-blue",
  },
  RENEWAL_REMINDER_SCHEDULED: {
    code: "RENEWAL_REMINDER_SCHEDULED",
    label: "更新提醒已设定",
    i18nKey: "cases.constants.phases.RENEWAL_REMINDER_SCHEDULED",
    badge: "badge-blue",
  },
  CLOSED_SUCCESS: {
    code: "CLOSED_SUCCESS",
    label: "成功归档",
    i18nKey: "cases.constants.phases.CLOSED_SUCCESS",
    badge: "badge-green",
  },
  CLOSED_FAILED: {
    code: "CLOSED_FAILED",
    label: "失败归档",
    i18nKey: "cases.constants.phases.CLOSED_FAILED",
    badge: "badge-red",
  },
};

export { PHASE_DEFS as BUSINESS_PHASE_MAP };

/**
 * 业务阶段 code → 中文标签。
 * @param phase 业务阶段代码
 * @returns 中文标签，未知 code 原样返回
 */
export function getPhaseLabel(phase: string): string {
  return PHASE_DEFS[phase as BusinessPhaseId]?.label ?? phase;
}

/**
 * 业务阶段 code → i18n key。
 * @param phase 业务阶段代码
 * @returns i18n key；未匹配时返回 `""`
 */
export function getPhaseI18nKey(phase: string): string {
  return PHASE_DEFS[phase as BusinessPhaseId]?.i18nKey ?? "";
}

/**
 * 业务阶段 code → badge class。
 * @param phase 业务阶段代码
 * @returns badge class；未匹配时返回 `"badge-gray"`
 */
export function getPhaseBadge(phase: string): string {
  return PHASE_DEFS[phase as BusinessPhaseId]?.badge ?? "badge-gray";
}
