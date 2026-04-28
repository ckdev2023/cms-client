import type {
  CustomerCase,
  CustomerBmvProfile,
  CustomerComm,
  CustomerCreateFormFields,
  CustomerDetail,
  CustomerLog,
  CustomerRelation,
} from "../types";
import {
  adaptBulkMutationResult,
  adaptCustomerBmvActionResult,
  adaptCommunicationLogListResult,
  adaptCustomerCaseListResult,
  adaptCustomerDetailDto,
  adaptCustomerDuplicateCandidates,
  adaptCustomerListResult,
  adaptCustomerMutationResult,
  adaptCustomerRelationDto,
  adaptCustomerRelationListResult,
  adaptTimelineBmvCommListResult,
  adaptTimelineLogListResult,
  buildContactPersonPath,
  buildCheckDuplicatesPayload,
  buildCreateCustomerPayload,
  buildCustomerRelationPayload,
  buildCustomerDetailPath,
  buildCustomerListSearchParams,
  buildUpdateCustomerPayload,
  type CustomerBasicInfoUpdateInput,
  type CustomerDuplicateCandidate,
  type CustomerDuplicateCheckInput,
  type CustomerListParams,
  type CustomerListResult,
  type CustomerRelationMutationInput,
} from "./CustomerAdapter";
import {
  CUSTOMER_CASES_API_PATH,
  CUSTOMER_CASES_QUERY_HTTP_CONTRACT,
} from "./CustomerAdapterTypes";
import {
  assertBulkInput,
  assertRelationInput,
  createRuntime,
  requestAndAdapt,
  type CustomerRepositoryFactoryInput,
  type CustomerRepositoryRuntime,
} from "./CustomerRepositorySupport";

const COMMUNICATION_LOGS_API_PATH = "/api/communication-logs";
const CONTACT_PERSONS_API_PATH = "/api/contact-persons";
const TIMELINE_API_PATH = "/api/timeline";

function buildTimelineQuery(customerId: string): URLSearchParams {
  return new URLSearchParams({
    entityType: "customer",
    entityId: customerId,
    limit: "200",
  });
}

function sortCustomerComms(items: CustomerComm[]): CustomerComm[] {
  return [...items].sort((left, right) => {
    const leftAt = Date.parse(left.occurredAt);
    const rightAt = Date.parse(right.occurredAt);
    if (Number.isNaN(leftAt) || Number.isNaN(rightAt)) return 0;
    return rightAt - leftAt;
  });
}

interface CustomerMutationResult {
  id: string;
}

interface CustomerBmvActionResult extends CustomerMutationResult {
  bmvProfile: CustomerBmvProfile | null;
}

/** 客户模块仓储能力定义。 */
export interface CustomerRepository {
  /** 查询客户列表。 */
  listCustomers(params: CustomerListParams): Promise<CustomerListResult>;
  /** 查询客户关联案件。 */
  listRelatedCases(customerId: string): Promise<CustomerCase[]>;
  /** 查询客户沟通记录。 */
  listComms(customerId: string): Promise<CustomerComm[]>;
  /** 查询客户操作日志。 */
  listLogs(customerId: string): Promise<CustomerLog[]>;
  /** 查询客户关联人。 */
  listRelations(customerId: string): Promise<CustomerRelation[]>;
  /** 查询单个客户详情。 */
  getCustomerDetail(id: string): Promise<CustomerDetail>;
  /** 新建客户。 */
  createCustomer(input: CustomerCreateFormFields): Promise<{ id: string }>;
  /** 更新客户基础信息。 */
  updateCustomerBasicInfo(
    id: string,
    input: CustomerBasicInfoUpdateInput,
  ): Promise<{ id: string }>;
  /** 发送经营管理签问卷。 */ sendBmvQuestionnaire(
    id: string,
  ): Promise<CustomerBmvActionResult>;
  /** 记录经营管理签问卷回收并生成报价。 */ generateBmvQuote(
    id: string,
  ): Promise<CustomerBmvActionResult>;
  /** 记录经营管理签已签约。 */ recordBmvSign(
    id: string,
  ): Promise<CustomerBmvActionResult>;
  /** 新增客户关联人。 */ createRelation(
    input: CustomerRelationMutationInput,
  ): Promise<CustomerRelation>;
  /** 编辑客户关联人。 */ updateRelation(
    id: string,
    input: CustomerRelationMutationInput,
  ): Promise<CustomerRelation>;
  /** 检查潜在重复客户。 */ checkDuplicates(
    input: CustomerDuplicateCheckInput,
  ): Promise<CustomerDuplicateCandidate[]>;
  /** 批量指派负责人。 */ bulkAssignOwner(
    customerIds: string[],
    ownerId: string,
  ): Promise<{ updatedCount: number }>;
  /** 批量调整分组。 */ bulkChangeGroup(
    customerIds: string[],
    group: string,
  ): Promise<{ updatedCount: number }>;
  /** 检查 BMV 功能开关是否对当前租户启用。 */
  isBmvEnabled(): Promise<boolean>;
}

