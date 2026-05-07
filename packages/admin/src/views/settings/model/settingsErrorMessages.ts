const ERROR_CODE_TO_I18N: Record<string, string> = {
  USER_DUPLICATE_EMAIL: "settings.errors.userDuplicateEmail",
  ROLE_DUPLICATE_CODE: "settings.errors.roleDuplicateCode",
  INSUFFICIENT_ROLE_AUTHORITY: "settings.errors.insufficientRoleAuthority",
  USER_LAST_OWNER: "settings.errors.userLastOwner",
  ROLE_IS_SYSTEM: "settings.errors.roleIsSystem",
  ROLE_HAS_MEMBERS: "settings.errors.roleHasMembers",
};

const FALLBACK_KEY = "settings.errors.unknown";

/**
 * 将服务端错误码映射为 i18n key。
 * 若 message 命中已知错误码则返回对应 key，否则返回通用兜底 key。
 *
 * @param message - 服务端返回的错误码字符串
 * @returns 对应的 i18n key
 */
export function mapSettingsError(message: string): string {
  return ERROR_CODE_TO_I18N[message] ?? FALLBACK_KEY;
}
