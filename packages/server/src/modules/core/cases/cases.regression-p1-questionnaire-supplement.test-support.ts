import type { Pool } from "pg";

import { CasesService } from "./cases.service";

export const ORG_ID = "00000000-0000-4000-8000-000000000000";
export const USER_ID = "00000000-0000-4000-8000-000000000001";
export const CASE_ID = "case-1";

type QueryFn = (
  sql: string,
  params?: unknown[],
) => Promise<{ rows: unknown[]; rowCount: number }>;

export const ok = (rows: unknown[] = [], rowCount = rows.length) =>
  Promise.resolve({ rows, rowCount });

const isTxSql = (s: string) =>
  /^(begin|commit|rollback|select set_config)/.test(s.trim().toLowerCase());

const BASE_CASE_ROW: Record<string, unknown> = {
  id: CASE_ID,
  org_id: ORG_ID,
  customer_id: "cust-1",
  case_type_code: "visa",
  status: "S1",
  stage: "S1",
  group_id: null,
  owner_user_id: USER_ID,
  opened_at: "2026-01-01T00:00:00.000Z",
  due_at: null,
  metadata: {},
  case_no: null,
  case_name: null,
  case_subtype: null,
  application_type: null,
  application_flow_type: "standard",
  visa_plan: null,
  post_approval_stage: "none",
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
  current_workflow_step_code: null,
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
 * 为 `CasesService` 测试构造最小可用的连接池 stub。
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
 * 构造模板解析器 stub，默认回退到 legacy 模式。
 * @param r 可选的返回值或按 `kind` 分发的 resolver。
 * @returns 带有 `service.resolve` 的模板服务 stub。
 */
export function makeTemplates(r?: unknown) {
  return {
    service: {
      resolve: (_ctx: unknown, input: { kind: string }) =>
        Promise.resolve(
          typeof r === "function"
            ? (r as (input: { kind: string }) => unknown)(input)
            : (r ?? { mode: "legacy", used: false }),
        ),
    },
  };
}

/**
 * 创建绑定 stub 依赖的 `CasesService` 实例。
 * @param pool 供测试使用的 pool stub。
 * @param tpl 可选模板服务 stub。
 * @param tpl.service 模板服务对象。
 * @returns 已注入测试依赖的 `CasesService`。
 */
export function svc(
  pool: ReturnType<typeof makePool>,
  tpl?: { service: unknown },
) {
  return new CasesService(
    pool as unknown as Pool,
    (tpl ?? makeTemplates()).service as never,
  );
}

/**
 * 生成默认测试上下文。
 * @returns 默认 staff 请求上下文。
 */
export function ctx() {
  return { orgId: ORG_ID, userId: USER_ID, role: "staff" as const };
}

/**
 * 生成测试用 case row，并保持 `status` / `stage` 同步。
 * @param overrides 覆盖默认 row 字段的值。
 * @returns 供查询结果复用的 case row。
 */
export function makeCaseRow(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  const row: Record<string, unknown> = { ...BASE_CASE_ROW, ...overrides };
  applyStageStatusFallback(row, overrides);
  return row;
}

/**
 * 生成详情聚合计数行。
 * @param overrides 覆盖默认统计字段的值。
 * @returns 供详情聚合测试使用的计数行。
 */
export function makeCountsRow(overrides: Record<string, string> = {}) {
  return {
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
    ...overrides,
  };
}
