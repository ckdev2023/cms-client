import type { Pool } from "pg";

import { PermissionsService } from "../auth/permissions.service";
import type { Case } from "../model/coreEntities";
import type { RequestContext } from "../tenancy/requestContext";
import { ResidencePeriodsController } from "./residencePeriods.controller";
import { ResidencePeriodsService } from "./residencePeriods.service";

export const ORG_ID = "00000000-0000-4000-8000-000000000000";
export const USER_ID = "00000000-0000-4000-8000-000000000001";
export const OTHER_USER = "00000000-0000-4000-8000-000000000099";
export const CASE_ID = "00000000-0000-4000-8000-000000000010";
export const CUSTOMER_ID = "00000000-0000-4000-8000-000000000020";
export const PERIOD_ID = "00000000-0000-4000-8000-000000000030";
export const GROUP_ID = "00000000-0000-4000-8000-000000000050";

type QueryResult = { rows: unknown[]; rowCount?: number };
type QueryFn = (sql: string, params?: unknown[]) => Promise<QueryResult>;

type CreateControllerOptions = {
  periodService: ResidencePeriodsService;
  getCaseResult?: Case | null;
  canView?: boolean;
  canEdit?: boolean;
};

/**
 * 构造测试请求上下文。
 * @param role 请求角色。
 * @param overrides 额外覆盖字段。
 * @returns 标准 RequestContext。
 */
export function makeCtx(
  role: RequestContext["role"] = "staff",
  overrides: Partial<RequestContext> = {},
): RequestContext {
  return { orgId: ORG_ID, userId: USER_ID, role, ...overrides };
}

/**
 * 构造 residence_periods 查询行。
 * @param overrides 需要覆盖的字段。
 * @returns 模拟的 residence_periods 结果行。
 */
export function makeResidencePeriodRow(
  overrides: Record<string, unknown> = {},
) {
  return {
    id: PERIOD_ID,
    org_id: ORG_ID,
    case_id: CASE_ID,
    customer_id: CUSTOMER_ID,
    visa_type: "business_manager",
    status_of_residence: "経営・管理",
    period_years: 1,
    period_label: "1年",
    valid_from: "2026-01-01",
    valid_until: "2027-01-01",
    card_number: "AB1234567CD",
    is_current: true,
    entry_date: "2026-01-15",
    reminder_created: false,
    notes: null,
    created_by: USER_ID,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

/**
 * 构造 Case 领域实体。
 * @param overrides 需要覆盖的字段。
 * @returns 满足 Case 结构的测试实体。
 */
export function makeCaseEntity(overrides: Partial<Case> = {}): Case {
  return {
    id: CASE_ID,
    orgId: ORG_ID,
    customerId: CUSTOMER_ID,
    caseTypeCode: "business_manager_visa",
    status: "S8",
    stage: "S8",
    groupId: GROUP_ID,
    ownerUserId: USER_ID,
    openedAt: "2026-01-01T00:00:00.000Z",
    dueAt: null,
    metadata: {},
    caseNo: null,
    caseName: null,
    caseSubtype: null,
    applicationType: null,
    applicationFlowType: "coe_overseas",
    visaPlan: "1y",
    postApprovalStage: null,
    coeIssuedAt: null,
    coeExpiryDate: null,
    coeSentAt: "2026-03-01T00:00:00.000Z",
    closeReason: null,
    supplementCount: 0,
    companyId: null,
    priority: "normal",
    riskLevel: "low",
    assistantUserId: null,
    sourceChannel: null,
    signedAt: null,
    acceptedAt: null,
    submissionDate: null,
    resultDate: null,
    residenceExpiryDate: null,
    archivedAt: null,
    resultOutcome: null,
    quotePrice: 300000,
    depositPaidCached: true,
    finalPaymentPaidCached: true,
    billingUnpaidAmountCached: "0",
    billingRiskAcknowledgedBy: null,
    billingRiskAcknowledgedAt: null,
    billingRiskAckReasonCode: null,
    billingRiskAckReasonNote: null,
    billingRiskAckEvidenceUrl: null,
    overseasVisaStartAt: "2026-03-15T00:00:00.000Z",
    entryConfirmedAt: "2026-04-01T00:00:00.000Z",
    currentWorkflowStepCode: "ENTRY_SUCCESS",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  } as Case;
}

/**
 * 构造连接池 stub。
 * @param queryFn SQL 查询路由。
 * @returns 供 ResidencePeriodsService 注入的 Pool。
 */
export function makePool(queryFn: QueryFn): Pool {
  return {
    connect: () =>
      Promise.resolve({
        query: queryFn,
        release: () => undefined,
      }),
  } as unknown as Pool;
}

/**
 * 构造 timeline stub。
 * @returns 含 write stub 与写入记录数组的对象。
 */
export function makeTimeline() {
  const writes: unknown[] = [];
  return {
    service: {
      write: (_ctx: unknown, input: unknown) => {
        writes.push(input);
        return Promise.resolve();
      },
    },
    writes,
  };
}

/**
 * 构造注入 timeline stub 的 ResidencePeriodsService。
 * @param queryFn SQL 查询路由。
 * @returns 含 service 与 timeline 记录器的测试夹具。
 */
export function createService(queryFn: QueryFn) {
  const timeline = makeTimeline();
  const svc = new ResidencePeriodsService(
    makePool(queryFn),
    timeline.service as never,
  );
  return { svc, timeline };
}

/**
 * 构造注入案例服务与权限服务 stub 的 controller。
 * @param opts controller 依赖配置。
 * @param opts.periodService ResidencePeriodsService 实例。
 * @param opts.getCaseResult 父案件查询结果。
 * @param opts.canView 是否允许查看父案件。
 * @param opts.canEdit 是否允许编辑父案件。
 * @returns 可直接调用的 ResidencePeriodsController。
 */
export function createController(opts: CreateControllerOptions) {
  const caseResult =
    opts.getCaseResult === null
      ? null
      : (opts.getCaseResult ?? makeCaseEntity());
  const casesService = {
    get: () => Promise.resolve(caseResult),
  };
  const permissionsService = new PermissionsService();
  if (opts.canView !== undefined || opts.canEdit !== undefined) {
    permissionsService.canViewCase = () => opts.canView ?? true;
    permissionsService.canEditCase = () => opts.canEdit ?? true;
  }
  return new ResidencePeriodsController(
    opts.periodService,
    casesService as never,
    permissionsService,
  );
}

/**
 * 构造 controller 请求对象。
 * @param role 请求角色。
 * @param groupId 可选 groupId。
 * @returns 含 requestContext 的 controller 请求对象。
 */
export function makeReq(
  role: RequestContext["role"] = "staff",
  groupId?: string,
): { requestContext: RequestContext } {
  return {
    requestContext: {
      orgId: ORG_ID,
      userId: USER_ID,
      role,
      groupId,
    } as RequestContext,
  };
}
