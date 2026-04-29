import type { Group, UserGroupMembership } from "../model/coreEntities";

// ────────────────────────────────────────────────────────────────
// 错误码 — controller / admin adapter 依赖这些 code 映射 i18n key
// ────────────────────────────────────────────────────────────────

export const GROUP_WRITE_ERROR_CODES = {
  NOT_FOUND: "GROUP_NOT_FOUND",
  DUPLICATE_NAME: "GROUP_DUPLICATE_NAME",
  ALREADY_DISABLED: "GROUP_ALREADY_DISABLED",
} as const;

/** Group 写操作错误码联合类型。 */
export type GroupWriteErrorCode =
  (typeof GROUP_WRITE_ERROR_CODES)[keyof typeof GROUP_WRITE_ERROR_CODES];

// ────────────────────────────────────────────────────────────────
// 查询参数
// ────────────────────────────────────────────────────────────────

/** 列表查询状态过滤。 */
export type GroupStatusFilter = "active" | "disabled";

/** 列表查询请求参数。 */
export type GroupListInput = {
  status?: GroupStatusFilter;
};

// ────────────────────────────────────────────────────────────────
// 写操作入参
// ────────────────────────────────────────────────────────────────

/** 新建 Group 请求参数。 */
export type CreateGroupInput = {
  name: string;
  description?: string | null;
};

/** 重命名 Group 请求参数。 */
export type RenameGroupInput = {
  name: string;
};

/** 停用 Group 请求参数。 */
export type DisableGroupInput = {
  reason?: string | null;
};

// ────────────────────────────────────────────────────────────────
// 读 DTO — 列表 / 详情 / 成员 / 引用计数
// ────────────────────────────────────────────────────────────────

/**
 * Group 列表项 DTO — 附加聚合计数（活跃案件数 / 成员数）。
 *
 * 对齐页面规格 §2.1：Group 名称、状态、创建时间、活跃案件数、成员数。
 */
export type GroupSummaryDto = Pick<
  Group,
  | "id"
  | "orgId"
  | "groupNo"
  | "name"
  | "description"
  | "activeFlag"
  | "createdAt"
> & {
  activeCaseCount: number;
  memberCount: number;
};

/** Group 列表分页结果 DTO。 */
export type GroupListResultDto = {
  items: GroupSummaryDto[];
  total: number;
};

/**
 * Group 成员 DTO — 从 UserGroupMembership + User 联表投影。
 *
 * 对齐页面规格 §3 Group 详情的成员列表。
 */
export type GroupMemberDto = Pick<
  UserGroupMembership,
  "id" | "isPrimaryGroup" | "activeFlag" | "joinedAt"
> & {
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
};

/**
 * Group 引用计数 — disable 确认弹窗与 timeline payload 共用。
 *
 * 对齐页面规格 §5：停用有引用的 Group 时弹出确认提示。
 */
export type GroupReferenceCounts = {
  customerCount: number;
  caseCount: number;
};

/**
 * Group 详情聚合 DTO — 包含基础信息、成员列表与引用统计。
 *
 * 对齐页面规格 §3：Group 名称/编号、状态、成员列表、关联客户与案件统计。
 */
export type GroupDetailDto = Pick<
  Group,
  | "id"
  | "orgId"
  | "groupNo"
  | "name"
  | "description"
  | "activeFlag"
  | "createdBy"
  | "createdAt"
  | "updatedBy"
  | "updatedAt"
> & {
  members: GroupMemberDto[];
  references: GroupReferenceCounts;
};
