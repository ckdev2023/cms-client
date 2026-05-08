import type { CustomerCase } from "../types";
import {
  asRecord,
  pickOptionalString,
  readNullableStringField,
  readStringField,
} from "./CustomerAdapterShared";

/** cases API DTO 中 `adaptCustomerCaseDto` 依赖的权威主键名（p0-fe-002b-07 contract）。 */
// prettier-ignore
export const CUSTOMER_CASE_UPSTREAM_CONTRACT = ["id","caseName","caseTypeCode","stage","ownerUserId","createdAt","updatedAt"] as const;

const CUSTOMER_CASE_NAME_FIELDS = ["name", "caseName", "title"];
const CUSTOMER_CASE_NUMBER_FIELDS = ["caseNo", "caseNumber"];
// prettier-ignore
const CUSTOMER_CASE_TYPE_FIELDS = ["type","caseType","caseTypeCode","applicationType"];
const CUSTOMER_CASE_STAGE_FIELDS = ["stage", "workflowStage", "statusLabel"];
// prettier-ignore
const CUSTOMER_CASE_OWNER_FIELDS = ["ownerName","ownerDisplayName","assigneeName","ownerUserName","ownerUserId"];
// prettier-ignore
const CUSTOMER_CASE_OWNER_DISPLAY_NAME_FIELDS = ["ownerDisplayName","ownerName","assigneeName","ownerUserName"];
const CUSTOMER_CASE_OWNER_ID_FIELDS = ["ownerUserId", "ownerId", "assigneeId"];
const CUSTOMER_CASE_UPDATED_AT_FIELDS = ["updatedAt", "openedAt", "createdAt"];
const CUSTOMER_CASE_CREATED_AT_FIELDS = ["createdAt", "openedAt"];

function readCustomerCaseStatus(
  record: Record<string, unknown>,
): CustomerCase["status"] {
  const archivedAt = readNullableStringField(record, "archivedAt");
  if (typeof archivedAt === "string" && archivedAt.trim()) return "archived";
  const stageValue = pickOptionalString(record, [
    "stage",
    "stageId",
    "stageCode",
    "workflowStage",
  ]);
  if (stageValue === "S9") return "archived";
  const rawStatus = pickOptionalString(record, ["status", "caseStatus"]);
  return rawStatus?.toLowerCase() === "archived" ? "archived" : "active";
}

function unwrapSummaryCaseRecord(
  record: Record<string, unknown>,
): Record<string, unknown> {
  const nested = asRecord(record.case);
  if (!nested) return record;
  return { ...nested, ...record };
}

interface CustomerCaseOwnerFields {
  owner: string;
  ownerId?: string;
  ownerDisplayName?: string;
}

function readCustomerCaseOwnerFields(
  record: Record<string, unknown>,
): CustomerCaseOwnerFields {
  const ownerRecord = asRecord(record.owner);
  const nestedName = ownerRecord ? readStringField(ownerRecord, "name") : null;
  const nestedId = ownerRecord ? readStringField(ownerRecord, "id") : null;

  const displayName =
    nestedName ??
    pickOptionalString(record, CUSTOMER_CASE_OWNER_DISPLAY_NAME_FIELDS) ??
    undefined;
  const ownerId =
    pickOptionalString(record, CUSTOMER_CASE_OWNER_ID_FIELDS) ??
    nestedId ??
    undefined;
  const fallback =
    displayName ?? pickOptionalString(record, CUSTOMER_CASE_OWNER_FIELDS) ?? "";

  const fields: CustomerCaseOwnerFields = { owner: fallback };
  if (ownerId) fields.ownerId = ownerId;
  if (displayName) fields.ownerDisplayName = displayName;
  return fields;
}

function adaptCustomerCaseDto(value: unknown): CustomerCase | null {
  const raw = asRecord(value);
  if (!raw) return null;

  const record = unwrapSummaryCaseRecord(raw);
  const id = readStringField(record, "id");
  if (!id) return null;

  const caseNumber =
    pickOptionalString(record, CUSTOMER_CASE_NUMBER_FIELDS) ?? undefined;

  return {
    id,
    ...(caseNumber !== undefined ? { caseNumber } : {}),
    name:
      pickOptionalString(record, CUSTOMER_CASE_NAME_FIELDS) ?? caseNumber ?? "",
    type: pickOptionalString(record, CUSTOMER_CASE_TYPE_FIELDS) ?? "",
    stage: pickOptionalString(record, CUSTOMER_CASE_STAGE_FIELDS) ?? "",
    status: readCustomerCaseStatus(record),
    ...readCustomerCaseOwnerFields(record),
    createdAt:
      pickOptionalString(record, CUSTOMER_CASE_CREATED_AT_FIELDS) ?? "",
    updatedAt:
      pickOptionalString(record, CUSTOMER_CASE_UPDATED_AT_FIELDS) ?? "",
  };
}

/**
 * 解析关联案件列表接口返回值。
 *
 * @param value - 关联案件接口响应体
 * @returns 成功时返回案件列表，失败时返回 `null`
 */
export function adaptCustomerCaseListResult(
  value: unknown,
): CustomerCase[] | null {
  const items = Array.isArray(value)
    ? value
    : asRecord(value) && Array.isArray(asRecord(value)!.items)
      ? (asRecord(value)!.items as unknown[])
      : null;
  if (!items) return null;

  const adapted = items
    .map((item) => adaptCustomerCaseDto(item))
    .filter((item): item is CustomerCase => item !== null);
  return adapted.length === items.length ? adapted : null;
}
