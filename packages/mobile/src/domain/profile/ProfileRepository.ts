import type { AppUser } from "@domain/auth/AppUser";

/**
 * Profile 领域仓库接口。
 */
export type ProfileRepository = {
  /**
   * 获取当前用户信息。
   *
   * @returns AppUser
   */
  getProfile(): Promise<AppUser>;

  /**
   * 更新个人信息。
   *
   * @param data 更新数据
   * @returns 更新后的 AppUser
   */
  updateProfile(data: {
    name?: string;
    preferredLanguage?: string;
  }): Promise<AppUser>;

  /**
   * 登出（清除 Token）。
   */
  logout(): Promise<void>;
};
