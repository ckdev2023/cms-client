/**
 * BillingRepository — 收费模块仓储层。
 *
 * 工厂 `createBillingRepository` 基于 `BillingRepositorySupport` 构建运行时，
 * 通过 `BillingAdapters` 完成 URL 拼接与 DTO → 前端类型适配。
 *
 * 默认 `apiPath: '/api'`、`getToken: getAdminAccessToken`——不会误请求 `/api/cases/...`。
 */

import type {
  BillingPlanNode,
  BillingSummaryData,
  CollectionResult,
} from "../types";
import {
  adaptBillingListResult,
  adaptBillingMutationResult,
  adaptBillingPlanNodes,
  adaptBillingRiskAckStatus,
  adaptBillingSummary,
  adaptCollectionResult,
  adaptPaymentLogResult,
  type BillingListResult,
  type BillingMutationResult,
  type BillingRiskAckStatus,
  type PaymentLogResult,
} from "./BillingAdapters";
import {
  buildBillingCollectionsBulkUrl,
  buildBillingPlansUrl,
  buildBillingRiskAckUrl,
  buildBillingSummaryUrl,
  buildPaymentRecordReverseUrl,
  buildPaymentRecordVoidUrl,
  buildPaymentRecordsUrl,
  type BillingListFilters,
  type BillingRiskAckInput,
  type BillingSummaryFilters,
  type CreatePaymentInput,
  type PaymentLogFilters,
  type VoidOrReverseInput,
} from "./BillingAdapterUrls";
import {
  BillingRepositoryError,
  createBillingRepositoryRuntime,
  requestAndAdapt,
  type BillingRepositoryFactoryInput,
  type BillingRepositoryRuntime,
} from "./BillingRepositorySupport";

/**
 * 收费模块仓储接口——所有收费相关 CRUD 操作的统一入口。
 */
export interface BillingRepository {
  /** 获取收费计划列表。 */
  getList(filters?: BillingListFilters): Promise<BillingListResult>;
  /** 获取收费汇总。 */
  getSummary(filters?: BillingSummaryFilters): Promise<BillingSummaryData>;
  /** 获取回款流水列表。 */
  getPaymentLog(filters?: PaymentLogFilters): Promise<PaymentLogResult>;
  /** 登记回款。 */
  createPayment(input: CreatePaymentInput): Promise<BillingMutationResult>;
  /** 作废回款。 */
  voidPayment(
    id: string,
    input: VoidOrReverseInput,
  ): Promise<BillingMutationResult>;
  /** 冲正回款。 */
  reversePayment(
    id: string,
    input: VoidOrReverseInput,
  ): Promise<BillingMutationResult>;
  /** 批量催款。 */
  bulkCollect(caseIds: string[]): Promise<CollectionResult>;
  /** 获取案件收费节点列表。 */
  getBillingPlanNodes(caseId: string): Promise<BillingPlanNode[]>;
  /** 提交欠款风险确认。 */
  acknowledgeBillingRisk(
    caseId: string,
    input: BillingRiskAckInput,
  ): Promise<BillingMutationResult>;
  /** 获取案件欠款风险确认状态。 */
  getCaseBillingRiskAck(caseId: string): Promise<BillingRiskAckStatus | null>;
}

export { BillingRepositoryError };

// ─── Factory helpers ────────────────────────────────────────────

function createGetList(rt: BillingRepositoryRuntime) {
  return (filters?: BillingListFilters): Promise<BillingListResult> =>
    requestAndAdapt({
      runtime: rt,
      url: buildBillingPlansUrl(rt.apiPath, filters),
      method: "GET",
      adapt: adaptBillingListResult,
      errorMessage: "Invalid billing plans list response",
    });
}

function createGetSummary(rt: BillingRepositoryRuntime) {
  return (filters?: BillingSummaryFilters): Promise<BillingSummaryData> =>
    requestAndAdapt({
      runtime: rt,
      url: buildBillingSummaryUrl(rt.apiPath, filters),
      method: "GET",
      adapt: adaptBillingSummary,
      errorMessage: "Invalid billing summary response",
    });
}

function createGetPaymentLog(rt: BillingRepositoryRuntime) {
  return (filters?: PaymentLogFilters): Promise<PaymentLogResult> =>
    requestAndAdapt({
      runtime: rt,
      url: buildPaymentRecordsUrl(rt.apiPath, filters),
      method: "GET",
      adapt: adaptPaymentLogResult,
      errorMessage: "Invalid payment records response",
    });
}

