import { SetMetadata } from "@nestjs/common";

import type { Role } from "./roles";

export const IS_PUBLIC_KEY = "auth.isPublic";
export const REQUIRED_ROLES_KEY = "auth.requiredRoles";

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
