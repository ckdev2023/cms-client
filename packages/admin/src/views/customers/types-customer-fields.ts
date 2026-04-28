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
   *
   */
  avatar: string;
  /**
   *
   */
  note: string;
}
