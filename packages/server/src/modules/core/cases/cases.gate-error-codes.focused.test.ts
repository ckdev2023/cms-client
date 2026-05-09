/**
 * Gate exception 错误码前缀回归测试。
 *
 * 背景：admin adapter 通过解析 BadRequestException.message 中的错误码前缀
 * （e.g. "CASE_GATE_A_MISSING_PRIMARY_PARTY: ..."）映射对应 i18n 文案。
 * 历史上 transition-gates 的多个 gate 抛出无前缀消息，导致前端只能
 * fallback 到 "操作失败，请稍后重试。" 通用提示，掩盖真实阻塞原因。
 *
 * 本测试锁定每个 gate 的消息前缀，回归 admin 端的可读错误反馈。
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { type Pool } from "pg";

import { CasesService } from "./cases.service";
import { CASE_WRITE_ERROR_CODES } from "./cases.types";
import { type RequestContext } from "../tenancy/requestContext";

const ORG_ID = "00000000-0000-4000-8000-000000000000";
const USER_ID = "00000000-0000-4000-8000-000000000001";
const CASE_ID = "case-1";

function makeCtx(): RequestContext {
  return { orgId: ORG_ID, userId: USER_ID, role: "staff" };
}

function makeCaseRow(overrides: Record<string, unknown> = {}) {
  const row = {
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
    business_phase: "CONSULTING",
    current_workflow_step_code: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
  if (typeof overrides.status === "string" && overrides.stage === undefined) {
    row.stage = overrides.status;
  }
  return row;
}

type QueryFn = (
  sql: string,
  params?: unknown[],
) => Promise<{ rows: unknown[]; rowCount: number }>;

const ok = (rows: unknown[] = [], rowCount = rows.length) =>
  Promise.resolve({ rows, rowCount });
const isTxSql = (s: string) =>
  /^(begin|commit|rollback|select set_config)/.test(s.trim().toLowerCase());

function makePool(qf: QueryFn) {
  return {
    connect: () =>
      Promise.resolve({
        query: (s: string, p?: unknown[]) => {
          if (isTxSql(s)) return ok();
          if (
            s.includes("from billing_records") &&
            s.includes("limit 1") &&
            !s.includes("status =") &&
            !s.includes("status in") &&
            !s.includes("milestone_name")
          ) {
            return ok([{ id: "br-auto-stub" }]);
          }
          return qf(s, p);
        },
        release: () => undefined,
      }),
  };
}

function makeTemplates() {
  return {
    service: {
      resolve: () => Promise.resolve({ mode: "legacy", used: false }),
    },
  };
}

function svc(pool: ReturnType<typeof makePool>, tpl: { service: unknown }) {
  return new CasesService(pool as unknown as Pool, tpl.service as never);
}

void describe("transition gate exceptions carry error code prefix", () => {
  void test("S3→S4 missing primary party → CASE_GATE_A_MISSING_PRIMARY_PARTY", async () => {
    const pool = makePool((sql, p) => {
      if (sql.includes("from cases") && p?.[0] === CASE_ID) {
        return ok([makeCaseRow({ status: "S3" })]);
      }
      if (sql.includes("from case_parties")) return ok([]);
      return ok();
    });

    await assert.rejects(
      () =>
        svc(pool, makeTemplates()).transition(makeCtx(), CASE_ID, {
          toStatus: "S4",
        }),
      (err: Error) => {
        assert.ok(
          err.message.startsWith(
            CASE_WRITE_ERROR_CODES.GATE_A_MISSING_PRIMARY_PARTY,
          ),
          `expected message to start with ${CASE_WRITE_ERROR_CODES.GATE_A_MISSING_PRIMARY_PARTY}, got: ${err.message}`,
        );
        return true;
      },
    );
  });

  void test("S4→S5 incomplete required items → CASE_GATE_B_INCOMPLETE_REQUIRED_ITEMS", async () => {
    const pool = makePool((sql, p) => {
      if (sql.includes("from cases") && p?.[0] === CASE_ID) {
        return ok([makeCaseRow({ status: "S4" })]);
      }
      if (sql.includes("from case_parties")) return ok([{ id: "cp-1" }]);
      if (
        sql.includes("from document_items") &&
        sql.includes("required_flag = true")
      ) {
        return ok([{ id: "di-1" }]);
      }
      return ok();
    });

    await assert.rejects(
      () =>
        svc(pool, makeTemplates()).transition(makeCtx(), CASE_ID, {
          toStatus: "S5",
        }),
      (err: Error) => {
        assert.ok(
          err.message.startsWith(
            CASE_WRITE_ERROR_CODES.GATE_B_INCOMPLETE_REQUIRED_ITEMS,
          ),
          `expected message to start with ${CASE_WRITE_ERROR_CODES.GATE_B_INCOMPLETE_REQUIRED_ITEMS}, got: ${err.message}`,
        );
        return true;
      },
    );
  });
});
