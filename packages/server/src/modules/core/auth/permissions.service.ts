import { Injectable } from "@nestjs/common";

import type { Case, Customer } from "../model/coreEntities";
import { hasRequiredRole, type Role } from "./roles";

/**
 * 案件资源动作类型。
 *
 * P0 最小权限矩阵把同一资源的权限拆分为四类独立动作，
 * 避免"可见即可编辑"或"可见即可导出"的权限放大。
 *
 * @see 03-业务规则与不变量.md §10.4
 */
export type CaseAction = "view" | "edit" | "export" | "audit";

/**
 * P0 案件最小权限矩阵（仅供内部查表使用）。
 *
 * 维度：role × action
 * 每个单元格返回一个判定函数，接收 (userId, userGroupId, caseRow)。
 *
 * 规则来源：03-业务规则与不变量.md §10.5
 *
 * | 动作     | manager/owner  | staff                       | viewer           |
 * |----------|----------------|-----------------------------|------------------|
 * | view     | 全量           | 本组 + 负责/协作案件        | 仅负责/协作案件  |
 * | edit     | 全量           | 负责/协作案件               | 不可             |
 * | export   | 受控开放       | 仅案件负责人（主办人）      | 不可             |
 * | audit    | 受控开放       | 负责/协作案件               | 不可             |
 */
type CaseActionPredicate = (
  userId: string,
  userGroupId: string | undefined,
  caseRow: Case,
) => boolean;

const CASE_ACTION_MATRIX: Record<
  CaseAction,
  Record<"admin" | "staff" | "viewer", CaseActionPredicate>
> = {
  view: {
    admin: () => true,
    staff: (uid, gid, c) => isCaseInGroup(gid, c) || isCaseParticipant(uid, c),
    viewer: (uid, _gid, c) => isCaseParticipant(uid, c),
  },
  edit: {
    admin: () => true,
    staff: (uid, _gid, c) => isCaseParticipant(uid, c),
    viewer: () => false,
  },
  export: {
    admin: () => true,
    staff: (uid, _gid, c) => c.ownerUserId === uid,
    viewer: () => false,
  },
  audit: {
    admin: () => true,
    staff: (uid, _gid, c) => isCaseParticipant(uid, c),
    viewer: () => false,
  },
};

/**
 * 案件权限判定用的角色层级。
 */
export type CaseRoleTier = "admin" | "staff" | "viewer";

/**
 * 将 RBAC 角色映射为案件权限层级。
 *
 * @param role 用户角色
 * @returns 案件权限层级
 */
export function resolveRoleTier(role: Role): CaseRoleTier {
  if (hasRequiredRole(role, ["manager"])) return "admin";
  if (hasRequiredRole(role, ["staff"])) return "staff";
  return "viewer";
}

/**
 * 资源级权限服务。
 *
 * P0 口径要求列表/详情/搜索/导出/批量动作使用同一套授权条件：
 * `role + org + group + 负责人/协作关系`。
 *
 * @see 03-业务规则与不变量.md §10.6
 */
@Injectable()
export class PermissionsService {
  /**
   * 统一案件权限判定入口。
   *
   * @param userId 当前用户 ID
   * @param userRole 当前用户角色
   * @param userGroupId 当前用户组 ID
   * @param caseRow 案件实体
   * @param action 请求动作
   * @returns 是否允许
   */
  canPerformCaseAction(
    userId: string,
    userRole: Role,
    userGroupId: string | undefined,
    caseRow: Case,
    action: CaseAction,
  ): boolean {
    const tier = resolveRoleTier(userRole);
    return CASE_ACTION_MATRIX[action][tier](userId, userGroupId, caseRow);
  }

  /**
   * 判断当前用户是否可查看案件。
   *
   * @param userId 当前用户 ID
   * @param userRole 当前用户角色
   * @param userGroupId 当前用户组 ID
   * @param caseRow 案件实体
   * @returns 是否允许查看
   */
  canViewCase(
    userId: string,
    userRole: Role,
    userGroupId: string | undefined,
    caseRow: Case,
  ): boolean {
    return this.canPerformCaseAction(
      userId,
      userRole,
      userGroupId,
      caseRow,
      "view",
    );
  }

  /**
   * 判断当前用户是否可编辑案件。
   *
   * @param userId 当前用户 ID
   * @param userRole 当前用户角色
   * @param userGroupId 当前用户组 ID
   * @param caseRow 案件实体
   * @returns 是否允许编辑
   */
  canEditCase(
    userId: string,
    userRole: Role,
    userGroupId: string | undefined,
    caseRow: Case,
  ): boolean {
    return this.canPerformCaseAction(
      userId,
      userRole,
      userGroupId,
      caseRow,
      "edit",
    );
  }