function createCreatePayment(rt: BillingRepositoryRuntime) {
  return (input: CreatePaymentInput): Promise<BillingMutationResult> =>
    requestAndAdapt({
      runtime: rt,
      url: buildPaymentRecordsUrl(rt.apiPath),
      method: "POST",
      body: input,
      adapt: adaptBillingMutationResult,
      errorMessage: "Invalid create payment response",
    });
}

function createVoidPayment(rt: BillingRepositoryRuntime) {
  return (
    id: string,
    input: VoidOrReverseInput,
  ): Promise<BillingMutationResult> =>
    requestAndAdapt({
      runtime: rt,
      url: buildPaymentRecordVoidUrl(rt.apiPath, id),
      method: "POST",
      body: input,
      adapt: adaptBillingMutationResult,
      errorMessage: "Invalid void payment response",
    });
}

function createReversePayment(rt: BillingRepositoryRuntime) {
  return (
    id: string,
    input: VoidOrReverseInput,
  ): Promise<BillingMutationResult> =>
    requestAndAdapt({
      runtime: rt,
      url: buildPaymentRecordReverseUrl(rt.apiPath, id),
      method: "POST",
      body: input,
      adapt: adaptBillingMutationResult,
      errorMessage: "Invalid reverse payment response",
    });
}

function createBulkCollect(rt: BillingRepositoryRuntime) {
  return (caseIds: string[]): Promise<CollectionResult> =>
    requestAndAdapt({
      runtime: rt,
      url: buildBillingCollectionsBulkUrl(rt.apiPath),
      method: "POST",
      body: { caseIds },
      adapt: adaptCollectionResult,
      errorMessage: "Invalid bulk collection response",
    });
}

function createGetBillingPlanNodes(rt: BillingRepositoryRuntime) {
  return (caseId: string): Promise<BillingPlanNode[]> =>
    requestAndAdapt({
      runtime: rt,
      url: buildBillingPlansUrl(rt.apiPath, { caseId, page: 1, limit: 200 }),
      method: "GET",
      adapt: adaptBillingPlanNodes,
      errorMessage: "Invalid billing plan nodes response",
    });
}

function createAcknowledgeBillingRisk(rt: BillingRepositoryRuntime) {
  return (
    caseId: string,
    input: BillingRiskAckInput,
  ): Promise<BillingMutationResult> =>
    requestAndAdapt({
      runtime: rt,
      url: buildBillingRiskAckUrl(rt.apiPath, caseId),
      method: "POST",
      body: input,
      adapt: adaptBillingMutationResult,
      errorMessage: "Invalid billing risk ack response",
    });
}

function createGetCaseBillingRiskAck(rt: BillingRepositoryRuntime) {
  return async (caseId: string): Promise<BillingRiskAckStatus | null> => {
    const url = `${rt.apiPath}/cases/${encodeURIComponent(caseId)}/billing-tab-aggregate`;
    return requestAndAdapt({
      runtime: rt,
      url,
      method: "GET",
      adapt: (body) => {
        const r =
          body && typeof body === "object" && !Array.isArray(body)
            ? (body as Record<string, unknown>)
            : null;
        if (!r) return null;
        const summary =
          r.summary && typeof r.summary === "object"
            ? (r.summary as Record<string, unknown>)
            : null;
        if (!summary) return null;
        return adaptBillingRiskAckStatus(summary.billingRiskAck);
      },
      errorMessage: "Invalid billing tab aggregate response",
    });
  };
}

// ─── Factory ────────────────────────────────────────────────────

/**
 * 创建基于 HTTP 请求的 BillingRepository。
 *
 * 默认 `apiPath: '/api'`、`getToken: getAdminAccessToken`。
 *
 * @param input - 可选的 fetch、令牌提供者和 API 路径覆盖
 * @returns 实现所有收费 CRUD 操作的仓库实例
 */
export function createBillingRepository(
  input?: BillingRepositoryFactoryInput,
): BillingRepository {
  const rt = createBillingRepositoryRuntime(input);

  return {
    getList: createGetList(rt),
    getSummary: createGetSummary(rt),
    getPaymentLog: createGetPaymentLog(rt),
    createPayment: createCreatePayment(rt),
    voidPayment: createVoidPayment(rt),
    reversePayment: createReversePayment(rt),
    bulkCollect: createBulkCollect(rt),
    getBillingPlanNodes: createGetBillingPlanNodes(rt),
    acknowledgeBillingRisk: createAcknowledgeBillingRisk(rt),
    getCaseBillingRiskAck: createGetCaseBillingRiskAck(rt),
  };
}
