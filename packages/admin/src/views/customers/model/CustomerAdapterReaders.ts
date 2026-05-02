import type { CustomerCreateFormFields, CustomerDetail } from "../types";
import type {
  CustomerBasicInfoUpdateInput,
  CustomerDuplicateCandidate,
  CustomerDuplicateCheckInput,
  CustomerDuplicateMatchField,
  CustomerListParams,
  CustomerRelationMutationInput,
} from "./CustomerAdapterTypes";
import {
  CUSTOMER_AVATAR_FIELDS,
  CUSTOMER_BIRTHDATE_FIELDS,
  CUSTOMER_GROUP_FIELDS,
  CUSTOMER_NOTE_FIELDS,
  CUSTOMER_REFERRAL_FIELDS,
  asRecord,
  buildBaseProfile,
  normalizeOptionalString,
  pickOptionalString,
} from "./CustomerAdapterShared";

type CustomerMutationPayload = {
  type: "individual" | "corporation";
  baseProfile: Record<string, unknown>;
};

type CustomerRelationMutationPayload = {
  customerId: string;
  name: string;
  relationType: string;
  roleTitle: string;
  phone: string;
  email: string;
};

function readOptionalCustomerField(
  value: unknown,
  keys: readonly string[],
): string {
  const record = asRecord(value);
  if (!record) return "";
  return pickOptionalString(record, keys) ?? "";
}

/**
 * 构造客户列表接口所需的查询参数。
 *
 * @param params - 列表筛选、分页参数
 * @returns 已过滤空值的 `URLSearchParams`
 */
export function buildCustomerListSearchParams(
  params: CustomerListParams,
): URLSearchParams {
  const searchParams = new URLSearchParams();
  if (params.scope) searchParams.set("scope", params.scope);
  if (normalizeOptionalString(params.search)) {
    searchParams.set("search", params.search!.trim());
  }
  if (normalizeOptionalString(params.group)) {
    searchParams.set("group", params.group!.trim());
  }
  if (normalizeOptionalString(params.owner)) {
    searchParams.set("owner", params.owner!.trim());
  }
  if (params.activeCases === "yes" || params.activeCases === "no") {
    searchParams.set("activeCases", params.activeCases);
  }
  if (typeof params.page === "number") {
    searchParams.set("page", String(params.page));
  }
  if (typeof params.limit === "number") {
    searchParams.set("limit", String(params.limit));
  }
  return searchParams;
}

/**
 * 将新建表单字段映射为后端创建 payload。
 *
 * BUG-187：根据 `customerType` 分流：
 * - `individual` 走 `buildBaseProfile`，保留所有个人字段（gender/birthday/nationality/visaType）。
 * - `corporation` 只携带法人相关字段（companyKana / representativeName），
 *   省略个人专属 schema 以避免 server `validateBaseProfile` 抛错。
 *
 * @param input - 新建客户表单字段
 * @returns 后端可接受的客户创建 payload
 */
export function buildCreateCustomerPayload(
  input: CustomerCreateFormFields,
): CustomerMutationPayload {
  if (input.customerType === "corporation") {
    return {
      type: "corporation",
      baseProfile: buildCorporationBaseProfile(input),
    };
  }
  return {
    type: "individual",
    baseProfile: buildBaseProfile({
      displayName: input.displayName,
      legalName: input.legalName,
      furigana: input.kana,
      nationality: input.nationality,
      gender: input.gender,
      birthDate: input.birthDate,
      phone: input.phone,
      email: input.email,
      group: input.group,
      referralSource: input.referrer,
      location: input.location,
      sourceType: input.sourceType,
      visaType: input.visaType,
      referrerName: input.referrerName,
      avatar: input.avatar,
      note: input.note,
    }),
  };
}

