/**
 * P0 回归矩阵 — §1 Stage 转换 + §2 Gate-A/B/C 门禁不变量
 *
 * S1-S9 全量 allowed / blocked 覆盖 + Gate 前置条件断言。
 */

import test from "node:test";
import assert from "node:assert/strict";
import type { Pool } from "pg";

import {
  CasesService,
  DEFAULT_CASE_TRANSITIONS,
  P0_CASE_STAGES,
} from "./cases.service";

const P0_STAGES = ["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8", "S9"];
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

function isBillingExistenceCheck(sql: string): boolean {
  return (
    sql.includes("from billing_records") &&
    sql.includes("limit 1") &&
    !sql.includes("status =") &&
    !sql.includes("status in") &&
    !sql.includes("milestone_name")
  );
}

function makePool(qf: QueryFn) {
  return {
    connect: () =>
      Promise.resolve({
        query: (s: string, p?: unknown[]) => {
          if (isTxSql(s)) return ok();
          if (isBillingExistenceCheck(s)) return ok([{ id: "br-auto-stub" }]);
          return qf(s, p);
        },
        release: () => undefined,
      }),
  };
}
function makeTemplates(r?: unknown) {
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
function svc(pool: ReturnType<typeof makePool>, tpl: { service: unknown }) {
  return new CasesService(pool as unknown as Pool, tpl.service as never);
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
    business_phase: "CONSULTING",
    current_workflow_step_code: null,
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

function transitionPool(to: string, from: string) {
  return makePool((sql, p) => {
    if (sql.includes("update cases") && sql.includes("stage = $2"))
      return ok([makeCaseRow({ status: to })]);
    if (sql.includes("from cases") && p?.[0] === CASE_ID)
      return ok([makeCaseRow({ status: from })]);
    if (sql.includes("from case_parties")) return ok([{ id: "cp-1" }]);
    if (
      sql.includes("from document_items") &&
      sql.includes("required_flag = true") &&
      !sql.includes("updated_at >")
    )
      return ok([]);
    if (sql.includes("from validation_runs"))
      return ok([
        {
          id: "vr-1",
          result_status: "passed",
          executed_at: "2026-04-20T00:00:00.000Z",
        },
      ]);
    if (sql.includes("as stale")) return ok([{ stale: false }]);
    return ok();
  });
}

// ═══════════════════════════════════════════════════════════════
// §1 Stage 转换矩阵完整性
// ═══════════════════════════════════════════════════════════════

void test("§1 P0_CASE_STAGES covers exactly S1-S9", () => {
  assert.deepEqual([...P0_CASE_STAGES].sort(), [...P0_STAGES].sort());
});

void test("§1 DEFAULT_CASE_TRANSITIONS references only P0 stages", () => {
  for (const [from, tos] of Object.entries(DEFAULT_CASE_TRANSITIONS)) {
    assert.ok(P0_CASE_STAGES.has(from), `from '${from}' not in P0 stages`);
    for (const to of tos) {
      assert.ok(P0_CASE_STAGES.has(to), `to '${to}' not in P0 stages`);
    }
  }
});

void test("§1 S9 is terminal — no outbound transitions", () => {
  const s9Tos = (
    DEFAULT_CASE_TRANSITIONS as Record<string, string[] | undefined>
  ).S9;
  assert.ok(!s9Tos || s9Tos.length === 0);
});

void test("§1 only S7 and S8 can reach S9 directly (BUG-063)", () => {
  for (const stage of P0_STAGES.filter((s) => s !== "S9")) {
    const tos = DEFAULT_CASE_TRANSITIONS[stage] ?? [];
    if (stage === "S7" || stage === "S8") {
      assert.ok(tos.includes("S9"), `${stage} → S9 must be allowed`);
    } else {
      assert.ok(!tos.includes("S9"), `${stage} → S9 must NOT be allowed`);
    }
  }
});

void test("§1 happy-path S1→…→S9", async () => {
  for (let i = 0; i < P0_STAGES.length - 1; i++) {
    const from = P0_STAGES[i];
    const to = P0_STAGES[i + 1];
    const r = await svc(transitionPool(to, from), makeTemplates()).transition(
      ctx(),
      CASE_ID,
      { toStatus: to },
    );
    assert.equal(r.status, to, `${from}→${to}`);
  }
});

const ALLOWED_SET = new Set(
  Object.entries(DEFAULT_CASE_TRANSITIONS).flatMap(([from, tos]) =>
    tos.map((to) => `${from}->${to}`),
  ),
);
for (const from of P0_STAGES) {
  for (const to of P0_STAGES) {
    if (from === to || ALLOWED_SET.has(`${from}->${to}`)) continue;
    void test(`§1 blocked: ${from} → ${to}`, async () => {
      const pool = makePool((sql, p) =>
        sql.includes("from cases") && p?.[0] === CASE_ID
          ? ok([makeCaseRow({ status: from })])
          : ok(),
      );
      await assert.rejects(
        () =>
          svc(pool, makeTemplates()).transition(ctx(), CASE_ID, {
            toStatus: to,
          }),
        (e) => e instanceof Error,
      );
    });
  }
}

// ═══════════════════════════════════════════════════════════════
// §2 Gate-A / B / C 门禁不变量
// ═══════════════════════════════════════════════════════════════

void test("§2 Gate-A: S3→S4 rejected without primary party", async () => {
  const pool = makePool((sql, p) => {
    if (sql.includes("from cases") && p?.[0] === CASE_ID)
      return ok([makeCaseRow({ status: "S3" })]);
    if (sql.includes("from case_parties")) return ok([]);
    return ok();
  });
  await assert.rejects(
    () =>
      svc(pool, makeTemplates()).transition(ctx(), CASE_ID, { toStatus: "S4" }),
    /primary case party/,
  );
});

void test("§2 Gate-A: S3→S4 succeeds with primary party", async () => {
  const r = await svc(transitionPool("S4", "S3"), makeTemplates()).transition(
    ctx(),
    CASE_ID,
    { toStatus: "S4" },
  );
  assert.equal(r.stage, "S4");
});

void test("§2 Gate-B: S4→S5 rejected when required docs incomplete", async () => {
  const pool = makePool((sql, p) => {
    if (sql.includes("from cases") && p?.[0] === CASE_ID)
      return ok([makeCaseRow({ status: "S4" })]);
    if (
      sql.includes("from document_items") &&
      sql.includes("required_flag = true") &&
      !sql.includes("updated_at >")
    )
      return ok([{ id: "di-1", item_status: "pending" }]);
    return ok();
  });
  await assert.rejects(
    () =>
      svc(pool, makeTemplates()).transition(ctx(), CASE_ID, { toStatus: "S5" }),
    /required document/i,
  );
});

void test("§2 Gate-B: S4→S5 succeeds when all required docs approved/waived", async () => {
  const r = await svc(transitionPool("S5", "S4"), makeTemplates()).transition(
    ctx(),
    CASE_ID,
    { toStatus: "S5" },
  );
  assert.equal(r.stage, "S5");
});

void test("§2 S5→S6 rejected without passed validation run", async () => {
  const pool = makePool((sql, p) => {
    if (sql.includes("from cases") && p?.[0] === CASE_ID)
      return ok([makeCaseRow({ status: "S5" })]);
    if (sql.includes("from validation_runs")) return ok([]);
    return ok();
  });
  await assert.rejects(
    () =>
      svc(pool, makeTemplates()).transition(ctx(), CASE_ID, { toStatus: "S6" }),
    /validation run/i,
  );
});

void test("§2 S5→S6 rejected with stale validation run", async () => {
  const pool = makePool((sql, p) => {
    if (sql.includes("from cases") && p?.[0] === CASE_ID)
      return ok([makeCaseRow({ status: "S5" })]);
    if (sql.includes("from validation_runs"))
      return ok([
        { id: "vr-1", result_status: "passed", executed_at: "2026-01-01" },
      ]);
    if (sql.includes("as stale")) return ok([{ stale: true }]);
    return ok();
  });
  await assert.rejects(
    () =>
      svc(pool, makeTemplates()).transition(ctx(), CASE_ID, { toStatus: "S6" }),
    /stale|validation/i,
  );
});

void test("§2 S5→S6 rejected when review required but not approved", async () => {
  const pool = makePool((sql, p) => {
    if (sql.includes("from cases") && p?.[0] === CASE_ID)
      return ok([makeCaseRow({ status: "S5" })]);
    if (sql.includes("from validation_runs"))
      return ok([
        { id: "vr-1", result_status: "passed", executed_at: "2026-04-20" },
      ]);
    if (sql.includes("as stale")) return ok([{ stale: false }]);
    if (sql.includes("from review_records")) return ok([]);
    return ok();
  });
  const tpl = makeTemplates((input: { kind: string }) =>
    input.kind === "case_type"
      ? {
          mode: "template",
          used: true,
          version: 1,
          config: { review_required_flag: true },
        }
      : { mode: "legacy", used: false },
  );
  await assert.rejects(
    () => svc(pool, tpl).transition(ctx(), CASE_ID, { toStatus: "S6" }),
    /review/i,
  );
});

void test("§2 Gate-C: S6→S7 rejected without passed VR", async () => {
  const pool = makePool((sql, p) => {
    if (sql.includes("from cases") && p?.[0] === CASE_ID)
      return ok([makeCaseRow({ status: "S6" })]);
    if (sql.includes("from validation_runs")) return ok([]);
    return ok();
  });
  await assert.rejects(
    () =>
      svc(pool, makeTemplates()).transition(ctx(), CASE_ID, { toStatus: "S7" }),
    /validation run/i,
  );
});

void test("§2 Gate-C: S6→S7 rejected when unpaid + no risk-ack", async () => {
  const pool = makePool((sql, p) => {
    if (sql.includes("from cases") && p?.[0] === CASE_ID)
      return ok([
        makeCaseRow({
          status: "S6",
          billing_unpaid_amount_cached: "100000",
          billing_risk_acknowledged_at: null,
        }),
      ]);
    if (sql.includes("from validation_runs"))
      return ok([
        { id: "vr-1", result_status: "passed", executed_at: "2026-04-20" },
      ]);
    if (sql.includes("as stale")) return ok([{ stale: false }]);
    return ok();
  });
  await assert.rejects(
    () =>
      svc(pool, makeTemplates()).transition(ctx(), CASE_ID, { toStatus: "S7" }),
    /billing risk/i,
  );
});

void test("§2 Gate-C: S6→S7 succeeds when unpaid + risk-acknowledged", async () => {
  const pool = makePool((sql, p) => {
    if (sql.includes("update cases") && sql.includes("stage = $2"))
      return ok([makeCaseRow({ status: "S7" })]);
    if (sql.includes("from cases") && p?.[0] === CASE_ID)
      return ok([
        makeCaseRow({
          status: "S6",
          billing_unpaid_amount_cached: "100000",
          billing_risk_acknowledged_at: "2026-04-18T00:00:00.000Z",
        }),
      ]);
    if (sql.includes("from validation_runs"))
      return ok([
        { id: "vr-1", result_status: "passed", executed_at: "2026-04-20" },
      ]);
    if (sql.includes("as stale")) return ok([{ stale: false }]);
    return ok();
  });
  const r = await svc(pool, makeTemplates()).transition(ctx(), CASE_ID, {
    toStatus: "S7",
  });
  assert.equal(r.stage, "S7");
});

void test("§2 Gate-C: S6→S7 succeeds when no unpaid balance", async () => {
  const r = await svc(transitionPool("S7", "S6"), makeTemplates()).transition(
    ctx(),
    CASE_ID,
    { toStatus: "S7" },
  );
  assert.equal(r.stage, "S7");
});
