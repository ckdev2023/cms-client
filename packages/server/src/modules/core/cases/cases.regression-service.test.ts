/**
 * P0 回归矩阵 — §8 Cross-group + §9 Stage history + §10 计费风险 + §11 Post-approval
 */
import test from "node:test";
import assert from "node:assert/strict";
import type { Pool } from "pg";

import { PermissionsService } from "../auth/permissions.service";
import type { Case } from "../model/coreEntities";
import { CasesController } from "./cases.controller";
import { CasesService, POST_APPROVAL_STAGES } from "./cases.service";
import { isBillingReceivableExistenceQuery } from "./cases.final-payment-coe-guard.focused.test-support";

const baseMockCase: Case = {
  id: "case-1",
  orgId: "org-1",
  customerId: "customer-1",
  caseTypeCode: "visa",
  status: "S1",
  stage: "S1",
  groupId: "group-1",
  ownerUserId: "owner-1",
  openedAt: "2026-01-01T00:00:00.000Z",
  dueAt: null,
  metadata: {},
  caseNo: "CASE-001",
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
  assistantUserId: "assistant-1",
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
  currentWorkflowStepCode: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function reqCtx(role: "owner" | "manager" | "staff" | "viewer") {
  return {
    requestContext: { orgId: "org-1", userId: "owner-1", role },
  };
}

function stubPerms(o: Partial<PermissionsService> = {}): PermissionsService {
  return {
    canViewCase: () => true,
    canEditCase: () => true,
    canExportCase: () => true,
    canAuditCase: () => true,
    canCreateCase: () => true,
    canPerformCaseAction: () => true,
    ...o,
  } as unknown as PermissionsService;
}

const ORG_ID = "00000000-0000-4000-8000-000000000000";
const USER_ID = "00000000-0000-4000-8000-000000000001";
const CASE_ID = "case-1";

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
        query: (s: string, p?: unknown[]) => (isTxSql(s) ? ok() : qf(s, p)),
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
function svc(pool: ReturnType<typeof makePool>) {
  return new CasesService(
    pool as unknown as Pool,
    makeTemplates().service as never,
  );
}
function ctx() {
  return { orgId: ORG_ID, userId: USER_ID, role: "staff" as const };
}
function makeCaseRow(overrides: Record<string, unknown> = {}) {
  const row: Record<string, unknown> = {
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
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
  if (typeof overrides.status === "string" && overrides.stage === undefined)
    row.stage = overrides.status;
  if (typeof overrides.stage === "string" && overrides.status === undefined)
    row.status = overrides.stage;
  return row;
}

// ═══════════════════════════════════════════════════════════════
// §8 Cross-group 建案 / 转组留痕
// ═══════════════════════════════════════════════════════════════

void test("§8 create: forwards groupId + crossGroupReason", async () => {
  let cap: Record<string, unknown> | undefined;
  const service = {
    create: (_: unknown, i: Record<string, unknown>) => {
      cap = i;
      return Promise.resolve(baseMockCase);
    },
  } as unknown as CasesService;
  const ctrl = new CasesController(service, stubPerms());
  await ctrl.create(reqCtx("staff") as never, {
    customerId: "c1",
    caseTypeCode: "visa",
    ownerUserId: "u1",
    groupId: "cross-group",
    crossGroupReason: "client transferred",
  });
  assert.ok(cap);
  assert.equal(cap.groupId, "cross-group");
  assert.equal(cap.crossGroupReason, "client transferred");
});

void test("§8 update: forwards groupId + groupTransferReason", async () => {
  let cap: Record<string, unknown> | undefined;
  const service = {
    assertCanEditCase: () => Promise.resolve(),
    update: (_: unknown, _id: string, i: Record<string, unknown>) => {
      cap = i;
      return Promise.resolve(baseMockCase);
    },
  } as unknown as CasesService;
  const ctrl = new CasesController(service, stubPerms());
  await ctrl.update(reqCtx("staff") as never, "case-1", {
    groupId: "new-group",
    groupTransferReason: "reassigned",
  });
  assert.ok(cap);
  assert.equal(cap.groupId, "new-group");
  assert.equal(cap.groupTransferReason, "reassigned");
});

// ═══════════════════════════════════════════════════════════════
// §9 Stage history
// ═══════════════════════════════════════════════════════════════

void test("§9 transition writes case_stage_history", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];
  const pool = makePool((sql, p) => {
    calls.push({ sql: sql.trim(), params: p });
    if (sql.includes("update cases") && sql.includes("stage = $2"))
      return ok([makeCaseRow({ status: "S2" })]);
    if (sql.includes("from cases") && p?.[0] === CASE_ID)
      return ok([makeCaseRow({ status: "S1" })]);
    return ok();
  });
  await svc(pool).transition(ctx(), CASE_ID, { toStatus: "S2" });
  const h = calls.find((c) => c.sql.includes("insert into case_stage_history"));
  assert.ok(h, "must write stage history");
  assert.ok(h.params, "must have params");
  const hp = h.params;
  assert.equal(hp[2], "S1");
  assert.equal(hp[3], "S2");
});

void test("§9 transition writes timeline log", async () => {
  const calls: { sql: string }[] = [];
  const pool = makePool((sql, p) => {
    calls.push({ sql: sql.trim() });
    if (sql.includes("update cases") && sql.includes("stage = $2"))
      return ok([makeCaseRow({ status: "S2" })]);
    if (sql.includes("from cases") && p?.[0] === CASE_ID)
      return ok([makeCaseRow({ status: "S1" })]);
    return ok();
  });
  await svc(pool).transition(ctx(), CASE_ID, { toStatus: "S2" });
  assert.ok(calls.some((c) => c.sql.includes("insert into timeline_logs")));
});

