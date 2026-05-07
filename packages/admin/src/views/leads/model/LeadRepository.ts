/**
 * LeadRepository — 线索仓储接口与工厂。
 *
 * 仓储只做请求编排与错误归一化：
 * - URL 构造委托给 `buildLeadListSearchParams` / `buildLeadDetailPath`
 * - 请求体构造委托给 `buildXxxPayload`（LeadAdapter）
 * - 响应适配委托给 `adaptXxx`（LeadAdapter）
 * - 错误归一化由 `LeadRepositorySupport.requestAndAdapt` 统一处理
 */

import type { LeadFollowupRecord, LeadLogEntry } from "../types-detail";
import {
  adaptLeadListResult,
  adaptLeadDetailAggregate,
  adaptLeadMutationResult,
  adaptLeadConvertCustomerResult,
  adaptLeadConvertCaseResult,
  adaptLeadBulkResult,
  adaptLeadDedupResult,
  buildLeadListSearchParams,
  buildLeadDetailPath,
  buildLeadFollowupsPath,
  buildLeadLogsPath,
  buildLeadStatusPath,
  buildLeadDedupParams,
  buildLeadDedupPath,
  buildLeadBulkPath,
  buildLeadConvertCustomerPath,
  buildLeadConvertCasePath,
  buildLeadCreatePayload,
  buildLeadUpdatePayload,
  buildLeadStatusPayload,
  buildLeadFollowupPayload,
  buildLeadConvertCustomerPayload,
  buildLeadConvertCasePayload,
  buildBulkAssignPayload,
  buildBulkStatusPayload,
  buildBulkFollowupPayload,
  buildBulkTagsPayload,
  buildBulkExportPayload,
  type LeadListParams,
  type LeadListResult,
  type LeadMutationResult,
  type LeadBulkResult,
  type LeadDetailAggregate,
  type LeadCreateInput,
  type LeadUpdateInput,
  type LeadStatusInput,
  type LeadFollowupInput,
  type LeadDedupParams,
  type LeadDedupResult,
  type LeadConvertCustomerInput,
  type LeadConvertCaseInput,
  type LeadBulkAssignInput,
  type LeadBulkStatusInput,
  type LeadBulkFollowupInput,
  type LeadBulkTagsInput,
  type LeadBulkExportInput,
} from "./LeadAdapter";
import {
  LeadRepositoryError,
  createRuntime,
  requestAndAdapt,
  type LeadRepositoryFactoryInput,
  type LeadRepositoryRuntime,
  type ServerBlocker,
} from "./LeadRepositorySupport";

// ─── Responsibility Boundary ────────────────────────────────────
// LeadRepository is request-orchestration only.
// LeadRepository MUST NOT contain inline field mapping, raw body
// construction, or response parsing logic.

/**
 *
 */
export interface LeadRepository {
  /**
   *
   */
  listLeads(params: LeadListParams): Promise<LeadListResult>;
  /**
   *
   */
  getDetail(id: string): Promise<LeadDetailAggregate | null>;
  /**
   *
   */
  createLead(input: LeadCreateInput): Promise<LeadMutationResult>;
  /**
   *
   */
  updateLead(id: string, input: LeadUpdateInput): Promise<LeadMutationResult>;
  /**
   *
   */
  transitionLead(
    id: string,
    input: LeadStatusInput,
  ): Promise<LeadMutationResult>;
  /**
   *
   */
  addFollowup(
    leadId: string,
    input: LeadFollowupInput,
  ): Promise<LeadMutationResult>;
  /**
   *
   */
  listFollowups(leadId: string): Promise<LeadFollowupRecord[]>;
  /**
   *
   */
  listLogs(leadId: string): Promise<LeadLogEntry[]>;
  /**
   *
   */
  bulkAssign(input: LeadBulkAssignInput): Promise<LeadBulkResult>;
  /**
   *
   */
  bulkStatus(input: LeadBulkStatusInput): Promise<LeadBulkResult>;
  /**
   *
   */
  bulkFollowup(input: LeadBulkFollowupInput): Promise<LeadBulkResult>;
  /**
   *
   */
  bulkTags(input: LeadBulkTagsInput): Promise<LeadBulkResult>;
  /**
   *
   */
  bulkExport(input: LeadBulkExportInput): Promise<LeadBulkResult>;
  /**
   *
   */
  dedup(params: LeadDedupParams): Promise<LeadDedupResult>;
  /**
   *
   */
  convertCustomer(
    id: string,
    input: LeadConvertCustomerInput,
  ): Promise<LeadMutationResult>;
  /**
   *
   */
  convertCase(
    id: string,
    input: LeadConvertCaseInput,
  ): Promise<LeadMutationResult>;
}

export { LeadRepositoryError };
export type { ServerBlocker };

// ─── Method factories ───────────────────────────────────────────