export {
  CustomerRepositoryError,
  type ServerBlocker,
} from "./CustomerRepositorySupport";

function createListCustomers(runtime: CustomerRepositoryRuntime) {
  return async (params: CustomerListParams): Promise<CustomerListResult> => {
    const query = buildCustomerListSearchParams(params).toString();
    const url = query ? `${runtime.apiPath}?${query}` : runtime.apiPath;
    return requestAndAdapt({
      runtime,
      url,
      method: "GET",
      adapt: adaptCustomerListResult,
      errorMessage: "Invalid customer list response",
    });
  };
}

function createGetCustomerDetail(runtime: CustomerRepositoryRuntime) {
  return async (id: string): Promise<CustomerDetail> =>
    requestAndAdapt({
      runtime,
      url: buildCustomerDetailPath(runtime.apiPath, id),
      method: "GET",
      adapt: adaptCustomerDetailDto,
      errorMessage: "Invalid customer detail response",
    });
}

// ─── Customer → Cases Downstream Reuse (p0-fe-002b-01 / p0-fe-002b-03, calibrated by p0-fe-009-01) ──
// This function queries the cases API directly: GET /api/cases?customerId=<id>&view=summary
// It shares the same server endpoint as CaseRepository.listCases but constructs
// its own URLSearchParams to avoid cross-feature import (architecture rule).
//
// Contract dependency (p0-fe-002b-03 frozen, p0-fe-009-01 calibrated):
//   - Server query param name: "customerId" (must match CASE_LIST_HTTP_FIELD_MAP.customerId)
//   - "view=summary" ensures response includes customerName/groupName/latestValidation
//     (aligned with CaseAdapterReaders.buildCaseListSearchParams)
//   - Locked by CaseAdapterReaders.customer-summary-page.test.ts
//   - Response DTO minimum fields: see CUSTOMER_DOWNSTREAM_MINIMUM_FIELDS in CaseAdapterTypes
//   - Shared HTTP params: see CUSTOMER_CASES_QUERY_HTTP_CONTRACT in CustomerAdapterTypes
//   - Response adaptation: adaptCustomerCaseListResult (flexible multi-key resilient parser)
//
// If the cases list API renames "customerId", changes "view=summary" semantics,
// or changes its response shape, this function and adaptCustomerCaseListResult
// must be updated in sync.

function createListRelatedCases(runtime: CustomerRepositoryRuntime) {
  return async (customerId: string): Promise<CustomerCase[]> => {
    const normalizedCustomerId = customerId.trim();
    if (!normalizedCustomerId) return [];

    const query = new URLSearchParams({
      [CUSTOMER_CASES_QUERY_HTTP_CONTRACT.customerId]: normalizedCustomerId,
      view: CUSTOMER_CASES_QUERY_HTTP_CONTRACT.view,
    });
    return requestAndAdapt({
      runtime,
      url: `${CUSTOMER_CASES_API_PATH}?${query.toString()}`,
      method: "GET",
      adapt: adaptCustomerCaseListResult,
      errorMessage: "Invalid related cases response",
    });
  };
}

