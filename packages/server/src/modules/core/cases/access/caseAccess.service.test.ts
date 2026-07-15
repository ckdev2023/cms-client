import { test } from "node:test";
import assert from "node:assert/strict";
import { type Pool } from "pg";
import { ForbiddenException, NotFoundException } from "@nestjs/common";

import { CaseAccessService } from "./caseAccess.service";
import { CasesService } from "../cases.service";
import type { PermissionsService } from "../../auth/permissions.service";
import { type RequestContext } from "../../tenancy/requestContext";

const ORG_ID = "00000000-0000-4000-8000-000000000000";
const USER_ID = "00000000-0000-4000-8000-000000000001";
const CASE_ID = "case-1";

function makeCtx(
  role: "staff" | "viewer" | "manager" = "staff",
): RequestContext {
  return { orgId: ORG_ID, userId: USER_ID, role };
}

/**
 * 最小案件查询行（字段口径对齐 cases.service.test.ts 的 makeCaseRow）。
 * @param overrides 覆盖字段
 * @returns 查询行
 */
function makeCaseRow(overrides: Record<string, unknown> = {}) {
  return {
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
    jurisdiction_authority: null,
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
}

type QueryFn = (
  sql: string,
  params?: unknown[],
) => Promise<{ rows: unknown[]; rowCount: number }>;

const ok = (rows: unknown[] = []) =>
  Promise.resolve({ rows, rowCount: rows.length });
const isTxSql = (s: string) =>
  /^(begin|commit|rollback|select set_config)/.test(s.trim().toLowerCase());

/**
 * mock Pool：透传事务控制 SQL，业务 SQL 交给处理函数。
 * @param qf 业务 SQL 处理函数
 * @returns mock Pool
 */
function makePool(qf: QueryFn) {
  return {
    connect: () =>
      Promise.resolve({
        query: (s: string, p?: unknown[]) => (isTxSql(s) ? ok() : qf(s, p)),
        release: () => undefined,
      }),
  } as unknown as Pool;
}

function makePermissions(canEdit: boolean): PermissionsService {
  return {
    canEditCase: () => canEdit,
  } as unknown as PermissionsService;
}

void test("get: returns null when case is missing", async () => {
  const svc = new CaseAccessService(makePool(() => ok([])));
  assert.equal(await svc.get(makeCtx(), CASE_ID), null);
});

void test("get: maps row to Case and filters soft-deleted rows in SQL", async () => {
  let capturedSql = "";
  const svc = new CaseAccessService(
    makePool((sql) => {
      capturedSql = sql;
      return ok([makeCaseRow({ stage: "S3" })]);
    }),
  );
  const result = await svc.get(makeCtx(), CASE_ID);
  assert.ok(result);
  assert.equal(result.id, CASE_ID);
  assert.equal(result.stage, "S3");
  assert.match(capturedSql, /metadata->>'_status'/);
  assert.match(capturedSql, /is distinct from 'deleted'/);
});

void test("assertCanEditCase: rejects when PermissionsService is absent", async () => {
  const svc = new CaseAccessService(makePool(() => ok([makeCaseRow()])));
  await assert.rejects(
    svc.assertCanEditCase(makeCtx(), CASE_ID),
    /PermissionsService is required/,
  );
});

void test("assertCanEditCase: throws NotFound when case is missing", async () => {
  const svc = new CaseAccessService(
    makePool(() => ok([])),
    makePermissions(true),
  );
  await assert.rejects(
    svc.assertCanEditCase(makeCtx(), CASE_ID),
    NotFoundException,
  );
});

void test("assertCanEditCase: throws Forbidden when permission denied", async () => {
  const svc = new CaseAccessService(
    makePool(() => ok([makeCaseRow()])),
    makePermissions(false),
  );
  await assert.rejects(
    svc.assertCanEditCase(makeCtx("viewer"), CASE_ID),
    ForbiddenException,
  );
});

void test("assertCanEditCase: resolves when permission granted", async () => {
  const svc = new CaseAccessService(
    makePool(() => ok([makeCaseRow()])),
    makePermissions(true),
  );
  await assert.doesNotReject(svc.assertCanEditCase(makeCtx(), CASE_ID));
});

void test("CasesService facade delegates get/assertCanEditCase to CaseAccessService", async () => {
  const pool = makePool(() => ok([makeCaseRow({ stage: "S2" })]));
  const templates = {
    resolve: () => Promise.resolve({ mode: "legacy", used: false }),
  };
  const facade = new CasesService(
    pool,
    templates as never,
    makePermissions(true),
  );
  const viaFacade = await facade.get(makeCtx(), CASE_ID);
  assert.ok(viaFacade);
  assert.equal(viaFacade.stage, "S2");
  await assert.doesNotReject(facade.assertCanEditCase(makeCtx(), CASE_ID));
});
