import type { HttpClient } from "@infra/http/HttpClient";
import type { KVStorage } from "@infra/storage/KVStorage";
import type { AuthRepository } from "@domain/auth/AuthRepository";

import { createAuthApi } from "./AuthApi";

const TOKEN_KEY = "auth_token";

/**
 * 创建 AuthRepository 的数据层实现。
 *
 * @param deps 依赖集合
 * @param deps.httpClient HTTP 客户端
 * @param deps.storage KV 存储
 * @param deps.baseUrl API 基础 URL
 * @returns AuthRepository 实例
 */
export function createAuthRepository(deps: {
  httpClient: HttpClient;
  storage: KVStorage;
  baseUrl: string;
}): AuthRepository {
  const api = createAuthApi({
    httpClient: deps.httpClient,
    baseUrl: deps.baseUrl,
  });

  return {
    async requestCode(contact) {
      await api.requestCode(contact);
    },

    async verifyCode(contact, code) {
      const result = await api.verifyCode(contact, code);
      await deps.storage.setString(TOKEN_KEY, result.token);
      return result;
    },

    async getMe() {
      const token = await deps.storage.getString(TOKEN_KEY);
      if (!token) throw new Error("No auth token");
      return api.getMe(token);
    },
  };
}
