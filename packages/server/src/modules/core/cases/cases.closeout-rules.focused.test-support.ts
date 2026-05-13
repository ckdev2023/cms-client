import type { Pool } from "pg";

import { CasesService } from "./cases.service";
import type { CaseResidencePeriodSummary } from "./cases.types-residence-closeout";
import type { Case } from "../model/coreEntities";
import type { RequestContext } from "../tenancy/requestContext";

export const ORG_ID = "00000000-0000-4000-8000-000000000000";
export const USER_ID = "00000000-0000-4000-8000-000000000001";
export const CASE_ID = "case-closeout-1";

const BASE_CASE_ROW: Record<string, unknown> = {
  id: CASE_ID,
  org_id: ORG_ID,
  customer_id: "cust-1",
  case_type_code: "business_manager_visa",
  status: "S8",
  stage: "S8",
  group_id: null,
  owner_user_id: USER_ID,
  opened_at: "2026-01-01T00:00:00.000Z",
  due_at: null,
  metadata: {},
  case_no: null,
  case_name: null,
  case_subtype: null,
  application_type: null,
  application_flow_type: null,
  visa_plan: null,
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
  quote_price: null,
  deposit_paid_cached: false,
  final_payment_paid_cached: false,
  billing_unpaid_amount_cached: "0",
  billing_risk_acknowledged_by: null,
  billing_risk_acknowledged_at: null,
  billing_risk_ack_reason_code: null,
  billing_risk_ack_reason_note: null,
  billing_risk_ack_evidence_url: null,
  overseas_visa_start_at: null,
  entry_confirmed_at: null,
  business_phase: "CONSULTING",
  current_workflow_step_code: "ENTRY_SUCCESS",
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

function applyStageStatusFallback(
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

/**
 * 生成 closeout 测试使用的请求上下文。
 * @param role 请求上下文角色。
 * @returns 对应角色的租户请求上下文。
 */
export function makeCtx(
  role: "staff" | "viewer" | "manager" = "staff",
): RequestContext {
  return { orgId: ORG_ID, userId: USER_ID, role };
}

/**
 * 生成 closeout 规则测试使用的领域 `Case`。
 * @param overrides 覆盖默认 case 字段的值。
 * @returns 用于 closeout 规则校验的 `Case` 实体。
 */
export function makeCase(overrides: Partial<Case> = {}): Case {
  return {
    id: CASE_ID,
    orgId: ORG_ID,
    customerId: "cust-1",
    caseTypeCode: "business_manager_visa",
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
    applicationFlowType: null,
    visaPlan: null,
    postApprovalStage: null,
    coeIssuedAt: null,
    coeExpiryDate: null,
    coeSentAt: null,
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
    quotePrice: null,
    depositPaidCached: false,
    finalPaymentPaidCached: false,
    billingUnpaidAmountCached: 0,
    billingRiskAcknowledgedBy: null,
    billingRiskAcknowledgedAt: null,
    billingRiskAckReasonCode: null,
    billingRiskAckReasonNote: null,
    billingRiskAckEvidenceUrl: null,
    overseasVisaStartAt: null,
    entryConfirmedAt: null,
    jurisdictionAuthority: null,
    businessPhase: "CONSULTING",
    currentWorkflowStepCode: "ENTRY_SUCCESS",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

export const FULL_SUMMARY: CaseResidencePeriodSummary = {
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
};

/**
 * 生成 closeout 场景下的 case row，并保持 `status` / `stage` 同步。
 * @param overrides 覆盖默认 case row 字段的值。
 * @returns 供查询结果复用的 case row。
 */
export function makeCaseRow(overrides: Record<string, unknown> = {}) {
  const row: Record<string, unknown> = { ...BASE_CASE_ROW, ...overrides };
  applyStageStatusFallback(row, overrides);
  return row;
}

export const RESIDENCE_PERIOD_ROW = {
  id: "rp-001",
  org_id: ORG_ID,
  case_id: CASE_ID,
  customer_id: "cust-1",
  visa_type: "business_manager",
  status_of_residence: "経営・管理",
  period_years: 1,
  period_label: "1年",
  valid_from: "2026-04-01",
  valid_until: "2027-04-01",
  card_number: "AB1234567CD",
  is_current: true,
  entry_date: "2026-03-15",
  reminder_created: true,
  notes: null,
  created_by: USER_ID,
  created_at: "2026-04-01T00:00:00.000Z",
  updated_at: "2026-04-01T00:00:00.000Z",
};

type QueryFn = (
  sql: string,
  params?: unknown[],
) => Promise<{ rows: unknown[]; rowCount: number }>;

const ok = (rows: unknown[] = [], rowCount = rows.length) =>
  Promise.resolve({ rows, rowCount });

const isTxSql = (s: string) =>
  /^(begin|commit|rollback|select set_config)/.test(s.trim().toLowerCase());

/**
 * 为 closeout 相关测试构造最小可用的连接池 stub。
 * @param qf 非事务 SQL 的查询处理函数。
 * @returns 可注入 `CasesService` 的 pool stub。
 */
export function makePool(qf: QueryFn) {
  return {
    connect: () =>
      Promise.resolve({
        query: (s: string, p?: unknown[]) => (isTxSql(s) ? ok() : qf(s, p)),
        release: () => undefined,
      }),
  };
}

/**
 * 构造 closeout 测试所需的模板解析器 stub。
 * @returns 返回 legacy 模式的模板服务 stub。
 */
export function makeTemplates() {
  return {
    service: {
      resolve: () => Promise.resolve({ mode: "legacy", used: false }),
    },
  };
}

/**
 * 创建绑定 closeout 测试依赖的 `CasesService`。
 * @param pool 供测试使用的 pool stub。
 * @param tpl 模板服务 stub。
 * @param tpl.service 模板服务对象。
 * @returns 已注入测试依赖的 `CasesService`。
 */
export function svc(
  pool: ReturnType<typeof makePool>,
  tpl: { service: unknown },
) {
  return new CasesService(pool as unknown as Pool, tpl.service as never);
}

/**
 * 生成 S8→S9 closeout 转场所需的数据库交互 stub。
 * @param caseOverrides 覆盖默认 case row 字段的值。
 * @param residencePeriodRow 当前在留期间 row；传 `null` 表示不存在。
 * @returns 可用于转场测试的 pool stub。
 */
export function bmvS8TransitionPool(
  caseOverrides: Record<string, unknown> = {},
  residencePeriodRow: Record<string, unknown> | null = RESIDENCE_PERIOD_ROW,
) {
  return makePool((sql, p) => {
    if (sql.includes("update cases") && sql.includes("stage = $2")) {
      return ok([makeCaseRow({ ...caseOverrides, status: "S9", stage: "S9" })]);
    }
    if (sql.includes("from cases") && p?.[0] === CASE_ID) {
      return ok([makeCaseRow(caseOverrides)]);
    }
    if (sql.includes("from residence_periods") && sql.includes("is_current")) {
      return residencePeriodRow ? ok([residencePeriodRow]) : ok([]);
    }
    return ok();
  });
}

const detailCountsRow = {
  document_items_total: "0",
  document_items_done: "0",
  questionnaire_items_total: "0",
  questionnaire_items_done: "0",
  case_parties: "0",
  tasks: "0",
  tasks_pending: "0",
  communication_logs: "0",
  submission_packages: "0",
  generated_documents: "0",
  validation_runs: "0",
  review_records: "0",
  billing_records: "0",
  payment_records: "0",
};

/**
 * 生成 `getDetailAggregate` 所需的数据库交互 stub。
 * @param caseOverrides 覆盖默认 case row 字段的值。
 * @param residencePeriodRow 当前在留期间 row；传 `null` 表示不存在。
 * @returns 可用于详情聚合测试的 pool stub。
 */
export function detailAggregatePool(
  caseOverrides: Record<string, unknown> = {},
  residencePeriodRow: Record<string, unknown> | null = RESIDENCE_PERIOD_ROW,
) {
  const summaryRow = {
    ...makeCaseRow(caseOverrides),
    customer_name: "Test Customer",
    group_name: null,
    owner_display_name: "Owner",
    assistant_display_name: null,
  };
  return makePool((sql) => {
    if (sql.includes("customer_name")) return ok([summaryRow]);
    if (sql.includes("document_items_total")) return ok([detailCountsRow]);
    if (sql.includes("from residence_periods") && sql.includes("is_current")) {
      return residencePeriodRow ? ok([residencePeriodRow]) : ok([]);
    }
    return ok([]);
  });
}
