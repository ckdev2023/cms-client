import { normalizeObject } from "../../../infra/utils/normalize";
import type { ContactPerson, Customer } from "../model/coreEntities";
import {
  CUSTOMER_BMV_QUESTIONNAIRE_STATUSES,
  CUSTOMER_BMV_QUOTE_STATUSES,
  CUSTOMER_BMV_SIGN_STATUSES,
  CUSTOMER_RELATION_TYPES,
} from "./customers.types";
import type {
  CustomerBmvIntakeStatus,
  CustomerBmvProfile,
  CustomerBmvQuestionnaireStatus,
  CustomerBmvQuoteStatus,
  CustomerBmvSignStatus,
  CustomerDetailDto,
  CustomerDtoAggregates,
  CustomerRelationDto,
  CustomerRelationType,
  CustomerSummaryDto,
} from "./customers.types";
import {
  CUSTOMER_GROUP_FIELDS,
  CUSTOMER_KANA_FIELDS,
  CUSTOMER_NAME_FIELDS,
  normalizeOptionalString,
} from "./customers.utils";

const CUSTOMER_NUMBER_FIELDS = [
  "customerNumber",
  "customer_number",
  "customerNo",
  "customer_no",
] as const;
const CUSTOMER_PHONE_FIELDS = ["phone", "phoneNumber", "mobile"] as const;
const CUSTOMER_EMAIL_FIELDS = ["email", "emailAddress"] as const;
const CUSTOMER_REFERRAL_FIELDS = [
  "referralSource",
  "referral_source",
  "leadSource",
  "lead_source",
  "source",
] as const;
const CUSTOMER_BIRTHDATE_FIELDS = ["birthDate", "birthday"] as const;
const CUSTOMER_AVATAR_FIELDS = [
  "avatar",
  "avatarUrl",
  "avatar_url",
  "photo",
  "photo_url",
] as const;
const CUSTOMER_NOTE_FIELDS = ["note", "notes", "memo"] as const;
const CUSTOMER_LAST_CONTACT_DATE_FIELDS = [
  "lastContactDate",
  "last_contact_date",
  "lastContactAt",
  "last_contact_at",
] as const;
const CUSTOMER_LAST_CONTACT_CHANNEL_FIELDS = [
  "lastContactChannel",
  "last_contact_channel",
] as const;

function isStringArrayMember<T extends string>(
  members: readonly T[],
  value: string,
): value is T {
  return members.includes(value as T);
}

function pickOptionalString(
  record: Record<string, unknown>,
  fields: readonly string[],
): string | null {
  for (const field of fields) {
    const value = normalizeOptionalString(record[field]);
    if (value) return value;
  }
  return null;
}

function pickNestedRecord(
  record: Record<string, unknown>,
  fields: readonly string[],
): Record<string, unknown> {
  for (const field of fields) {
    const value = normalizeObject(record[field]);
    if (Object.keys(value).length > 0) return value;
  }
  return {};
}

function mergeBmvProfileRecord(
  baseProfile: Record<string, unknown>,
): Record<string, unknown> {
  return {
    ...normalizeObject(baseProfile.bmv_profile),
    ...normalizeObject(baseProfile.bmvProfile),
  };
}

function pickOptionalStringFromContacts(
  customer: Customer,
  fields: readonly string[],
): string | null {
  for (const contact of customer.contacts) {
    const value = pickOptionalString(contact, fields);
    if (value) return value;
  }
  return null;
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => normalizeOptionalString(item))
    .filter((item): item is string => item !== null);
}

function deriveInitials(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length === 0) return "";
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return parts
      .slice(0, 2)
      .map((part) => part.slice(0, 1))
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }
  return trimmed.slice(0, 2).toUpperCase();
}

function normalizeCustomerRelationType(value: unknown): CustomerRelationType {
  const normalized = normalizeOptionalString(value);
  return normalized && isStringArrayMember(CUSTOMER_RELATION_TYPES, normalized)
    ? normalized
    : "other";
}

function resolveDisplayName(baseProfile: Record<string, unknown>): string {
  return pickOptionalString(baseProfile, CUSTOMER_NAME_FIELDS) ?? "";
}

function resolveLegalName(baseProfile: Record<string, unknown>): string {
  return (
    pickOptionalString(baseProfile, [
      "legalName",
      "legal_name",
      "name_cn",
      "name_en",
      "name_jp",
      "name",
    ]) ?? resolveDisplayName(baseProfile)
  );
}

function resolveOwnerSummary(
  customer: Customer,
  aggregates: CustomerDtoAggregates,
): CustomerSummaryDto["owner"] {
  const ownerRecord = pickNestedRecord(customer.baseProfile, ["owner"]);
  const name =
    normalizeOptionalString(aggregates.ownerName) ??
    pickOptionalString(ownerRecord, ["name"]) ??
    pickOptionalString(customer.baseProfile, ["ownerName", "owner_name"]) ??
    "";
  const initials =
    normalizeOptionalString(aggregates.ownerInitials) ??
    pickOptionalString(ownerRecord, ["initials"]) ??
    pickOptionalString(customer.baseProfile, [
      "ownerInitials",
      "owner_initials",
    ]) ??
    deriveInitials(name);
  return { initials, name };
}

