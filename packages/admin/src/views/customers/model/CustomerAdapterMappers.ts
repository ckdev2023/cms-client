import type {
  CustomerDetail,
  CustomerRelation,
  CustomerSummary,
  RelationType,
} from "../types";
import { resolveBmvIntakeStatus, type CustomerBmvProfile } from "../types-bmv";
import {
  DUPLICATE_MATCH_FIELDS,
  type CustomerDuplicateCandidate,
  type CustomerDuplicateMatchField,
  type CustomerListResult,
} from "./CustomerAdapterTypes";
import { readCustomerBmvProfile } from "./CustomerAdapterReaders";
import {
  CUSTOMER_GROUP_FIELDS,
  CUSTOMER_KANA_FIELDS,
  adaptOwner,
  asRecord,
  normalizeOptionalString,
  pickOptionalString,
  readNullableStringField,
  readNumberField,
  readStringArray,
  readStringField,
  resolveDisplayName,
  resolveEmail,
  resolveLegalName,
  resolvePhone,
} from "./CustomerAdapterShared";

const BMV_QUESTIONNAIRE_STATUSES = ["not_started", "sent", "returned"] as const;
const BMV_QUOTE_STATUSES = ["not_started", "generated", "confirmed"] as const;
const BMV_SIGN_STATUSES = ["not_started", "pending", "signed"] as const;
// prettier-ignore
const BMV_INTAKE_STATUSES = ["not_started","questionnaire_pending","quote_pending","sign_pending","ready_for_case_creation"] as const;

export {
  CUSTOMER_CASE_UPSTREAM_CONTRACT,
  adaptCustomerCaseListResult,
} from "./CustomerAdapterCaseMapper";

const CONTACT_PERSON_RELATION_FIELDS = ["relationType", "relation_type"];
const CONTACT_PERSON_ROLE_FIELDS = ["roleTitle", "role_title"];
const CONTACT_PERSON_PHONE_FIELDS = ["phone", "phoneNumber"];
const CONTACT_PERSON_EMAIL_FIELDS = ["email", "emailAddress"];
function normalizeRelationType(value: unknown): RelationType {
  switch (normalizeOptionalString(value)?.toLowerCase()) {
    case "spouse":
      return "spouse";
    case "parent":
      return "parent";
    case "child":
      return "child";
    case "agent":
    case "representative":
    case "advisor":
    case "consultant":
      return "agent";
    default:
      return "other";
  }
}

function readBmvFields(record: Record<string, unknown>) {
  return {
    questionnaireStatus: pickOptionalString(record, [
      "questionnaireStatus",
      "questionnaire_status",
    ]),
    quoteStatus: pickOptionalString(record, ["quoteStatus", "quote_status"]),
    signStatus: pickOptionalString(record, ["signStatus", "sign_status"]),
    intakeStatus: pickOptionalString(record, ["intakeStatus", "intake_status"]),
    questionnaireSentAt: readNullableStringFieldByKeys(record, [
      "questionnaireSentAt",
      "questionnaire_sent_at",
    ]),
    questionnaireReturnedAt: readNullableStringFieldByKeys(record, [
      "questionnaireReturnedAt",
      "questionnaire_returned_at",
    ]),
    quoteGeneratedAt: readNullableStringFieldByKeys(record, [
      "quoteGeneratedAt",
      "quote_generated_at",
    ]),
    quoteConfirmedAt: readNullableStringFieldByKeys(record, [
      "quoteConfirmedAt",
      "quote_confirmed_at",
    ]),
    signedAt: readNullableStringFieldByKeys(record, ["signedAt", "signed_at"]),
    note: readNullableStringFieldByKeys(record, ["note", "memo"]),
    sourceLeadId: readNullableStringFieldByKeys(record, [
      "sourceLeadId",
      "source_lead_id",
    ]),
    leadGroupId: readNullableStringFieldByKeys(record, [
      "leadGroupId",
      "lead_group_id",
    ]),
    leadOwnerUserId: readNullableStringFieldByKeys(record, [
      "leadOwnerUserId",
      "lead_owner_user_id",
    ]),
  };
}

function readNullableStringFieldByKeys(
  record: Record<string, unknown>,
  keys: readonly string[],
): string | null | undefined {
  for (const key of keys) {
    const value = readNullableStringField(record, key);
    if (value !== undefined) return value;
  }
  return undefined;
}

function isEnumMember<T extends string>(
  value: string | null,
  allowed: readonly T[],
): value is T {
  return value !== null && allowed.includes(value as T);
}

function hasBmvFieldValue(fields: ReturnType<typeof readBmvFields>): boolean {
  return Object.values(fields).some(
    (field) => field !== undefined && field !== null,
  );
}

function normalizeBmvStatus<T extends string>(
  value: string | null,
  allowed: readonly T[],
): T | "not_started" {
  return isEnumMember(value, allowed) ? value : "not_started";
}

