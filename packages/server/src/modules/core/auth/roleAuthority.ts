import type { Role } from "./roles";

/**
 * actor が target ユーザー（の角色）を管理できるかどうか判定する。
 *
 * - owner：任意の角色を管理可能
 * - manager：staff / viewer のみ
 * - staff / viewer：管理権限なし
 *
 * @param actorRole - 操作者の角色
 * @param targetRole - 対象ユーザーの角色
 * @returns 管理可能かどうか
 */
export function canManageRole(actorRole: Role, targetRole: Role): boolean {
  if (actorRole === "owner") return true;
  if (actorRole === "manager") {
    return targetRole === "staff" || targetRole === "viewer";
  }
  return false;
}

/**
 * actor が指定角色を付与できるかどうか判定する。
 *
 * 管理可能な角色の範囲と同一。
 *
 * @param actorRole - 操作者の角色
 * @param newRole - 付与しようとする角色
 * @returns 付与可能かどうか
 */
export function canAssignRole(actorRole: Role, newRole: Role): boolean {
  if (actorRole === "owner") return true;
  if (actorRole === "manager") {
    return newRole === "staff" || newRole === "viewer";
  }
  return false;
}
