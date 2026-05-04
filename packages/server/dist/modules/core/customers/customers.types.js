/** 客户所在地枚举。 */
export const CUSTOMER_LOCATIONS = ["OVERSEAS", "JAPAN"];
/** 客户来源渠道枚举。 */
export const CUSTOMER_SOURCE_TYPES = ["REFERRAL", "WEB", "ADS"];
/**
 * 客户关系类型（P0 冻结口径）。
 */
export const CUSTOMER_RELATION_TYPES = [
  "spouse",
  "parent",
  "child",
  "agent",
  "other",
];
/** 经营管理签承接问卷状态。 */
export const CUSTOMER_BMV_QUESTIONNAIRE_STATUSES = [
  "not_started",
  "sent",
  "returned",
];
/** 经营管理签报价状态。 */
export const CUSTOMER_BMV_QUOTE_STATUSES = [
  "not_started",
  "generated",
  "confirmed",
];
/** 经营管理签签约状态。 */
export const CUSTOMER_BMV_SIGN_STATUSES = ["not_started", "pending", "signed"];
/** 经营管理签整体承接状态。 */
export const CUSTOMER_BMV_INTAKE_STATUSES = [
  "not_started",
  "questionnaire_pending",
  "quote_pending",
  "sign_pending",
  "ready_for_case_creation",
];
//# sourceMappingURL=customers.types.js.map
