import type { HttpClient } from "@infra/http/HttpClient";
import type { KVStorage } from "@infra/storage/KVStorage";
import type { InboxRepository } from "@domain/inbox/InboxRepository";

import { createInboxApi } from "./InboxApi";

/**
 * 创建 InboxRepository 的数据层实现。
 *
 * @param deps 依赖集合
 * @param deps.httpClient HTTP 客户端
 * @param deps.storage KV 存储
 * @param deps.baseUrl API 基础 URL
 * @returns InboxRepository 实例
 */
export function createInboxRepository(deps: {
  httpClient: HttpClient;
  storage: KVStorage;
  baseUrl: string;
}): InboxRepository {
  const api = createInboxApi({
    httpClient: deps.httpClient,
    baseUrl: deps.baseUrl,
    getToken: () => deps.storage.getString("auth_token"),
    getPreferredLanguage: async () =>
      (await deps.storage.getString("preferred_language")) ?? "ja",
  });

  return {
    async listConversations() {
      return api.listConversations();
    },
    async getMessages(conversationId) {
      return api.getMessages(conversationId);
    },
    async sendMessage(conversationId, text) {
      return api.sendMessage(conversationId, text);
    },
  };
}
