/**
 * Canonical 権限コード一覧。
 *
 * 新規追加時は以下を同時更新すること：
 * - 本ファイル
 * - migration seed（role_permissions の INSERT）
 * - 対応する role の backfill
 */

export const PERMISSION_CODES = {
  CASE_VIEW: "case.view",
  CASE_EDIT: "case.edit",
  CASE_EXPORT: "case.export",
  CASE_AUDIT: "case.audit",
  CASE_CREATE: "case.create",
  CASE_FINALIZE: "case.finalize",

  CUSTOMER_VIEW: "customer.view",
  CUSTOMER_EDIT: "customer.edit",

  GROUP_VIEW: "group.view",
  GROUP_MANAGE: "group.manage",

  USER_VIEW: "user.view",
  USER_MANAGE: "user.manage",
  ROLE_ASSIGN: "role.assign",
  PERMISSION_OVERRIDE: "permission.override",

  SETTINGS_WRITE: "settings.write",

  FEATURE_FLAG_MANAGE: "feature_flag.manage",
} as const;

/** 権限コード値のユニオン型。 */
export type PermissionCode =
  (typeof PERMISSION_CODES)[keyof typeof PERMISSION_CODES];

export const ALL_PERMISSION_CODES: readonly PermissionCode[] =
  Object.values(PERMISSION_CODES);

const SYSTEM_ROLE_PERMISSIONS: Record<string, readonly PermissionCode[]> = {
  owner: [...ALL_PERMISSION_CODES],
  manager: [
    PERMISSION_CODES.CASE_VIEW,
    PERMISSION_CODES.CASE_EDIT,
    PERMISSION_CODES.CASE_EXPORT,
    PERMISSION_CODES.CASE_AUDIT,
    PERMISSION_CODES.CASE_CREATE,
    PERMISSION_CODES.CASE_FINALIZE,
    PERMISSION_CODES.CUSTOMER_VIEW,
    PERMISSION_CODES.CUSTOMER_EDIT,
    PERMISSION_CODES.GROUP_VIEW,
    PERMISSION_CODES.GROUP_MANAGE,
    PERMISSION_CODES.USER_VIEW,
    PERMISSION_CODES.USER_MANAGE,
    PERMISSION_CODES.ROLE_ASSIGN,
    PERMISSION_CODES.SETTINGS_WRITE,
  ],
  staff: [
    PERMISSION_CODES.CASE_VIEW,
    PERMISSION_CODES.CASE_EDIT,
    PERMISSION_CODES.CASE_EXPORT,
    PERMISSION_CODES.CASE_AUDIT,
    PERMISSION_CODES.CASE_CREATE,
    PERMISSION_CODES.CASE_FINALIZE,
    PERMISSION_CODES.CUSTOMER_VIEW,
    PERMISSION_CODES.CUSTOMER_EDIT,
    PERMISSION_CODES.GROUP_VIEW,
    PERMISSION_CODES.USER_VIEW,
  ],
  viewer: [
    PERMISSION_CODES.CASE_VIEW,
    PERMISSION_CODES.CUSTOMER_VIEW,
    PERMISSION_CODES.GROUP_VIEW,
    PERMISSION_CODES.USER_VIEW,
  ],
};

/**
 * system 角色のデフォルト権限コードセットを返す。
 *
 * @param roleCode - system 角色コード（owner / manager / staff / viewer）
 * @returns 権限コード配列（未知コードの場合は空配列）
 */
export function getSystemRolePermissions(
  roleCode: string,
): readonly PermissionCode[] {
  return SYSTEM_ROLE_PERMISSIONS[roleCode] ?? [];
}

/**
 * 指定文字列が有効な権限コードかどうか判定する。
 *
 * @param code - 検査対象の文字列
 * @returns 有効な権限コードであれば true
 */
export function isValidPermissionCode(code: string): code is PermissionCode {
  return ALL_PERMISSION_CODES.includes(code as PermissionCode);
}
