import type {
  CustomerRelationFormFields,
  CustomerScope,
  CustomerSummary,
} from "../types";

/** 去重接口允许返回的命中字段键。 */
export const DUPLICATE_MATCH_FIELDS = ["name", "phone", "email"] as const;

/** 去重候选命中的字段类型。 */
export type CustomerDuplicateMatchField =
  (typeof DUPLICATE_MATCH_FIELDS)[number];

/** 客户列表查询参数。 */
export interface CustomerListParams {
  /** 数据权限范围。 */
  scope?: CustomerScope;
  /** 关键字搜索。 */
  search?: string;
  /** 分组筛选值。 */
  group?: string;
  /** 负责人筛选值。 */
  owner?: string;
  /** 是否仅显示有活跃案件的客户。 */
  activeCases?: "" | "yes" | "no";
  /** 当前页码。 */
  page?: number;
  /** 单页条数。 */
  limit?: number;
}

/** 客户列表接口返回结果。 */
export interface CustomerListResult {
  /** 当前页客户摘要。 */
  items: CustomerSummary[];
  /** 满足条件的总记录数。 */
  total: number;
}

/** 客户去重检查入参。 */
export interface CustomerDuplicateCheckInput {
  /** 待检查的姓名。 */
  name?: string;
  /** 待检查的手机号。 */
  phone?: string;
  /** 待检查的邮箱。 */
  email?: string;
  /** 需要从候选中排除的客户 ID。 */
  excludeCustomerId?: string;
}

/** 去重候选项。 */
export interface CustomerDuplicateCandidate {
  /** 客户 ID。 */
  id: string;
  /** 展示名。 */
  displayName: string;
  /** 法定姓名。 */
  legalName: string;
  /** 假名/ふりがな。 */
  furigana: string;
  /** 电话。 */
  phone: string;
  /** 邮箱。 */
  email: string;
  /** 所属分组。 */
  group: string;
  /** 命中的字段列表。 */
  matchedFields: CustomerDuplicateMatchField[];
}

/** 基础信息保存入参。 */
export interface CustomerBasicInfoUpdateInput {
  /** 展示名。 */
  displayName: string;
  /** 法定姓名。 */
  legalName: string;
  /** 假名读音。 */
  furigana: string;
  /** 国籍。 */
  nationality: string;
  /** 性别。 */
  gender: string;
  /** 出生日期。 */
  birthDate: string;
  /** 电话。 */
  phone: string;
  /** 邮箱。 */
  email: string;
  /** 分组。 */
  group: string;
  /** 负责人 ID。 */
  ownerId?: string;
  /** 来源/介绍人。 */
  referralSource: string;
  /** 头像 URL。 */
  avatar: string;
  /** 备注。 */
  note: string;
}

/** 关联人新增/编辑入参。 */
export interface CustomerRelationMutationInput extends CustomerRelationFormFields {
  /** 所属客户 ID。 */
  customerId: string;
}
