import type { HttpClient } from "@infra/http/HttpClient";
import type { KVStorage } from "@infra/storage/KVStorage";
import type { CaseRepository } from "@domain/case/CaseRepository";

import { createCaseApi } from "./CaseApi";

/**
 * 创建 CaseRepository 的数据层实现。
 *
 * @param deps 依赖集合
 * @param deps.httpClient HTTP 客户端
 * @param deps.storage KV 存储
 * @param deps.baseUrl API 基础 URL
 * @returns CaseRepository 实例
 */
export function createCaseRepository(deps: {
  httpClient: HttpClient;
  storage: KVStorage;
  baseUrl: string;
}): CaseRepository {
  const api = createCaseApi({
    httpClient: deps.httpClient,
    baseUrl: deps.baseUrl,
    getToken: () => deps.storage.getString("auth_token"),
  });

  return {
    async listMyCases() {
      return api.listCases();
    },
    async getCaseDetail(caseId) {
      return api.getCaseDetail(caseId);
    },
  };
}
