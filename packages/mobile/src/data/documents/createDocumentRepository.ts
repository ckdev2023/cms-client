import type { HttpClient } from "@infra/http/HttpClient";
import type { KVStorage } from "@infra/storage/KVStorage";
import type { DocumentRepository } from "@domain/documents/DocumentRepository";

import { createDocumentApi } from "./DocumentApi";

/**
 * 创建 DocumentRepository 的数据层实现。
 *
 * @param deps 依赖集合
 * @param deps.httpClient HTTP 客户端
 * @param deps.storage KV 存储
 * @param deps.baseUrl API 基础 URL
 * @returns DocumentRepository 实例
 */
export function createDocumentRepository(deps: {
  httpClient: HttpClient;
  storage: KVStorage;
  baseUrl: string;
}): DocumentRepository {
  const api = createDocumentApi({
    httpClient: deps.httpClient,
    baseUrl: deps.baseUrl,
    getToken: () => deps.storage.getString("auth_token"),
  });

  return {
    async listMyDocuments(filters) {
      return api.listDocuments(filters);
    },
    async uploadDocument(file, metadata) {
      return api.uploadDocument({
        fileName: file.fileName,
        docType: metadata.docType,
        caseId: metadata.caseId,
        data: file.data,
        contentType: file.contentType,
        appUserId: "self",
      });
    },
    async getDownloadUrl(docId) {
      return api.getDownloadUrl(docId);
    },
  };
}
