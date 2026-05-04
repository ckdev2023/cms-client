var __decorate =
  (this && this.__decorate) ||
  function (decorators, target, key, desc) {
    var c = arguments.length,
      r =
        c < 3
          ? target
          : desc === null
            ? (desc = Object.getOwnPropertyDescriptor(target, key))
            : desc,
      d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function")
      r = Reflect.decorate(decorators, target, key, desc);
    else
      for (var i = decorators.length - 1; i >= 0; i--)
        if ((d = decorators[i]))
          r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return (c > 3 && r && Object.defineProperty(target, key, r), r);
  };
import { Injectable } from "@nestjs/common";
import { hasRequiredRole } from "./roles";
const CASE_ACTION_MATRIX = {
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
 * 将 RBAC 角色映射为案件权限层级。
 *
 * @param role 用户角色
 * @returns 案件权限层级
 */
export function resolveRoleTier(role) {
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
let PermissionsService = class PermissionsService {
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
  canPerformCaseAction(userId, userRole, userGroupId, caseRow, action) {
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
  canViewCase(userId, userRole, userGroupId, caseRow) {
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
  canEditCase(userId, userRole, userGroupId, caseRow) {
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
  canExportCase(userId, userRole, userGroupId, caseRow) {
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
  canAuditCase(userId, userRole, userGroupId, caseRow) {
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
  canCreateCase(userRole) {
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
  canAccessCustomer(userId, userRole, userGroupId, customerRow) {
    return (
      hasRequiredRole(userRole, ["manager"]) ||
      isCustomerInGroup(userGroupId, customerRow) ||
      isCustomerParticipant(userId, customerRow)
    );
  }
  /**
   * 判断当前用户是否可编辑客户。
   *
   * @param userId 当前用户 ID
   * @param userRole 当前用户角色
   * @param userGroupId 当前用户组 ID
   * @param customerRow 客户实体
   * @returns 是否允许编辑
   */
  canEditCustomer(userId, userRole, userGroupId, customerRow) {
    return this.canAccessCustomer(userId, userRole, userGroupId, customerRow);
  }
};
PermissionsService = __decorate([Injectable()], PermissionsService);
export { PermissionsService };
function isCaseParticipant(userId, caseRow) {
  return caseRow.ownerUserId === userId || caseRow.assistantUserId === userId;
}
function isCaseInGroup(userGroupId, caseRow) {
  if (!userGroupId) return false;
  return typeof caseRow.groupId === "string" && caseRow.groupId === userGroupId;
}
function isCustomerParticipant(userId, customerRow) {
  const ownerUserId = readCustomerString(customerRow, [
    "owner_user_id",
    "ownerUserId",
  ]);
  if (ownerUserId === userId) return true;
  const collaboratorFields = ["collaborator_user_ids", "collaboratorUserIds"];
  return collaboratorFields.some((field) => {
    const raw = customerRow.baseProfile[field];
    if (!Array.isArray(raw)) return false;
    return raw.some(
      (item) => typeof item === "string" && item.trim() === userId,
    );
  });
}
function isCustomerInGroup(userGroupId, customerRow) {
  if (!userGroupId) return false;
  return (
    readCustomerString(customerRow, ["group", "group_id", "groupId"]) ===
    userGroupId
  );
}
function readCustomerString(customerRow, fields) {
  for (const field of fields) {
    const value = customerRow.baseProfile[field];
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (trimmed.length > 0) return trimmed;
  }
  return null;
}
//# sourceMappingURL=permissions.service.js.map