// ═══════════════════════════════════════════════════════════════
// §10 计费风险确认闭环
// ═══════════════════════════════════════════════════════════════

void test("§10 billingRiskAck: writes fields + timeline", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];
  const pool = makePool((sql, p) => {
    calls.push({ sql: sql.trim(), params: p });
    if (sql.includes("update cases") && sql.includes("billing_risk"))
      return ok([
        makeCaseRow({
          billing_risk_acknowledged_by: USER_ID,
          billing_risk_acknowledged_at: "2026-04-20T00:00:00.000Z",
          billing_risk_ack_reason_code: "confirmed",
          billing_risk_ack_evidence_url: "https://e.com/r.pdf",
        }),
      ]);
    if (sql.includes("from cases") && p?.[0] === CASE_ID)
      return ok([makeCaseRow()]);
    return ok();
  });
  const r = await svc(pool).acknowledgeBillingRisk(ctx(), CASE_ID, {
    reasonCode: "confirmed",
    reasonNote: "by phone",
    evidenceUrl: "https://e.com/r.pdf",
  });
  assert.equal(r.billingRiskAckReasonCode, "confirmed");
  assert.equal(r.billingRiskAckEvidenceUrl, "https://e.com/r.pdf");
  assert.ok(calls.some((c) => c.sql.includes("insert into timeline_logs")));
});

void test("§10 billingRiskAck: re-ack overwrites previous", async () => {
  const pool = makePool((sql, p) => {
    if (sql.includes("update cases") && sql.includes("billing_risk"))
      return ok([
        makeCaseRow({
          billing_risk_acknowledged_by: USER_ID,
          billing_risk_ack_reason_code: "updated",
        }),
      ]);
    if (sql.includes("from cases") && p?.[0] === CASE_ID)
      return ok([
        makeCaseRow({
          billing_risk_acknowledged_by: "prev",
          billing_risk_ack_reason_code: "old",
        }),
      ]);
    return ok();
  });
  const r = await svc(pool).acknowledgeBillingRisk(ctx(), CASE_ID, {
    reasonCode: "updated",
  });
  assert.equal(r.billingRiskAckReasonCode, "updated");
});

// ═══════════════════════════════════════════════════════════════
// §11 Post-approval stage
// ═══════════════════════════════════════════════════════════════

void test("§11 POST_APPROVAL_STAGES has expected values", () => {
  for (const s of [
    "waiting_final_payment",
    "coe_sent",
    "overseas_visa_applying",
    "entry_success",
  ]) {
    assert.ok(POST_APPROVAL_STAGES.has(s), `must include '${s}'`);
  }
  assert.equal(POST_APPROVAL_STAGES.size, 4);
});

void test("§11 postApprovalStage: rejects invalid stage", async () => {
  const pool = makePool((sql, p) => {
    if (sql.includes("from cases") && p?.[0] === CASE_ID)
      return ok([makeCaseRow()]);
    return ok();
  });
  await assert.rejects(
    () =>
      svc(pool).updatePostApprovalStage(ctx(), CASE_ID, { stage: "INVALID" }),
    /invalid|not.*valid/i,
  );
});

void test("§11 postApprovalStage: coe_sent blocked when gate=block", async () => {
  const pool = makePool((sql, p) => {
    if (isBillingReceivableExistenceQuery(sql)) return ok([{ ok: true }]);
    if (sql.includes("from cases") && p?.[0] === CASE_ID)
      return ok([makeCaseRow()]);
    if (
      sql.includes(
        "select id, amount_due, status, milestone_name, gate_effect_mode",
      )
    )
      return ok([
        {
          id: "11111111-2222-4333-8444-555555555555",
          amount_due: "250000",
          status: "partial",
          milestone_name: "尾款",
          gate_effect_mode: "block",
        },
      ]);
    if (sql.includes("from payment_records pr") && sql.includes("any("))
      return ok([{ total_received: "100000" }]);
    return ok();
  });
  await assert.rejects(
    () =>
      svc(pool).updatePostApprovalStage(ctx(), CASE_ID, { stage: "coe_sent" }),
    /billing gate blocks COE/i,
  );
});

void test("§11 postApprovalStage: entry_success stamps entry_confirmed_at", async () => {
  const pool = makePool((sql, p) => {
    if (sql.includes("update cases") && sql.includes("post_approval_stage"))
      return ok([
        makeCaseRow({
          post_approval_stage: "entry_success",
          entry_confirmed_at: "2026-04-20",
        }),
      ]);
    if (sql.includes("from cases") && p?.[0] === CASE_ID)
      return ok([makeCaseRow()]);
    return ok();
  });
  const r = await svc(pool).updatePostApprovalStage(ctx(), CASE_ID, {
    stage: "entry_success",
  });
  assert.equal(r.postApprovalStage, "entry_success");
  assert.ok(r.entryConfirmedAt);
});

// ═══════════════════════════════════════════════════════════════
// §3.5 S9: softDelete gap regression (documents current behavior)
// ═══════════════════════════════════════════════════════════════

void test("§3 S9: softDelete does not currently enforce S9 guard (gap)", async () => {
  const calls: { sql: string }[] = [];
  const pool = makePool((sql, p) => {
    calls.push({ sql: sql.trim() });
    if (sql.includes("from cases") && p?.[0] === CASE_ID)
      return ok([makeCaseRow({ status: "S9" })]);
    if (sql.includes("update cases"))
      return ok([
        makeCaseRow({ status: "S9", metadata: { _status: "deleted" } }),
      ]);
    return ok();
  });
  await svc(pool).softDelete(ctx(), CASE_ID);
  assert.ok(
    calls.some((c) => c.sql.includes("update cases")),
    "softDelete currently proceeds on S9",
  );
});