function createListComms(runtime: CustomerRepositoryRuntime) {
  return async (customerId: string): Promise<CustomerComm[]> => {
    const normalizedCustomerId = customerId.trim();
    if (!normalizedCustomerId) return [];

    const commsQuery = new URLSearchParams({
      customerId: normalizedCustomerId,
      limit: "200",
    });

    const [comms, bmvTimelineComms] = await Promise.all([
      requestAndAdapt({
        runtime,
        url: `${COMMUNICATION_LOGS_API_PATH}?${commsQuery.toString()}`,
        method: "GET",
        adapt: adaptCommunicationLogListResult,
        errorMessage: "Invalid customer communications response",
      }),
      requestAndAdapt({
        runtime,
        url: `${TIMELINE_API_PATH}?${buildTimelineQuery(normalizedCustomerId).toString()}`,
        method: "GET",
        adapt: adaptTimelineBmvCommListResult,
        errorMessage: "Invalid customer timeline communications response",
      }),
    ]);

    return sortCustomerComms([...comms, ...bmvTimelineComms]);
  };
}

function createListLogs(runtime: CustomerRepositoryRuntime) {
  return async (customerId: string): Promise<CustomerLog[]> => {
    const normalizedCustomerId = customerId.trim();
    if (!normalizedCustomerId) return [];

    const query = buildTimelineQuery(normalizedCustomerId);
    return requestAndAdapt({
      runtime,
      url: `${TIMELINE_API_PATH}?${query.toString()}`,
      method: "GET",
      adapt: adaptTimelineLogListResult,
      errorMessage: "Invalid customer logs response",
    });
  };
}

function createListRelations(runtime: CustomerRepositoryRuntime) {
  return async (customerId: string): Promise<CustomerRelation[]> => {
    const normalizedCustomerId = customerId.trim();
    if (!normalizedCustomerId) return [];

    const query = new URLSearchParams({ customerId: normalizedCustomerId });
    return requestAndAdapt({
      runtime,
      url: `${CONTACT_PERSONS_API_PATH}?${query.toString()}`,
      method: "GET",
      adapt: adaptCustomerRelationListResult,
      errorMessage: "Invalid customer relations response",
    });
  };
}

function createCreateCustomer(runtime: CustomerRepositoryRuntime) {
  return async (
    input: CustomerCreateFormFields,
  ): Promise<CustomerMutationResult> =>
    requestAndAdapt({
      runtime,
      url: runtime.apiPath,
      method: "POST",
      body: buildCreateCustomerPayload(input),
      adapt: adaptCustomerMutationResult,
      errorMessage: "Invalid create customer response",
    });
}

function createUpdateCustomerBasicInfo(runtime: CustomerRepositoryRuntime) {
  return async (
    id: string,
    input: CustomerBasicInfoUpdateInput,
  ): Promise<CustomerMutationResult> =>
    requestAndAdapt({
      runtime,
      url: buildCustomerDetailPath(runtime.apiPath, id),
      method: "PATCH",
      body: buildUpdateCustomerPayload(input),
      adapt: adaptCustomerMutationResult,
      errorMessage: "Invalid update customer response",
    });
}

function createBmvAction(
  runtime: CustomerRepositoryRuntime,
  actionPath: string,
  errorMessage: string,
) {
  return async (id: string): Promise<CustomerBmvActionResult> =>
    requestAndAdapt({
      runtime,
      url: `${buildCustomerDetailPath(runtime.apiPath, id)}/${actionPath}`,
      method: "POST",
      adapt: adaptCustomerBmvActionResult,
      errorMessage,
    });
}

function createCreateRelation(runtime: CustomerRepositoryRuntime) {
  return async (
    input: CustomerRelationMutationInput,
  ): Promise<CustomerRelation> => {
    assertRelationInput(input.customerId, input.name);
    return requestAndAdapt({
      runtime,
      url: CONTACT_PERSONS_API_PATH,
      method: "POST",
      body: buildCustomerRelationPayload(input),
      adapt: adaptCustomerRelationDto,
      errorMessage: "Invalid create relation response",
    });
  };
}

function createUpdateRelation(runtime: CustomerRepositoryRuntime) {
  return async (
    id: string,
    input: CustomerRelationMutationInput,
  ): Promise<CustomerRelation> => {
    assertRelationInput(input.customerId, input.name, id);
    return requestAndAdapt({
      runtime,
      url: buildContactPersonPath(CONTACT_PERSONS_API_PATH, id),
      method: "PATCH",
      body: buildCustomerRelationPayload(input),
      adapt: adaptCustomerRelationDto,
      errorMessage: "Invalid update relation response",
    });
  };
}

