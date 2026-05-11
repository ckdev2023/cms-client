import { BadRequestException } from "@nestjs/common";

import type { Customer } from "../model/coreEntities";
import { requireTimestampString } from "../model/timestamps";
import { normalizeObject } from "../../../infra/utils/normalize";
import { CUSTOMER_LOCATIONS, CUSTOMER_SOURCE_TYPES } from "./customers.types";
import type { CustomerQueryRow } from "./customers.types";

type BaseProfileSchemaField = {
  type: "string" | "date";
};

const INDIVIDUAL_BASE_PROFILE_SCHEMA: Record<string, BaseProfileSchemaField> = {
  name_cn: { type: "string" },
  name_en: { type: "string" },
  name_jp: { type: "string" },
  gender: { type: "string" },
  nationality: { type: "string" },
  birthday: { type: "date" },
  birthplace: { type: "string" },
  passport_no: { type: "string" },
  passport_expiry_date: { type: "date" },
  residence_card_no: { type: "string" },
  residence_expiry_date: { type: "date" },
};

const INDIVIDUAL_REQUIRED_NAME_FIELDS = ["name_cn", "name_en", "name_jp"];

/** 客户查询字段列表。 */
export const CUSTOMER_COLS =
  "id, org_id, type, base_profile, contacts, created_at, updated_at";

/** 客户姓名类字段。 */
export const CUSTOMER_NAME_FIELDS = [
  "displayName",
  "display_name",
  "legalName",
  "legal_name",
  "name",
  "name_cn",
  "name_en",
  "name_jp",
] as const;

/** 客户假名类字段。 */
export const CUSTOMER_KANA_FIELDS = ["kana", "furigana"] as const;

export const CUSTOMER_OWNER_FIELDS = ["owner_user_id", "ownerUserId"] as const;

/**
 * 若档案中尚无有效负责人字段，则将创建人设为默认负责人。
 * Admin 直连创建客户时需与线索转化路径对齐，否则「我的」范围筛选不到新客户。
 *
 * @param baseProfile - 已与 localizedNames 等合并后的基础档案
 * @param defaultOwnerUserId - 当前操作者用户 ID
 * @returns 可能补全 `ownerUserId` 后的档案副本
 */
export function applyDefaultCustomerOwnerIfMissing(
  baseProfile: Record<string, unknown>,
  defaultOwnerUserId: string,
): Record<string, unknown> {
  for (const key of CUSTOMER_OWNER_FIELDS) {
    const value = baseProfile[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return baseProfile;
    }
  }
  return { ...baseProfile, ownerUserId: defaultOwnerUserId };
}

export const CUSTOMER_GROUP_FIELDS = ["group", "group_id", "groupId"] as const;
const CUSTOMER_COLLABORATOR_FIELDS = [
  "collaborator_user_ids",
  "collaboratorUserIds",
] as const;
function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * 将数据库行映射为 Customer 实体。
 * @param row 数据库查询结果行
 * @returns 领域层 Customer 实体
 */
export function mapCustomerRow(row: CustomerQueryRow): Customer {
  return {
    id: row.id,
    orgId: row.org_id,
    type: row.type,
    baseProfile: normalizeObject(row.base_profile),
    contacts: Array.isArray(row.contacts)
      ? row.contacts.map(normalizeObject)
      : [],
    createdAt: requireTimestampString(row.created_at, "created_at"),
    updatedAt: requireTimestampString(row.updated_at, "updated_at"),
  };
}

/**
 * 规范化可选字符串，空白值返回 `null`。
 * @param value 任意输入值
 * @returns 规范化后的字符串或 `null`
 */
export function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * 规范化可比较字符串，统一为小写。
 * @param value 任意输入值
 * @returns 规范化后的字符串或 `null`
 */
export function normalizeComparableString(value: unknown): string | null {
  const normalized = normalizeOptionalString(value);
  return normalized ? normalized.toLowerCase() : null;
}

/**
 * 规范化电话号码，仅保留数字。
 * @param value 任意输入值
 * @returns 仅数字的电话号码或 `null`
 */
export function normalizePhone(value: unknown): string | null {
  const normalized = normalizeOptionalString(value);
  if (!normalized) return null;

  const digits = normalized.replace(/[^0-9]+/g, "");
  return digits.length > 0 ? digits : null;
}

/**
 * 向 SQL 参数数组追加参数并返回占位符引用。
 * @param params SQL 参数数组
 * @param value 待追加的参数值
 * @returns PostgreSQL 参数占位符
 */
export function pushParam(params: unknown[], value: unknown): string {
  params.push(value);
  return `$${String(params.length)}`;
}

/**
 * 构造客户有效记录谓词，排除软删除数据。
 * @param alias SQL 表别名
 * @returns SQL 谓词片段
 */
export function activeCustomerPredicate(alias?: string): string {
  const prefix = alias ? `${alias}.` : "";
  return `coalesce(${prefix}base_profile->>'status', '') is distinct from 'deleted'`;
}

/**
 * 收集客户可用于去重比对的姓名字段。
 * @param baseProfile 客户基础档案
 * @returns 归一化后的姓名集合
 */
