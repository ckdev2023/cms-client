import { SetMetadata } from "@nestjs/common";

import type { PermissionCode } from "./permissions.codes";
import type { Role } from "./roles";

export const IS_PUBLIC_KEY = "auth.isPublic";
export const REQUIRED_ROLES_KEY = "auth.requiredRoles";
export const REQUIRED_PERMISSIONS_KEY = "auth.requiredPermissions";

/**
 * 标记路由为公开接口（不要求鉴权/租户上下文）。
 *
 * @returns 装饰器
 */
export function Public() {
  return SetMetadata(IS_PUBLIC_KEY, true);
}

/**
 * 声明路由所需角色（支持更高角色包含更低角色）。
 *
 * @param roles 允许的角色集合
 * @returns 装饰器
 */
export function RequireRoles(...roles: Role[]) {
  return SetMetadata(REQUIRED_ROLES_KEY, roles);
}

/**
 * 声明路由所需権限コード（全て保持している場合のみアクセス可）。
 *
 * @param permissions 必要な権限コード
 * @returns デコレータ
 */
export function RequirePermission(...permissions: PermissionCode[]) {
  return SetMetadata(REQUIRED_PERMISSIONS_KEY, permissions);
}