function trimToOptional(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function buildCorporationBaseProfile(
  input: CustomerCreateFormFields,
): Record<string, unknown> {
  return {
    displayName: input.displayName.trim(),
    legalName: input.legalName.trim(),
    companyKana: input.kana.trim(),
    representativeName: input.representativeName.trim(),
    phone: input.phone.trim(),
    email: input.email.trim(),
    group: input.group.trim(),
    referralSource: input.referrer.trim(),
    location: trimToOptional(input.location),
    sourceType: trimToOptional(input.sourceType),
    referrerName: trimToOptional(input.referrerName),
    avatar: input.avatar.trim(),
    note: input.note.trim(),
  };
}

/**
 * 将基础信息编辑表单映射为后端更新 payload。
 *
 * @param input - 基础信息更新输入
 * @returns 后端可接受的客户更新 payload
 */
export function buildUpdateCustomerPayload(
  input: CustomerBasicInfoUpdateInput,
): CustomerMutationPayload {
  return {
    type: "individual",
    baseProfile: buildBaseProfile(input),
  };
}

/**
 * 将关联人表单映射为后端 contact-person payload。
 *
 * @param input - 关联人新增/编辑输入
 * @returns 后端可接受的联系人 payload
 */
export function buildCustomerRelationPayload(
  input: CustomerRelationMutationInput,
): CustomerRelationMutationPayload {
  return {
    customerId: input.customerId.trim(),
    name: input.name.trim(),
    relationType: input.relationType,
    roleTitle: input.roleTitle.trim(),
    phone: input.phone.trim(),
    email: input.email.trim(),
  };
}

/**
 * 构造去重检查接口 payload。
 *
 * @param input - 去重检查输入
 * @returns 去除空白后的检查 payload
 */
export function buildCheckDuplicatesPayload(
  input: CustomerDuplicateCheckInput,
) {
  return {
    name: input.name?.trim() || undefined,
    phone: input.phone?.trim() || undefined,
    email: input.email?.trim() || undefined,
    excludeCustomerId: input.excludeCustomerId?.trim() || undefined,
  };
}

/**
 * 拼接客户详情接口地址。
 *
 * @param apiPath - 客户模块 API 根路径
 * @param id - 客户 ID
 * @returns 编码后的详情接口路径
 */
export function buildCustomerDetailPath(apiPath: string, id: string): string {
  return `${apiPath}/${encodeURIComponent(id)}`;
}

/**
 * 拼接联系人的详情/更新接口地址。
 *
 * @param apiPath - 联系人模块 API 根路径
 * @param id - 联系人 ID
 * @returns 编码后的联系人接口路径
 */
export function buildContactPersonPath(apiPath: string, id: string): string {
  return `${apiPath}/${encodeURIComponent(id)}`;
}

/**
 * 根据客户详情构造去重检查入参。
 *
 * @param customer - 当前客户详情
 * @returns 用于排除自身的去重检查 payload
 */
export function buildCustomerDuplicatePayloadForDetail(
  customer: CustomerDetail,
): CustomerDuplicateCheckInput {
  return {
    name: customer.legalName,
    phone: customer.phone,
    email: customer.email,
    excludeCustomerId: customer.id,
  };
}

/**
 * 将客户详情转成与去重接口一致的候选对象。
 *
 * @param customer - 当前客户详情
 * @param matchedFields - 命中的去重字段
 * @returns 标准化后的候选对象
 */
export function adaptDuplicateCandidateFromDetail(
  customer: CustomerDetail,
  matchedFields: CustomerDuplicateMatchField[],
): CustomerDuplicateCandidate {
  return {
    id: customer.id,
    displayName: customer.displayName,
    legalName: customer.legalName,
    furigana: customer.furigana,
    phone: customer.phone,
    email: customer.email,
    group: customer.group,
    matchedFields,
  };
}

/**
 * 读取客户分组字段。
 *
 * @param value - 任意客户对象
 * @returns 归一化后的分组值；缺失时返回空字符串
 */
export function readCustomerGroupLabel(value: unknown): string {
  return readOptionalCustomerField(value, CUSTOMER_GROUP_FIELDS);
}

/**
 * 读取客户生日字段。
 *
 * @param value - 任意客户对象
 * @returns 归一化后的生日值；缺失时返回空字符串
 */
export function readCustomerBirthDate(value: unknown): string {
  return readOptionalCustomerField(value, CUSTOMER_BIRTHDATE_FIELDS);
}

/**
 * 读取客户来源/介绍人字段。
 *
 * @param value - 任意客户对象
 * @returns 归一化后的来源值；缺失时返回空字符串
 */
export function readCustomerReferralSource(value: unknown): string {
  return readOptionalCustomerField(value, CUSTOMER_REFERRAL_FIELDS);
}

/**
 * 读取客户头像字段。
 *
 * @param value - 任意客户对象
 * @returns 归一化后的头像值；缺失时返回空字符串
 */
export function readCustomerAvatar(value: unknown): string {
  return readOptionalCustomerField(value, CUSTOMER_AVATAR_FIELDS);
}

/**
 * 读取客户备注字段。
 *
 * @param value - 任意客户对象
 * @returns 归一化后的备注值；缺失时返回空字符串
 */
export function readCustomerNote(value: unknown): string {
  return readOptionalCustomerField(value, CUSTOMER_NOTE_FIELDS);
}

/**
 * 读取客户对象中的经营管理签档案，兼容顶层 DTO 与 `baseProfile` 嵌套结构。
 *
 * @param value - 任意客户对象
 * @returns 命中的原始 `bmvProfile` 值；未命中时返回 `undefined`
 */
export function readCustomerBmvProfile(value: unknown): unknown {
  const record = asRecord(value);
  if (!record) return undefined;

  if ("bmvProfile" in record) return record.bmvProfile;
  if ("bmv_profile" in record) return record.bmv_profile;

  const baseProfile =
    asRecord(record.baseProfile) ?? asRecord(record.base_profile);
  if (!baseProfile) return undefined;

  if ("bmvProfile" in baseProfile) return baseProfile.bmvProfile;
  if ("bmv_profile" in baseProfile) return baseProfile.bmv_profile;
  return undefined;
}
