import { normalizeObject } from "../../../infra/utils/normalize";
import { resolveLocalizedNamesFromProfile } from "./customers.localized-names";
import {
  CUSTOMER_BMV_QUESTIONNAIRE_STATUSES,
  CUSTOMER_BMV_QUOTE_STATUSES,
  CUSTOMER_BMV_SIGN_STATUSES,
  CUSTOMER_LOCATIONS,
  CUSTOMER_RELATION_TYPES,
  CUSTOMER_SOURCE_TYPES,
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
];
const CUSTOMER_PHONE_FIELDS = ["phone", "phoneNumber", "mobile"];
const CUSTOMER_EMAIL_FIELDS = ["email", "emailAddress"];
const CUSTOMER_REFERRAL_FIELDS = [
  "referralSource",
  "referral_source",
  "leadSource",
  "lead_source",
  "source",
];
const CUSTOMER_BIRTHDATE_FIELDS = ["birthDate", "birthday"];
const CUSTOMER_AVATAR_FIELDS = [
  "avatar",
  "avatarUrl",
  "avatar_url",
  "photo",
  "photo_url",
];
const CUSTOMER_NOTE_FIELDS = ["note", "notes", "memo"];
const CUSTOMER_LAST_CONTACT_DATE_FIELDS = [
  "lastContactDate",
  "last_contact_date",
  "lastContactAt",
  "last_contact_at",
];
const CUSTOMER_LAST_CONTACT_CHANNEL_FIELDS = [
  "lastContactChannel",
  "last_contact_channel",
];
function isStringArrayMember(members, value) {
  return members.includes(value);
}
function pickOptionalString(record, fields) {
  for (const field of fields) {
    const value = normalizeOptionalString(record[field]);
    if (value) return value;
  }
  return null;
}
function pickNestedRecord(record, fields) {
  for (const field of fields) {
    const value = normalizeObject(record[field]);
    if (Object.keys(value).length > 0) return value;
  }
  return {};
}
function mergeBmvProfileRecord(baseProfile) {
  return {
    ...normalizeObject(baseProfile.bmv_profile),
    ...normalizeObject(baseProfile.bmvProfile),
  };
}
function pickOptionalStringFromContacts(customer, fields) {
  for (const contact of customer.contacts) {
    const value = pickOptionalString(contact, fields);
    if (value) return value;
  }
  return null;
}
function normalizeStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => normalizeOptionalString(item))
    .filter((item) => item !== null);
}
function deriveInitials(name) {
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
function normalizeCustomerRelationType(value) {
  const normalized = normalizeOptionalString(value);
  return normalized && isStringArrayMember(CUSTOMER_RELATION_TYPES, normalized)
    ? normalized
    : "other";
}
function resolveDisplayName(baseProfile) {
  return pickOptionalString(baseProfile, CUSTOMER_NAME_FIELDS) ?? "";
}
function resolveLegalName(baseProfile) {
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
function resolveOwnerSummary(customer, aggregates) {
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
function normalizeBmvStatus(raw, fields, allowed) {
  const value = pickOptionalString(raw, fields) ?? "not_started";
  return isStringArrayMember(allowed, value) ? value : "not_started";
}
function resolveCustomerNumber(customer) {
  return (
    pickOptionalString(customer.baseProfile, CUSTOMER_NUMBER_FIELDS) ??
    customer.id
  );
}
function resolveCustomerPhone(customer) {
  return (
    pickOptionalString(customer.baseProfile, CUSTOMER_PHONE_FIELDS) ??
    pickOptionalStringFromContacts(customer, CUSTOMER_PHONE_FIELDS) ??
    ""
  );
}
function resolveCustomerEmail(customer) {
  return (
    pickOptionalString(customer.baseProfile, CUSTOMER_EMAIL_FIELDS) ??
    pickOptionalStringFromContacts(customer, CUSTOMER_EMAIL_FIELDS) ??
    ""
  );
}
function resolveCustomerReferral(customer, aggregates) {
  return (
    normalizeOptionalString(aggregates.referralSource) ??
    pickOptionalString(customer.baseProfile, CUSTOMER_REFERRAL_FIELDS) ??
    ""
  );
}
function resolveCustomerGroup(customer, aggregates) {
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
 * @returns 规范化后的经营管理签档案；空缺时返回 `not_started` 默认值
 */
export function resolveCustomerBmvProfile(baseProfile) {
  return normalizeCustomerBmvProfile(mergeBmvProfileRecord(baseProfile));
}
/**
 * 创建经营管理签档案默认值。
 *
 * @returns 初始状态下的经营管理签档案
 */
export function createDefaultCustomerBmvProfile() {
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
    sourceLeadId: null,
    currentQuoteFormId: null,
    visaPlan: null,
    quoteAmount: null,
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
export function resolveCustomerBmvIntakeStatus(profile) {
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
 * @returns 规范化后的经营管理签承接档案；空对象时返回 `not_started` 默认值
 */
export function normalizeCustomerBmvProfile(value) {
  const raw = normalizeObject(value);
  if (Object.keys(raw).length === 0) return createDefaultCustomerBmvProfile();
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
    sourceLeadId: pickOptionalString(raw, ["sourceLeadId", "source_lead_id"]),
    currentQuoteFormId: pickOptionalString(raw, [
      "currentQuoteFormId",
      "current_quote_form_id",
    ]),
    visaPlan: pickOptionalString(raw, ["visaPlan", "visa_plan"]),
    quoteAmount: normalizeOptionalNumber(raw),
  };
}
function normalizeOptionalNumber(raw) {
  for (const key of ["quoteAmount", "quote_amount"]) {
    const v = raw[key];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string") {
      const n = Number(v);
      if (Number.isFinite(n)) return n;
    }
  }
  return null;
}
/**
 * 将 ContactPerson 适配为客户关联人 DTO。
 *
 * @param contactPerson - `contact_persons` 领域实体
 * @returns 管理端关系 Tab 所需的关联人 DTO
 */
export function mapContactPersonToCustomerRelationDto(contactPerson) {
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
export function mapCustomerToSummaryDto(customer, aggregates = {}) {
  return {
    id: customer.id,
    type: customer.type,
    displayName: resolveDisplayName(customer.baseProfile),
    legalName: resolveLegalName(customer.baseProfile),
    localizedNames: resolveLocalizedNamesFromProfile(customer.baseProfile),
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
function pickEnum(bp, fields, allowed) {
  const raw = pickOptionalString(bp, fields);
  return raw && allowed.includes(raw) ? raw : null;
}
/**
 * 将 Customer 领域实体映射为详情 DTO。
 *
 * @param customer - 客户领域实体
 * @param aggregates - 详情页聚合查询补充字段
 * @returns 管理端客户详情使用的稳定 DTO
 */
export function mapCustomerToDetailDto(customer, aggregates = {}) {
  const summary = mapCustomerToSummaryDto(customer, aggregates);
  const bp = customer.baseProfile;
  return {
    ...summary,
    nationality: normalizeOptionalString(bp.nationality) ?? "",
    gender: normalizeOptionalString(bp.gender) ?? "",
    birthDate: pickOptionalString(bp, CUSTOMER_BIRTHDATE_FIELDS) ?? "",
    avatar: pickOptionalString(bp, CUSTOMER_AVATAR_FIELDS) ?? "",
    note: pickOptionalString(bp, CUSTOMER_NOTE_FIELDS) ?? "",
    location: pickEnum(bp, ["location"], CUSTOMER_LOCATIONS),
    sourceType: pickEnum(
      bp,
      ["sourceType", "source_type"],
      CUSTOMER_SOURCE_TYPES,
    ),
    visaType:
      summary.bmvProfile.visaPlan ??
      pickOptionalString(bp, ["visaType", "visa_type"]),
    referrerName: pickOptionalString(bp, ["referrerName", "referrer_name"]),
    archivedCases: aggregates.archivedCases ?? 0,
    caseNames: normalizeStringArray(aggregates.caseNames),
    lastCaseCreatedDate: aggregates.lastCaseCreatedDate ?? null,
  };
}
//# sourceMappingURL=customers.dto-mappers.js.map
