import type { HttpClient } from "@infra/http/HttpClient";
import type {
  CaseSummary,
  CaseDetail,
  DocumentItemSummary,
  TimelineEntry,
} from "@domain/case/Case";

type CaseListResponse = { items: CaseSummary[]; total: number };
type DocItemListResponse = { items: DocumentItemSummary[]; total: number };
type TimelineResponse = { items: TimelineEntry[] };

/**
 * 认证 Header 生成工具。
 *
 * @param getToken Token 获取函数
 * @returns Header 对象
 */
async function authHeaders(
  getToken: () => Promise<string | null>,
): Promise<Record<string, string>> {
  const token = await getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Case API 层 — 调用 Server cases / document-items / timeline 端点。
 *
 * @param deps 依赖集合
 * @param deps.httpClient HTTP 客户端
 * @param deps.baseUrl API 基础 URL
 * @param deps.getToken Token 获取函数
 * @returns Case API 方法集
 */
export function createCaseApi(deps: {
  httpClient: HttpClient;
  baseUrl: string;
  getToken: () => Promise<string | null>;
}) {
  const { httpClient, baseUrl, getToken } = deps;

  return {
    /**
     * 获取案件列表。
     *
     * @returns 案件列表
     */
    async listCases(): Promise<CaseSummary[]> {
      const h = await authHeaders(getToken);
      const res = await httpClient.requestJson<CaseListResponse>({
        url: `${baseUrl}/cases`,
        method: "GET",
        headers: h,
      });
      return res.data.items;
    },

    /**
     * 获取案件详情。
     *
     * @param caseId 案件 ID
     * @returns 案件详情
     */
    async getCaseDetail(caseId: string): Promise<CaseDetail> {
      const h = await authHeaders(getToken);
      const [caseRes, docsRes, timelineRes] = await Promise.all([
        httpClient.requestJson<CaseSummary>({
          url: `${baseUrl}/cases/${caseId}`,
          method: "GET",
          headers: h,
        }),
        httpClient.requestJson<DocItemListResponse>({
          url: `${baseUrl}/document-items?caseId=${caseId}`,
          method: "GET",
          headers: h,
        }),
        httpClient.requestJson<TimelineResponse>({
          url: `${baseUrl}/timeline?entityType=case&entityId=${caseId}`,
          method: "GET",
          headers: h,
        }),
      ]);
      return {
        ...caseRes.data,
        documents: docsRes.data.items,
        timeline: timelineRes.data.items,
      };
    },
  };
}
