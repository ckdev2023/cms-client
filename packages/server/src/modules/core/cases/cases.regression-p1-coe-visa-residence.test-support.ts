import type { Pool } from "pg";

import { CasesService } from "./cases.service";
import { BMV_CASE_TYPE } from "./cases.template-bmv";
import type { FinalPaymentGuardCheckResult } from "./cases.types-final-payment";
import type { CaseResidencePeriodSummary } from "./cases.types-residence-closeout";
import type { Case } from "../model/coreEntities";

export const ORG_ID = "00000000-0000-4000-8000-000000000000";
export const USER_ID = "00000000-0000-4000-8000-000000000001";
export const CASE_ID = "case-p1-reg2";

const BASE_CASE_ROW: Record<string, unknown> = {
  id: CASE_ID,
  org_id: ORG_ID,
  customer_id: "cust-1",
  case_type_code: BMV_CASE_TYPE,
  status: "S7",
  stage: "S7",
  group_id: null,
  owner_user_id: USER_ID,
  opened_at: "2026-01-01T00:00:00.000Z",
  due_at: null,
  metadata: {},
  case_no: null,
  case_name: null,
  case_subtype: null,
  application_type: null,
  application_flow_type: "coe_overseas",
  visa_plan: "1y",
  post_approval_stage: null,
  coe_issued_at: null,
  coe_expiry_date: null,
  coe_sent_at: null,
  close_reason: null,
  supplement_count: 0,
  company_id: null,
  priority: "normal",
  risk_level: "low",
  assistant_user_id: null,
  source_channel: null,
  signed_at: null,
  accepted_at: null,
  submission_date: null,
  result_date: null,
  residence_expiry_date: null,
  archived_at: null,
  result_outcome: null,
  quote_price: 300000,
  deposit_paid_cached: true,
  final_payment_paid_cached: true,
  billing_unpaid_amount_cached: "0",
  billing_risk_acknowledged_by: null,
  billing_risk_acknowledged_at: null,
  billing_risk_ack_reason_code: null,
  billing_risk_ack_reason_note: null,
  billing_risk_ack_evidence_url: null,
  overseas_visa_start_at: null,
  entry_confirmed_at: null,
  jurisdiction_authority: null,
  business_phase: "CONSULTING",
  current_workflow_step_code: "VISA_APPLYING",
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

function syncStageStatus(
  row: Record<string, unknown>,
  overrides: Record<string, unknown>,
) {
  if (typeof overrides.status === "string" && overrides.stage === undefined) {
    row.stage = overrides.status;
  }
  if (typeof overrides.stage === "string" && overrides.status === undefined) {
    row.status = overrides.stage;
  }
}

type QueryFn = (
  sql: string,
  params?: unknown[],
) => Promise<{ rows: unknown[]; rowCount: number }>;

function isTxSql(sql: string) {
  return /^(begin|commit|rollback|select set_config)/.test(
    sql.trim().toLowerCase(),
  );
}

/**
 * 生成标准查询结果。
 * @param rows 查询返回行。
 * @param rowCount 影响行数，默认取 rows.length。
 * @returns Promise 包装后的查询结果。
 */
export function ok(rows: unknown[] = [], rowCount = rows.length) {
  return Promise.resolve({ rows, rowCount });
}

/**
 * 创建带事务短路的 Pool stub。
 * @param queryFn 非事务 SQL 的查询路由。
 * @returns 供 CasesService 注入的 Pool stub。
 */
export function makePool(queryFn: QueryFn) {
  return {
    connect: () =>
      Promise.resolve({
        query: (sql: string, params?: unknown[]) =>
          isTxSql(sql) ? ok() : queryFn(sql, params),
        release: () => undefined,
      }),
  };
}

/**
 * 创建模板服务 stub。
 * @param resolver 自定义模板解析结果或解析函数。
 * @returns 含 `service.resolve` 的模板服务夹具。
 */
export function makeTemplates(resolver?: unknown) {
  return {
    service: {
      resolve: (_ctx: unknown, input: { kind: string }) =>
        Promise.resolve(
          typeof resolver === "function"
            ? (resolver as (input: { kind: string }) => unknown)(input)
            : (resolver ?? { mode: "legacy", used: false }),
        ),
    },
  };
}

/**
 * 创建 CasesService 测试实例。
 * @param pool 数据库连接池 stub。
 * @param templates 可选模板服务 stub。
 * @param templates.service 模板解析 service。
 * @returns CasesService 实例。
 */
export function svc(
  pool: ReturnType<typeof makePool>,
  templates?: { service: unknown },
) {
  return new CasesService(
    pool as unknown as Pool,
    (templates ?? makeTemplates()).service as never,
  );
}

/**
 * 构造 CasesService 请求上下文。
 * @returns 标准 staff 请求上下文。
 */
export function ctx() {
  return { orgId: ORG_ID, userId: USER_ID, role: "staff" as const };
}

/**
 * 构造 cases 表查询行。
 * @param overrides 需要覆盖的数据库字段。
 * @returns 模拟的 cases 查询行。
 */
export function makeCaseRow(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  const row: Record<string, unknown> = { ...BASE_CASE_ROW, ...overrides };
  syncStageStatus(row, overrides);
  return row;
}

/**
 * 构造领域层 Case 实体。
 * @param overrides 需要覆盖的实体字段。
 * @returns 满足 Case 结构的测试实体。
 */
export function makeCaseEntity(overrides: Partial<Case> = {}): Case {
  return {
    id: CASE_ID,
    orgId: ORG_ID,
    customerId: "cust-1",
    caseTypeCode: BMV_CASE_TYPE,
    status: "S8",
    stage: "S8",
    groupId: null,
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
    jurisdictionAuthority: null,
    currentWorkflowStepCode: "ENTRY_SUCCESS",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  } as Case;
}

/**
 * 构造完整成功结案所需的在留期间摘要。
 * @param overrides 需要覆盖的摘要字段。
 * @returns 标准 CaseResidencePeriodSummary。
 */
export function makeFullResidenceSummary(
  overrides: Partial<CaseResidencePeriodSummary> = {},
): CaseResidencePeriodSummary {
  return {
    id: "rp-001",
    visaType: "business_manager",
    statusOfResidence: "経営・管理",
    periodYears: 1,
    periodLabel: "1年",
    validFrom: "2026-04-01",
    validUntil: "2027-04-01",
    cardNumber: "AB1234567CD",
    entryDate: "2026-03-15",
    reminderCreated: true,
    ...overrides,
  };
}

/**
 * 构造未结清尾款场景的 guard 结果。
 * @param mode 门禁模式。
 * @param unpaid 未结金额，默认 200000。
 * @returns FinalPaymentGuardCheckResult。
 */
export function unsettled(
  mode: "block" | "warn",
  unpaid = 200000,
): FinalPaymentGuardCheckResult {
  return { settled: false, unpaid, gateEffectMode: mode };
}