function createCheckDuplicates(runtime: CustomerRepositoryRuntime) {
  return async (
    input: CustomerDuplicateCheckInput,
  ): Promise<CustomerDuplicateCandidate[]> =>
    requestAndAdapt({
      runtime,
      url: `${runtime.apiPath}/check-duplicates`,
      method: "POST",
      body: buildCheckDuplicatesPayload(input),
      adapt: adaptCustomerDuplicateCandidates,
      errorMessage: "Invalid customer duplicate response",
    });
}

function adaptFeatureFlagEnabled(value: unknown): boolean | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (typeof record.enabled !== "boolean") return null;
  return record.enabled;
}

function createIsBmvEnabled(runtime: CustomerRepositoryRuntime) {
  return async (): Promise<boolean> => {
    const query = new URLSearchParams({ key: "bmv" });
    try {
      const result = await requestAndAdapt({
        runtime,
        url: `/api/feature-flags/resolve?${query.toString()}`,
        method: "GET",
        adapt: adaptFeatureFlagEnabled,
        errorMessage: "Invalid feature flag resolve response",
      });
      return result;
    } catch {
      return false;
    }
  };
}

function createBulkMutation(
  runtime: CustomerRepositoryRuntime,
  input: {
    path: string;
    fieldName: string;
    errorMessage: string;
    buildBody: (
      customerIds: string[],
      value: string,
    ) => Record<string, unknown>;
  },
) {
  return async (
    customerIds: string[],
    fieldValue: string,
  ): Promise<{ updatedCount: number }> => {
    const normalizedIds = assertBulkInput(
      customerIds,
      fieldValue,
      input.fieldName,
    );
    const result = await requestAndAdapt({
      runtime,
      url: `${runtime.apiPath}/${input.path}`,
      method: "POST",
      body: input.buildBody(normalizedIds, fieldValue.trim()),
      adapt: adaptBulkMutationResult,
      errorMessage: input.errorMessage,
    });
    return { updatedCount: result.updatedCount };
  };
}

/**
 * 创建客户模块仓储实现。
 *
 * @param input - 可注入的请求器、鉴权 token 获取器与 API 前缀
 * @param input.request - 自定义 `fetch` 实现
 * @param input.getToken - 自定义 token 获取器
 * @param input.apiPath - 客户 API 根路径
 * @returns 满足客户模块读写能力的仓储对象
 */
export function createCustomerRepository(
  input: CustomerRepositoryFactoryInput = {},
): CustomerRepository {
  const runtime = createRuntime(input);

  return {
    listCustomers: createListCustomers(runtime),
    listRelatedCases: createListRelatedCases(runtime),
    listComms: createListComms(runtime),
    listLogs: createListLogs(runtime),
    listRelations: createListRelations(runtime),
    getCustomerDetail: createGetCustomerDetail(runtime),
    createCustomer: createCreateCustomer(runtime),
    updateCustomerBasicInfo: createUpdateCustomerBasicInfo(runtime),
    sendBmvQuestionnaire: createBmvAction(
      runtime,
      "bmv/questionnaire/send",
      "Invalid send BMV questionnaire response",
    ),
    generateBmvQuote: createBmvAction(
      runtime,
      "bmv/quote/generate",
      "Invalid generate BMV quote response",
    ),
    recordBmvSign: createBmvAction(
      runtime,
      "bmv/sign/record",
      "Invalid record BMV sign response",
    ),
    createRelation: createCreateRelation(runtime),
    updateRelation: createUpdateRelation(runtime),
    checkDuplicates: createCheckDuplicates(runtime),
    bulkAssignOwner: createBulkMutation(runtime, {
      path: "bulk-assign-owner",
      fieldName: "ownerId",
      errorMessage: "Invalid bulk assign owner response",
      buildBody: (customerIds, ownerId) => ({ customerIds, ownerId }),
    }),
    bulkChangeGroup: createBulkMutation(runtime, {
      path: "bulk-change-group",
      fieldName: "group",
      errorMessage: "Invalid bulk change group response",
      buildBody: (customerIds, group) => ({ customerIds, group }),
    }),
    isBmvEnabled: createIsBmvEnabled(runtime),
  };
}