function normalizeBmvStatus<T extends string>(
  raw: Record<string, unknown>,
  fields: readonly string[],
  allowed: readonly T[],
): T | "not_started" {
  const value = pickOptionalString(raw, fields) ?? "not_started";
  return isStringArrayMember(allowed, value) ? value : "not_started";
}

function resolveCustomerNumber(customer: Customer): string {
  return (
    pickOptionalString(customer.baseProfile, CUSTOMER_NUMBER_FIELDS) ??
    customer.id
  );
}

function resolveCustomerPhone(customer: Customer): string {
  return (
    pickOptionalString(customer.baseProfile, CUSTOMER_PHONE_FIELDS) ??
    pickOptionalStringFromContacts(customer, CUSTOMER_PHONE_FIELDS) ??
    ""
  );
}

function resolveCustomerEmail(customer: Customer): string {
  return (
    pickOptionalString(customer.baseProfile, CUSTOMER_EMAIL_FIELDS) ??
    pickOptionalStringFromContacts(customer, CUSTOMER_EMAIL_FIELDS) ??
    ""
  );
}

function resolveCustomerReferral(
  customer: Customer,
  aggregates: CustomerDtoAggregates,
): string {
  return (
    normalizeOptionalString(aggregates.referralSource) ??
    pickOptionalString(customer.baseProfile, CUSTOMER_REFERRAL_FIELDS) ??
    ""
  );
}

function resolveCustomerGroup(
  customer: Customer,
  aggregates: CustomerDtoAggregates,
): string {
  return (
    normalizeOptionalString(aggregates.groupName) ??
    pickOptionalString(customer.baseProfile, [
      "groupName",
      "group_name",
      ...CUSTOMER_GROUP_FIELDS,
    ]) ??
    ""
  );
}

/**
 * 从客户 `baseProfile` 中解析经营管理签档案。
 *
 * @param baseProfile - 客户档案 JSONB 对象
 * @returns 规范化后的经营管理签档案；不存在时返回 `null`
 */
export function resolveCustomerBmvProfile(
  baseProfile: Record<string, unknown>,
): CustomerBmvProfile | null {
  return normalizeCustomerBmvProfile(mergeBmvProfileRecord(baseProfile));
}

/**
 * 创建经营管理签档案默认值。
 *
 * @returns 初始状态下的经营管理签档案
 */
export function createDefaultCustomerBmvProfile(): CustomerBmvProfile {
  return {
    questionnaireStatus: "not_started",
    quoteStatus: "not_started",
    signStatus: "not_started",
    intakeStatus: resolveCustomerBmvIntakeStatus({
      questionnaireStatus: "not_started",
      quoteStatus: "not_started",
      signStatus: "not_started",
    }),
    questionnaireSentAt: null,
    questionnaireReturnedAt: null,
    quoteGeneratedAt: null,
    quoteConfirmedAt: null,
    signedAt: null,
    note: null,
  };
}

/**
 * 根据经营管理签子步骤推导整体 intakeStatus。
 *
 * @param profile - 经营管理签承接流程当前子步骤状态
 * @param profile.questionnaireStatus - 问卷阶段状态
 * @param profile.quoteStatus - 报价阶段状态
 * @param profile.signStatus - 签约阶段状态
 * @returns 由问卷 → 报价 → 签约门禁推导出的整体 intakeStatus
 */
export function resolveCustomerBmvIntakeStatus(profile: {
  questionnaireStatus: CustomerBmvQuestionnaireStatus;
  quoteStatus: CustomerBmvQuoteStatus;
  signStatus: CustomerBmvSignStatus;
}): CustomerBmvIntakeStatus {
  if (
    profile.questionnaireStatus === "not_started" &&
    profile.quoteStatus === "not_started" &&
    profile.signStatus === "not_started"
  ) {
    return "not_started";
  }
  if (profile.signStatus === "signed") return "ready_for_case_creation";
  if (profile.questionnaireStatus !== "returned")
    return "questionnaire_pending";
  if (
    profile.quoteStatus === "generated" ||
    profile.quoteStatus === "confirmed" ||
    profile.signStatus === "pending"
  ) {
    return "sign_pending";
  }
  return "quote_pending";
}

/**
 * 规范化经营管理签承接档案。
 *
 * @param value - 客户基础档案中的 bmvProfile 原始值
 * @returns 规范化后的经营管理签承接档案；空对象时返回 `null`
 */
