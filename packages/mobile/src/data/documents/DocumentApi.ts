import type { HttpClient } from "@infra/http/HttpClient";
import type {
  UserDocumentSummary,
  UserDocument,
} from "@domain/documents/UserDocument";

type DocListResponse = { items: UserDocumentSummary[]; total: number };
type DownloadUrlResponse = { url: string };

/** 文档上传参数。 */
type UploadBody = {
  fileName: string;
  docType?: string;
  caseId?: string;
  data: string;
  contentType: string;
  appUserId: string;
};

/**
 * 认证 Header 生成。
 *
 * @param getToken Token 获取函数
 * @returns Header 对象
 */
async function authHeaders(
  getToken: () => Promise<string | null>,
): Promise<Record<string, string>> {
  const t = await getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

/** API 依赖。 */
type DocApiDeps = {
  httpClient: HttpClient;
  baseUrl: string;
  getToken: () => Promise<string | null>;
};

/**
 * 上传文档。
 *
 * @param deps API 依赖
 * @param body 上传参数
 * @returns 上传的文档
 */
async function uploadDoc(
  deps: DocApiDeps,
  body: UploadBody,
): Promise<UserDocument> {
  const h = await authHeaders(deps.getToken);
  const res = await deps.httpClient.requestJson<UserDocument>({
    url: `${deps.baseUrl}/user-documents/upload`,
    method: "POST",
    headers: h,
    body,
  });
  return res.data;
}

/**
 * 获取签名下载 URL。
 *
 * @param deps API 依赖
 * @param docId 文档 ID
 * @returns 签名下载 URL
 */
async function downloadUrl(deps: DocApiDeps, docId: string): Promise<string> {
  const h = await authHeaders(deps.getToken);
  const res = await deps.httpClient.requestJson<DownloadUrlResponse>({
    url: `${deps.baseUrl}/user-documents/${docId}/download-url`,
    method: "GET",
    headers: h,
  });
  return res.data.url;
}

/**
 * Document API 层 — 调用 Server user-documents 端点。
 *
 * @param deps 依赖集合
 * @param deps.httpClient HTTP 客户端
 * @param deps.baseUrl API 基础 URL
 * @param deps.getToken Token 获取函数
 * @returns Document API 方法集
 */
export function createDocumentApi(deps: DocApiDeps) {
  return {
    /**
     * 获取文档列表。
     *
     * @param filters 筛选条件
     * @param filters.caseId 案件 ID
     * @returns 文档列表
     */
    async listDocuments(filters?: {
      caseId?: string;
    }): Promise<UserDocumentSummary[]> {
      const h = await authHeaders(deps.getToken);
      const qs = filters?.caseId ? `?caseId=${filters.caseId}` : "";
      const res = await deps.httpClient.requestJson<DocListResponse>({
        url: `${deps.baseUrl}/user-documents${qs}`,
        method: "GET",
        headers: h,
      });
      return res.data.items;
    },
    uploadDocument: (body: UploadBody) => uploadDoc(deps, body),
    getDownloadUrl: (docId: string) => downloadUrl(deps, docId),
  };
}
