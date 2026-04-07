import { Injectable } from "@nestjs/common";

import type { Case, Customer } from "../model/coreEntities";
import { hasRequiredRole, type Role } from "./roles";

/**
 * 资源级权限服务。
 */
@Injectable()
export class PermissionsService {
  /**
   * 判断当前用户是否可访问案件。
   * @param userId 当前用户 ID
   * @param userRole 当前用户角色
   * @param caseRow 案件实体
   * @returns 是否允许访问
   */
  canAccessCase(userId: string, userRole: Role, caseRow: Case): boolean {
    return (
      hasRequiredRole(userRole, ["manager"]) ||
      isCaseParticipant(userId, caseRow)
    );
  }

  /**
   * 判断当前用户是否可编辑案件。
   * @param userId 当前用户 ID
   * @param userRole 当前用户角色
   * @param caseRow 案件实体
   * @returns 是否允许编辑
   */
  canEditCase(userId: string, userRole: Role, caseRow: Case): boolean {
    return this.canAccessCase(userId, userRole, caseRow);
  }

  /**
   * 判断当前用户是否可访问客户。
   * @param _userId 当前用户 ID
   * @param _userRole 当前用户角色
   * @param _customerRow 客户实体
   * @returns 是否允许访问
   */
  canAccessCustomer(
    _userId: string,
    _userRole: Role,
    _customerRow: Customer,
  ): boolean {
    void _userId;
    void _userRole;
    void _customerRow;
    return true;
  }

  /**
   * 判断当前用户是否可编辑客户。
   * @param _userId 当前用户 ID
   * @param _userRole 当前用户角色
   * @returns 是否允许编辑
   */
  canEditCustomer(_userId: string, _userRole: Role): boolean {
    void _userId;
    void _userRole;
    return true;
  }
}

function isCaseParticipant(userId: string, caseRow: Case): boolean {
  return caseRow.ownerUserId === userId || caseRow.assistantUserId === userId;
}
