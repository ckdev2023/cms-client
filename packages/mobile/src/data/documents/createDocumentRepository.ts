import type { HttpClient } from "@infra/http/HttpClient";
import type { KVStorage } from "@infra/storage/KVStorage";
import type { DocumentRepository } from "@domain/documents/DocumentRepository";

import { createDocumentApi } from "./DocumentApi";

/**
 * DocumentRepository のデータ層実装を生成する。
 *
 * @param deps - 依存オブジェクト
 * @param deps.httpClient - HTTP クライアント
 * @param deps.storage - KV ストレージ
 * @param deps.baseUrl - API ベース URL
 * @returns DocumentRepository 実装
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
    listRequirements: (filters) => api.listRequirements(filters),
    getRequirementVersions: (id) => api.getRequirementVersions(id),
    registerVersion: (input) => api.registerVersion(input),
    listMyDocuments: (filters) => api.listDocuments(filters),
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
    getDownloadUrl: (docId) => api.getDownloadUrl(docId),
    reviewFileVersion: (versionId, decision, comment) =>
      api.reviewFileVersion(versionId, decision, comment),
  };
}