function createListLeads(runtime: LeadRepositoryRuntime) {
  return async (params: LeadListParams): Promise<LeadListResult> => {
    const query = buildLeadListSearchParams(params).toString();
    const url = query ? `${runtime.apiPath}?${query}` : runtime.apiPath;
    return requestAndAdapt({
      runtime,
      url,
      method: "GET",
      adapt: adaptLeadListResult,
      errorMessage: "Invalid lead list response",
    });
  };
}

function createGetDetail(runtime: LeadRepositoryRuntime) {
  return async (id: string): Promise<LeadDetailAggregate | null> => {
    const normalizedId = id.trim();
    if (!normalizedId) return null;

    return requestAndAdapt({
      runtime,
      url: buildLeadDetailPath(runtime.apiPath, normalizedId),
      method: "GET",
      adapt: adaptLeadDetailAggregate,
      errorMessage: "Invalid lead detail response",
    });
  };
}

function createCreateLead(runtime: LeadRepositoryRuntime) {
  return async (input: LeadCreateInput): Promise<LeadMutationResult> =>
    requestAndAdapt({
      runtime,
      url: runtime.apiPath,
      method: "POST",
      body: buildLeadCreatePayload(input),
      adapt: adaptLeadMutationResult,
      errorMessage: "Invalid create lead response",
    });
}

function createUpdateLead(runtime: LeadRepositoryRuntime) {
  return async (
    id: string,
    input: LeadUpdateInput,
  ): Promise<LeadMutationResult> =>
    requestAndAdapt({
      runtime,
      url: buildLeadDetailPath(runtime.apiPath, id),
      method: "PATCH",
      body: buildLeadUpdatePayload(input),
      adapt: adaptLeadMutationResult,
      errorMessage: "Invalid update lead response",
    });
}

function createTransitionLead(runtime: LeadRepositoryRuntime) {
  return async (
    id: string,
    input: LeadStatusInput,
  ): Promise<LeadMutationResult> =>
    requestAndAdapt({
      runtime,
      url: buildLeadStatusPath(runtime.apiPath, id),
      method: "PATCH",
      body: buildLeadStatusPayload(input),
      adapt: adaptLeadMutationResult,
      errorMessage: "Invalid lead transition response",
    });
}

function createAddFollowup(runtime: LeadRepositoryRuntime) {
  return async (
    leadId: string,
    input: LeadFollowupInput,
  ): Promise<LeadMutationResult> =>
    requestAndAdapt({
      runtime,
      url: buildLeadFollowupsPath(runtime.apiPath, leadId),
      method: "POST",
      body: buildLeadFollowupPayload(input),
      adapt: adaptLeadMutationResult,
      errorMessage: "Invalid add followup response",
    });
}

function createListFollowups(runtime: LeadRepositoryRuntime) {
  return async (leadId: string): Promise<LeadFollowupRecord[]> => {
    const normalizedId = leadId.trim();
    if (!normalizedId) return [];

    const result = await requestAndAdapt({
      runtime,
      url: buildLeadFollowupsPath(runtime.apiPath, normalizedId),
      method: "GET",
      adapt: (value) => {
        const record =
          value && typeof value === "object" && !Array.isArray(value)
            ? (value as Record<string, unknown>)
            : null;
        const items =
          record && Array.isArray(record.items)
            ? record.items
            : Array.isArray(value)
              ? value
              : null;
        return items ?? [];
      },
      errorMessage: "Invalid followups response",
    });
    return result as LeadFollowupRecord[];
  };
}

function createListLogs(runtime: LeadRepositoryRuntime) {
  return async (leadId: string): Promise<LeadLogEntry[]> => {
    const normalizedId = leadId.trim();
    if (!normalizedId) return [];

    const result = await requestAndAdapt({
      runtime,
      url: buildLeadLogsPath(runtime.apiPath, normalizedId),
      method: "GET",
      adapt: (value) => {
        const record =
          value && typeof value === "object" && !Array.isArray(value)
            ? (value as Record<string, unknown>)
            : null;
        const items =
          record && Array.isArray(record.items)
            ? record.items
            : Array.isArray(value)
              ? value
              : null;
        return items ?? [];
      },
      errorMessage: "Invalid logs response",
    });
    return result as LeadLogEntry[];
  };
}

function createBulkAssign(runtime: LeadRepositoryRuntime) {
  return async (input: LeadBulkAssignInput): Promise<LeadBulkResult> =>
    requestAndAdapt({
      runtime,
      url: buildLeadBulkPath(runtime.apiPath, "assign"),
      method: "POST",
      body: buildBulkAssignPayload(input),
      adapt: adaptLeadBulkResult,
      errorMessage: "Invalid bulk assign response",
    });
}

