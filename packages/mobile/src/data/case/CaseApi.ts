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
 * 認証 Header 生成ツール。
 *
 * @param getToken Token 取得関数
 * @returns Header オブジェクト
 */
async function authHeaders(
  getToken: () => Promise<string | null>,
): Promise<Record<string, string>> {
  const token = await getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** CaseDetail のデフォルト拡張フィールド（API 未返却分を補填）。 */
const DETAIL_DEFAULTS: Omit<
  CaseDetail,
  keyof CaseSummary | "documents" | "timeline"
> = {
  sourceLeadId: null,
  groupId: "",
  primaryAssistantUserId: null,
  sourceChannel: null,
  signedAt: null,
  employerName: null,
  closeReason: null,
  archiveReason: null,
  archivedAt: null,
  nextAction: null,
  nextActionDueAt: null,
  hasBlockingIssueFlag: false,
};

/**
 * Case API 層 — Server cases / document-items / timeline エンドポイントを呼び出す。
 *
 * @param deps 依存セット
 * @param deps.httpClient HTTP クライアント
 * @param deps.baseUrl API ベース URL
 * @param deps.getToken Token 取得関数
 * @returns Case API メソッドセット
 */
export function createCaseApi(deps: {
  httpClient: HttpClient;
  baseUrl: string;
  getToken: () => Promise<string | null>;
}) {
  const { httpClient, baseUrl, getToken } = deps;

  return {
    /**
     * 案件リスト取得。
     *
     * @returns 案件リスト
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
     * 案件詳細取得。
     *
     * @param caseId 案件 ID
     * @returns 案件詳細
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
        ...DETAIL_DEFAULTS,
        ...caseRes.data,
        documents: docsRes.data.items,
        timeline: timelineRes.data.items,
      };
    },
  };
}
