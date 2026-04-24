import type { CaseDetail, CaseListItem, CaseSummaryCardData } from "../types";
import {
  adaptCaseDetailAggregate,
  adaptCaseListResult,
  adaptCaseMutationResult,
  adaptCaseSummaryCards,
  adaptCaseTransitionResult,
  adaptDeleteCaseResult,
  buildBillingRiskAckPayload,
  buildCaseDetailPath,
  buildCaseListSearchParams,
  buildCreateCasePayload,
  buildPostApprovalPayload,
  buildTransitionPayload,
  buildUpdateCasePayload,
  type CaseBillingRiskAckInput,
  type CaseCreateInput,
  type CaseDetailAggregate,
  type CaseListParams,
  type CaseListResult,
  type CaseMutationResult,
  type CasePostApprovalInput,
  type CaseTransitionInput,
  type CaseUpdateInput,
} from "./CaseAdapter";
import {
  createRuntime,
  requestAndAdapt,
  type CaseRepositoryFactoryInput,
  type CaseRepositoryRuntime,
} from "./CaseRepositorySupport";

// ─── Responsibility Boundary ────────────────────────────────────
// CaseRepository is request-orchestration only:
//   1. URL construction    → buildCaseListSearchParams / buildCaseDetailPath
//   2. Payload building    → buildXxxPayload (CaseAdapterWriteBuilders)
//   3. Response adaptation → adaptXxx (CaseAdapterMappers / MutationResults / DetailAggregate)
//   4. Error normalization → CaseRepositorySupport (requestAndAdapt)
//
// CaseRepository MUST NOT contain inline field mapping, raw body
// construction, or response parsing logic.

/**
 * 案件仓储接口——所有案件 CRUD 操作的统一入口。
 *
 * 实现只做请求编排、错误归一化与 builders/adapters 委托，
 * 不承担任何字段级映射。
 */
export interface CaseRepository {
  /**
   *
   */
  listCases(params: CaseListParams): Promise<CaseListResult>;
  /**
   *
   */
  getSummaryCards(items: CaseListItem[]): CaseSummaryCardData[];
  /**
   *
   */
  getDetail(id: string): Promise<CaseDetail | null>;
  /**
   *
   */
  getDetailAggregate(id: string): Promise<CaseDetailAggregate | null>;
  /**
   *
   */
  createCase(input: CaseCreateInput): Promise<CaseMutationResult>;
  /**
   *
   */
  updateCase(id: string, input: CaseUpdateInput): Promise<CaseMutationResult>;
  /**
   *
   */
  transitionCase(
    id: string,
    input: CaseTransitionInput,
  ): Promise<CaseMutationResult>;
  /**
   *
   */
  acknowledgeBillingRisk(
    id: string,
    input: CaseBillingRiskAckInput,
  ): Promise<CaseMutationResult>;
  /**
   *
   */
  updatePostApprovalStage(
    id: string,
    input: CasePostApprovalInput,
  ): Promise<CaseMutationResult>;
  /**
   *
   */
  deleteCase(id: string): Promise<void>;
}

export { CaseRepositoryError } from "./CaseRepositorySupport";

function createListCases(runtime: CaseRepositoryRuntime) {
  return async (params: CaseListParams): Promise<CaseListResult> => {
    const query = buildCaseListSearchParams(params).toString();
    const url = query ? `${runtime.apiPath}?${query}` : runtime.apiPath;
    return requestAndAdapt({
      runtime,
      url,
      method: "GET",
      adapt: adaptCaseListResult,
      errorMessage: "Invalid case list response",
    });
  };
}

function createGetDetail(runtime: CaseRepositoryRuntime) {
  return async (id: string): Promise<CaseDetail | null> => {
    const aggregate = await createGetDetailAggregate(runtime)(id);
    return aggregate?.detail ?? null;
  };
}

function createGetDetailAggregate(runtime: CaseRepositoryRuntime) {
  return async (id: string): Promise<CaseDetailAggregate | null> => {
    const normalizedId = id.trim();
    if (!normalizedId) return null;

    return requestAndAdapt({
      runtime,
      url: `${buildCaseDetailPath(runtime.apiPath, normalizedId)}/aggregate`,
      method: "GET",
      adapt: adaptCaseDetailAggregate,
      errorMessage: "Invalid case detail aggregate response",
    });
  };
}

