import { test } from "node:test";
import assert from "node:assert/strict";
import { CasesService } from "./cases.service";
const ORG_ID = "00000000-0000-4000-8000-000000000000";
const USER_ID = "00000000-0000-4000-8000-000000000001";
const CASE_ID = "case-1";
function makeCtx() {
  return { orgId: ORG_ID, userId: USER_ID, role: "staff" };
}
function makeCaseRow(overrides = {}) {
  return {
    id: CASE_ID,
    org_id: ORG_ID,
    customer_id: "cust-1",
    case_type_code: "visa",
    status: "S1",
    owner_user_id: USER_ID,
    opened_at: "2026-01-01T00:00:00.000Z",
    due_at: null,
    metadata: {},
    case_no: null,
    case_name: null,
    case_subtype: null,
    application_type: null,
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
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}
const ok = (rows = [], rowCount = rows.length) =>
  Promise.resolve({ rows, rowCount });
const isTxSql = (s) =>
  /^(begin|commit|rollback|select set_config)/.test(s.trim().toLowerCase());
function makePool(qf) {
  return {
    connect: () =>
      Promise.resolve({
        query: (s, p) => (isTxSql(s) ? ok() : qf(s, p)),
        release: () => undefined,
      }),
  };
}
function svc(pool) {
  return new CasesService(pool, {
    resolve: () => Promise.resolve({ mode: "legacy", used: false }),
  });
}
void test("create rejects invalid priority enum", async () => {
  await assert.rejects(
    () =>
      svc(makePool(() => ok())).create(makeCtx(), {
        customerId: "cust-1",
        caseTypeCode: "visa",
        ownerUserId: USER_ID,
        priority: "invalid",
      }),
    /Invalid priority/,
  );
});
void test("create rejects invalid riskLevel enum", async () => {
  await assert.rejects(
    () =>
      svc(makePool(() => ok())).create(makeCtx(), {
        customerId: "cust-1",
        caseTypeCode: "visa",
        ownerUserId: USER_ID,
        riskLevel: "invalid",
      }),
    /Invalid riskLevel/,
  );
});
void test("update ignores caseNo patch", async () => {
  const calls = [];
  const currentCaseNo = "CASE-0001";
  const pool = makePool((sql, params) => {
    calls.push({ sql: sql.trim(), params });
    if (sql.includes("from cases") && params?.[0] === CASE_ID) {
      return ok([makeCaseRow({ case_no: currentCaseNo })]);
    }
    if (sql.includes("update cases")) {
      return ok([makeCaseRow({ case_no: currentCaseNo })]);
    }
    return ok();
  });
  const updated = await svc(pool).update(makeCtx(), CASE_ID, {
    caseNo: "CASE-001",
  });
  assert.equal(updated.caseNo, currentCaseNo);
  const updateCall = calls.find((call) => call.sql.includes("update cases"));
  assert.ok(updateCall);
  assert.equal(updateCall.params?.[6], currentCaseNo);
});
void test("update rejects invalid priority enum", async () => {
  const pool = makePool((sql, params) =>
    sql.includes("from cases") && params?.[0] === CASE_ID
      ? ok([makeCaseRow()])
      : ok(),
  );
  await assert.rejects(
    () => svc(pool).update(makeCtx(), CASE_ID, { priority: "invalid" }),
    /Invalid priority/,
  );
});
void test("update rejects invalid riskLevel enum", async () => {
  const pool = makePool((sql, params) =>
    sql.includes("from cases") && params?.[0] === CASE_ID
      ? ok([makeCaseRow()])
      : ok(),
  );
  await assert.rejects(
    () => svc(pool).update(makeCtx(), CASE_ID, { riskLevel: "invalid" }),
    /Invalid riskLevel/,
  );
});
//# sourceMappingURL=cases.service.s4-validation.test.js.map
