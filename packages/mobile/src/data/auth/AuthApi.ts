import type { HttpClient } from "@infra/http/HttpClient";
import type { AppUser } from "@domain/auth/AppUser";

type RequestCodeResponse = { ok: boolean };
type VerifyCodeResponse = { token: string; user: AppUser };

/**
 * 联系方式を contact body に変換。
 *
 * @param contact 邮箱或手机号
 * @returns body オブジェクト
 */
function toContactBody(contact: string): { email: string } | { phone: string } {
  return contact.includes("@") ? { email: contact } : { phone: contact };
}

/**
 * Auth API 层 — 调用 Server app-auth 端点。
 *
 * @param deps 依赖集合
 * @param deps.httpClient HTTP 客户端
 * @param deps.baseUrl API 基础 URL
 * @returns Auth API 方法集
 */
export function createAuthApi(deps: {
  httpClient: HttpClient;
  baseUrl: string;
}) {
  const { httpClient, baseUrl } = deps;

  return {
    /**
     * POST /app-auth/request-code
     *
     * @param contact 邮箱或手机号
     */
    async requestCode(contact: string): Promise<void> {
      await httpClient.requestJson<RequestCodeResponse>({
        url: `${baseUrl}/app-auth/request-code`,
        method: "POST",
        body: toContactBody(contact),
      });
    },

    /**
     * POST /app-auth/verify-code
     *
     * @param contact 邮箱或手机号
     * @param code 验证码
     * @returns token 和用户信息
     */
    async verifyCode(
      contact: string,
      code: string,
    ): Promise<{ token: string; user: AppUser }> {
      const res = await httpClient.requestJson<VerifyCodeResponse>({
        url: `${baseUrl}/app-auth/verify-code`,
        method: "POST",
        body: { ...toContactBody(contact), code },
      });
      return res.data;
    },

    /**
     * GET /app-auth/me
     *
     * @param token JWT token
     * @returns AppUser
     */
    async getMe(token: string): Promise<AppUser> {
      const res = await httpClient.requestJson<AppUser>({
        url: `${baseUrl}/app-auth/me`,
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data;
    },
  };
}
