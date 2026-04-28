import { test } from "node:test";
import assert from "node:assert/strict";
import { type Pool } from "pg";
import { ForbiddenException, NotFoundException } from "@nestjs/common";

import { CasesService } from "./cases.service";
import { PermissionsService } from "../auth/permissions.service";
import { type RequestContext } from "../tenancy/requestContext";

const ORG_ID = "00000000-0000-4000-8000-000000000000";
const OWNER_ID = "00000000-0000-4000-8000-000000000001";
const OTHER_USER_ID = "00000000-0000-4000-8000-000000000099";
const CASE_ID = "case-perm-1";

function makeCtx(overrides: Partial<RequestContext> = {}): RequestContext {
  return { orgId: ORG_ID, userId: OWNER_ID, role: "staff", ...overrides };
}

function makeCaseRow(overrides: Record<string, unknown> = {}) {
  return {
    id: CASE_ID,
    org_id: ORG_ID,
    customer_id: "cust-1",
    case_type_code: "visa",
    status: "S1",
    stage: "S1",
    group_id: null,
    owner_user_id: OWNER_ID,
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
        query: (s: string, p?: unknown[]) => (isTxSql(s) ? ok() : qf(s, p)),
        release: () => undefined,
      }),
  };
}

function makeSvc(pool: ReturnType<typeof makePool>, perms: PermissionsService) {
  const stubTemplates = {
    resolve: () => Promise.resolve({ mode: "legacy", used: false }),
  };
  return new CasesService(
    pool as unknown as Pool,
    stubTemplates as never,
    perms,
  );
}

// ── case not found → NotFoundException ──
void test("assertCanEditCase: throws NotFoundException when case does not exist", async () => {
  const pool = makePool((sql) => {
    if (sql.includes("from cases")) return ok([]);
    return ok();
  });
  const perms = new PermissionsService();
  const service = makeSvc(pool, perms);

  await assert.rejects(
    () => service.assertCanEditCase(makeCtx(), "nonexistent-id"),
    (err: unknown) => {
      assert.ok(err instanceof NotFoundException);
      return true;
    },
  );
});

// ── cross-org (RLS returns 0 rows) → NotFoundException ──
void test("assertCanEditCase: throws NotFoundException for cross-org case (RLS isolation)", async () => {
  const pool = makePool((sql) => {
    if (sql.includes("from cases")) return ok([]);
    return ok();
  });
  const perms = new PermissionsService();
  const service = makeSvc(pool, perms);

  const crossOrgCtx = makeCtx({
    orgId: "11111111-1111-4111-8111-111111111111",
  });
  await assert.rejects(
    () => service.assertCanEditCase(crossOrgCtx, CASE_ID),
    (err: unknown) => {
      assert.ok(err instanceof NotFoundException);
      return true;
    },
  );
});

// ── viewer has no edit permission → ForbiddenException ──
void test("assertCanEditCase: throws ForbiddenException when viewer tries to edit", async () => {
  const pool = makePool((sql) => {
    if (sql.includes("from cases")) return ok([makeCaseRow()]);
    return ok();
  });
  const perms = new PermissionsService();
  const service = makeSvc(pool, perms);

  const viewerCtx = makeCtx({ userId: OTHER_USER_ID, role: "viewer" });
  await assert.rejects(
    () => service.assertCanEditCase(viewerCtx, CASE_ID),
    (err: unknown) => {
      assert.ok(err instanceof ForbiddenException);
      return true;
    },
  );
});

// ── staff who is not case participant → ForbiddenException ──
void test("assertCanEditCase: throws ForbiddenException for non-participant staff", async () => {
  const pool = makePool((sql) => {
    if (sql.includes("from cases")) return ok([makeCaseRow()]);
    return ok();
  });
  const perms = new PermissionsService();
  const service = makeSvc(pool, perms);

  const nonParticipantCtx = makeCtx({ userId: OTHER_USER_ID, role: "staff" });
  await assert.rejects(
    () => service.assertCanEditCase(nonParticipantCtx, CASE_ID),
    (err: unknown) => {
      assert.ok(err instanceof ForbiddenException);
      return true;
    },
  );
});

// ── owner (staff + participant) can edit → resolves ──
void test("assertCanEditCase: resolves for case owner (staff)", async () => {
  const pool = makePool((sql) => {
    if (sql.includes("from cases")) return ok([makeCaseRow()]);
    return ok();
  });
  const perms = new PermissionsService();
  const service = makeSvc(pool, perms);

  await service.assertCanEditCase(makeCtx({ role: "staff" }), CASE_ID);
});

// ── manager can always edit → resolves ──
void test("assertCanEditCase: resolves for manager regardless of ownership", async () => {
  const pool = makePool((sql) => {
    if (sql.includes("from cases")) return ok([makeCaseRow()]);
    return ok();
  });
  const perms = new PermissionsService();
  const service = makeSvc(pool, perms);

  const managerCtx = makeCtx({ userId: OTHER_USER_ID, role: "manager" });
  await service.assertCanEditCase(managerCtx, CASE_ID);
});

// ── assistant (staff + participant) can edit → resolves ──
void test("assertCanEditCase: resolves for case assistant (staff)", async () => {
  const pool = makePool((sql) => {
    if (sql.includes("from cases"))
      return ok([makeCaseRow({ assistant_user_id: OTHER_USER_ID })]);
    return ok();
  });
  const perms = new PermissionsService();
  const service = makeSvc(pool, perms);

  const assistantCtx = makeCtx({ userId: OTHER_USER_ID, role: "staff" });
  await service.assertCanEditCase(assistantCtx, CASE_ID);
});
