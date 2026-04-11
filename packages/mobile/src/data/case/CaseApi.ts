import type { HttpClient } from "@infra/http/HttpClient";
import type {
  CaseSummary,
  CaseDetail,
  CaseStage,
  PostApprovalStage,
  DocumentItemSummary,
  TimelineEntry,
} from "@domain/case/Case";

/**
 * Server Case レスポンス型。
 * cases.service.ts の mapCaseRow が返すフィールド名に対応。
 */
type ServerCaseResponse = {
  id: string;
  orgId: string;
  customerId: string;
  caseTypeCode: string;
  status: string;
  ownerUserId: string;
  openedAt: string;
  dueAt: string | null;
  metadata: Record<string, unknown>;
  caseNo: string | null;
  caseName: string | null;
  caseSubtype: string | null;
  applicationType: string | null;
  companyId: string | null;
  priority: string;
  riskLevel: string;
  assistantUserId: string | null;
  sourceChannel: string | null;
  signedAt: string | null;
  acceptedAt: string | null;
  submissionDate: string | null;
  resultDate: string | null;
  residenceExpiryDate: string | null;
  archivedAt: string | null;
  resultOutcome: string | null;
  quotePrice: number | null;
  depositPaidCached: boolean;
  finalPaymentPaidCached: boolean;
  billingUnpaidAmountCached: number;
  billingRiskAcknowledgedBy: string | null;
  billingRiskAcknowledgedAt: string | null;
  billingRiskAckReasonCode: string | null;
  billingRiskAckReasonNote: string | null;
  billingRiskAckEvidenceUrl: string | null;
  overseasVisaStartAt: string | null;
  entryConfirmedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type ServerCaseListResponse = { items: ServerCaseResponse[]; total: number };
type DocItemListResponse = { items: DocumentItemSummary[]; total: number };
type TimelineResponse = { items: TimelineEntry[] };

async function authHeaders(
  getToken: () => Promise<string | null>,
): Promise<Record<string, string>> {
  const token = await getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Server → Domain: CaseSummary へのフィールドマッピング。
 *
 * Server 側は status / ownerUserId / caseTypeCode 等を使用するが、
 * Domain 層は stage / principalUserId / caseType に正規化する。
 *
 * @param raw Server 側の案件レスポンス
 * @returns Domain CaseSummary
 */
export function mapServerCaseToSummary(raw: ServerCaseResponse): CaseSummary {
  return {
    id: raw.id,
    caseNo: raw.caseNo ?? "",
    caseName: raw.caseName,
    caseType: raw.caseTypeCode,
    applicationType: raw.applicationType as CaseSummary["applicationType"],
    stage: raw.status as CaseStage,
    priority: raw.priority as CaseSummary["priority"],
    riskLevel: raw.riskLevel as CaseSummary["riskLevel"],
    customerId: raw.customerId,
    principalUserId: raw.ownerUserId,
    resultOutcome: raw.resultOutcome as CaseSummary["resultOutcome"],
    nextDeadlineDueAt: raw.dueAt,
    billingUnpaidAmountCached: raw.billingUnpaidAmountCached,
    depositPaidCached: raw.depositPaidCached,
    finalPaymentPaidCached: raw.finalPaymentPaidCached,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

/**
 * Server → Domain: CaseDetail へのフィールドマッピング。
 *
 * @param raw Server レスポンスの Case オブジェクト
 * @param documents 案件に紐づく資料項リスト
 * @param timeline 案件のタイムラインエントリ
 * @returns Domain 層の CaseDetail
 */
export function mapServerCaseToDetail(
  raw: ServerCaseResponse,
  documents: DocumentItemSummary[],
  timeline: TimelineEntry[],
): CaseDetail {
  const meta = raw.metadata ?? {};
  return {
    ...mapServerCaseToSummary(raw),
    sourceLeadId: null,
    groupId: "",
    primaryAssistantUserId: raw.assistantUserId,
    sourceChannel: raw.sourceChannel,
    signedAt: raw.signedAt,
    acceptedAt: raw.acceptedAt,
    dueAt: raw.dueAt,
    quotePrice: raw.quotePrice,
    submissionDate: raw.submissionDate,
    resultDate: raw.resultDate,
    residenceExpiryDate: raw.residenceExpiryDate,
    employerName: null,
    closeReason: null,
    archiveReason: null,
    archivedAt: raw.archivedAt,
    nextAction: null,
    nextActionDueAt: null,
    hasBlockingIssueFlag: false,
    postApprovalStage:
      (meta.post_approval_stage as PostApprovalStage | undefined) ?? null,
    overseasVisaStartAt: raw.overseasVisaStartAt,
    entryConfirmedAt: raw.entryConfirmedAt,
    billingRiskAcknowledgedBy: raw.billingRiskAcknowledgedBy,
    billingRiskAcknowledgedAt: raw.billingRiskAcknowledgedAt,
    billingRiskAckReasonCode: raw.billingRiskAckReasonCode,
    billingRiskAckReasonNote: raw.billingRiskAckReasonNote,
    billingRiskAckEvidenceUrl: raw.billingRiskAckEvidenceUrl,
    documents,
    timeline,
  };
}

/**
 * Case API — Server cases / document-items / timeline エンドポイントを呼び出す。
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
      const res = await httpClient.requestJson<ServerCaseListResponse>({
        url: `${baseUrl}/cases`,
        method: "GET",
        headers: h,
      });
      return res.data.items.map(mapServerCaseToSummary);
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
        httpClient.requestJson<ServerCaseResponse>({
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
      return mapServerCaseToDetail(
        caseRes.data,
        docsRes.data.items,
        timelineRes.data.items,
      );
    },
  };
}
