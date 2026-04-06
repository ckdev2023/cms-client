import type { AppUser } from "./AppUser";

/**
 * Auth 领域仓库接口。
 *
 * 约束：
 * - domain 层仅定义接口/类型
 * - data 层提供实现，app 容器负责装配注入
 */
export type AuthRepository = {
  /**
   * 请求验证码。
   *
   * @param contact 邮箱或手机号
   * @returns 请求结果
   */
  requestCode(contact: string): Promise<void>;

  /**
   * 验证验证码并获取 token。
   *
   * @param contact 邮箱或手机号
   * @param code 验证码
   * @returns token 和用户信息
   */
  verifyCode(
    contact: string,
    code: string,
  ): Promise<{ token: string; user: AppUser }>;

  /**
   * 获取当前用户信息。
   *
   * @returns AppUser
   */
  getMe(): Promise<AppUser>;
};
