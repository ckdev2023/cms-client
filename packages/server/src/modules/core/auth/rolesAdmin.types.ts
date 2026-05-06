import type { PermissionCode } from "./permissions.codes";

/** 角色一覧 DTO。 */
export type RoleDto = {
  id: string;
  orgId: string;
  code: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  memberCount: number;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};

/** 角色詳細 DTO（権限コード一覧を含む）。 */
export type RoleDetailDto = RoleDto & {
  permissions: string[];
};

/** 角色作成入力。 */
export type CreateRoleInput = {
  code: string;
  name: string;
  description?: string;
  permissions: PermissionCode[];
};

/** 角色更新入力。 */
export type UpdateRoleInput = {
  name?: string;
  description?: string;
};

/** 角色の権限コード全量更新入力。 */
export type SetRolePermissionsInput = {
  permissions: PermissionCode[];
};

/** ユーザー権限覆盖 DTO。 */
export type PermissionOverrideDto = {
  userId: string;
  permission: string;
  effect: "grant" | "deny";
  reason: string | null;
  grantedBy: string;
  grantedAt: string;
  expiresAt: string | null;
};

/** ユーザー権限覆盖一括更新入力。 */
export type SetPermissionOverridesInput = {
  overrides: {
    permission: PermissionCode;
    effect: "grant" | "deny";
    reason: string;
    expiresAt?: string;
  }[];
};

/** GET /me/permissions レスポンス DTO。 */
export type MePermissionsDto = {
  permissions: string[];
  roleId: string | null;
  role: string;
  ttl: number;
};
