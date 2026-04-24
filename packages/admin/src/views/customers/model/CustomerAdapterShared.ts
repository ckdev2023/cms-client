import type { CustomerSummary } from "../types";

const CUSTOMER_NAME_FIELDS = [
  "displayName",
  "display_name",
  "legalName",
  "legal_name",
  "name",
  "name_cn",
  "name_en",
  "name_jp",
] as const;

export const CUSTOMER_KANA_FIELDS = ["kana", "furigana"] as const;
export const CUSTOMER_PHONE_FIELDS = [
  "phone",
  "phoneNumber",
  "mobile",
] as const;
export const CUSTOMER_EMAIL_FIELDS = ["email", "emailAddress"] as const;
export const CUSTOMER_GROUP_FIELDS = ["group", "group_id", "groupId"] as const;
export const CUSTOMER_BIRTHDATE_FIELDS = ["birthDate", "birthday"] as const;
export const CUSTOMER_REFERRAL_FIELDS = [
  "referralSource",
  "referral_source",
  "leadSource",
  "lead_source",
  "source",
] as const;
export const CUSTOMER_AVATAR_FIELDS = [
  "avatar",
  "avatarUrl",
  "avatar_url",
  "photo",
  "photo_url",
] as const;
export const CUSTOMER_NOTE_FIELDS = ["note", "notes", "memo"] as const;

type BaseProfileInput = {
  displayName: string;
  legalName: string;
  furigana: string;
  nationality: string;
  gender: string;
  birthDate: string;
  phone: string;
  email: string;
  group: string;
  referralSource: string;
  avatar: string;
  note: string;
  ownerId?: string;
};

function readContactField(
  entity: Record<string, unknown>,
  keys: readonly string[],
): string | null {
  const contacts = Array.isArray(entity.contacts) ? entity.contacts : [];
  for (const contact of contacts) {
    const record = asRecord(contact);
    if (!record) continue;
    const value = pickOptionalString(record, keys);
    if (value) return value;
  }
  return null;
}

/**
 * 将未知值收窄为普通对象记录。
 *
 * @param value - 待判断的任意值
 * @returns 可用对象时返回记录，否则返回 `null`
 */
export function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/**
 * 将可选字符串归一化为空值或去首尾空白后的文本。
 *
 * @param value - 原始输入值
 * @returns 有效字符串时返回 trim 后结果，否则返回 `null`
 */
export function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * 按候选字段顺序读取第一个非空字符串。
 *
 * @param record - 来源对象
 * @param keys - 候选字段名列表
 * @returns 第一个命中的非空字符串；未命中时返回 `null`
 */
export function pickOptionalString(
  record: Record<string, unknown>,
  keys: readonly string[],
): string | null {
  for (const key of keys) {
    const value = normalizeOptionalString(record[key]);
    if (value) return value;
  }
  return null;
}

/**
 * 读取对象上的字符串字段；缺失或类型不符时返回 `null`。
 *
 * @param record - 来源对象
 * @param key - 字段名
 * @returns 字符串字段值；缺失或类型不符时返回 `null`
 */
export function readStringField(
  record: Record<string, unknown>,
  key: string,
): string | null {
  return typeof record[key] === "string" ? record[key] : null;
}

/**
 * 读取允许为 `null` 的字符串字段。
 *
 * @param record - 来源对象
 * @param key - 字段名
 * @returns `undefined` 表示缺失，`null` 表示显式空值，其余返回字符串
 */
export function readNullableStringField(
  record: Record<string, unknown>,
  key: string,
): string | null | undefined {
  const value = record[key];
  if (value === undefined) return undefined;
  if (value === null) return null;
  return typeof value === "string" ? value : undefined;
}

/**
 * 从 number / number-like string 中解析有限数值。
 *
 * @param record - 来源对象
 * @param key - 字段名
 * @returns 有效数字时返回数值，否则返回 `null`
 */