export function collectComparableNames(
  baseProfile: Record<string, unknown>,
): string[] {
  return [...CUSTOMER_NAME_FIELDS, ...CUSTOMER_KANA_FIELDS]
    .map((field) => normalizeComparableString(baseProfile[field]))
    .filter((value): value is string => value !== null);
}

/**
 * 提取客户负责人 ID。
 * @param customer 客户实体
 * @returns 负责人 ID 或 `null`
 */
export function getCustomerOwnerUserId(customer: Customer): string | null {
  for (const field of CUSTOMER_OWNER_FIELDS) {
    const value = normalizeOptionalString(customer.baseProfile[field]);
    if (value) return value;
  }
  return null;
}

/**
 * 提取客户协作者 ID 列表。
 * @param customer 客户实体
 * @returns 去重后的协作者 ID 集合
 */
export function getCustomerCollaboratorUserIds(customer: Customer): string[] {
  const values = new Set<string>();

  for (const field of CUSTOMER_COLLABORATOR_FIELDS) {
    const raw = customer.baseProfile[field];
    if (!Array.isArray(raw)) continue;

    for (const item of raw) {
      const value = normalizeOptionalString(item);
      if (value) values.add(value);
    }
  }

  return [...values];
}

/**
 * 规范化并去重 ID 列表。
 * @param ids 原始 ID 列表
 * @param fieldName 字段名
 * @returns 去重后的 ID 列表
 */
export function normalizeDistinctIds(
  ids: string[],
  fieldName: string,
): string[] {
  const values = ids.map((id) => id.trim()).filter((id) => id.length > 0);

  if (values.length === 0) {
    throw new BadRequestException(`${fieldName} must contain at least one id`);
  }

  return [...new Set(values)];
}

/**
 * 校验客户基础档案结构。
 * @param type 客户类型
 * @param baseProfile 客户基础档案
 * @returns 校验通过后的基础档案对象
 */
export function validateBaseProfile(
  type: string,
  baseProfile: unknown,
): Record<string, unknown> {
  if (!isPlainRecord(baseProfile)) {
    throw new BadRequestException("baseProfile must be an object");
  }
  if (type !== "individual") return baseProfile;

  // BUG-137：可选日期/字符串字段允许空字符串入参，统一在校验前剥离空字符串，
  // 避免直接 curl 或历史客户端发送 `birthday=""` 时被当作非法日期。
  const sanitized = stripEmptySchemaFields(baseProfile);

  const errors: string[] = [];
  validateRequiredName(sanitized, errors);
  validateSchemaFields(sanitized, errors);
  validateEnumField(sanitized, "location", CUSTOMER_LOCATIONS, errors);
  validateEnumField(sanitized, "sourceType", CUSTOMER_SOURCE_TYPES, errors);
  validateOptionalStringField(sanitized, "visaType", errors);
  validateOptionalStringField(sanitized, "referrerName", errors);

  if (errors.length > 0) {
    throw new BadRequestException(`Invalid baseProfile: ${errors.join("; ")}`);
  }
  return sanitized;
}

function stripEmptySchemaFields(
  baseProfile: Record<string, unknown>,
): Record<string, unknown> {
  const next: Record<string, unknown> = { ...baseProfile };
  for (const field of Object.keys(INDIVIDUAL_BASE_PROFILE_SCHEMA)) {
    const value = next[field];
    if (typeof value === "string" && value.trim().length === 0) {
      next[field] = undefined;
      Reflect.deleteProperty(next, field);
    }
  }
  return next;
}

function validateRequiredName(
  baseProfile: Record<string, unknown>,
  errors: string[],
): void {
  const hasName = INDIVIDUAL_REQUIRED_NAME_FIELDS.some((field) =>
    isNonEmptyString(baseProfile[field]),
  );
  if (!hasName) {
    errors.push("at least one of name_cn, name_en or name_jp is required");
  }
}

function validateSchemaFields(
  baseProfile: Record<string, unknown>,
  errors: string[],
): void {
  for (const [field, schema] of Object.entries(
    INDIVIDUAL_BASE_PROFILE_SCHEMA,
  )) {
    const value = baseProfile[field];
    if (value === undefined || value === null) continue;
    if (schema.type === "string") {
      if (typeof value !== "string") errors.push(`${field} must be a string`);
      continue;
    }
    if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
      errors.push(`${field} must be a valid date string`);
    }
  }
}

function validateEnumField(
  profile: Record<string, unknown>,
  field: string,
  allowed: readonly string[],
  errors: string[],
): void {
  const value = profile[field];
  if (value === undefined || value === null) return;
  if (typeof value !== "string" || !allowed.includes(value)) {
    errors.push(`${field} must be one of ${allowed.join(", ")}`);
  }
}

function validateOptionalStringField(
  profile: Record<string, unknown>,
  field: string,
  errors: string[],
): void {
  const value = profile[field];
  if (value === undefined || value === null) return;
  if (typeof value !== "string") {
    errors.push(`${field} must be a string`);
  }
}