function createBulkStatus(runtime: LeadRepositoryRuntime) {
  return async (input: LeadBulkStatusInput): Promise<LeadBulkResult> =>
    requestAndAdapt({
      runtime,
      url: buildLeadBulkPath(runtime.apiPath, "status"),
      method: "POST",
      body: buildBulkStatusPayload(input),
      adapt: adaptLeadBulkResult,
      errorMessage: "Invalid bulk status response",
    });
}

function createBulkFollowup(runtime: LeadRepositoryRuntime) {
  return async (input: LeadBulkFollowupInput): Promise<LeadBulkResult> =>
    requestAndAdapt({
      runtime,
      url: buildLeadBulkPath(runtime.apiPath, "followup"),
      method: "POST",
      body: buildBulkFollowupPayload(input),
      adapt: adaptLeadBulkResult,
      errorMessage: "Invalid bulk followup response",
    });
}

function createBulkTags(runtime: LeadRepositoryRuntime) {
  return async (input: LeadBulkTagsInput): Promise<LeadBulkResult> =>
    requestAndAdapt({
      runtime,
      url: buildLeadBulkPath(runtime.apiPath, "tags"),
      method: "POST",
      body: buildBulkTagsPayload(input),
      adapt: adaptLeadBulkResult,
      errorMessage: "Invalid bulk tags response",
    });
}

function createBulkExport(runtime: LeadRepositoryRuntime) {
  return async (input: LeadBulkExportInput): Promise<LeadBulkResult> =>
    requestAndAdapt({
      runtime,
      url: buildLeadBulkPath(runtime.apiPath, "export"),
      method: "POST",
      body: buildBulkExportPayload(input),
      adapt: adaptLeadBulkResult,
      errorMessage: "Invalid bulk export response",
    });
}

function createDedup(runtime: LeadRepositoryRuntime) {
  return async (params: LeadDedupParams): Promise<LeadDedupResult> => {
    const query = buildLeadDedupParams(params).toString();
    const url = `${buildLeadDedupPath(runtime.apiPath)}?${query}`;
    return requestAndAdapt({
      runtime,
      url,
      method: "GET",
      adapt: (value) =>
        adaptLeadDedupResult(value) ?? { leads: [], customers: [] },
      errorMessage: "Invalid dedup response",
    });
  };
}

function createConvertCustomer(runtime: LeadRepositoryRuntime) {
  return async (
    id: string,
    input: LeadConvertCustomerInput,
  ): Promise<LeadMutationResult> => {
    const normalizedId = id.trim();
    if (!normalizedId) {
      throw new LeadRepositoryError({
        code: "VALIDATION_ERROR",
        message: "Missing lead ID",
      });
    }
    return requestAndAdapt({
      runtime,
      url: buildLeadConvertCustomerPath(runtime.apiPath, normalizedId),
      method: "POST",
      body: buildLeadConvertCustomerPayload(input),
      adapt: adaptLeadConvertCustomerResult,
      errorMessage: "Invalid convert customer response",
    });
  };
}

function createConvertCase(runtime: LeadRepositoryRuntime) {
  return async (
    id: string,
    input: LeadConvertCaseInput,
  ): Promise<LeadMutationResult> => {
    const normalizedId = id.trim();
    if (!normalizedId) {
      throw new LeadRepositoryError({
        code: "VALIDATION_ERROR",
        message: "Missing lead ID",
      });
    }
    return requestAndAdapt({
      runtime,
      url: buildLeadConvertCasePath(runtime.apiPath, normalizedId),
      method: "POST",
      body: buildLeadConvertCasePayload(input),
      adapt: adaptLeadConvertCaseResult,
      errorMessage: "Invalid convert case response",
    });
  };
}

// ─── Factory ────────────────────────────────────────────────────

/**
 * 创建基于 HTTP 请求的真实 LeadRepository。
 *
 * @param input - 可选的 fetch、令牌提供者和 API 路径覆盖
 * @returns 实现所有线索 CRUD 操作的仓库实例
 */
export function createLeadRepository(
  input: LeadRepositoryFactoryInput = {},
): LeadRepository {
  const runtime = createRuntime(input);

  return {
    listLeads: createListLeads(runtime),
    getDetail: createGetDetail(runtime),
    createLead: createCreateLead(runtime),
    updateLead: createUpdateLead(runtime),
    transitionLead: createTransitionLead(runtime),
    addFollowup: createAddFollowup(runtime),
    listFollowups: createListFollowups(runtime),
    listLogs: createListLogs(runtime),
    bulkAssign: createBulkAssign(runtime),
    bulkStatus: createBulkStatus(runtime),
    bulkFollowup: createBulkFollowup(runtime),
    bulkTags: createBulkTags(runtime),
    bulkExport: createBulkExport(runtime),
    dedup: createDedup(runtime),
    convertCustomer: createConvertCustomer(runtime),
    convertCase: createConvertCase(runtime),
  };
}