function resolveStatuses(fields: ReturnType<typeof readBmvFields>) {
  const questionnaireStatus = normalizeBmvStatus(
    fields.questionnaireStatus,
    BMV_QUESTIONNAIRE_STATUSES,
  );
  const quoteStatus = normalizeBmvStatus(
    fields.quoteStatus,
    BMV_QUOTE_STATUSES,
  );
  const signStatus = normalizeBmvStatus(fields.signStatus, BMV_SIGN_STATUSES);
  const intakeStatus = isEnumMember(fields.intakeStatus, BMV_INTAKE_STATUSES)
    ? fields.intakeStatus
    : resolveBmvIntakeStatus({ questionnaireStatus, quoteStatus, signStatus });
  return { questionnaireStatus, quoteStatus, signStatus, intakeStatus };
}

function buildBmvProfile(
  fields: ReturnType<typeof readBmvFields>,
): CustomerBmvProfile {
  return {
    ...resolveStatuses(fields),
    questionnaireSentAt: fields.questionnaireSentAt ?? null,
    questionnaireReturnedAt: fields.questionnaireReturnedAt ?? null,
    quoteGeneratedAt: fields.quoteGeneratedAt ?? null,
    quoteConfirmedAt: fields.quoteConfirmedAt ?? null,
    signedAt: fields.signedAt ?? null,
    note: fields.note ?? null,
    sourceLeadId: fields.sourceLeadId ?? null,
    leadGroupId: fields.leadGroupId ?? null,
    leadOwnerUserId: fields.leadOwnerUserId ?? null,
  };
}
/**
 * 解析客户 BMV 档案。
 * @param value - 后端返回的 BMV 档案片段
 * @returns 标准化档案或 null
 */
export function adaptBmvProfile(value: unknown): CustomerBmvProfile | null {
  if (value == null) return null;
  const record = asRecord(value);
  if (!record) return null;
  const fields = readBmvFields(record);
  return hasBmvFieldValue(fields) ? buildBmvProfile(fields) : null;
}
function readSummaryFields(record: Record<string, unknown>) {
  return {
    id: readStringField(record, "id"),
    displayName: readStringField(record, "displayName"),
    legalName: readStringField(record, "legalName"),
    furigana: readStringField(record, "furigana"),
    customerNumber: readStringField(record, "customerNumber"),
    phone: readStringField(record, "phone"),
    email: readStringField(record, "email"),
    totalCases: readNumberField(record, "totalCases"),
    activeCases: readNumberField(record, "activeCases"),
    lastContactDate: readNullableStringField(record, "lastContactDate"),
    lastContactChannel: readNullableStringField(record, "lastContactChannel"),
    owner: adaptOwner(record.owner),
    referralSource: readStringField(record, "referralSource"),
    group: readStringField(record, "group"),
    bmvProfile: adaptBmvProfile(readCustomerBmvProfile(record)),
  };
}
function isPresent<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}
function hasRequiredSummaryFields(
  fields: ReturnType<typeof readSummaryFields>,
): boolean {
  return (
    [
      fields.id,
      fields.displayName,
      fields.legalName,
      fields.furigana,
      fields.customerNumber,
      fields.phone,
      fields.email,
      fields.totalCases,
      fields.activeCases,
      fields.owner,
      fields.referralSource,
      fields.group,
    ].every(isPresent) &&
    fields.lastContactDate !== undefined &&
    fields.lastContactChannel !== undefined
  );
}
function hasValidSummaryBmv(record: Record<string, unknown>): boolean {
  const rawBmvProfile = readCustomerBmvProfile(record);
  return rawBmvProfile == null || typeof rawBmvProfile === "object";
}
function isValidSummaryRecord(
  record: Record<string, unknown>,
  fields: ReturnType<typeof readSummaryFields>,
): boolean {
  return hasRequiredSummaryFields(fields) && hasValidSummaryBmv(record);
}
function stringOrEmpty(record: Record<string, unknown>, key: string): string {
  return readStringField(record, key) ?? "";
}

function readDetailFields(record: Record<string, unknown>) {
  return {
    nationality: stringOrEmpty(record, "nationality"),
    gender: stringOrEmpty(record, "gender"),
    birthDate: stringOrEmpty(record, "birthDate"),
    avatar: stringOrEmpty(record, "avatar"),
    note: stringOrEmpty(record, "note"),
    location: stringOrEmpty(record, "location"),
    sourceType: stringOrEmpty(record, "sourceType"),
    visaType: stringOrEmpty(record, "visaType"),
    referrerName: stringOrEmpty(record, "referrerName"),
    archivedCases: readNumberField(record, "archivedCases") ?? 0,
    caseNames: readStringArray(record.caseNames) ?? [],
    caseTitles: readStringArray(record.caseTitles) ?? [],
    lastCaseCreatedDate:
      readNullableStringField(record, "lastCaseCreatedDate") ?? null,
  };
}
function adaptDuplicateCandidateItem(
  value: unknown,
): CustomerDuplicateCandidate | null {
  const record = asRecord(value);
  const customer = record ? asRecord(record.customer) : null;
  const matchedFields = readStringArray(record?.matchedFields);
  const baseProfile = customer ? (asRecord(customer.baseProfile) ?? {}) : null;
  if (!customer || !baseProfile || !matchedFields) return null;

  const id = readStringField(customer, "id");
  const normalizedMatchedFields = matchedFields.filter(
    (field): field is CustomerDuplicateMatchField =>
      DUPLICATE_MATCH_FIELDS.includes(field as CustomerDuplicateMatchField),
  );
  if (!id || normalizedMatchedFields.length !== matchedFields.length)
    return null;

  return {
    id,
    displayName: resolveDisplayName(baseProfile),
    legalName: resolveLegalName(baseProfile),
    furigana: pickOptionalString(baseProfile, CUSTOMER_KANA_FIELDS) ?? "",
    phone: resolvePhone(customer),
    email: resolveEmail(customer),
    group: pickOptionalString(baseProfile, CUSTOMER_GROUP_FIELDS) ?? "",
    matchedFields: normalizedMatchedFields,
  };
}

