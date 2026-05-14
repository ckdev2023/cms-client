import type { Pool } from "pg";

import { CasesService } from "./cases.service";
import type { RequestContext } from "../tenancy/requestContext";

const ORG_ID = "00000000-0000-4000-8000-000000000000";
export const USER_ID = "00000000-0000-4000-8000-000000000001";
export const CASE_ID = "case-fp-1";

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
  final_payment_paid_cached: false,
  billing_unpaid_amount_cached: "200000",
  billing_risk_acknowledged_by: null,
  billing_risk_acknowledged_at: null,
  billing_risk_ack_reason_code: null,
  billing_risk_ack_reason_note: null,
  billing_risk_ack_evidence_url: null,
  overseas_visa_start_at: null,
  entry_confirmed_at: null,
  current_workflow_step_code: "APPROVED",
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

type QueryFn = (
  sql: string,
  params?: unknown[],
) => Promise<{ rows: unknown[]; rowCount: number }>;

/**
 * 生成 cases 测试用请求上下文。
 * @param role 请求上下文角色。
 * @returns 供 CasesService 调用的 RequestContext。
 */
export function makeCtx(
  role: "staff" | "viewer" | "manager" = "staff",
): RequestContext {
  return { orgId: ORG_ID, userId: USER_ID, role };
}

/**
 * 生成 case 查询结果行。
 * @param overrides 需要覆盖的字段。
 * @returns cases 表模拟查询结果行。
 */
export function makeCaseRow(overrides: Record<string, unknown> = {}) {
  const row = { ...BASE_CASE_ROW, ...overrides };
  if (typeof overrides.status === "string" && overrides.stage === undefined) {
    row.stage = overrides.status;
  }
  if (typeof overrides.stage === "string" && overrides.status === undefined) {
    row.status = overrides.stage;
  }
  return row;
}

/**
 * 生成标准查询成功结果。
 * @param rows 查询返回行。
 * @param rowCount 行数，默认取 rows.length。
 * @returns Promise 包装后的查询结果。
 */
export function ok(rows: unknown[] = [], rowCount = rows.length) {
  return Promise.resolve({ rows, rowCount });
}

/**
 * 识别 `cases.service.billing-gates` 中 `hasCaseBillingReceivable` 使用的 exists 探测 SQL。
 * 对 `transitionPhase`/`updatePostApprovalStage` 命中 COE 门卫的 stub 应优先返回 `{ ok: boolean }`。
 *
 * @param sql 事务内执行的 SQL 文本。
 * @returns 是否为 billing 存在性探测语句。
 */
export function isBillingReceivableExistenceQuery(sql: string): boolean {
  return (
    /\bselect\s+exists\s*\(/i.test(sql) &&
    sql.includes("billing_records") &&
    sql.includes("case_id = $1")
  );
}

function isTxSql(sql: string) {
  return /^(begin|commit|rollback|select set_config)/.test(
    sql.trim().toLowerCase(),
  );
}

/**
 * 生成带事务 SQL 兜底的连接池 stub。
 * @param queryFn 业务 SQL 的 query 实现。
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
 * 生成模板解析 stub。
 * @param result 可选的固定返回值或 resolver 函数。
 * @returns 含 resolve() 的模板 service stub。
 */
export function makeTemplates(result?: unknown) {
  return {
    service: {
      resolve: (_ctx: unknown, input: { kind: string }) =>
        Promise.resolve(
          typeof result === "function"
            ? (result as (input: { kind: string }) => unknown)(input)
            : (result ?? { mode: "legacy", used: false }),
        ),
    },
  };
}

/**
 * 创建注入 pool 与模板 stub 的 CasesService。
 * @param pool 数据库连接池 stub。
 * @param templates 模板解析 stub。
 * @param templates.service 模板解析 service。
 * @returns 可直接用于测试的 CasesService。
 */
export function svc(
  pool: ReturnType<typeof makePool>,
  templates: { service: unknown },
) {
  return new CasesService(pool as unknown as Pool, templates.service as never);
}

/**
 * 生成 billing_records 查询结果行。
 * @param mode gate effect mode。
 * @param status billing status。
 * @param amount amount_due 值。
 * @param milestone milestone_name 值。
 * @returns billing_records 模拟查询结果行。
 */
export function billingRow(
  mode: "block" | "warn" | "off",
  status = "due",
  amount = "200000",
  milestone = "尾款",
) {
  return {
    id: "11111111-2222-4333-8444-555555555555",
    amount_due: amount,
    status,
    milestone_name: milestone,
    gate_effect_mode: mode,
  };
}

/**
 * 生成 payment_records 聚合结果行。
 * @param received total_received 值。
 * @returns payment_records 模拟聚合结果行。
 */
export function paymentRow(received: string) {
  return { total_received: received };
}