export function normalizeCustomerBmvProfile(
  value: unknown,
): CustomerBmvProfile | null {
  const raw = normalizeObject(value);
  if (Object.keys(raw).length === 0) return null;

  const questionnaireStatus = normalizeBmvStatus(
    raw,
    ["questionnaireStatus", "questionnaire_status"],
    CUSTOMER_BMV_QUESTIONNAIRE_STATUSES,
  );
  const quoteStatus = normalizeBmvStatus(
    raw,
    ["quoteStatus", "quote_status"],
    CUSTOMER_BMV_QUOTE_STATUSES,
  );
  const signStatus = normalizeBmvStatus(
    raw,
    ["signStatus", "sign_status"],
    CUSTOMER_BMV_SIGN_STATUSES,
  );

  return {
    questionnaireStatus,
    quoteStatus,
    signStatus,
    intakeStatus: resolveCustomerBmvIntakeStatus({
      questionnaireStatus,
      quoteStatus,
      signStatus,
    }),
    questionnaireSentAt: pickOptionalString(raw, [
      "questionnaireSentAt",
      "questionnaire_sent_at",
    ]),
    questionnaireReturnedAt: pickOptionalString(raw, [
      "questionnaireReturnedAt",
      "questionnaire_returned_at",
    ]),
    quoteGeneratedAt: pickOptionalString(raw, [
      "quoteGeneratedAt",
      "quote_generated_at",
    ]),
    quoteConfirmedAt: pickOptionalString(raw, [
      "quoteConfirmedAt",
      "quote_confirmed_at",
    ]),
    signedAt: pickOptionalString(raw, ["signedAt", "signed_at"]),
    note: pickOptionalString(raw, ["note", "memo"]),
  };
}

/**
 * 将 ContactPerson 适配为客户关联人 DTO。
 *
 * @param contactPerson - `contact_persons` 领域实体
 * @returns 管理端关系 Tab 所需的关联人 DTO
 */
export function mapContactPersonToCustomerRelationDto(
  contactPerson: ContactPerson,
): CustomerRelationDto {
  return {
    id: contactPerson.id,
    name: contactPerson.name,
    kana: "",
    relationType: normalizeCustomerRelationType(contactPerson.relationType),
    phone: contactPerson.phone ?? "",
    email: contactPerson.email ?? "",
    tags: contactPerson.roleTitle ? [contactPerson.roleTitle] : [],
    note: "",
  };
}

/**
 * 将 Customer 领域实体映射为列表 DTO。
 *
 * @param customer - 客户领域实体
 * @param aggregates - 列表页聚合查询补充字段
 * @returns 管理端客户列表使用的稳定 DTO
 */
export function mapCustomerToSummaryDto(
  customer: Customer,
  aggregates: CustomerDtoAggregates = {},
): CustomerSummaryDto {
  return {
    id: customer.id,
    displayName: resolveDisplayName(customer.baseProfile),
    legalName: resolveLegalName(customer.baseProfile),
    furigana:
      pickOptionalString(customer.baseProfile, CUSTOMER_KANA_FIELDS) ?? "",
    customerNumber: resolveCustomerNumber(customer),
    phone: resolveCustomerPhone(customer),
    email: resolveCustomerEmail(customer),
    totalCases: aggregates.totalCases ?? 0,
    activeCases: aggregates.activeCases ?? 0,
    lastContactDate:
      aggregates.lastContactDate ??
      pickOptionalString(
        customer.baseProfile,
        CUSTOMER_LAST_CONTACT_DATE_FIELDS,
      ),
    lastContactChannel:
      aggregates.lastContactChannel ??
      pickOptionalString(
        customer.baseProfile,
        CUSTOMER_LAST_CONTACT_CHANNEL_FIELDS,
      ),
    owner: resolveOwnerSummary(customer, aggregates),
    referralSource: resolveCustomerReferral(customer, aggregates),
    group: resolveCustomerGroup(customer, aggregates),
    bmvProfile: resolveCustomerBmvProfile(customer.baseProfile),
  };
}

/**
 * 将 Customer 领域实体映射为详情 DTO。
 *
 * @param customer - 客户领域实体
 * @param aggregates - 详情页聚合查询补充字段
 * @returns 管理端客户详情使用的稳定 DTO
 */
export function mapCustomerToDetailDto(
  customer: Customer,
  aggregates: CustomerDtoAggregates = {},
): CustomerDetailDto {
  const summary = mapCustomerToSummaryDto(customer, aggregates);
  return {
    ...summary,
    nationality:
      normalizeOptionalString(customer.baseProfile.nationality) ?? "",
    gender: normalizeOptionalString(customer.baseProfile.gender) ?? "",
    birthDate:
      pickOptionalString(customer.baseProfile, CUSTOMER_BIRTHDATE_FIELDS) ?? "",
    avatar:
      pickOptionalString(customer.baseProfile, CUSTOMER_AVATAR_FIELDS) ?? "",
    note: pickOptionalString(customer.baseProfile, CUSTOMER_NOTE_FIELDS) ?? "",
    archivedCases: aggregates.archivedCases ?? 0,
    caseNames: normalizeStringArray(aggregates.caseNames),
    lastCaseCreatedDate: aggregates.lastCaseCreatedDate ?? null,
  };
}
