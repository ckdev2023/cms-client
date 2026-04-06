/**
 * AppUser 实体（Mobile 端用户）。
 */
export type AppUser = {
  /** 用户唯一标识。 */
  id: string;
  /** 偏好语言。 */
  preferredLanguage: string;
  /** 用户姓名。 */
  name: string;
  /** 邮箱（可选）。 */
  email: string | null;
  /** 手机号（可选）。 */
  phone: string | null;
  /** 账号状态。 */
  status: string;
};