export function readNumberField(
  record: Record<string, unknown>,
  key: string,
): number | null {
  const value = record[key];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string" || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * 验证值是否为纯字符串数组。
 *
 * @param value - 原始输入值
 * @returns 纯字符串数组时原样返回，否则返回 `null`
 */
export function readStringArray(value: unknown): string[] | null {
  return Array.isArray(value) && value.every((item) => typeof item === "string")
    ? value
    : null;
}

/**
 * 将表单快照转换为后端 `baseProfile` 结构。
 *
 * @param input - 客户基础信息快照
 * @returns 后端可消费的 `baseProfile` 对象
 */
export function buildBaseProfile(
  input: BaseProfileInput,
): Record<string, unknown> {
  const baseProfile: Record<string, unknown> = {
    displayName: input.displayName.trim(),
    legalName: input.legalName.trim(),
    name_cn: input.legalName.trim(),
    furigana: input.furigana.trim(),
    nationality: input.nationality.trim(),
    gender: input.gender.trim(),
    birthday: input.birthDate.trim(),
    phone: input.phone.trim(),
    email: input.email.trim(),
    group: input.group.trim(),
    referralSource: input.referralSource.trim(),
    avatar: input.avatar.trim(),
    note: input.note.trim(),
  };

  if (input.ownerId !== undefined) {
    baseProfile.owner_user_id = input.ownerId.trim();
  }

  return baseProfile;
}

/**
 * 解析客户展示名，兼容多种后端字段命名。
 *
 * @param baseProfile - 客户 `baseProfile` 对象
 * @returns 归一化后的展示名；缺失时返回空字符串
 */
export function resolveDisplayName(
  baseProfile: Record<string, unknown>,
): string {
  return pickOptionalString(baseProfile, CUSTOMER_NAME_FIELDS) ?? "";
}

/**
 * 优先读取法定姓名，缺失时回退到展示名。
 *
 * @param baseProfile - 客户 `baseProfile` 对象
 * @returns 法定姓名；无法解析时回退到展示名
 */
export function resolveLegalName(baseProfile: Record<string, unknown>): string {
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

/**
 * 解析客户电话，优先读取 `baseProfile`，再回退到联系人列表。
 *
 * @param entity - 客户 DTO 对象
 * @returns 归一化后的电话；缺失时返回空字符串
 */
export function resolvePhone(entity: Record<string, unknown>): string {
  const baseProfile = asRecord(entity.baseProfile) ?? {};
  const fromBaseProfile = pickOptionalString(
    baseProfile,
    CUSTOMER_PHONE_FIELDS,
  );
  if (fromBaseProfile) return fromBaseProfile;
  return readContactField(entity, CUSTOMER_PHONE_FIELDS) ?? "";
}

/**
 * 解析客户邮箱，优先读取 `baseProfile`，再回退到联系人列表。
 *
 * @param entity - 客户 DTO 对象
 * @returns 归一化后的邮箱；缺失时返回空字符串
 */
export function resolveEmail(entity: Record<string, unknown>): string {
  const baseProfile = asRecord(entity.baseProfile) ?? {};
  const fromBaseProfile = pickOptionalString(
    baseProfile,
    CUSTOMER_EMAIL_FIELDS,
  );
  if (fromBaseProfile) return fromBaseProfile;
  return readContactField(entity, CUSTOMER_EMAIL_FIELDS) ?? "";
}

/**
 * 将 owner DTO 归一化为列表页可消费的负责人对象。
 *
 * @param value - 原始 owner 字段
 * @returns 成功时返回负责人对象，失败时返回 `null`
 */
export function adaptOwner(value: unknown): CustomerSummary["owner"] | null {
  const record = asRecord(value);
  if (!record) return null;
  const initials = readStringField(record, "initials");
  const name = readStringField(record, "name");
  return initials !== null && name !== null ? { initials, name } : null;
}