/**
 * 将后端联系人 DTO 转成前端 `CustomerRelation`。
 *
 * @param value - 任意联系人响应对象
 * @returns 成功时返回关联人对象，失败时返回 `null`
 */
export function adaptCustomerRelationDto(
  value: unknown,
): CustomerRelation | null {
  const record = asRecord(value);
  if (!record) return null;

  const id = readStringField(record, "id");
  const name = readStringField(record, "name");
  if (!id || !name) return null;

  const roleTitle = pickOptionalString(record, CONTACT_PERSON_ROLE_FIELDS);
  return {
    id,
    name,
    kana: "",
    relationType: normalizeRelationType(
      pickOptionalString(record, CONTACT_PERSON_RELATION_FIELDS),
    ),
    phone: pickOptionalString(record, CONTACT_PERSON_PHONE_FIELDS) ?? "",
    email: pickOptionalString(record, CONTACT_PERSON_EMAIL_FIELDS) ?? "",
    tags: roleTitle ? [roleTitle] : [],
    note: "",
  };
}

/**
 * 解析关联人列表接口返回值。
 *
 * @param value - 关联人接口响应体
 * @returns 成功时返回关联人列表，失败时返回 `null`
 */
export function adaptCustomerRelationListResult(
  value: unknown,
): CustomerRelation[] | null {
  const items = Array.isArray(value)
    ? value
    : asRecord(value) && Array.isArray(asRecord(value)!.items)
      ? (asRecord(value)!.items as unknown[])
      : null;
  if (!items) return null;

  const adapted = items
    .map((item) => adaptCustomerRelationDto(item))
    .filter((item): item is CustomerRelation => item !== null);
  return adapted.length === items.length ? adapted : null;
}

/**
 * 将后端客户摘要 DTO 转成前端 `CustomerSummary`。
 *
 * @param value - 任意后端响应对象
 * @returns 成功时返回摘要对象，失败时返回 `null`
 */
export function adaptCustomerSummaryDto(
  value: unknown,
): CustomerSummary | null {
  const record = asRecord(value);
  if (!record) return null;

  const fields = readSummaryFields(record);
  return isValidSummaryRecord(record, fields)
    ? (fields as CustomerSummary)
    : null;
}

/**
 * 将后端客户详情 DTO 转成前端 `CustomerDetail`。
 *
 * @param value - 任意后端响应对象
 * @returns 成功时返回详情对象，失败时返回 `null`
 */
export function adaptCustomerDetailDto(value: unknown): CustomerDetail | null {
  const summary = adaptCustomerSummaryDto(value);
  const record = asRecord(value);
  if (!summary || !record) return null;

  const fields = readDetailFields(record);
  return { ...summary, ...fields };
}

/**
 * 解析客户列表接口返回值。
 *
 * @param value - 列表接口响应体
 * @returns 成功时返回列表结果，失败时返回 `null`
 */
export function adaptCustomerListResult(
  value: unknown,
): CustomerListResult | null {
  const record = asRecord(value);
  if (!record || !Array.isArray(record.items)) return null;

  const items = record.items
    .map((item) => adaptCustomerSummaryDto(item))
    .filter((item): item is CustomerSummary => item !== null);
  const total = readNumberField(record, "total");

  return items.length === record.items.length && total !== null
    ? { items, total }
    : null;
}

/**
 * 解析客户去重接口返回的候选列表。
 *
 * @param value - 去重接口响应体
 * @returns 成功时返回候选列表，失败时返回 `null`
 */
export function adaptCustomerDuplicateCandidates(
  value: unknown,
): CustomerDuplicateCandidate[] | null {
  if (!Array.isArray(value)) return null;

  const items = value
    .map((item) => adaptDuplicateCandidateItem(item))
    .filter((item): item is CustomerDuplicateCandidate => item !== null);

  return items.length === value.length ? items : null;
}

/**
 * 解析批量操作接口返回结果。
 *
 * @param value - 批量接口响应体
 * @returns 成功时返回更新数量，失败时返回 `null`
 */
export function adaptBulkMutationResult(
  value: unknown,
): { ok: true; updatedCount: number } | null {
  const record = asRecord(value);
  const ok = record?.ok === true;
  const updatedCount = record ? readNumberField(record, "updatedCount") : null;
  return ok && updatedCount !== null ? { ok: true, updatedCount } : null;
}
