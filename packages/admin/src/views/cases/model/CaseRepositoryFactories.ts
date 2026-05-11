import type { CaseDetail } from "../types";
import {
  adaptCaseDetailAggregate,
  adaptCaseListResult,
  adaptCaseMutationResult,
  adaptCaseTransitionResult,
  adaptDeleteCaseResult,
  buildBillingRiskAckPayload,
  buildCaseDetailPath,
  buildCaseListSearchParams,
  buildCasePartiesApiPath,
  buildCreateCasePayload,
  buildCreateCasePartyPayload,
  buildPostApprovalPayload,
  buildTransitionPayload,
  buildUpdateCasePayload,
  buildWorkflowStepTransitionPayload,
  type CaseBillingRiskAckInput,
  type CaseCreateInput,
  type CaseDetailAggregate,
  type CaseListParams,
  type CaseListResult,
  type CaseMutationResult,
  type CasePartyCreateInput,
  type CasePostApprovalInput,
  type CaseTransitionInput,
  type CaseUpdateInput,
  type CaseWorkflowStepTransitionInput,
} from "./CaseAdapter";
import {
  CaseRepositoryError,
  requestAndAdapt,
  type CaseRepositoryRuntime,
} from "./CaseRepositorySupport";

/**
 * 创建案件列表查询闭包。
 * @param runtime - 仓库运行时上下文
 * @returns 接收列表查询参数并返回适配后的结果
 */
export function createListCases(runtime: CaseRepositoryRuntime) {
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

/**
 * 创建案件详情快照查询闭包。
 * @param runtime - 仓库运行时上下文
 * @returns 接收案件 ID 并返回详情快照
 */
export function createGetDetail(runtime: CaseRepositoryRuntime) {
  return async (id: string): Promise<CaseDetail | null> => {
    const aggregate = await createGetDetailAggregate(runtime)(id);
    return aggregate?.detail ?? null;
  };
}

/**
 * 创建案件详情聚合查询闭包。
 * @param runtime - 仓库运行时上下文
 * @returns 接收案件 ID 并返回聚合数据
 */
export function createGetDetailAggregate(runtime: CaseRepositoryRuntime) {
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

/**
 * 创建新案件创建闭包。
 * @param runtime - 仓库运行时上下文
 * @returns 接收创建输入并返回 mutation 结果
 */
export function createCreateCase(runtime: CaseRepositoryRuntime) {
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

/**
 * 创建案件字段更新闭包。
 * @param runtime - 仓库运行时上下文
 * @returns 接收 ID 与更新输入并返回 mutation 结果
 */
export function createUpdateCase(runtime: CaseRepositoryRuntime) {
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

/**
 * 创建阶段流转闭包。
 * @param runtime - 仓库运行时上下文
 * @returns 接收 ID 与流转输入并返回 mutation 结果
 */
export function createTransitionCase(runtime: CaseRepositoryRuntime) {
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

/**
 * 创建业务阶段流转闭包。
 * @param runtime - 仓库运行时上下文
 * @returns 接收 ID 与目标阶段配置并返回 mutation 结果
 */
export function createTransitionPhase(runtime: CaseRepositoryRuntime) {
  return async (
    id: string,
    input: {
      toPhase: string;
      closeReason?: string;
      resultOutcome?: string;
    },
  ): Promise<CaseMutationResult> =>
    requestAndAdapt({
      runtime,
      url: `${buildCaseDetailPath(runtime.apiPath, id)}/phase-transition`,
      method: "POST",
      body: input,
      adapt: adaptCaseTransitionResult,
      errorMessage: "Invalid phase transition response",
    });
}

/**
 * 创建收费风险确认闭包。
 * @param runtime - 仓库运行时上下文
 * @returns 接收 ID 与风险确认输入并返回 mutation 结果
 */
export function createAcknowledgeBillingRisk(runtime: CaseRepositoryRuntime) {
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

/**
 * 创建下签后子阶段更新闭包。
 * @param runtime - 仓库运行时上下文
 * @returns 接收 ID 与子阶段输入并返回 mutation 结果
 */
export function createUpdatePostApprovalStage(runtime: CaseRepositoryRuntime) {
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

/**
 * 创建工作流子步骤流转闭包。
 * @param runtime - 仓库运行时上下文
 * @returns 接收 ID 与步骤流转输入并返回 mutation 结果
 */
export function createTransitionWorkflowStep(runtime: CaseRepositoryRuntime) {
  return async (
    id: string,
    input: CaseWorkflowStepTransitionInput,
  ): Promise<CaseMutationResult> =>
    requestAndAdapt({
      runtime,
      url: `${buildCaseDetailPath(runtime.apiPath, id)}/workflow-step-transition`,
      method: "POST",
      body: buildWorkflowStepTransitionPayload(input),
      adapt: adaptCaseMutationResult,
      errorMessage: "Invalid workflow step transition response",
    });
}

/**
 * 创建案件删除闭包。
 * @param runtime - 仓库运行时上下文
 * @returns 接收案件 ID 并执行删除
 */
export function createDeleteCase(runtime: CaseRepositoryRuntime) {
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
 * 创建案件关联人创建闭包。
 * @param runtime - 仓库运行时上下文
 * @returns 接收关联人输入并返回 mutation 结果
 */
export function createCreateCaseParty(runtime: CaseRepositoryRuntime) {
  return async (input: CasePartyCreateInput): Promise<CaseMutationResult> =>
    requestAndAdapt({
      runtime,
      url: buildCasePartiesApiPath(runtime.apiPath),
      method: "POST",
      body: buildCreateCasePartyPayload(input),
      adapt: adaptCaseMutationResult,
      errorMessage: "Invalid create case party response",
    });
}

/**
 * 创建 checklist bootstrap 闭包。
 * @param runtime - 仓库运行时上下文
 * @returns 接收案件 ID 并从模板补生成资料清单
 */
export function createBootstrapChecklist(runtime: CaseRepositoryRuntime) {
  return async (caseId: string): Promise<CaseMutationResult> => {
    const normalizedId = caseId.trim();
    if (!normalizedId) {
      throw new CaseRepositoryError({
        code: "VALIDATION_ERROR",
        message: "Missing case ID",
      });
    }
    return requestAndAdapt({
      runtime,
      url: `${runtime.apiPath}/${normalizedId}/checklist/bootstrap-from-template`,
      method: "POST",
      adapt: adaptCaseMutationResult,
      errorMessage: "Failed to bootstrap checklist from template",
    });
  };
}

/**
 * 创建续签提醒重试闭包。
 * @param runtime - 仓库运行时上下文
 * @returns 接收案件 ID 并触发提醒重建
 */
export function createRetryReminderCreation(runtime: CaseRepositoryRuntime) {
  return async (caseId: string): Promise<CaseMutationResult> => {
    const normalizedId = caseId.trim();
    if (!normalizedId) {
      throw new CaseRepositoryError({
        code: "VALIDATION_ERROR",
        message: "Missing case ID",
      });
    }
    return requestAndAdapt({
      runtime,
      url: `${runtime.apiPath}/${normalizedId}/retry-reminder-creation`,
      method: "POST",
      adapt: adaptCaseMutationResult,
      errorMessage: "Failed to retry reminder creation",
    });
  };
}
