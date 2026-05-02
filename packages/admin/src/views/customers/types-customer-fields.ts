/** 客户类型枚举，与 server `customers.type` 列对齐。 */
export const CUSTOMER_TYPES = ["individual", "corporation"] as const;
/**
 * 客户类型：`individual`（个人）/`corporation`（法人）。
 * BUG-187：admin 创建弹窗需要支持两种类型切换。
 */
export type CustomerType = (typeof CUSTOMER_TYPES)[number];

export const CUSTOMER_LOCATIONS = ["OVERSEAS", "JAPAN"] as const;
/**
 *
 */
export type CustomerLocation = (typeof CUSTOMER_LOCATIONS)[number];

export const CUSTOMER_SOURCE_TYPES = ["REFERRAL", "WEB", "ADS"] as const;
/**
 *
 */
export type CustomerSourceType = (typeof CUSTOMER_SOURCE_TYPES)[number];

export const CUSTOMER_VISA_TYPES = [
  "business_manager",
  "engineer_specialist",
  "skilled_labor",
  "student",
  "dependent",
  "permanent_resident",
  "spouse_of_jp_national",
  "long_term_resident",
  "designated_activities",
  "other",
] as const;
/**
 *
 */
export type CustomerVisaType = (typeof CUSTOMER_VISA_TYPES)[number];

/**
 * 新建客户表单字段集合。
 */
export interface CustomerCreateFormFields {
  /**
   * 客户类型：`individual` / `corporation`。
   * BUG-187：默认 `individual`，决定弹窗显示的字段集合与提交 payload 的 type。
   */
  customerType: CustomerType;
  /**
   *
   */
  displayName: string;
  /**
   *
   */
  group: string;
  /**
   *
   */
  legalName: string;
  /**
   *
   */
  kana: string;
  /**
   *
   */
  gender: string;
  /**
   *
   */
  birthDate: string;
  /**
   *
   */
  nationality: string;
  /**
   *
   */
  phone: string;
  /**
   *
   */
  email: string;
  /**
   *
   */
  referrer: string;
  /**
   *
   */
  location: string;
  /**
   *
   */
  sourceType: string;
  /**
   *
   */
  visaType: string;
  /**
   *
   */
  referrerName: string;
  /**
   * 法人客户专属：代表者姓名。
   * BUG-187：仅在 `customerType === "corporation"` 时收集。
   */
  representativeName: string;
  /**
   *
   */
  avatar: string;
  /**
   *
   */
  note: string;
}