  /**
   * 判断当前用户是否可导出/下载案件相关数据。
   *
   * @param userId 当前用户 ID
   * @param userRole 当前用户角色
   * @param userGroupId 当前用户组 ID
   * @param caseRow 案件实体
   * @returns 是否允许导出
   */
  canExportCase(
    userId: string,
    userRole: Role,
    userGroupId: string | undefined,
    caseRow: Case,
  ): boolean {
    return this.canPerformCaseAction(
      userId,
      userRole,
      userGroupId,
      caseRow,
      "export",
    );
  }

  /**
   * 判断当前用户是否可查看案件审计日志。
   *
   * @param userId 当前用户 ID
   * @param userRole 当前用户角色
   * @param userGroupId 当前用户组 ID
   * @param caseRow 案件实体
   * @returns 是否允许查看审计
   */
  canAuditCase(
    userId: string,
    userRole: Role,
    userGroupId: string | undefined,
    caseRow: Case,
  ): boolean {
    return this.canPerformCaseAction(
      userId,
      userRole,
      userGroupId,
      caseRow,
      "audit",
    );
  }

  /**
   * 判断当前用户是否有权建案。
   *
   * P0 口径：staff+ 可建案；viewer 不可建案。
   * 后续可扩展 group/customer 维度的细粒度控制。
   *
   * @param userRole 当前用户角色
   * @returns 是否允许建案
   */
  canCreateCase(userRole: Role): boolean {
    return resolveRoleTier(userRole) !== "viewer";
  }

  /**
   * 判断当前用户是否可访问客户。
   *
   * @param userId 当前用户 ID
   * @param userRole 当前用户角色
   * @param userGroupId 当前用户组 ID
   * @param customerRow 客户实体
   * @returns 是否允许访问
   */
  canAccessCustomer(
    userId: string,
    userRole: Role,
    userGroupId: string | undefined,
    customerRow: Customer,
  ): boolean {
    return (
      hasRequiredRole(userRole, ["manager"]) ||
      isCustomerInGroup(userGroupId, customerRow) ||
      isCustomerParticipant(userId, customerRow)
    );
  }

  /**
   * 判断当前用户是否可定稿案件文书（manager+ 或案件主办人）。
   *
   * @param userId 当前用户 ID。
   * @param userRole 当前用户角色。
   * @param caseRow 案件实体。
   * @returns 是否允许定稿。
   */
  canFinalizeCase(userId: string, userRole: Role, caseRow: Case): boolean {
    if (hasRequiredRole(userRole, ["manager"])) return true;
    return caseRow.ownerUserId === userId;
  }

  /**
   * 判断当前用户是否可编辑客户。
   *
   * @param userId 当前用户 ID。
   * @param userRole 当前用户角色。
   * @param userGroupId 当前用户组 ID。
   * @param customerRow 客户实体。
   * @returns 是否允许编辑。
   */
  canEditCustomer(
    userId: string,
    userRole: Role,
    userGroupId: string | undefined,
    customerRow: Customer,
  ): boolean {
    return this.canAccessCustomer(userId, userRole, userGroupId, customerRow);
  }
}

function isCaseParticipant(userId: string, caseRow: Case): boolean {
  return caseRow.ownerUserId === userId || caseRow.assistantUserId === userId;
}

function isCaseInGroup(
  userGroupId: string | undefined,
  caseRow: Case,
): boolean {
  if (!userGroupId) return false;
  return typeof caseRow.groupId === "string" && caseRow.groupId === userGroupId;
}

function isCustomerParticipant(userId: string, customerRow: Customer): boolean {
  const ownerUserId = readCustomerString(customerRow, [
    "owner_user_id",
    "ownerUserId",
  ]);
  if (ownerUserId === userId) return true;

  const collaboratorFields = [
    "collaborator_user_ids",
    "collaboratorUserIds",
  ] as const;

  return collaboratorFields.some((field) => {
    const raw = customerRow.baseProfile[field];
    if (!Array.isArray(raw)) return false;
    return raw.some(
      (item) => typeof item === "string" && item.trim() === userId,
    );
  });
}

function isCustomerInGroup(
  userGroupId: string | undefined,
  customerRow: Customer,
): boolean {
  if (!userGroupId) return false;
  return (
    readCustomerString(customerRow, ["group", "group_id", "groupId"]) ===
    userGroupId
  );
}

function readCustomerString(
  customerRow: Customer,
  fields: readonly string[],
): string | null {
  for (const field of fields) {
    const value = customerRow.baseProfile[field];
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (trimmed.length > 0) return trimmed;
  }
  return null;
}