function createCreateCase(runtime: CaseRepositoryRuntime) {
  return async (input: CaseCreateInput): Promise<CaseMutationResult> =>
    requestAndAdapt({
      runtime,
      url: runtime.apiPath,
      method: "POST",
      body: buildCreateCasePayload(input),
      adapt: adaptCaseMutationResult,
      errorMessage: "Invalid create case response",
    });
}

function createUpdateCase(runtime: CaseRepositoryRuntime) {
  return async (
    id: string,
    input: CaseUpdateInput,
  ): Promise<CaseMutationResult> =>
    requestAndAdapt({
      runtime,
      url: buildCaseDetailPath(runtime.apiPath, id),
      method: "PATCH",
      body: buildUpdateCasePayload(input),
      adapt: adaptCaseMutationResult,
      errorMessage: "Invalid update case response",
    });
}

function createTransitionCase(runtime: CaseRepositoryRuntime) {
  return async (
    id: string,
    input: CaseTransitionInput,
  ): Promise<CaseMutationResult> =>
    requestAndAdapt({
      runtime,
      url: `${buildCaseDetailPath(runtime.apiPath, id)}/transition`,
      method: "POST",
      body: buildTransitionPayload(input),
      adapt: adaptCaseTransitionResult,
      errorMessage: "Invalid case transition response",
    });
}

function createAcknowledgeBillingRisk(runtime: CaseRepositoryRuntime) {
  return async (
    id: string,
    input: CaseBillingRiskAckInput,
  ): Promise<CaseMutationResult> =>
    requestAndAdapt({
      runtime,
      url: `${buildCaseDetailPath(runtime.apiPath, id)}/billing-risk-ack`,
      method: "POST",
      body: buildBillingRiskAckPayload(input),
      adapt: adaptCaseMutationResult,
      errorMessage: "Invalid billing risk acknowledgment response",
    });
}

function createUpdatePostApprovalStage(runtime: CaseRepositoryRuntime) {
  return async (
    id: string,
    input: CasePostApprovalInput,
  ): Promise<CaseMutationResult> =>
    requestAndAdapt({
      runtime,
      url: `${buildCaseDetailPath(runtime.apiPath, id)}/post-approval-stage`,
      method: "POST",
      body: buildPostApprovalPayload(input),
      adapt: adaptCaseMutationResult,
      errorMessage: "Invalid post-approval stage response",
    });
}

function createDeleteCase(runtime: CaseRepositoryRuntime) {
  return async (id: string): Promise<void> => {
    await requestAndAdapt({
      runtime,
      url: buildCaseDetailPath(runtime.apiPath, id),
      method: "DELETE",
      adapt: adaptDeleteCaseResult,
      errorMessage: "Invalid delete case response",
    });
  };
}

/**
 * 创建基于 HTTP 请求的真实 CaseRepository。
 *
 * 仓储只做请求编排与错误归一化：
 * - URL 构造委托给 `buildCaseListSearchParams` / `buildCaseDetailPath`
 * - 请求体构造委托给 `buildXxxPayload`（CaseAdapterWriteBuilders）
 * - 响应适配委托给 `adaptXxx`（CaseAdapterMappers / MutationResults / DetailAggregate）
 * - 错误归一化由 `CaseRepositorySupport.requestAndAdapt` 统一处理
 *
 * @param input - 可选的 fetch、令牌提供者和 API 路径覆盖
 * @returns 实现所有案件 CRUD 操作的仓库实例
 */
export function createCaseRepository(
  input: CaseRepositoryFactoryInput = {},
): CaseRepository {
  const runtime = createRuntime(input);

  return {
    listCases: createListCases(runtime),
    getSummaryCards: adaptCaseSummaryCards,
    getDetail: createGetDetail(runtime),
    getDetailAggregate: createGetDetailAggregate(runtime),
    createCase: createCreateCase(runtime),
    updateCase: createUpdateCase(runtime),
    transitionCase: createTransitionCase(runtime),
    acknowledgeBillingRisk: createAcknowledgeBillingRisk(runtime),
    updatePostApprovalStage: createUpdatePostApprovalStage(runtime),
    deleteCase: createDeleteCase(runtime),
  };
}
