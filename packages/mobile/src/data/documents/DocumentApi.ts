import type { HttpClient } from "@infra/http/HttpClient";
import type {
  UserDocumentSummary,
  UserDocument,
  DocumentRequirement,
  DocumentFileVersion,
  DocumentFileReviewStatus,
} from "@domain/documents/UserDocument";
import type { RegisterVersionInput } from "@domain/documents/DocumentRepository";

type DocListResponse = { items: UserDocumentSummary[]; total: number };
type RequirementListResponse = {
  items: DocumentRequirement[];
  total: number;
};
type VersionListResponse = { items: DocumentFileVersion[]; total: number };
type DownloadUrlResponse = { url: string };

type UploadBody = {
  fileName: string;
  docType?: string;
  caseId?: string;
  data: string;
  contentType: string;
  appUserId: string;
};

type DocApiDeps = {
  httpClient: HttpClient;
  baseUrl: string;
  getToken: () => Promise<string | null>;
};

async function authHeaders(
  getToken: () => Promise<string | null>,
): Promise<Record<string, string>> {
  const t = await getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

async function fetchRequirements(
  deps: DocApiDeps,
  filters?: { caseId?: string },
): Promise<DocumentRequirement[]> {
  const h = await authHeaders(deps.getToken);
  const qs = filters?.caseId ? `?caseId=${filters.caseId}` : "";
  const res = await deps.httpClient.requestJson<RequirementListResponse>({
    url: `${deps.baseUrl}/document-requirements${qs}`,
    method: "GET",
    headers: h,
  });
  return res.data.items;
}

async function fetchVersions(
  deps: DocApiDeps,
  requirementId: string,
): Promise<DocumentFileVersion[]> {
  const h = await authHeaders(deps.getToken);
  const res = await deps.httpClient.requestJson<VersionListResponse>({
    url: `${deps.baseUrl}/document-requirements/${requirementId}/versions`,
    method: "GET",
    headers: h,
  });
  return res.data.items;
}

async function postVersion(
  deps: DocApiDeps,
  input: RegisterVersionInput,
): Promise<DocumentFileVersion> {
  const h = await authHeaders(deps.getToken);
  const res = await deps.httpClient.requestJson<DocumentFileVersion>({
    url: `${deps.baseUrl}/document-requirements/${input.requirementId}/versions`,
    method: "POST",
    headers: h,
    body: input,
  });
  return res.data;
}

async function patchReview(
  deps: DocApiDeps,
  versionId: string,
  decision: DocumentFileReviewStatus,
  comment?: string,
): Promise<DocumentFileVersion> {
  const h = await authHeaders(deps.getToken);
  const res = await deps.httpClient.requestJson<DocumentFileVersion>({
    url: `${deps.baseUrl}/document-file-versions/${versionId}/review`,
    method: "POST",
    headers: h,
    body: { decision, comment },
  });
  return res.data;
}

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
 * Document API 层 — P0 资料項端点 + legacy user-documents 端点。
 *
 * @param deps - API 依赖集合
 * @returns Document API 方法集
 */
export function createDocumentApi(deps: DocApiDeps) {
  return {
    listRequirements: (filters?: { caseId?: string }) =>
      fetchRequirements(deps, filters),
    getRequirementVersions: (rid: string) => fetchVersions(deps, rid),
    registerVersion: (input: RegisterVersionInput) => postVersion(deps, input),
    reviewFileVersion: (
      versionId: string,
      decision: DocumentFileReviewStatus,
      comment?: string,
    ) => patchReview(deps, versionId, decision, comment),

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
