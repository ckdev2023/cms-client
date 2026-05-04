const ROLE_RANK = {
  owner: 4,
  manager: 3,
  staff: 2,
  viewer: 1,
};
/**
 * 判断用户角色是否满足所需角色集合（支持“更高角色包含更低角色”）。
 *
 * @param userRole 用户角色
 * @param requiredRoles 允许的角色集合
 * @returns 是否满足
 */
export function hasRequiredRole(userRole, requiredRoles) {
  if (requiredRoles.length === 0) return true;
  const userRank = ROLE_RANK[userRole];
  return requiredRoles.some((r) => userRank >= ROLE_RANK[r]);
}
/**
 * 将不可信输入解析为 Role。
 *
 * @param value 原始输入
 * @returns Role 或 null
 */
export function parseRole(value) {
  if (value === "owner") return "owner";
  if (value === "manager") return "manager";
  if (value === "staff") return "staff";
  if (value === "viewer") return "viewer";
  return null;
}
//# sourceMappingURL=roles.js.map
