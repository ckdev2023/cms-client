import type { HttpClient } from "@infra/http/HttpClient";
import type { KVStorage } from "@infra/storage/KVStorage";
import type { ProfileRepository } from "@domain/profile/ProfileRepository";

import { createProfileApi } from "./ProfileApi";

const TOKEN_KEY = "auth_token";
const USER_ID_KEY = "auth_user_id";

/**
 * 创建 ProfileRepository 的数据层实现。
 *
 * @param deps 依赖集合
 * @param deps.httpClient HTTP 客户端
 * @param deps.storage KV 存储
 * @param deps.baseUrl API 基础 URL
 * @returns ProfileRepository 实例
 */
export function createProfileRepository(deps: {
  httpClient: HttpClient;
  storage: KVStorage;
  baseUrl: string;
}): ProfileRepository {
  const api = createProfileApi({
    httpClient: deps.httpClient,
    baseUrl: deps.baseUrl,
    getToken: () => deps.storage.getString(TOKEN_KEY),
  });

  return {
    async getProfile() {
      return api.getProfile();
    },

    async updateProfile(data) {
      const userId = await deps.storage.getString(USER_ID_KEY);
      if (!userId) throw new Error("No user ID stored");
      const updated = await api.updateProfile(userId, data, userId);
      if (data.preferredLanguage) {
        await deps.storage.setString(
          "preferred_language",
          data.preferredLanguage,
        );
      }
      return updated;
    },

    async logout() {
      await deps.storage.delete(TOKEN_KEY);
      await deps.storage.delete(USER_ID_KEY);
    },
  };
}
