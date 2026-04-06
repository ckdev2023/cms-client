import type { HttpClient } from "@infra/http/HttpClient";
import type { AppUser } from "@domain/auth/AppUser";

/**
 * Profile API 层 — 调用 Server app-users 端点。
 *
 * @param deps 依赖集合
 * @param deps.httpClient HTTP 客户端
 * @param deps.baseUrl API 基础 URL
 * @param deps.getToken Token 获取函数
 * @returns Profile API 方法集
 */
export function createProfileApi(deps: {
  httpClient: HttpClient;
  baseUrl: string;
  getToken: () => Promise<string | null>;
}) {
  const { httpClient, baseUrl, getToken } = deps;

  async function headers(): Promise<Record<string, string>> {
    const token = await getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  return {
    /**
     * 获取当前用户信息（通过 /app-auth/me）。
     *
     * @returns 用户信息
     */
    async getProfile(): Promise<AppUser> {
      const h = await headers();
      const res = await httpClient.requestJson<AppUser>({
        url: `${baseUrl}/app-auth/me`,
        method: "GET",
        headers: h,
      });
      return res.data;
    },

    /**
     * 更新用户信息。
     *
     * @param userId 用户 ID
     * @param data 更新数据
     * @param data.name 姓名
     * @param data.preferredLanguage 偏好语言
     * @param callerId 调用者 ID
     * @returns 更新后的用户信息
     */
    async updateProfile(
      userId: string,
      data: { name?: string; preferredLanguage?: string },
      callerId: string,
    ): Promise<AppUser> {
      const h = await headers();
      const res = await httpClient.requestJson<AppUser>({
        url: `${baseUrl}/app-users/${userId}`,
        method: "PATCH",
        headers: h,
        body: { ...data, callerId },
      });
      return res.data;
    },
  };
}
