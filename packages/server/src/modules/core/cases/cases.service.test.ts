/* eslint-disable max-lines, no-console */
import { test } from "node:test";
import assert from "node:assert/strict";
import { type Pool } from "pg";

import {
  CasesService,
  mapCaseRow,
  mapCaseListSummaryRow,
  mapDetailCountsRow,
  mapLatestValidationRow,
  mapLatestSubmissionRow,
  mapLatestReviewRow,
  mapDocProgressByProviderRows,
} from "./cases.service";
import { type RequestContext } from "../tenancy/requestContext";

const ORG_ID = "00000000-0000-4000-8000-000000000000";
const USER_ID = "00000000-0000-4000-8000-000000000001";
const CASE_ID = "case-1";

function makeCtx(
  role: "staff" | "viewer" | "manager" = "staff",
): RequestContext {
  return { orgId: ORG_ID, userId: USER_ID, role };
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
  if (typeof overrides.stage === "string" && overrides.status === undefined) {
    row.status = overrides.stage;
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

/**
 * mock Pool：自动透传事务控制 SQL。
 * @param qf 业务 SQL 处理函数
 * @returns mock Pool 实例
 */
function makePool(qf: QueryFn) {
  return {
    connect: () =>
      Promise.resolve({
        query: (s: string, p?: unknown[]) => (isTxSql(s) ? ok() : qf(s, p)),
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
function makeTemplatesErr(e: Error) {
  return { service: { resolve: () => Promise.reject(e) } };
}
function svc(pool: ReturnType<typeof makePool>, tpl: { service: unknown }) {
  return new CasesService(pool as unknown as Pool, tpl.service as never);
}
/**
 * 标准 queryFn：通过 belongsToOrg 校验 + 插入 case 成功。
 * @returns QueryFn
 */
function stdQ(): QueryFn {
  return (sql, params) => {
    if (
      sql.includes("select id from customers") ||
      sql.includes("select id from users") ||
      sql.includes("select id from companies")
    )
      return ok([{ id: params?.[0] }]);
    if (sql.includes("FROM customers c") && sql.includes("JOIN groups g"))
      return ok([]);
    if (sql.includes("insert into cases")) return ok([makeCaseRow()]);
    return ok();
  };
}
const CREATE_INPUT = {
  customerId: "cust-1",
  caseTypeCode: "visa",
  ownerUserId: USER_ID,
};

// ── create (no template) ──
void test("create: inserts row + timeline, no template", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];
  const pool = makePool((s, p) => {
    calls.push({ sql: s.trim(), params: p });
    return stdQ()(s, p);
  });
  const c = await svc(pool, makeTemplates()).create(makeCtx(), CREATE_INPUT);
  assert.equal(c.id, CASE_ID);
  assert.equal(c.status, "S1");
  assert.equal(c.stage, "S1");
  assert.equal(
    calls.filter((c) => c.sql.includes("insert into timeline_logs")).length,
    1,
  );
});

void test("create: stage input mirrors stage and status columns", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];
  const pool = makePool((sql, params) => {
    calls.push({ sql: sql.trim(), params });
    if (
      sql.includes("select id from customers") ||
      sql.includes("select id from users")
    ) {
      return ok([{ id: params?.[0] }]);
    }
    if (sql.includes("FROM customers c") && sql.includes("JOIN groups g"))
      return ok([]);
    if (sql.includes("insert into cases")) {
      return ok([makeCaseRow({ stage: params?.[4], status: params?.[3] })]);
    }
    return ok();
  });

  const created = await svc(pool, makeTemplates()).create(makeCtx(), {
    ...CREATE_INPUT,
    stage: "S2",
  });

  const insertCall = calls.find((call) =>
    call.sql.includes("insert into cases"),
  );
  assert.ok(insertCall);
  const insertParams = insertCall.params ?? [];
  assert.equal(insertParams[3], "S2");
  assert.equal(insertParams[4], "S2");
  assert.equal(created.status, "S2");
  assert.equal(created.stage, "S2");
});

void test("create: generates case_no from org prefix and month", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];
  const now = new Date();
  const yyyymm = `${String(now.getFullYear())}${String(now.getMonth() + 1).padStart(2, "0")}`;
  const pool = makePool((sql, params) => {
    calls.push({ sql: sql.trim(), params });
    if (
      sql.includes("select id from customers") ||
      sql.includes("select id from users")
    ) {
      return ok([{ id: params?.[0] }]);
    }
    if (sql.includes("select settings from organizations")) {
      return ok([{ settings: { case_prefix: "TOKYO" } }]);
    }
    if (
      sql.includes(
        "select count(*) as count from cases where org_id = $1 and case_no like $2",
      )
    ) {
      return ok([{ count: "12" }]);
    }
    if (sql.includes("insert into cases")) {
      return ok([makeCaseRow({ case_no: params?.[9] })]);
    }
    if (sql.includes("FROM customers c") && sql.includes("JOIN groups g"))
      return ok([]);
    return ok();
  });

  const created = await svc(pool, makeTemplates()).create(
    makeCtx(),
    CREATE_INPUT,
  );
  assert.equal(created.caseNo, `TOKYO-${yyyymm}-0013`);
  const insertCall = calls.find((call) =>
    call.sql.includes("insert into cases"),
  );
  assert.equal(insertCall?.params?.[9], `TOKYO-${yyyymm}-0013`);
});

// ── create (with template → generates document_items) ──
void test("create: generates document_items from template", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];
  const pool = makePool((s, p) => {
    calls.push({ sql: s.trim(), params: p });
    return stdQ()(s, p);
  });
  const tpl = makeTemplates({
    mode: "template",
    used: true,
    version: 1,
    config: {
      items: [
        { code: "passport", name: "Passport Copy", ownerSide: "applicant" },
        { code: "photo", name: "Photo" },
      ],
    },
  });
  await svc(pool, tpl).create(makeCtx(), CREATE_INPUT);
  const di = calls.filter((c) => c.sql.includes("insert into document_items"));
  assert.equal(di.length, 2);
  assert.equal(di[0]?.params?.[2], "passport");
  assert.equal(di[1]?.params?.[5], "applicant");
});

// ── create failure ──
void test("create: throws on insert failure", async () => {
  const pool = makePool((sql, p) => {
    if (
      sql.includes("select id from customers") ||
      sql.includes("select id from users")
    )
      return ok([{ id: p?.[0] }]);
    if (sql.includes("FROM customers c") && sql.includes("JOIN groups g"))
      return ok([]);
    return ok();
  });
  await assert.rejects(
    () =>
      svc(pool, makeTemplates()).create(makeCtx(), {
        customerId: "c",
        caseTypeCode: "t",
        ownerUserId: "u",
      }),
    (e) => {
      assert.ok(e instanceof Error);
      return true;
    },
  );
});

// ── create: template service error propagates ──
void test("create: propagates template service error (500)", async () => {
  const pool = makePool(stdQ());
  await assert.rejects(
    () =>
      svc(pool, makeTemplatesErr(new Error("Service unavailable"))).create(
        makeCtx(),
        CREATE_INPUT,
      ),
    (e) => {
      assert.ok(e instanceof Error);
      assert.ok(e.message.includes("Service unavailable"));
      return true;
    },
  );
});

// ── create: template 404 → legacy downgrade ──
void test("create: downgrades to legacy if template not found (404)", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];
  const pool = makePool((s, p) => {
    calls.push({ sql: s.trim(), params: p });
    return stdQ()(s, p);
  });
  const tpl = makeTemplates({
    mode: "template",
    used: false,
    reason: "Not found",
  });
  const c = await svc(pool, tpl).create(makeCtx(), CREATE_INPUT);
  assert.equal(c.id, CASE_ID);
  assert.equal(
    calls.filter((c) => c.sql.includes("insert into document_items")).length,
    0,
  );
});

// ── create: cross-tenant customerId rejected ──
void test("create: rejects foreign customerId", async () => {
  const pool = makePool((sql) => {
    if (sql.includes("select id from customers")) return ok([]);
    if (sql.includes("select id from users")) return ok([{ id: USER_ID }]);
    return ok();
  });
  await assert.rejects(
    () =>
      svc(pool, makeTemplates()).create(makeCtx(), {
        ...CREATE_INPUT,
        customerId: "foreign",
      }),
    (e) => {
      assert.ok(e instanceof Error);
      assert.ok(e.message.includes("customers"));
      return true;
    },
  );
});

// ── get ──
void test("get: returns case or null", async () => {
  const pool = makePool((sql, p) =>
    sql.includes("from cases") && p?.[0] === CASE_ID
      ? ok([makeCaseRow()])
      : ok(),
  );
  const s = svc(pool, makeTemplates());
  const c = await s.get(makeCtx("viewer"), CASE_ID);
  assert.ok(c);
  assert.equal(c.id, CASE_ID);
  assert.equal(c.stage, "S1");
  assert.equal(c.postApprovalStage, null);
  assert.equal(await s.get(makeCtx("viewer"), "nonexistent"), null);
});

// ── list ──
void test("list: returns items and total", async () => {
  const pool = makePool((sql) =>
    sql.includes("count(*)") ? ok([{ count: "3" }]) : ok([makeCaseRow()]),
  );
  const r = await svc(pool, makeTemplates()).list(makeCtx("viewer"));
  assert.equal(r.total, 3);
  assert.equal(r.items.length, 1);
});

void test("list: applies filters", async () => {
  const calls: { sql: string }[] = [];
  const pool = makePool((sql) => {
    calls.push({ sql: sql.trim() });
    return sql.includes("count(*)")
      ? ok([{ count: "1" }])
      : ok([makeCaseRow()]);
  });
  await svc(pool, makeTemplates()).list(makeCtx("viewer"), {
    stage: "S3",
    ownerUserId: USER_ID,
    customerId: "00000000-0000-4000-8000-000000000010",
  });
  const cq = calls.find((c) => c.sql.includes("count(*)"));
  assert.ok(cq);
  assert.ok(cq.sql.includes("coalesce(stage, status) = $"));
  assert.ok(cq.sql.includes("owner_user_id = $"));
});

void test("list: handles empty result", async () => {
  const pool = makePool(() => ok());
  const r = await svc(pool, makeTemplates()).list(makeCtx("viewer"));
  assert.equal(r.total, 0);
  assert.equal(r.items.length, 0);
});

void test("list: invalid customerId filter returns empty without querying invalid uuid", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];
  const pool = makePool((sql, params) => {
    calls.push({ sql, params });
    if (sql.includes("count(*)")) return ok([{ count: "0" }]);
    return ok([]);
  });

  const result = await svc(pool, makeTemplates()).list(makeCtx("viewer"), {
    customerId: "cust-001",
  });

  assert.equal(result.total, 0);
  assert.equal(result.items.length, 0);
  const countCall = calls.find((call) => call.sql.includes("count(*)"));
  assert.ok(countCall);
  assert.ok(countCall.sql.includes("where 1 = 0"));
  const dataCall = calls.find((call) =>
    call.sql.includes("order by created_at"),
  );
  assert.ok(dataCall);
  assert.ok(dataCall.sql.includes("where 1 = 0"));
});

void test("list: invalid ownerUserId filter returns empty without querying invalid uuid", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];
  const pool = makePool((sql, params) => {
    calls.push({ sql, params });
    if (sql.includes("count(*)")) return ok([{ count: "0" }]);
    return ok([]);
  });

  const result = await svc(pool, makeTemplates()).list(makeCtx("viewer"), {
    ownerUserId: "owner-001",
  });

  assert.equal(result.total, 0);
  assert.equal(result.items.length, 0);
  const countCall = calls.find((call) => call.sql.includes("count(*)"));
  assert.ok(countCall);
  assert.ok(countCall.sql.includes("where 1 = 0"));
  const dataCall = calls.find((call) =>
    call.sql.includes("order by created_at"),
  );
  assert.ok(dataCall);
  assert.ok(dataCall.sql.includes("where 1 = 0"));
});

// ── update ──
void test("update: updates + timeline in transaction", async () => {
  const calls: { sql: string }[] = [];
  const pool = makePool((sql, p) => {
    calls.push({ sql: sql.trim() });
    if (sql.includes("update cases"))
      return ok([makeCaseRow({ case_type_code: "work_permit" })]);
    if (sql.includes("from cases") && p?.[0] === CASE_ID)
      return ok([makeCaseRow()]);
    return ok();
  });
  const u = await svc(pool, makeTemplates()).update(makeCtx(), CASE_ID, {
    caseTypeCode: "work_permit",
  });
  assert.equal(u.caseTypeCode, "work_permit");
  assert.equal(
    calls.filter((c) => c.sql.includes("insert into timeline_logs")).length,
    1,
  );
});

void test("update: ignores incoming caseNo", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];
  const currentCaseNo = "TOKYO-202604-0001";
  const pool = makePool((sql, params) => {
    calls.push({ sql: sql.trim(), params });
    if (sql.includes("update cases")) {
      return ok([
        makeCaseRow({ case_no: currentCaseNo, case_name: "Updated" }),
      ]);
    }
    if (sql.includes("from cases") && params?.[0] === CASE_ID) {
      return ok([makeCaseRow({ case_no: currentCaseNo })]);
    }
    return ok();
  });

  const updated = await svc(pool, makeTemplates()).update(makeCtx(), CASE_ID, {
    caseNo: "HACK-202604-9999",
    caseName: "Updated",
  });

  assert.equal(updated.caseNo, currentCaseNo);
  const updateCall = calls.find((call) => call.sql.includes("update cases"));
  assert.equal(updateCall?.params?.[6], currentCaseNo);
});

void test("update: throws when not found", async () => {
  const pool = makePool(() => ok());
  await assert.rejects(
    () =>
      svc(pool, makeTemplates()).update(makeCtx(), "x", { caseTypeCode: "x" }),
    (e) => {
      assert.ok(e instanceof Error);
      return true;
    },
  );
});

// ── transition helpers ──
function transitionPool(returnStatus: string, fromStatus = "S1") {
  return makePool((sql, p) => {
    if (sql.includes("update cases") && sql.includes("stage = $2"))
      return ok([makeCaseRow({ status: returnStatus })]);
    if (sql.includes("from cases") && p?.[0] === CASE_ID)
      return ok([makeCaseRow({ status: fromStatus })]);
    if (sql.includes("from case_parties")) {
      return ok([{ id: "cp-1" }]);
    }
    if (
      sql.includes("from document_items") &&
      sql.includes("required_flag = true") &&
      !sql.includes("updated_at >")
    ) {
      return ok([]);
    }
    if (sql.includes("from validation_runs")) {
      return ok([
        {
          id: "vr-1",
          result_status: "passed",
          executed_at: "2026-04-20T00:00:00.000Z",
        },
      ]);
    }
    if (sql.includes("as stale")) {
      return ok([{ stale: false }]);
    }
    return ok();
  });
}
const SF_TPL = (ts: { from: string; to: string }[]) =>
  makeTemplates({
    mode: "template",
    used: true,
    version: 1,
    config: { allowedTransitions: ts },
  });

void test("transition: default fallback transition + timeline", async () => {
  const calls: { sql: string }[] = [];
  const pool = makePool((sql, p) => {
    calls.push({ sql: sql.trim() });
    if (sql.includes("update cases") && sql.includes("stage = $2"))
      return ok([makeCaseRow({ status: "S2" })]);
    if (sql.includes("from cases") && p?.[0] === CASE_ID)
      return ok([makeCaseRow({ status: "S1" })]);
    return ok();
  });
  const r = await svc(pool, makeTemplates()).transition(makeCtx(), CASE_ID, {
    toStage: "S2",
  });
  assert.equal(r.status, "S2");
  assert.equal(r.stage, "S2");
  assert.equal(
    calls.filter((c) => c.sql.includes("insert into timeline_logs")).length,
    1,
  );
});

void test("transition: optimistic lock params [id, toStage, fromStage]", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];
  const pool = makePool((sql, p) => {
    calls.push({ sql: sql.trim(), params: p });
    if (sql.includes("update cases") && sql.includes("stage = $2"))
      return ok([makeCaseRow({ status: "S2" })]);
    if (sql.includes("from cases") && p?.[0] === CASE_ID)
      return ok([makeCaseRow({ status: "S1" })]);
    return ok();
  });
  await svc(pool, makeTemplates()).transition(makeCtx(), CASE_ID, {
    toStatus: "S2",
  });
  const u = calls.find(
    (c) => c.sql.includes("update cases") && c.sql.includes("stage = $2"),
  );
  assert.ok(u);
  assert.ok(u.params);
  assert.equal(u.params[0], CASE_ID);
  assert.equal(u.params[1], "S2");
  assert.equal(u.params[2], "S1");
});

void test("transition: concurrent conflict rejected", async () => {
  const pool = makePool((sql, p) => {
    if (sql.includes("update cases") && sql.includes("stage = $2"))
      return ok([]);
    if (sql.includes("from cases") && p?.[0] === CASE_ID)
      return ok([makeCaseRow({ status: "S1" })]);
    return ok();
  });
  await assert.rejects(
    () =>
      svc(pool, makeTemplates()).transition(makeCtx(), CASE_ID, {
        toStatus: "S2",
      }),
    (e) => {
      assert.ok(e instanceof Error);
      assert.ok(e.message.includes("conflict"));
      return true;
    },
  );
});

void test("transition: template allows valid transition", async () => {
  const r = await svc(
    transitionPool("S3", "S1"),
    SF_TPL([{ from: "S1", to: "S3" }]),
  ).transition(makeCtx(), CASE_ID, { toStatus: "S3" });
  assert.equal(r.status, "S3");
});

void test("transition: template blocks invalid transition", async () => {
  const pool = makePool((sql, p) =>
    sql.includes("from cases") && p?.[0] === CASE_ID
      ? ok([makeCaseRow({ status: "S1" })])
      : ok(),
  );
  await assert.rejects(
    () =>
      svc(pool, SF_TPL([{ from: "S1", to: "S3" }])).transition(
        makeCtx(),
        CASE_ID,
        { toStatus: "S7" },
      ),
    (e) => {
      assert.ok(e instanceof Error);
      assert.ok(e.message.includes("not allowed"));
      return true;
    },
  );
});

void test("transition: template service error propagates", async () => {
  const pool = makePool((sql, p) =>
    sql.includes("from cases") && p?.[0] === CASE_ID
      ? ok([makeCaseRow({ status: "S1" })])
      : ok(),
  );
  await assert.rejects(
    () =>
      svc(pool, makeTemplatesErr(new Error("svc down"))).transition(
        makeCtx(),
        CASE_ID,
        { toStatus: "S2" },
      ),
    (e) => {
      assert.ok(e instanceof Error);
      assert.ok(e.message.includes("svc down"));
      return true;
    },
  );
});

void test("transition: not found", async () => {
  await assert.rejects(
    () =>
      svc(
        makePool(() => ok()),
        makeTemplates(),
      ).transition(makeCtx(), "x", { toStatus: "x" }),
    (e) => {
      assert.ok(e instanceof Error);
      return true;
    },
  );
});

// ── P0 S1-S9 default state machine transitions ──
import {
  CASE_RESULT_OUTCOMES,
  DEFAULT_CASE_TRANSITIONS,
  P0_CASE_STAGES,
  POST_APPROVAL_STAGES,
} from "./cases.service";

// Verify the transition matrix only references valid P0 stages
void test("transition: DEFAULT_CASE_TRANSITIONS only uses P0 stages", () => {
  for (const [from, tos] of Object.entries(DEFAULT_CASE_TRANSITIONS)) {
    assert.ok(P0_CASE_STAGES.has(from), `'${from}' is not a valid P0 stage`);
    for (const to of tos) {
      assert.ok(P0_CASE_STAGES.has(to), `'${to}' is not a valid P0 stage`);
    }
  }
});

// Every valid pair in the default matrix should succeed
const ALL_VALID_PAIRS: [string, string][] = Object.entries(
  DEFAULT_CASE_TRANSITIONS,
).flatMap(([from, tos]) => tos.map((to): [string, string] => [from, to]));

for (const [from, to] of ALL_VALID_PAIRS) {
  void test(`transition: default allows ${from} → ${to}`, async () => {
    const input: Record<string, string> = { toStatus: to };
    if (to === "S9" && from !== "S8") {
      input.closeReason = "test_close";
    }
    const r = await svc(transitionPool(to, from), makeTemplates()).transition(
      makeCtx(),
      CASE_ID,
      input,
    );
    assert.equal(r.status, to);
  });
}

// Illegal transitions (P0 S1-S9)
const ILLEGAL_PAIRS: [string, string][] = [
  ["S1", "S3"],
  ["S1", "S7"],
  ["S2", "S5"],
  ["S3", "S7"],
  ["S6", "S1"],
  ["S7", "S6"],
  ["S8", "S1"],
];

for (const [from, to] of ILLEGAL_PAIRS) {
  void test(`transition: default blocks ${from} → ${to}`, async () => {
    const pool = makePool((sql, p) =>
      sql.includes("from cases") && p?.[0] === CASE_ID
        ? ok([makeCaseRow({ status: from })])
        : ok(),
    );
    await assert.rejects(
      () =>
        svc(pool, makeTemplates()).transition(makeCtx(), CASE_ID, {
          toStatus: to,
        }),
      (e) => {
        assert.ok(e instanceof Error);
        assert.ok(e.message.includes("not allowed"));
        return true;
      },
    );
  });
}

// S9 is terminal — cannot transition to anything (S9 write guard fires first)
void test("transition: S9 is terminal state", async () => {
  const pool = makePool((sql, p) =>
    sql.includes("from cases") && p?.[0] === CASE_ID
      ? ok([makeCaseRow({ status: "S9" })])
      : ok(),
  );
  await assert.rejects(
    () =>
      svc(pool, makeTemplates()).transition(makeCtx(), CASE_ID, {
        toStatus: "S1",
      }),
    (e) => {
      assert.ok(e instanceof Error);
      assert.ok(e.message.includes("not allowed") || e.message.includes("S9"));
      return true;
    },
  );
});

// Template flow takes priority over default
void test("transition: template overrides default (allows non-default)", async () => {
  // S1 → S7 is NOT in defaults, but template allows it
  const r = await svc(
    transitionPool("S7", "S1"),
    SF_TPL([{ from: "S1", to: "S7" }]),
  ).transition(makeCtx(), CASE_ID, { toStatus: "S7" });
  assert.equal(r.status, "S7");
});

void test("transition: template overrides default (blocks default-valid)", async () => {
  // S1 → S2 IS in defaults, but template only allows → S9
  const pool = makePool((sql, p) =>
    sql.includes("from cases") && p?.[0] === CASE_ID
      ? ok([makeCaseRow({ status: "S1" })])
      : ok(),
  );
  await assert.rejects(
    () =>
      svc(pool, SF_TPL([{ from: "S1", to: "S9" }])).transition(
        makeCtx(),
        CASE_ID,
        { toStatus: "S2" },
      ),
    (e) => {
      assert.ok(e instanceof Error);
      assert.ok(e.message.includes("not allowed"));
      return true;
    },
  );
});

// No template → fallback to default
void test("transition: no template falls back to default", async () => {
  const r = await svc(transitionPool("S3", "S2"), makeTemplates()).transition(
    makeCtx(),
    CASE_ID,
    { toStatus: "S3" },
  );
  assert.equal(r.status, "S3");
});

void test("transition: S3→S4 requires primary case party", async () => {
  const pool = makePool((sql, p) => {
    if (sql.includes("from cases") && p?.[0] === CASE_ID) {
      return ok([makeCaseRow({ status: "S3" })]);
    }
    if (sql.includes("from case_parties")) {
      return ok([]);
    }
    return ok();
  });

  await assert.rejects(
    () =>
      svc(pool, makeTemplates()).transition(makeCtx(), CASE_ID, {
        toStatus: "S4",
      }),
    /requires a primary case party/,
  );
});

void test("transition: S4→S5 requires required documents to be approved or waived", async () => {
  const pool = makePool((sql, p) => {
    if (sql.includes("from cases") && p?.[0] === CASE_ID) {
      return ok([makeCaseRow({ status: "S4" })]);
    }
    if (sql.includes("from case_parties")) {
      return ok([{ id: "cp-1" }]);
    }
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
    /requires all required document items to be approved or waived/,
  );
});

void test("transition: S4→S5 no longer checks validation run or review (moved to S5→S6)", async () => {
  const calls: string[] = [];
  const pool = makePool((sql, p) => {
    calls.push(sql.trim());
    if (sql.includes("update cases") && sql.includes("stage = $2"))
      return ok([makeCaseRow({ status: "S5" })]);
    if (sql.includes("from cases") && p?.[0] === CASE_ID) {
      return ok([makeCaseRow({ status: "S4" })]);
    }
    if (
      sql.includes("from document_items") &&
      sql.includes("required_flag = true") &&
      !sql.includes("updated_at >")
    ) {
      return ok([]);
    }
    return ok();
  });

  const result = await svc(pool, makeTemplates()).transition(
    makeCtx(),
    CASE_ID,
    { toStatus: "S5" },
  );
  assert.equal(result.stage, "S5");
  assert.ok(!calls.some((sql) => sql.includes("from validation_runs")));
  assert.ok(!calls.some((sql) => sql.includes("from review_records")));
});

void test("transition: S5→S6 requires a passed validation run", async () => {
  const pool = makePool((sql, p) => {
    if (sql.includes("from cases") && p?.[0] === CASE_ID)
      return ok([makeCaseRow({ status: "S5" })]);
    if (sql.includes("from validation_runs")) return ok([]);
    return ok();
  });

  await assert.rejects(
    () =>
      svc(pool, makeTemplates()).transition(makeCtx(), CASE_ID, {
        toStatus: "S6",
      }),
    /S5→S6 requires a passed validation run/,
  );
});

void test("transition: S5→S6 rejects failed validation run", async () => {
  const pool = makePool((sql, p) => {
    if (sql.includes("from cases") && p?.[0] === CASE_ID)
      return ok([makeCaseRow({ status: "S5" })]);
    if (sql.includes("from validation_runs"))
      return ok([
        {
          id: "vr-1",
          result_status: "failed",
          executed_at: "2026-04-20T00:00:00.000Z",
        },
      ]);
    return ok();
  });

  await assert.rejects(
    () =>
      svc(pool, makeTemplates()).transition(makeCtx(), CASE_ID, {
        toStatus: "S6",
      }),
    /latest validation run to be passed/,
  );
});

void test("transition: S5→S6 rejects stale validation run", async () => {
  const pool = makePool((sql, p) => {
    if (sql.includes("from cases") && p?.[0] === CASE_ID)
      return ok([makeCaseRow({ status: "S5" })]);
    if (sql.includes("from validation_runs"))
      return ok([
        {
          id: "vr-1",
          result_status: "passed",
          executed_at: "2026-04-20T00:00:00.000Z",
        },
      ]);
    if (sql.includes("as stale")) return ok([{ stale: true }]);
    return ok();
  });

  await assert.rejects(
    () =>
      svc(pool, makeTemplates()).transition(makeCtx(), CASE_ID, {
        toStatus: "S6",
      }),
    /stale/,
  );
});

void test("transition: S5→S6 requires approved review when review_required_flag is enabled", async () => {
  const pool = makePool((sql, p) => {
    if (sql.includes("from cases") && p?.[0] === CASE_ID)
      return ok([makeCaseRow({ status: "S5" })]);
    if (sql.includes("from validation_runs"))
      return ok([
        {
          id: "vr-1",
          result_status: "passed",
          executed_at: "2026-04-20T00:00:00.000Z",
        },
      ]);
    if (sql.includes("as stale")) return ok([{ stale: false }]);
    if (sql.includes("from review_records"))
      return ok([{ id: "rr-1", decision: "rejected" }]);
    return ok();
  });

  await assert.rejects(
    () =>
      svc(
        pool,
        makeTemplates((input: { kind: string }) =>
          input.kind === "case_type"
            ? {
                mode: "template",
                used: true,
                version: 1,
                config: { review_required_flag: true },
              }
            : { mode: "legacy", used: false },
        ),
      ).transition(makeCtx(), CASE_ID, { toStatus: "S6" }),
    /approved review record/,
  );
});

void test("transition: S5→S6 passes with valid VR and approved review", async () => {
  const pool = makePool((sql, p) => {
    if (sql.includes("update cases") && sql.includes("stage = $2"))
      return ok([makeCaseRow({ status: "S6" })]);
    if (sql.includes("from cases") && p?.[0] === CASE_ID)
      return ok([makeCaseRow({ status: "S5" })]);
    if (sql.includes("from validation_runs"))
      return ok([
        {
          id: "vr-1",
          result_status: "passed",
          executed_at: "2026-04-20T00:00:00.000Z",
        },
      ]);
    if (sql.includes("as stale")) return ok([{ stale: false }]);
    if (sql.includes("from review_records"))
      return ok([{ id: "rr-1", decision: "approved" }]);
    return ok();
  });

  const transitioned = await svc(
    pool,
    makeTemplates((input: { kind: string }) =>
      input.kind === "case_type"
        ? {
            mode: "template",
            used: true,
            version: 1,
            config: { review_required_flag: true },
          }
        : { mode: "legacy", used: false },
    ),
  ).transition(makeCtx(), CASE_ID, { toStatus: "S6" });

  assert.equal(transitioned.stage, "S6");
});

// ── Gate-C (S6→S7) ──

void test("transition: S6→S7 requires a passed validation run", async () => {
  const pool = makePool((sql, p) => {
    if (sql.includes("from cases") && p?.[0] === CASE_ID)
      return ok([makeCaseRow({ status: "S6" })]);
    if (sql.includes("from validation_runs")) return ok([]);
    return ok();
  });

  await assert.rejects(
    () =>
      svc(pool, makeTemplates()).transition(makeCtx(), CASE_ID, {
        toStatus: "S7",
      }),
    /S6→S7 requires a passed validation run/,
  );
});

void test("transition: S6→S7 rejects stale validation run", async () => {
  const pool = makePool((sql, p) => {
    if (sql.includes("from cases") && p?.[0] === CASE_ID)
      return ok([makeCaseRow({ status: "S6" })]);
    if (sql.includes("from validation_runs"))
      return ok([
        {
          id: "vr-1",
          result_status: "passed",
          executed_at: "2026-04-20T00:00:00.000Z",
        },
      ]);
    if (sql.includes("as stale")) return ok([{ stale: true }]);
    return ok();
  });

  await assert.rejects(
    () =>
      svc(pool, makeTemplates()).transition(makeCtx(), CASE_ID, {
        toStatus: "S7",
      }),
    /stale/,
  );
});

void test("transition: S6→S7 requires approved review when review_required_flag is enabled", async () => {
  const pool = makePool((sql, p) => {
    if (sql.includes("from cases") && p?.[0] === CASE_ID)
      return ok([makeCaseRow({ status: "S6" })]);
    if (sql.includes("from validation_runs"))
      return ok([
        {
          id: "vr-1",
          result_status: "passed",
          executed_at: "2026-04-20T00:00:00.000Z",
        },
      ]);
    if (sql.includes("as stale")) return ok([{ stale: false }]);
    if (sql.includes("from review_records"))
      return ok([{ id: "rr-1", decision: "rejected" }]);
    return ok();
  });

  await assert.rejects(
    () =>
      svc(
        pool,
        makeTemplates((input: { kind: string }) =>
          input.kind === "case_type"
            ? {
                mode: "template",
                used: true,
                version: 1,
                config: { review_required_flag: true },
              }
            : { mode: "legacy", used: false },
        ),
      ).transition(makeCtx(), CASE_ID, { toStatus: "S7" }),
    /approved review record/,
  );
});

void test("transition: S6→S7 requires billing risk ack when unpaid", async () => {
  const pool = makePool((sql, p) => {
    if (sql.includes("from cases") && p?.[0] === CASE_ID)
      return ok([
        makeCaseRow({
          status: "S6",
          billing_unpaid_amount_cached: "50000",
          billing_risk_acknowledged_at: null,
        }),
      ]);
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

  await assert.rejects(
    () =>
      svc(pool, makeTemplates()).transition(makeCtx(), CASE_ID, {
        toStatus: "S7",
      }),
    /billing risk acknowledgment/,
  );
});

void test("transition: S6→S7 passes when unpaid but billing risk acknowledged", async () => {
  const pool = makePool((sql, p) => {
    if (sql.includes("update cases") && sql.includes("stage = $2"))
      return ok([makeCaseRow({ status: "S7" })]);
    if (sql.includes("from cases") && p?.[0] === CASE_ID)
      return ok([
        makeCaseRow({
          status: "S6",
          billing_unpaid_amount_cached: "50000",
          billing_risk_acknowledged_at: "2026-04-20T00:00:00.000Z",
        }),
      ]);
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

  const transitioned = await svc(pool, makeTemplates()).transition(
    makeCtx(),
    CASE_ID,
    { toStatus: "S7" },
  );
  assert.equal(transitioned.stage, "S7");
});

void test("transition: S6→S7 passes when no unpaid balance", async () => {
  const r = await svc(transitionPool("S7", "S6"), makeTemplates()).transition(
    makeCtx(),
    CASE_ID,
    { toStatus: "S7" },
  );
  assert.equal(r.status, "S7");
});

void test("transition: template used=false falls back to default", async () => {
  const tpl = makeTemplates({
    mode: "template",
    used: false,
    reason: "Not found",
  });
  const r = await svc(transitionPool("S2", "S1"), tpl).transition(
    makeCtx(),
    CASE_ID,
    { toStatus: "S2" },
  );
  assert.equal(r.status, "S2");
});

// ── softDelete ──
void test("softDelete: marks deleted + timeline", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];
  const pool = makePool((sql, p) => {
    calls.push({ sql: sql.trim(), params: p });
    if (sql.includes("update cases") && sql.includes("metadata = $"))
      return ok([makeCaseRow()]);
    if (sql.includes("from cases") && p?.[0] === CASE_ID)
      return ok([makeCaseRow()]);
    return ok();
  });
  await svc(pool, makeTemplates()).softDelete(makeCtx("manager"), CASE_ID);
  const u = calls.find((c) => c.sql.includes("update cases"));
  assert.ok(u);
  assert.equal(
    (JSON.parse(u.params?.[1] as string) as Record<string, unknown>)._status,
    "deleted",
  );
  assert.equal(
    calls.filter((c) => c.sql.includes("insert into timeline_logs")).length,
    1,
  );
});

void test("softDelete: not found", async () => {
  await assert.rejects(
    () =>
      svc(
        makePool(() => ok()),
        makeTemplates(),
      ).softDelete(makeCtx("manager"), "x"),
    (e) => {
      assert.ok(e instanceof Error);
      return true;
    },
  );
});

// ── S4: new fields ──
const COMPANY_ID = "comp-1";

void test("create: with new fields (priority, companyId, etc.)", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];
  const pool = makePool((s, p) => {
    calls.push({ sql: s.trim(), params: p });
    return stdQ()(s, p);
  });
  const c = await svc(pool, makeTemplates()).create(makeCtx(), {
    ...CREATE_INPUT,
    caseName: "Test Case",
    priority: "high",
    riskLevel: "medium",
    companyId: COMPANY_ID,
    sourceChannel: "web",
    submissionDate: "2026-03-01",
  });
  assert.equal(c.id, CASE_ID);
  // company assertBelongsToOrg should be called
  const companyCheck = calls.find((c) =>
    c.sql.includes("select id from companies"),
  );
  assert.ok(companyCheck);
});

void test("create: companyId cross-tenant rejected", async () => {
  const pool = makePool((sql, params) => {
    if (
      sql.includes("select id from customers") ||
      sql.includes("select id from users")
    )
      return ok([{ id: params?.[0] }]);
    if (sql.includes("select id from companies")) return ok([]);
    if (sql.includes("insert into cases")) return ok([makeCaseRow()]);
    return ok();
  });
  await assert.rejects(
    () =>
      svc(pool, makeTemplates()).create(makeCtx(), {
        ...CREATE_INPUT,
        companyId: "foreign-comp",
      }),
    (e) => {
      assert.ok(e instanceof Error);
      assert.ok(e.message.includes("companies"));
      return true;
    },
  );
});

void test("update: with new fields (priority, caseName, etc.)", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];
  const pool = makePool((sql, p) => {
    calls.push({ sql: sql.trim(), params: p });
    if (sql.includes("update cases"))
      return ok([makeCaseRow({ priority: "urgent", case_name: "Updated" })]);
    if (sql.includes("from cases") && p?.[0] === CASE_ID)
      return ok([makeCaseRow()]);
    return ok();
  });
  const u = await svc(pool, makeTemplates()).update(makeCtx(), CASE_ID, {
    priority: "urgent",
    caseName: "Updated",
  });
  assert.equal(u.priority, "urgent");
  assert.equal(u.caseName, "Updated");
});

void test("update: companyId cross-tenant rejected", async () => {
  const pool = makePool((sql, p) => {
    if (sql.includes("select id from companies")) return ok([]);
    if (sql.includes("from cases") && p?.[0] === CASE_ID)
      return ok([makeCaseRow()]);
    if (sql.includes("update cases")) return ok([makeCaseRow()]);
    return ok();
  });
  await assert.rejects(
    () =>
      svc(pool, makeTemplates()).update(makeCtx(), CASE_ID, {
        companyId: "foreign-comp",
      }),
    (e) => {
      assert.ok(e instanceof Error);
      assert.ok(e.message.includes("companies"));
      return true;
    },
  );
});

void test("list: filters by priority", async () => {
  const calls: { sql: string }[] = [];
  const pool = makePool((sql) => {
    calls.push({ sql: sql.trim() });
    return sql.includes("count(*)")
      ? ok([{ count: "1" }])
      : ok([makeCaseRow({ priority: "high" })]);
  });
  await svc(pool, makeTemplates()).list(makeCtx("viewer"), {
    priority: "high",
  });
  const cq = calls.find((c) => c.sql.includes("count(*)"));
  assert.ok(cq);
  assert.ok(cq.sql.includes("priority = $"));
});

void test("list: filters by companyId", async () => {
  const calls: { sql: string }[] = [];
  const pool = makePool((sql) => {
    calls.push({ sql: sql.trim() });
    return sql.includes("count(*)")
      ? ok([{ count: "1" }])
      : ok([makeCaseRow({ company_id: COMPANY_ID })]);
  });
  await svc(pool, makeTemplates()).list(makeCtx("viewer"), {
    companyId: COMPANY_ID,
  });
  const cq = calls.find((c) => c.sql.includes("count(*)"));
  assert.ok(cq);
  assert.ok(cq.sql.includes("company_id = $"));
});

void test("mapCaseRow: maps all new fields correctly", async () => {
  const pool = makePool((sql, p) =>
    sql.includes("from cases") && p?.[0] === CASE_ID
      ? ok([
          makeCaseRow({
            case_no: "CASE-001",
            case_name: "Test",
            case_subtype: "renewal",
            application_type: "change_status",
            company_id: COMPANY_ID,
            priority: "high",
            risk_level: "medium",
            assistant_user_id: USER_ID,
            source_channel: "web",
            signed_at: "2026-02-01T00:00:00.000Z",
            accepted_at: "2026-02-02T00:00:00.000Z",
            submission_date: "2026-02-03",
            result_date: "2026-02-04",
            residence_expiry_date: "2027-01-01",
            archived_at: "2026-12-01T00:00:00.000Z",
          }),
        ])
      : ok(),
  );
  const c = await svc(pool, makeTemplates()).get(makeCtx("viewer"), CASE_ID);
  assert.ok(c);
  assert.equal(c.caseNo, "CASE-001");
  assert.equal(c.caseName, "Test");
  assert.equal(c.caseSubtype, "renewal");
  assert.equal(c.applicationType, "change_status");
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  assert.equal(c.companyId, COMPANY_ID);
  assert.equal(c.priority, "high");
  assert.equal(c.riskLevel, "medium");
  assert.equal(c.assistantUserId, USER_ID);
  assert.equal(c.sourceChannel, "web");
  assert.equal(c.signedAt, "2026-02-01T00:00:00.000Z");
  assert.equal(c.acceptedAt, "2026-02-02T00:00:00.000Z");
  assert.equal(c.submissionDate, "2026-02-03");
  assert.equal(c.resultDate, "2026-02-04");
  assert.equal(c.residenceExpiryDate, "2027-01-01");
  assert.equal(c.archivedAt, "2026-12-01T00:00:00.000Z");
});

// ── mapCaseRow: new P0 fields from migration 014 ──

void test("mapCaseRow: maps billing and post-approval fields", async () => {
  const pool = makePool((sql, p) =>
    sql.includes("from cases") && p?.[0] === CASE_ID
      ? ok([
          makeCaseRow({
            stage: "biz_step_15",
            application_flow_type: "coe_overseas",
            visa_plan: "2y",
            post_approval_stage: "coe_sent",
            coe_issued_at: "2026-03-20T00:00:00.000Z",
            coe_expiry_date: "2026-06-20",
            coe_sent_at: "2026-03-22T00:00:00.000Z",
            close_reason: "client_withdrawn",
            supplement_count: "2",
            result_outcome: "approved",
            quote_price: "500000.00",
            deposit_paid_cached: true,
            final_payment_paid_cached: false,
            billing_unpaid_amount_cached: "250000.00",
            billing_risk_acknowledged_by: USER_ID,
            billing_risk_acknowledged_at: "2026-03-15T10:00:00.000Z",
            billing_risk_ack_reason_code: "client_request",
            billing_risk_ack_reason_note: "Client confirmed by phone",
            overseas_visa_start_at: "2026-04-01T00:00:00.000Z",
            entry_confirmed_at: null,
          }),
        ])
      : ok(),
  );
  const c = await svc(pool, makeTemplates()).get(makeCtx("viewer"), CASE_ID);
  assert.ok(c);
  assert.equal(c.stage, "biz_step_15");
  assert.equal(c.applicationFlowType, "coe_overseas");
  assert.equal(c.visaPlan, "2y");
  assert.equal(c.postApprovalStage, "coe_sent");
  assert.equal(c.coeIssuedAt, "2026-03-20T00:00:00.000Z");
  assert.equal(c.coeExpiryDate, "2026-06-20");
  assert.equal(c.coeSentAt, "2026-03-22T00:00:00.000Z");
  assert.equal(c.closeReason, "client_withdrawn");
  assert.equal(c.supplementCount, 2);
  assert.equal(c.resultOutcome, "approved");
  assert.equal(c.quotePrice, 500000);
  assert.equal(c.depositPaidCached, true);
  assert.equal(c.finalPaymentPaidCached, false);
  assert.equal(c.billingUnpaidAmountCached, 250000);
  assert.equal(c.billingRiskAcknowledgedBy, USER_ID);
  assert.equal(c.billingRiskAcknowledgedAt, "2026-03-15T10:00:00.000Z");
  assert.equal(c.billingRiskAckReasonCode, "client_request");
  assert.equal(c.billingRiskAckReasonNote, "Client confirmed by phone");
  assert.equal(c.overseasVisaStartAt, "2026-04-01T00:00:00.000Z");
  assert.equal(c.entryConfirmedAt, null);
});

// ── resultOutcome validation ──

void test("create: rejects invalid resultOutcome", async () => {
  await assert.rejects(
    () =>
      svc(makePool(stdQ()), makeTemplates()).create(makeCtx(), {
        ...CREATE_INPUT,
        resultOutcome: "invalid",
      }),
    /Invalid resultOutcome/,
  );
});

void test("update: rejects invalid resultOutcome", async () => {
  const pool = makePool((sql, p) =>
    sql.includes("from cases") && p?.[0] === CASE_ID
      ? ok([makeCaseRow()])
      : ok(),
  );
  await assert.rejects(
    () =>
      svc(pool, makeTemplates()).update(makeCtx(), CASE_ID, {
        resultOutcome: "invalid",
      }),
    /Invalid resultOutcome/,
  );
});

void test("CASE_RESULT_OUTCOMES matches P0 spec + P1 visa_rejected", () => {
  assert.ok(CASE_RESULT_OUTCOMES.has("pending"));
  assert.ok(CASE_RESULT_OUTCOMES.has("approved"));
  assert.ok(CASE_RESULT_OUTCOMES.has("rejected"));
  assert.ok(CASE_RESULT_OUTCOMES.has("withdrawn"));
  assert.ok(CASE_RESULT_OUTCOMES.has("visa_rejected"));
  assert.equal(CASE_RESULT_OUTCOMES.size, 5);
});

// ── acknowledgeBillingRisk ──

void test("acknowledgeBillingRisk: writes fields + timeline", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];
  const pool = makePool((sql, p) => {
    calls.push({ sql: sql.trim(), params: p });
    if (sql.includes("update cases") && sql.includes("billing_risk"))
      return ok([
        makeCaseRow({
          billing_risk_acknowledged_by: USER_ID,
          billing_risk_acknowledged_at: "2026-04-01T00:00:00.000Z",
          billing_risk_ack_reason_code: "client_request",
          billing_risk_ack_reason_note: "ok",
        }),
      ]);
    if (sql.includes("from cases") && p?.[0] === CASE_ID)
      return ok([makeCaseRow()]);
    return ok();
  });

  const c = await svc(pool, makeTemplates()).acknowledgeBillingRisk(
    makeCtx(),
    CASE_ID,
    { reasonCode: "client_request", reasonNote: "ok" },
  );
  assert.equal(c.billingRiskAcknowledgedBy, USER_ID);
  assert.equal(c.billingRiskAckReasonCode, "client_request");
  const updateCall = calls.find(
    (c) => c.sql.includes("update cases") && c.sql.includes("billing_risk"),
  );
  assert.ok(updateCall);
  assert.ok(updateCall.params);
  assert.equal(updateCall.params[1], USER_ID);
  assert.equal(updateCall.params[2], "client_request");
  assert.equal(updateCall.params[3], "ok");
  assert.equal(
    calls.filter((c) => c.sql.includes("insert into timeline_logs")).length,
    1,
  );
});

void test("acknowledgeBillingRisk: not found", async () => {
  await assert.rejects(
    () =>
      svc(
        makePool(() => ok()),
        makeTemplates(),
      ).acknowledgeBillingRisk(makeCtx(), "x", { reasonCode: "test" }),
    (e) => {
      assert.ok(e instanceof Error);
      return true;
    },
  );
});

// ── updatePostApprovalStage ──

void test("POST_APPROVAL_STAGES matches expected values", () => {
  assert.ok(POST_APPROVAL_STAGES.has("waiting_final_payment"));
  assert.ok(POST_APPROVAL_STAGES.has("coe_sent"));
  assert.ok(POST_APPROVAL_STAGES.has("overseas_visa_applying"));
  assert.ok(POST_APPROVAL_STAGES.has("entry_success"));
  assert.equal(POST_APPROVAL_STAGES.size, 4);
});

void test("updatePostApprovalStage: writes metadata + timeline", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];
  const pool = makePool((sql, p) => {
    calls.push({ sql: sql.trim(), params: p });
    if (sql.includes("from billing_records") && sql.includes("尾款"))
      return ok();
    if (sql.includes("update cases") && sql.includes("metadata"))
      return ok([
        makeCaseRow({
          post_approval_stage: "coe_sent",
          metadata: { post_approval_stage: "coe_sent" },
        }),
      ]);
    if (sql.includes("from cases") && p?.[0] === CASE_ID)
      return ok([makeCaseRow({ status: "S8" })]);
    return ok();
  });

  const c = await svc(pool, makeTemplates()).updatePostApprovalStage(
    makeCtx(),
    CASE_ID,
    { stage: "coe_sent" },
  );
  assert.deepEqual(c.metadata, { post_approval_stage: "coe_sent" });
  assert.equal(c.postApprovalStage, "coe_sent");
  const updateCall = calls.find(
    (call) =>
      call.sql.includes("update cases") && call.sql.includes("metadata"),
  );
  assert.ok(updateCall);
  assert.equal(updateCall.params?.[2], "coe_sent");
  assert.equal(
    calls.filter((c) => c.sql.includes("insert into timeline_logs")).length,
    1,
  );
});

void test("updatePostApprovalStage: stamps overseas_visa_start_at on first entry", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];
  const pool = makePool((sql, p) => {
    calls.push({ sql: sql.trim(), params: p });
    if (sql.includes("update cases") && sql.includes("metadata"))
      return ok([
        makeCaseRow({
          post_approval_stage: "overseas_visa_applying",
          metadata: { post_approval_stage: "overseas_visa_applying" },
          overseas_visa_start_at: "2026-04-01T00:00:00.000Z",
        }),
      ]);
    if (sql.includes("from cases") && p?.[0] === CASE_ID)
      return ok([makeCaseRow({ status: "S8" })]);
    return ok();
  });

  const c = await svc(pool, makeTemplates()).updatePostApprovalStage(
    makeCtx(),
    CASE_ID,
    { stage: "overseas_visa_applying" },
  );
  assert.equal(c.overseasVisaStartAt, "2026-04-01T00:00:00.000Z");
  const updateCall = calls.find(
    (c) => c.sql.includes("update cases") && c.sql.includes("metadata"),
  );
  assert.ok(updateCall);
  assert.ok(updateCall.params);
  assert.equal(updateCall.params[2], "overseas_visa_applying");
  assert.equal(updateCall.params[3], true);
  assert.equal(updateCall.params[4], false);
});

void test("updatePostApprovalStage: blocks coe_sent when final payment gate is block", async () => {
  const pool = makePool((sql, p) => {
    if (sql.includes("from billing_records") && sql.includes("尾款")) {
      return ok([
        {
          amount_due: "250000",
          status: "partial",
          milestone_name: "尾款",
          gate_effect_mode: "block",
        },
      ]);
    }
    if (
      sql.includes("from payment_records pr") &&
      sql.includes("billing_records br")
    ) {
      return ok([{ total_received: "100000" }]);
    }
    if (sql.includes("from cases") && p?.[0] === CASE_ID) {
      return ok([makeCaseRow({ status: "S8" })]);
    }
    return ok();
  });

  await assert.rejects(
    () =>
      svc(pool, makeTemplates()).updatePostApprovalStage(makeCtx(), CASE_ID, {
        stage: "coe_sent",
      }),
    /CASE_POST_APPROVAL_BILLING_BLOCKED.*Billing gate blocks COE sending/,
  );
});

void test("updatePostApprovalStage: requires billing risk ack for warn gate", async () => {
  const pool = makePool((sql, p) => {
    if (sql.includes("from billing_records") && sql.includes("尾款")) {
      return ok([
        {
          amount_due: "250000",
          status: "partial",
          milestone_name: "尾款",
          gate_effect_mode: "warn",
        },
      ]);
    }
    if (
      sql.includes("from payment_records pr") &&
      sql.includes("billing_records br")
    ) {
      return ok([{ total_received: "100000" }]);
    }
    if (sql.includes("from cases") && p?.[0] === CASE_ID) {
      return ok([
        makeCaseRow({ status: "S8", billing_risk_acknowledged_at: null }),
      ]);
    }
    return ok();
  });

  await assert.rejects(
    () =>
      svc(pool, makeTemplates()).updatePostApprovalStage(makeCtx(), CASE_ID, {
        stage: "coe_sent",
      }),
    /Please acknowledge billing risk before sending COE/,
  );
});

void test("updatePostApprovalStage: allows coe_sent for warn gate after billing risk ack", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];
  const pool = makePool((sql, p) => {
    calls.push({ sql: sql.trim(), params: p });
    if (sql.includes("from billing_records") && sql.includes("尾款")) {
      return ok([
        {
          amount_due: "250000",
          status: "partial",
          milestone_name: "尾款",
          gate_effect_mode: "warn",
        },
      ]);
    }
    if (
      sql.includes("from payment_records pr") &&
      sql.includes("billing_records br")
    ) {
      return ok([{ total_received: "100000" }]);
    }
    if (sql.includes("update cases") && sql.includes("metadata")) {
      return ok([
        makeCaseRow({
          post_approval_stage: "coe_sent",
          metadata: { post_approval_stage: "coe_sent" },
          billing_risk_acknowledged_at: "2026-04-10T00:00:00.000Z",
        }),
      ]);
    }
    if (sql.includes("from cases") && p?.[0] === CASE_ID) {
      return ok([
        makeCaseRow({
          status: "S8",
          billing_risk_acknowledged_at: "2026-04-10T00:00:00.000Z",
        }),
      ]);
    }
    return ok();
  });

  const updated = await svc(pool, makeTemplates()).updatePostApprovalStage(
    makeCtx(),
    CASE_ID,
    { stage: "coe_sent" },
  );

  assert.equal(updated.postApprovalStage, "coe_sent");
  assert.equal(
    calls.filter((call) => call.sql.includes("insert into timeline_logs"))
      .length,
    1,
  );
});

void test("updatePostApprovalStage: rejects invalid stage", async () => {
  const pool = makePool((sql, p) =>
    sql.includes("from cases") && p?.[0] === CASE_ID
      ? ok([makeCaseRow()])
      : ok(),
  );
  await assert.rejects(
    () =>
      svc(pool, makeTemplates()).updatePostApprovalStage(makeCtx(), CASE_ID, {
        stage: "invalid_stage",
      }),
    /Invalid post-approval stage/,
  );
});

void test("updatePostApprovalStage: not found", async () => {
  await assert.rejects(
    () =>
      svc(
        makePool(() => ok()),
        makeTemplates(),
      ).updatePostApprovalStage(makeCtx(), "x", {
        stage: "coe_sent",
      }),
    (e) => {
      assert.ok(e instanceof Error);
      return true;
    },
  );
});

// ── Focused regression: stage history recording ──

void test("transition: writes case_stage_history row", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];
  const pool = makePool((sql, p) => {
    calls.push({ sql: sql.trim(), params: p });
    if (sql.includes("update cases") && sql.includes("stage = $2"))
      return ok([makeCaseRow({ status: "S2" })]);
    if (sql.includes("from cases") && p?.[0] === CASE_ID)
      return ok([makeCaseRow({ status: "S1" })]);
    return ok();
  });
  await svc(pool, makeTemplates()).transition(makeCtx(), CASE_ID, {
    toStatus: "S2",
  });
  const historyInsert = calls.find((c) =>
    c.sql.includes("insert into case_stage_history"),
  );
  assert.ok(historyInsert, "Expected case_stage_history insert");
  assert.ok(historyInsert.params);
  assert.equal(historyInsert.params[0], ORG_ID);
  assert.equal(historyInsert.params[1], CASE_ID);
  assert.equal(historyInsert.params[2], "S1");
  assert.equal(historyInsert.params[3], "S2");
  assert.equal(historyInsert.params[4], USER_ID);
});

void test("transition: S7→S9 writes stage history for terminal transition", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];
  const pool = makePool((sql, p) => {
    calls.push({ sql: sql.trim(), params: p });
    if (sql.includes("update cases") && sql.includes("stage = $2"))
      return ok([makeCaseRow({ status: "S9", close_reason: "rejected" })]);
    if (sql.includes("from cases") && p?.[0] === CASE_ID)
      return ok([makeCaseRow({ status: "S7" })]);
    return ok();
  });
  await svc(pool, makeTemplates()).transition(makeCtx(), CASE_ID, {
    toStatus: "S9",
    closeReason: "rejected",
  });
  const historyInsert = calls.find((c) =>
    c.sql.includes("insert into case_stage_history"),
  );
  assert.ok(historyInsert);
  assert.ok(historyInsert.params);
  assert.equal(historyInsert.params[2], "S7");
  assert.equal(historyInsert.params[3], "S9");
});

// ── Focused regression: billing risk ack with evidence URL ──

void test("acknowledgeBillingRisk: writes evidenceUrl", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];
  const pool = makePool((sql, p) => {
    calls.push({ sql: sql.trim(), params: p });
    if (sql.includes("update cases") && sql.includes("billing_risk"))
      return ok([
        makeCaseRow({
          billing_risk_acknowledged_by: USER_ID,
          billing_risk_acknowledged_at: "2026-04-01T00:00:00.000Z",
          billing_risk_ack_reason_code: "client_request",
          billing_risk_ack_reason_note: "ok",
          billing_risk_ack_evidence_url: "https://example.com/receipt.pdf",
        }),
      ]);
    if (sql.includes("from cases") && p?.[0] === CASE_ID)
      return ok([makeCaseRow()]);
    return ok();
  });

  const c = await svc(pool, makeTemplates()).acknowledgeBillingRisk(
    makeCtx(),
    CASE_ID,
    {
      reasonCode: "client_request",
      reasonNote: "ok",
      evidenceUrl: "https://example.com/receipt.pdf",
    },
  );
  assert.equal(c.billingRiskAckEvidenceUrl, "https://example.com/receipt.pdf");
  const updateCall = calls.find(
    (c) => c.sql.includes("update cases") && c.sql.includes("billing_risk"),
  );
  assert.ok(updateCall);
  assert.ok(updateCall.params);
  assert.equal(updateCall.params[4], "https://example.com/receipt.pdf");
});

void test("acknowledgeBillingRisk: evidenceUrl defaults to null when omitted", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];
  const pool = makePool((sql, p) => {
    calls.push({ sql: sql.trim(), params: p });
    if (sql.includes("update cases") && sql.includes("billing_risk"))
      return ok([
        makeCaseRow({
          billing_risk_acknowledged_by: USER_ID,
          billing_risk_acknowledged_at: "2026-04-01T00:00:00.000Z",
          billing_risk_ack_reason_code: "quick_proceed",
        }),
      ]);
    if (sql.includes("from cases") && p?.[0] === CASE_ID)
      return ok([makeCaseRow()]);
    return ok();
  });

  const c = await svc(pool, makeTemplates()).acknowledgeBillingRisk(
    makeCtx(),
    CASE_ID,
    { reasonCode: "quick_proceed" },
  );
  assert.equal(c.billingRiskAckEvidenceUrl, null);
  const updateCall = calls.find(
    (c) => c.sql.includes("update cases") && c.sql.includes("billing_risk"),
  );
  assert.ok(updateCall);
  assert.equal(updateCall.params?.[4], null);
});

// ── Focused regression: post-approval sub-stages ──

void test("updatePostApprovalStage: entry_success stamps entry_confirmed_at", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];
  const pool = makePool((sql, p) => {
    calls.push({ sql: sql.trim(), params: p });
    if (sql.includes("update cases") && sql.includes("metadata"))
      return ok([
        makeCaseRow({
          post_approval_stage: "entry_success",
          metadata: { post_approval_stage: "entry_success" },
          entry_confirmed_at: "2026-04-10T00:00:00.000Z",
        }),
      ]);
    if (sql.includes("from cases") && p?.[0] === CASE_ID)
      return ok([makeCaseRow({ status: "S8" })]);
    return ok();
  });

  const c = await svc(pool, makeTemplates()).updatePostApprovalStage(
    makeCtx(),
    CASE_ID,
    { stage: "entry_success" },
  );
  assert.equal(c.entryConfirmedAt, "2026-04-10T00:00:00.000Z");
  const updateCall = calls.find(
    (c) => c.sql.includes("update cases") && c.sql.includes("metadata"),
  );
  assert.ok(updateCall);
  assert.ok(updateCall.params);
  assert.equal(updateCall.params[2], "entry_success");
  assert.equal(updateCall.params[3], false);
  assert.equal(updateCall.params[4], true);
});

void test("updatePostApprovalStage: waiting_final_payment accepted", async () => {
  const pool = makePool((sql, p) => {
    if (sql.includes("update cases") && sql.includes("metadata"))
      return ok([
        makeCaseRow({
          post_approval_stage: "waiting_final_payment",
          metadata: { post_approval_stage: "waiting_final_payment" },
        }),
      ]);
    if (sql.includes("from cases") && p?.[0] === CASE_ID)
      return ok([makeCaseRow({ status: "S8" })]);
    return ok();
  });

  const c = await svc(pool, makeTemplates()).updatePostApprovalStage(
    makeCtx(),
    CASE_ID,
    { stage: "waiting_final_payment" },
  );
  assert.deepEqual(c.metadata, {
    post_approval_stage: "waiting_final_payment",
  });
  assert.equal(c.postApprovalStage, "waiting_final_payment");
});

void test("updatePostApprovalStage: does not re-stamp overseas_visa_start_at if already set", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];
  const pool = makePool((sql, p) => {
    calls.push({ sql: sql.trim(), params: p });
    if (sql.includes("update cases") && sql.includes("metadata"))
      return ok([
        makeCaseRow({
          post_approval_stage: "overseas_visa_applying",
          metadata: { post_approval_stage: "overseas_visa_applying" },
          overseas_visa_start_at: "2026-03-01T00:00:00.000Z",
        }),
      ]);
    if (sql.includes("from cases") && p?.[0] === CASE_ID)
      return ok([
        makeCaseRow({
          status: "S8",
          overseas_visa_start_at: "2026-03-01T00:00:00.000Z",
        }),
      ]);
    return ok();
  });

  await svc(pool, makeTemplates()).updatePostApprovalStage(makeCtx(), CASE_ID, {
    stage: "overseas_visa_applying",
  });
  const updateCall = calls.find(
    (c) => c.sql.includes("update cases") && c.sql.includes("metadata"),
  );
  assert.ok(updateCall);
  assert.equal(updateCall.params?.[3], false, "should not re-stamp visa start");
});

void test("mapCaseRow: falls back to metadata post_approval_stage when column is none", async () => {
  const pool = makePool((sql, p) =>
    sql.includes("from cases") && p?.[0] === CASE_ID
      ? ok([
          makeCaseRow({
            post_approval_stage: "none",
            metadata: { post_approval_stage: "coe_sent" },
          }),
        ])
      : ok(),
  );

  const c = await svc(pool, makeTemplates()).get(makeCtx("viewer"), CASE_ID);
  assert.ok(c);
  assert.equal(c.postApprovalStage, "coe_sent");
  assert.deepEqual(c.metadata, { post_approval_stage: "coe_sent" });
});

// ── Focused regression: mapCaseRow maps evidence URL ──

void test("mapCaseRow: maps billingRiskAckEvidenceUrl", async () => {
  const pool = makePool((sql, p) =>
    sql.includes("from cases") && p?.[0] === CASE_ID
      ? ok([
          makeCaseRow({
            billing_risk_ack_evidence_url: "https://example.com/proof.pdf",
          }),
        ])
      : ok(),
  );
  const c = await svc(pool, makeTemplates()).get(makeCtx("viewer"), CASE_ID);
  assert.ok(c);
  assert.equal(c.billingRiskAckEvidenceUrl, "https://example.com/proof.pdf");
});

void test("mapCaseRow: billingRiskAckEvidenceUrl defaults to null", async () => {
  const pool = makePool((sql, p) =>
    sql.includes("from cases") && p?.[0] === CASE_ID
      ? ok([makeCaseRow()])
      : ok(),
  );
  const c = await svc(pool, makeTemplates()).get(makeCtx("viewer"), CASE_ID);
  assert.ok(c);
  assert.equal(c.billingRiskAckEvidenceUrl, null);
});

// ── Focused regression: result archival path ──

void test("update: sets resultOutcome on S8 case", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];
  const pool = makePool((sql, p) => {
    calls.push({ sql: sql.trim(), params: p });
    if (sql.includes("update cases"))
      return ok([
        makeCaseRow({
          status: "S8",
          result_outcome: "approved",
          result_date: "2026-04-01",
        }),
      ]);
    if (sql.includes("from cases") && p?.[0] === CASE_ID)
      return ok([makeCaseRow({ status: "S8" })]);
    return ok();
  });
  const u = await svc(pool, makeTemplates()).update(makeCtx(), CASE_ID, {
    resultOutcome: "approved",
    resultDate: "2026-04-01",
  });
  assert.equal(u.resultOutcome, "approved");
  assert.equal(u.resultDate, "2026-04-01");
});

// ── Focused regression: billing risk re-acknowledgment ──

void test("acknowledgeBillingRisk: re-ack overwrites previous values", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];
  const pool = makePool((sql, p) => {
    calls.push({ sql: sql.trim(), params: p });
    if (sql.includes("update cases") && sql.includes("billing_risk"))
      return ok([
        makeCaseRow({
          billing_risk_acknowledged_by: USER_ID,
          billing_risk_acknowledged_at: "2026-04-10T00:00:00.000Z",
          billing_risk_ack_reason_code: "manager_override",
          billing_risk_ack_reason_note: "approved by VP",
          billing_risk_ack_evidence_url: "https://example.com/new-proof.pdf",
        }),
      ]);
    if (sql.includes("from cases") && p?.[0] === CASE_ID)
      return ok([
        makeCaseRow({
          billing_risk_acknowledged_by: "old-user",
          billing_risk_acknowledged_at: "2026-03-01T00:00:00.000Z",
          billing_risk_ack_reason_code: "client_request",
        }),
      ]);
    return ok();
  });

  const c = await svc(pool, makeTemplates()).acknowledgeBillingRisk(
    makeCtx(),
    CASE_ID,
    {
      reasonCode: "manager_override",
      reasonNote: "approved by VP",
      evidenceUrl: "https://example.com/new-proof.pdf",
    },
  );
  assert.equal(c.billingRiskAckReasonCode, "manager_override");
  assert.equal(
    c.billingRiskAckEvidenceUrl,
    "https://example.com/new-proof.pdf",
  );
});

// ── Focused regression: full happy-path stage chain ──

void test("transition: full chain S1→S2→S3→S4→S5→S6→S7→S8→S9", async () => {
  const chain = ["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8", "S9"];
  for (let i = 0; i < chain.length - 1; i++) {
    const from = chain[i];
    const to = chain[i + 1];
    const pool = makePool((sql, p) => {
      if (sql.includes("update cases") && sql.includes("stage = $2"))
        return ok([makeCaseRow({ status: to })]);
      if (sql.includes("from cases") && p?.[0] === CASE_ID)
        return ok([makeCaseRow({ status: from })]);
      if (sql.includes("from case_parties")) {
        return ok([{ id: "cp-1" }]);
      }
      if (
        sql.includes("from document_items") &&
        sql.includes("required_flag = true") &&
        !sql.includes("updated_at >")
      ) {
        return ok([]);
      }
      if (sql.includes("from validation_runs")) {
        return ok([
          {
            id: "vr-1",
            result_status: "passed",
            executed_at: "2026-04-20T00:00:00.000Z",
          },
        ]);
      }
      if (sql.includes("as stale")) {
        return ok([{ stale: false }]);
      }
      return ok();
    });
    const c = await svc(pool, makeTemplates()).transition(makeCtx(), CASE_ID, {
      toStatus: to,
    });
    assert.equal(c.status, to, `Expected ${from}→${to} to succeed`);
  }
});

// ── Focused regression: S7 correction stays in-place ──

void test("transition: S7 correction semantics — cannot roll back to S5 or S6", async () => {
  for (const target of ["S1", "S2", "S3", "S4", "S5", "S6"]) {
    const pool = makePool((sql, p) =>
      sql.includes("from cases") && p?.[0] === CASE_ID
        ? ok([makeCaseRow({ status: "S7" })])
        : ok(),
    );
    await assert.rejects(
      () =>
        svc(pool, makeTemplates()).transition(makeCtx(), CASE_ID, {
          toStatus: target,
        }),
      (e) => {
        assert.ok(e instanceof Error);
        assert.ok(e.message.includes("not allowed"));
        return true;
      },
      `S7 → ${target} should be blocked (correction stays in S7)`,
    );
  }
});

void test("transition: S7 can only proceed to S8 or S9", async () => {
  const r8 = await svc(transitionPool("S8", "S7"), makeTemplates()).transition(
    makeCtx(),
    CASE_ID,
    { toStatus: "S8" },
  );
  assert.equal(r8.status, "S8");

  const r9 = await svc(transitionPool("S9", "S7"), makeTemplates()).transition(
    makeCtx(),
    CASE_ID,
    {
      toStatus: "S9",
      closeReason: "rejected_by_immigration",
    },
  );
  assert.equal(r9.status, "S9");
});

// ── Focused regression: result archival path ──

void test("transition: S8→S9 result archival path", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];
  const pool = makePool((sql, p) => {
    calls.push({ sql: sql.trim(), params: p });
    if (sql.includes("update cases") && sql.includes("stage = $2"))
      return ok([makeCaseRow({ status: "S9", result_outcome: "approved" })]);
    if (sql.includes("from cases") && p?.[0] === CASE_ID)
      return ok([makeCaseRow({ status: "S8", result_outcome: "approved" })]);
    return ok();
  });
  const r = await svc(pool, makeTemplates()).transition(makeCtx(), CASE_ID, {
    toStatus: "S9",
  });
  assert.equal(r.status, "S9");
  assert.equal(r.resultOutcome, "approved");
  const history = calls.find((c) =>
    c.sql.includes("insert into case_stage_history"),
  );
  assert.ok(history);
  assert.ok(history.params);
  assert.equal(history.params[2], "S8");
  assert.equal(history.params[3], "S9");
});

// ── Focused regression: billing risk ack timeline includes evidenceUrl ──

void test("acknowledgeBillingRisk: timeline payload includes evidenceUrl", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];
  const pool = makePool((sql, p) => {
    calls.push({ sql: sql.trim(), params: p });
    if (sql.includes("update cases") && sql.includes("billing_risk"))
      return ok([
        makeCaseRow({
          billing_risk_acknowledged_by: USER_ID,
          billing_risk_acknowledged_at: "2026-04-01T00:00:00.000Z",
          billing_risk_ack_reason_code: "partial_waiver",
          billing_risk_ack_evidence_url: "https://example.com/doc.pdf",
        }),
      ]);
    if (sql.includes("from cases") && p?.[0] === CASE_ID)
      return ok([makeCaseRow()]);
    return ok();
  });

  await svc(pool, makeTemplates()).acknowledgeBillingRisk(makeCtx(), CASE_ID, {
    reasonCode: "partial_waiver",
    evidenceUrl: "https://example.com/doc.pdf",
  });
  const timelineCall = calls.find((c) =>
    c.sql.includes("insert into timeline_logs"),
  );
  assert.ok(timelineCall);
  const payload = JSON.parse(timelineCall.params?.[5] as string) as Record<
    string,
    unknown
  >;
  assert.equal(payload.reasonCode, "partial_waiver");
  assert.equal(payload.evidenceUrl, "https://example.com/doc.pdf");
});

// ── Focused regression: only S7 (with closeReason) and S8 can reach S9 ──

void test("transition: S1-S6 are blocked from direct S9 (BUG-063)", async () => {
  for (const stage of ["S1", "S2", "S3", "S4", "S5", "S6"]) {
    const pool = makePool((sql, p) =>
      sql.includes("from cases") && p?.[0] === CASE_ID
        ? ok([makeCaseRow({ status: stage })])
        : ok(),
    );
    await assert.rejects(
      () =>
        svc(pool, makeTemplates()).transition(makeCtx(), CASE_ID, {
          toStatus: "S9",
        }),
      (e) => e instanceof Error,
      `${stage} → S9 should be blocked`,
    );
  }
});

void test("transition: S7→S9 with closeReason and S8→S9 are allowed", async () => {
  const r7 = await svc(transitionPool("S9", "S7"), makeTemplates()).transition(
    makeCtx(),
    CASE_ID,
    {
      toStatus: "S9",
      closeReason: "rejected_by_immigration",
    },
  );
  assert.equal(r7.status, "S9", "S7 → S9 with closeReason should succeed");

  const r8 = await svc(transitionPool("S9", "S8"), makeTemplates()).transition(
    makeCtx(),
    CASE_ID,
    { toStatus: "S9" },
  );
  assert.equal(r8.status, "S9", "S8 → S9 should succeed");
});

// ── Group: CASE_COLS includes group_id ──

void test("mapCaseRow: maps group_id to groupId", () => {
  const row = makeCaseRow({ group_id: "grp-1" });
  const c = mapCaseRow(row as never);
  assert.equal(c.groupId, "grp-1");
});

void test("mapCaseRow: null group_id maps to null groupId", () => {
  const row = makeCaseRow({ group_id: null });
  const c = mapCaseRow(row as never);
  assert.equal(c.groupId, null);
});

void test("mapCaseRow: missing group_id maps to null groupId", () => {
  const row = makeCaseRow();
  const c = mapCaseRow(row as never);
  assert.equal(c.groupId, null);
});

// ── Group: create inherits group from customer ──

void test("create: resolves groupId from customer base_profile", async () => {
  const GROUP_ID = "grp-resolved";
  const calls: { sql: string; params?: unknown[] }[] = [];
  const pool = makePool((sql, params) => {
    calls.push({ sql: sql.trim(), params });
    if (
      sql.includes("select id from customers") ||
      sql.includes("select id from users")
    )
      return ok([{ id: params?.[0] }]);
    if (sql.includes("FROM customers c") && sql.includes("JOIN groups g"))
      return ok([{ group_id: GROUP_ID }]);
    if (sql.includes("insert into cases"))
      return ok([makeCaseRow({ group_id: GROUP_ID })]);
    return ok();
  });

  const c = await svc(pool, makeTemplates()).create(makeCtx(), CREATE_INPUT);
  assert.equal(c.groupId, GROUP_ID);

  const insertCall = calls.find((call) =>
    call.sql.includes("insert into cases"),
  );
  assert.ok(insertCall);
  assert.equal(insertCall.params?.[5], GROUP_ID);
});

void test("create: explicit groupId overrides customer inheritance", async () => {
  const EXPLICIT_GROUP = "grp-explicit";
  const calls: { sql: string; params?: unknown[] }[] = [];
  const pool = makePool((sql, params) => {
    calls.push({ sql: sql.trim(), params });
    if (
      sql.includes("select id from customers") ||
      sql.includes("select id from users")
    )
      return ok([{ id: params?.[0] }]);
    if (sql.includes("FROM customers c") && sql.includes("JOIN groups g"))
      return ok([{ group_id: EXPLICIT_GROUP }]);
    if (sql.includes("insert into cases"))
      return ok([makeCaseRow({ group_id: EXPLICIT_GROUP })]);
    return ok();
  });

  const c = await svc(pool, makeTemplates()).create(makeCtx(), {
    ...CREATE_INPUT,
    groupId: EXPLICIT_GROUP,
  });
  assert.equal(c.groupId, EXPLICIT_GROUP);

  const insertCall = calls.find((call) =>
    call.sql.includes("insert into cases"),
  );
  assert.ok(insertCall);
  assert.equal(insertCall.params?.[5], EXPLICIT_GROUP);
});

void test("create: null groupId when customer has no group", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];
  const pool = makePool((sql, params) => {
    calls.push({ sql: sql.trim(), params });
    if (
      sql.includes("select id from customers") ||
      sql.includes("select id from users")
    )
      return ok([{ id: params?.[0] }]);
    if (sql.includes("FROM customers c") && sql.includes("JOIN groups g"))
      return ok([]);
    if (sql.includes("insert into cases")) return ok([makeCaseRow()]);
    return ok();
  });

  const c = await svc(pool, makeTemplates()).create(makeCtx(), CREATE_INPUT);
  assert.equal(c.groupId, null);

  const insertCall = calls.find((call) =>
    call.sql.includes("insert into cases"),
  );
  assert.ok(insertCall);
  assert.equal(insertCall.params?.[5], null);
});

// ── Group: list filter ──

void test("list: applies groupId filter", async () => {
  const calls: { sql: string }[] = [];
  const pool = makePool((sql) => {
    calls.push({ sql: sql.trim() });
    return sql.includes("count(*)")
      ? ok([{ count: "1" }])
      : ok([makeCaseRow()]);
  });
  await svc(pool, makeTemplates()).list(makeCtx("viewer"), {
    groupId: "00000000-0000-4000-8000-000000000011",
  });
  const cq = calls.find((c) => c.sql.includes("count(*)"));
  assert.ok(cq);
  assert.ok(cq.sql.includes("group_id = $"));
});

// ── list: visibility filter ──

void test("list: admin visibility adds no extra WHERE conditions", async () => {
  const calls: { sql: string }[] = [];
  const pool = makePool((sql) => {
    calls.push({ sql: sql.trim() });
    return sql.includes("count(*)") ? ok([{ count: "0" }]) : ok([]);
  });
  await svc(pool, makeTemplates()).list(makeCtx("manager"), {
    visibility: { userId: USER_ID, roleTier: "admin", groupId: "grp-1" },
  });
  const cq = calls.find((c) => c.sql.includes("count(*)"));
  assert.ok(cq);
  assert.ok(!cq.sql.includes("owner_user_id = $"));
  assert.ok(!cq.sql.includes("assistant_user_id = $"));
});

void test("list: staff visibility filters by group OR participant", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];
  const pool = makePool((sql, params) => {
    calls.push({ sql: sql.trim(), params });
    return sql.includes("count(*)") ? ok([{ count: "0" }]) : ok([]);
  });
  await svc(pool, makeTemplates()).list(makeCtx("staff"), {
    visibility: { userId: USER_ID, roleTier: "staff", groupId: "grp-1" },
  });
  const cq = calls.find((c) => c.sql.includes("count(*)"));
  assert.ok(cq);
  assert.ok(cq.sql.includes("group_id = $"));
  assert.ok(cq.sql.includes("owner_user_id = $"));
  assert.ok(cq.sql.includes("assistant_user_id = $"));
  assert.ok(cq.params?.includes("grp-1"));
  assert.ok(cq.params?.includes(USER_ID));
});

void test("list: staff visibility without groupId filters by participant only", async () => {
  const calls: { sql: string }[] = [];
  const pool = makePool((sql) => {
    calls.push({ sql: sql.trim() });
    return sql.includes("count(*)") ? ok([{ count: "0" }]) : ok([]);
  });
  await svc(pool, makeTemplates()).list(makeCtx("staff"), {
    visibility: { userId: USER_ID, roleTier: "staff" },
  });
  const cq = calls.find((c) => c.sql.includes("count(*)"));
  assert.ok(cq);
  assert.ok(!cq.sql.includes("group_id = $"));
  assert.ok(cq.sql.includes("owner_user_id = $"));
  assert.ok(cq.sql.includes("assistant_user_id = $"));
});

void test("list: viewer visibility filters by participant only", async () => {
  const calls: { sql: string }[] = [];
  const pool = makePool((sql) => {
    calls.push({ sql: sql.trim() });
    return sql.includes("count(*)") ? ok([{ count: "0" }]) : ok([]);
  });
  await svc(pool, makeTemplates()).list(makeCtx("viewer"), {
    visibility: { userId: USER_ID, roleTier: "viewer" },
  });
  const cq = calls.find((c) => c.sql.includes("count(*)"));
  assert.ok(cq);
  assert.ok(!cq.sql.includes("group_id = $"));
  assert.ok(cq.sql.includes("owner_user_id = $"));
  assert.ok(cq.sql.includes("assistant_user_id = $"));
});

void test("list: admin scope=mine filters by participant only", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];
  const pool = makePool((sql, params) => {
    calls.push({ sql: sql.trim(), params });
    return sql.includes("count(*)") ? ok([{ count: "0" }]) : ok([]);
  });
  await svc(pool, makeTemplates()).list(makeCtx("manager"), {
    scope: "mine",
    visibility: { userId: USER_ID, roleTier: "admin", groupId: "grp-1" },
  });
  const cq = calls.find((c) => c.sql.includes("count(*)"));
  assert.ok(cq);
  assert.ok(!cq.sql.includes("group_id = $"));
  assert.ok(cq.sql.includes("owner_user_id = $"));
  assert.ok(cq.sql.includes("assistant_user_id = $"));
  assert.equal(cq.params?.[0], USER_ID);
});

// ============================================================================
// §p0-sv-006: 补充测试 — 权限失败 / Gate 失败 / 成功流转 / 欠款风险确认
// ============================================================================

// ── Gate-A success: S3→S4 passes when primary party exists ──

void test("transition: S3→S4 succeeds when primary party present", async () => {
  const calls: { sql: string }[] = [];
  const pool = makePool((sql, p) => {
    calls.push({ sql: sql.trim() });
    if (sql.includes("update cases") && sql.includes("stage = $2"))
      return ok([makeCaseRow({ status: "S4" })]);
    if (sql.includes("from cases") && p?.[0] === CASE_ID)
      return ok([makeCaseRow({ status: "S3" })]);
    if (sql.includes("from case_parties") && sql.includes("is_primary"))
      return ok([{ id: "cp-primary" }]);
    return ok();
  });

  const result = await svc(pool, makeTemplates()).transition(
    makeCtx(),
    CASE_ID,
    { toStatus: "S4" },
  );
  assert.equal(result.stage, "S4");
  assert.ok(calls.some((c) => c.sql.includes("from case_parties")));
});

// ── Gate-A via template: template state_flow still runs gate check ──

void test("transition: S3→S4 via template still checks Gate-A", async () => {
  const pool = makePool((sql, p) => {
    if (sql.includes("from cases") && p?.[0] === CASE_ID)
      return ok([makeCaseRow({ status: "S3" })]);
    if (sql.includes("from case_parties") && sql.includes("is_primary"))
      return ok([]);
    return ok();
  });

  await assert.rejects(
    () =>
      svc(pool, SF_TPL([{ from: "S3", to: "S4" }])).transition(
        makeCtx(),
        CASE_ID,
        { toStatus: "S4" },
      ),
    /requires a primary case party/,
  );
});

// ── Gate-B success: S4→S5 succeeds when all required docs approved ──

void test("transition: S4→S5 succeeds when all required docs approved", async () => {
  const calls: { sql: string }[] = [];
  const pool = makePool((sql, p) => {
    calls.push({ sql: sql.trim() });
    if (sql.includes("update cases") && sql.includes("stage = $2"))
      return ok([makeCaseRow({ status: "S5" })]);
    if (sql.includes("from cases") && p?.[0] === CASE_ID)
      return ok([makeCaseRow({ status: "S4" })]);
    if (
      sql.includes("from document_items") &&
      sql.includes("required_flag = true") &&
      !sql.includes("updated_at >")
    )
      return ok([]);
    return ok();
  });

  const result = await svc(pool, makeTemplates()).transition(
    makeCtx(),
    CASE_ID,
    { toStatus: "S5" },
  );
  assert.equal(result.stage, "S5");
  assert.ok(calls.some((c) => c.sql.includes("from document_items")));
});

// ── Gate-C combined: VR failed check runs before billing check ──

void test("transition: S6→S7 VR check fails before billing check is reached", async () => {
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
        {
          id: "vr-1",
          result_status: "failed",
          executed_at: "2026-04-20T00:00:00.000Z",
        },
      ]);
    return ok();
  });

  await assert.rejects(
    () =>
      svc(pool, makeTemplates()).transition(makeCtx(), CASE_ID, {
        toStatus: "S7",
      }),
    /latest validation run to be passed/,
  );
});

// ── Gate-C combined: review required + approved + unpaid + ack'd → success ──

void test("transition: S6→S7 succeeds with review required + approved + unpaid ack'd", async () => {
  const pool = makePool((sql, p) => {
    if (sql.includes("update cases") && sql.includes("stage = $2"))
      return ok([makeCaseRow({ status: "S7" })]);
    if (sql.includes("from cases") && p?.[0] === CASE_ID)
      return ok([
        makeCaseRow({
          status: "S6",
          billing_unpaid_amount_cached: "80000",
          billing_risk_acknowledged_at: "2026-04-18T00:00:00.000Z",
        }),
      ]);
    if (sql.includes("from validation_runs"))
      return ok([
        {
          id: "vr-1",
          result_status: "passed",
          executed_at: "2026-04-20T00:00:00.000Z",
        },
      ]);
    if (sql.includes("as stale")) return ok([{ stale: false }]);
    if (sql.includes("from review_records"))
      return ok([{ id: "rr-1", decision: "approved" }]);
    return ok();
  });

  const result = await svc(
    pool,
    makeTemplates((input: { kind: string }) =>
      input.kind === "case_type"
        ? {
            mode: "template",
            used: true,
            version: 1,
            config: { review_required_flag: true },
          }
        : { mode: "legacy", used: false },
    ),
  ).transition(makeCtx(), CASE_ID, { toStatus: "S7" });

  assert.equal(result.stage, "S7");
});

// ── Gate-C combined: review required + rejected review + unpaid → review fails first ──

void test("transition: S6→S7 review rejection fails before billing check", async () => {
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
        {
          id: "vr-1",
          result_status: "passed",
          executed_at: "2026-04-20T00:00:00.000Z",
        },
      ]);
    if (sql.includes("as stale")) return ok([{ stale: false }]);
    if (sql.includes("from review_records"))
      return ok([{ id: "rr-1", decision: "rejected" }]);
    return ok();
  });

  await assert.rejects(
    () =>
      svc(
        pool,
        makeTemplates((input: { kind: string }) =>
          input.kind === "case_type"
            ? {
                mode: "template",
                used: true,
                version: 1,
                config: { review_required_flag: true },
              }
            : { mode: "legacy", used: false },
        ),
      ).transition(makeCtx(), CASE_ID, { toStatus: "S7" }),
    /approved review record/,
  );
});

// ── Transition input validation: toStage + toStatus mismatch ──

void test("transition: rejects when toStage and toStatus mismatch", async () => {
  const pool = makePool((sql, p) =>
    sql.includes("from cases") && p?.[0] === CASE_ID
      ? ok([makeCaseRow({ status: "S1" })])
      : ok(),
  );

  await assert.rejects(
    () =>
      svc(pool, makeTemplates()).transition(makeCtx(), CASE_ID, {
        toStage: "S2",
        toStatus: "S3",
      }),
    /toStage and toStatus must match/,
  );
});

void test("transition: accepts when toStage and toStatus match", async () => {
  const pool = makePool((sql, p) => {
    if (sql.includes("update cases") && sql.includes("stage = $2"))
      return ok([makeCaseRow({ status: "S2" })]);
    if (sql.includes("from cases") && p?.[0] === CASE_ID)
      return ok([makeCaseRow({ status: "S1" })]);
    return ok();
  });

  const result = await svc(pool, makeTemplates()).transition(
    makeCtx(),
    CASE_ID,
    { toStage: "S2", toStatus: "S2" },
  );
  assert.equal(result.stage, "S2");
});

void test("transition: rejects invalid toStage value", async () => {
  const pool = makePool((sql, p) =>
    sql.includes("from cases") && p?.[0] === CASE_ID
      ? ok([makeCaseRow({ status: "S1" })])
      : ok(),
  );

  await assert.rejects(
    () =>
      svc(pool, makeTemplates()).transition(makeCtx(), CASE_ID, {
        toStage: "INVALID",
      }),
    /Invalid toStage/,
  );
});

void test("transition: rejects when neither toStage nor toStatus provided", async () => {
  const pool = makePool((sql, p) =>
    sql.includes("from cases") && p?.[0] === CASE_ID
      ? ok([makeCaseRow({ status: "S1" })])
      : ok(),
  );

  await assert.rejects(
    () => svc(pool, makeTemplates()).transition(makeCtx(), CASE_ID, {}),
    /Invalid toStage/,
  );
});

// ── BUG-063: S3/S6→S9 emergency close is now blocked ──

void test("transition: S3→S9 is blocked after BUG-063 tightening", async () => {
  const pool = makePool((sql, p) => {
    if (sql.includes("from cases") && p?.[0] === CASE_ID)
      return ok([makeCaseRow({ status: "S3" })]);
    return ok();
  });

  await assert.rejects(
    () =>
      svc(pool, makeTemplates()).transition(makeCtx(), CASE_ID, {
        toStatus: "S9",
      }),
    (e) => e instanceof Error && /not allowed/i.test(e.message),
  );
});

void test("transition: S6→S9 is blocked after BUG-063 tightening", async () => {
  const pool = makePool((sql, p) => {
    if (sql.includes("from cases") && p?.[0] === CASE_ID)
      return ok([
        makeCaseRow({
          status: "S6",
          billing_unpaid_amount_cached: "100000",
          billing_risk_acknowledged_at: null,
        }),
      ]);
    return ok();
  });

  await assert.rejects(
    () =>
      svc(pool, makeTemplates()).transition(makeCtx(), CASE_ID, {
        toStatus: "S9",
      }),
    (e) => e instanceof Error && /not allowed/i.test(e.message),
  );
});

// ── S5→S6 success: VR passed + non-stale + no review required ──

void test("transition: S5→S6 succeeds with VR passed and non-stale (review not required)", async () => {
  const calls: string[] = [];
  const pool = makePool((sql, p) => {
    calls.push(sql.trim());
    if (sql.includes("update cases") && sql.includes("stage = $2"))
      return ok([makeCaseRow({ status: "S6" })]);
    if (sql.includes("from cases") && p?.[0] === CASE_ID)
      return ok([makeCaseRow({ status: "S5" })]);
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

  const result = await svc(pool, makeTemplates()).transition(
    makeCtx(),
    CASE_ID,
    { toStatus: "S6" },
  );
  assert.equal(result.stage, "S6");
  assert.ok(calls.some((s) => s.includes("from validation_runs")));
  assert.ok(calls.some((s) => s.includes("as stale")));
  assert.ok(!calls.some((s) => s.includes("from review_records")));
});

// ── Workflow integration: ack billing risk then transition S6→S7 ──

void test("workflow: acknowledgeBillingRisk then S6→S7 succeeds", async () => {
  const ackPool = makePool((sql, p) => {
    if (sql.includes("update cases") && sql.includes("billing_risk"))
      return ok([
        makeCaseRow({
          status: "S6",
          billing_risk_acknowledged_by: USER_ID,
          billing_risk_acknowledged_at: "2026-04-20T00:00:00.000Z",
          billing_risk_ack_reason_code: "client_request",
          billing_unpaid_amount_cached: "80000",
        }),
      ]);
    if (sql.includes("from cases") && p?.[0] === CASE_ID)
      return ok([
        makeCaseRow({
          status: "S6",
          billing_unpaid_amount_cached: "80000",
          billing_risk_acknowledged_at: null,
        }),
      ]);
    return ok();
  });

  const ackedCase = await svc(ackPool, makeTemplates()).acknowledgeBillingRisk(
    makeCtx(),
    CASE_ID,
    { reasonCode: "client_request" },
  );
  assert.equal(ackedCase.billingRiskAckReasonCode, "client_request");
  assert.ok(ackedCase.billingRiskAcknowledgedAt);

  const transitionPool2 = makePool((sql, p) => {
    if (sql.includes("update cases") && sql.includes("stage = $2"))
      return ok([makeCaseRow({ status: "S7" })]);
    if (sql.includes("from cases") && p?.[0] === CASE_ID)
      return ok([
        makeCaseRow({
          status: "S6",
          billing_unpaid_amount_cached: "80000",
          billing_risk_acknowledged_at: "2026-04-20T00:00:00.000Z",
        }),
      ]);
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

  const transitioned = await svc(transitionPool2, makeTemplates()).transition(
    makeCtx(),
    CASE_ID,
    { toStatus: "S7" },
  );
  assert.equal(transitioned.stage, "S7");
});

// ── Billing risk ack: timeline records all provided fields ──

void test("acknowledgeBillingRisk: timeline captures all input fields", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];
  const pool = makePool((sql, p) => {
    calls.push({ sql: sql.trim(), params: p });
    if (sql.includes("update cases") && sql.includes("billing_risk"))
      return ok([
        makeCaseRow({
          billing_risk_acknowledged_by: USER_ID,
          billing_risk_acknowledged_at: "2026-04-20T00:00:00.000Z",
          billing_risk_ack_reason_code: "manager_override",
          billing_risk_ack_reason_note: "VP approved",
          billing_risk_ack_evidence_url: "https://example.com/doc.pdf",
        }),
      ]);
    if (sql.includes("from cases") && p?.[0] === CASE_ID)
      return ok([makeCaseRow()]);
    return ok();
  });

  await svc(pool, makeTemplates()).acknowledgeBillingRisk(makeCtx(), CASE_ID, {
    reasonCode: "manager_override",
    reasonNote: "VP approved",
    evidenceUrl: "https://example.com/doc.pdf",
  });

  const timelineCall = calls.find((c) =>
    c.sql.includes("insert into timeline_logs"),
  );
  assert.ok(timelineCall);
  const payload = JSON.parse(timelineCall.params?.[5] as string) as Record<
    string,
    unknown
  >;
  assert.equal(payload.reasonCode, "manager_override");
  assert.equal(payload.reasonNote, "VP approved");
  assert.equal(payload.evidenceUrl, "https://example.com/doc.pdf");
});

// ── Billing risk ack: optional fields default to null ──

void test("acknowledgeBillingRisk: optional fields absent → null in SQL", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];
  const pool = makePool((sql, p) => {
    calls.push({ sql: sql.trim(), params: p });
    if (sql.includes("update cases") && sql.includes("billing_risk"))
      return ok([
        makeCaseRow({
          billing_risk_acknowledged_by: USER_ID,
          billing_risk_acknowledged_at: "2026-04-20T00:00:00.000Z",
          billing_risk_ack_reason_code: "fast_track",
        }),
      ]);
    if (sql.includes("from cases") && p?.[0] === CASE_ID)
      return ok([makeCaseRow()]);
    return ok();
  });

  await svc(pool, makeTemplates()).acknowledgeBillingRisk(makeCtx(), CASE_ID, {
    reasonCode: "fast_track",
  });

  const updateCall = calls.find(
    (c) => c.sql.includes("update cases") && c.sql.includes("billing_risk"),
  );
  assert.ok(updateCall);
  assert.ok(updateCall.params);
  assert.equal(updateCall.params[3], null);
  assert.equal(updateCall.params[4], null);
});

// ── Stage history: every gate-guarded transition records history ──

void test("transition: S3→S4 records stage history", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];
  const pool = makePool((sql, p) => {
    calls.push({ sql: sql.trim(), params: p });
    if (sql.includes("update cases") && sql.includes("stage = $2"))
      return ok([makeCaseRow({ status: "S4" })]);
    if (sql.includes("from cases") && p?.[0] === CASE_ID)
      return ok([makeCaseRow({ status: "S3" })]);
    if (sql.includes("from case_parties") && sql.includes("is_primary"))
      return ok([{ id: "cp-1" }]);
    return ok();
  });

  await svc(pool, makeTemplates()).transition(makeCtx(), CASE_ID, {
    toStatus: "S4",
  });

  const history = calls.find((c) =>
    c.sql.includes("insert into case_stage_history"),
  );
  assert.ok(history);
  assert.ok(history.params);
  assert.equal(history.params[2], "S3");
  assert.equal(history.params[3], "S4");
});

void test("transition: S6→S7 records stage history after gate passes", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];
  const pool = makePool((sql, p) => {
    calls.push({ sql: sql.trim(), params: p });
    if (sql.includes("update cases") && sql.includes("stage = $2"))
      return ok([makeCaseRow({ status: "S7" })]);
    if (sql.includes("from cases") && p?.[0] === CASE_ID)
      return ok([makeCaseRow({ status: "S6" })]);
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

  await svc(pool, makeTemplates()).transition(makeCtx(), CASE_ID, {
    toStatus: "S7",
  });

  const history = calls.find((c) =>
    c.sql.includes("insert into case_stage_history"),
  );
  assert.ok(history);
  assert.ok(history.params);
  assert.equal(history.params[2], "S6");
  assert.equal(history.params[3], "S7");
});

// ── read model contract: mapCaseListSummaryRow ──

void test("mapCaseListSummaryRow maps joined names onto Case", () => {
  const row = {
    ...makeCaseRow({ case_name: "Test Case" }),
    customer_name: "Alice",
    group_name: "Tokyo Group",
    owner_display_name: "Suzuki",
    assistant_display_name: "Tanaka",
  };
  const dto = mapCaseListSummaryRow(row as never);
  assert.equal(dto.id, CASE_ID);
  assert.equal(dto.customerName, "Alice");
  assert.equal(dto.groupName, "Tokyo Group");
  assert.equal(dto.ownerDisplayName, "Suzuki");
  assert.equal(dto.assistantDisplayName, "Tanaka");
  assert.equal(dto.caseName, "Test Case");
  assert.equal(dto.stage, "S1");
});

void test("mapCaseListSummaryRow handles null joined names", () => {
  const row = {
    ...makeCaseRow(),
    customer_name: null,
    group_name: null,
    owner_display_name: null,
    assistant_display_name: null,
  };
  const dto = mapCaseListSummaryRow(row as never);
  assert.equal(dto.customerName, "");
  assert.equal(dto.groupName, null);
  assert.equal(dto.ownerDisplayName, "");
  assert.equal(dto.assistantDisplayName, null);
});

// ── read model contract: mapDetailCountsRow ──

void test("mapDetailCountsRow maps string counts to numbers", () => {
  const counts = mapDetailCountsRow({
    document_items_total: "16",
    document_items_done: "10",
    questionnaire_items_total: "2",
    questionnaire_items_done: "1",
    case_parties: "3",
    tasks: "5",
    tasks_pending: "2",
    communication_logs: "8",
    submission_packages: "1",
    generated_documents: "4",
    validation_runs: "2",
    review_records: "1",
    billing_records: "3",
    payment_records: "2",
  });
  assert.equal(counts.documentItemsTotal, 16);
  assert.equal(counts.documentItemsDone, 10);
  assert.equal(counts.questionnaireItemsTotal, 2);
  assert.equal(counts.questionnaireItemsDone, 1);
  assert.equal(counts.caseParties, 3);
  assert.equal(counts.tasks, 5);
  assert.equal(counts.tasksPending, 2);
  assert.equal(counts.communicationLogs, 8);
  assert.equal(counts.submissionPackages, 1);
  assert.equal(counts.generatedDocuments, 4);
  assert.equal(counts.validationRuns, 2);
  assert.equal(counts.reviewRecords, 1);
  assert.equal(counts.billingRecords, 3);
  assert.equal(counts.paymentRecords, 2);
});

void test("mapDetailCountsRow returns zeros for undefined row", () => {
  const counts = mapDetailCountsRow(undefined);
  assert.equal(counts.documentItemsTotal, 0);
  assert.equal(counts.documentItemsDone, 0);
  assert.equal(counts.questionnaireItemsTotal, 0);
  assert.equal(counts.questionnaireItemsDone, 0);
  assert.equal(counts.caseParties, 0);
  assert.equal(counts.tasks, 0);
  assert.equal(counts.tasksPending, 0);
  assert.equal(counts.communicationLogs, 0);
  assert.equal(counts.submissionPackages, 0);
  assert.equal(counts.generatedDocuments, 0);
  assert.equal(counts.validationRuns, 0);
  assert.equal(counts.reviewRecords, 0);
  assert.equal(counts.billingRecords, 0);
  assert.equal(counts.paymentRecords, 0);
});

// ── read model contract: mapLatestValidationRow ──

void test("mapLatestValidationRow maps validation run summary", () => {
  const result = mapLatestValidationRow({
    id: "vr-1",
    result_status: "failed",
    executed_at: "2026-04-20T10:00:00.000Z",
    blocking_count: 2,
    warning_count: 3,
  });
  assert.ok(result);
  assert.equal(result.id, "vr-1");
  assert.equal(result.status, "failed");
  assert.equal(result.executedAt, "2026-04-20T10:00:00.000Z");
  assert.equal(result.blockingCount, 2);
  assert.equal(result.warningCount, 3);
});

void test("mapLatestValidationRow returns null for undefined row", () => {
  assert.equal(mapLatestValidationRow(undefined), null);
});

void test("mapLatestValidationRow handles string counts", () => {
  const result = mapLatestValidationRow({
    id: "vr-2",
    result_status: "passed",
    executed_at: "2026-04-21T10:00:00.000Z",
    blocking_count: "0",
    warning_count: "1",
  });
  assert.ok(result);
  assert.equal(result.blockingCount, 0);
  assert.equal(result.warningCount, 1);
});

// ── read model contract: mapLatestSubmissionRow ──

void test("mapLatestSubmissionRow maps submission package summary", () => {
  const result = mapLatestSubmissionRow({
    id: "sp-1",
    submission_no: 2,
    submission_kind: "supplement",
    submitted_at: "2026-04-20T10:00:00.000Z",
    related_submission_id: "sp-0",
  });
  assert.ok(result);
  assert.equal(result.id, "sp-1");
  assert.equal(result.submissionNo, 2);
  assert.equal(result.submissionKind, "supplement");
  assert.equal(result.submittedAt, "2026-04-20T10:00:00.000Z");
  assert.equal(result.relatedSubmissionId, "sp-0");
});

void test("mapLatestSubmissionRow returns null for undefined", () => {
  assert.equal(mapLatestSubmissionRow(undefined), null);
});

void test("mapLatestSubmissionRow handles string submission_no", () => {
  const result = mapLatestSubmissionRow({
    id: "sp-2",
    submission_no: "3",
    submission_kind: "initial",
    submitted_at: "2026-04-21T10:00:00.000Z",
    related_submission_id: null,
  });
  assert.ok(result);
  assert.equal(result.submissionNo, 3);
  assert.equal(result.relatedSubmissionId, null);
});

// ── read model contract: mapLatestReviewRow ──

void test("mapLatestReviewRow maps review record summary", () => {
  const result = mapLatestReviewRow({
    id: "rr-1",
    decision: "approved",
    reviewed_at: "2026-04-20T14:00:00.000Z",
    reviewer_user_id: "user-5",
    reviewer_display_name: "Reviewer A",
  });
  assert.ok(result);
  assert.equal(result.id, "rr-1");
  assert.equal(result.decision, "approved");
  assert.equal(result.reviewedAt, "2026-04-20T14:00:00.000Z");
  assert.equal(result.reviewerUserId, "user-5");
  assert.equal(result.reviewerDisplayName, "Reviewer A");
});

void test("mapLatestReviewRow returns null for undefined", () => {
  assert.equal(mapLatestReviewRow(undefined), null);
});

void test("mapLatestReviewRow handles null reviewer fields", () => {
  const result = mapLatestReviewRow({
    id: "rr-2",
    decision: "rejected",
    reviewed_at: "2026-04-21T14:00:00.000Z",
    reviewer_user_id: null,
    reviewer_display_name: null,
  });
  assert.ok(result);
  assert.equal(result.reviewerUserId, null);
  assert.equal(result.reviewerDisplayName, null);
});

// ── read model contract: mapDocProgressByProviderRows ──

void test("mapDocProgressByProviderRows maps provider progress", () => {
  const result = mapDocProgressByProviderRows([
    { provider_role: "applicant", total: "5", done: "3" },
    { provider_role: "supporter", total: "3", done: "2" },
    { provider_role: "internal", total: "2", done: "1" },
  ]);
  assert.equal(result.length, 3);
  assert.equal(result[0]?.providerRole, "applicant");
  assert.equal(result[0]?.total, 5);
  assert.equal(result[0]?.done, 3);
  assert.equal(result[2]?.providerRole, "internal");
});

void test("mapDocProgressByProviderRows returns empty for empty input", () => {
  assert.deepEqual(mapDocProgressByProviderRows([]), []);
});

// ── read model contract: listSummary ──

void test("listSummary returns CaseListResultDto with joined names", async () => {
  const summaryRow = {
    ...makeCaseRow(),
    customer_name: "Alice",
    group_name: "Tokyo-1",
    owner_display_name: "Suzuki",
    assistant_display_name: null,
  };
  const pool = makePool((sql) => {
    if (sql.includes("count(*)")) return ok([{ count: "1" }]);
    if (sql.includes("customer_name")) return ok([summaryRow]);
    return ok();
  });

  const result = await svc(pool, makeTemplates()).listSummary(makeCtx());
  assert.equal(result.total, 1);
  assert.equal(result.page, 1);
  assert.equal(result.limit, 50);
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0]?.customerName, "Alice");
  assert.equal(result.items[0]?.groupName, "Tokyo-1");
  assert.equal(result.items[0]?.ownerDisplayName, "Suzuki");
  assert.equal(result.items[0]?.assistantDisplayName, null);
});

void test("listSummary respects page and limit", async () => {
  let capturedParams: unknown[] | undefined;
  const pool = makePool((sql, params) => {
    if (sql.includes("count(*)")) return ok([{ count: "100" }]);
    if (sql.includes("customer_name")) {
      capturedParams = params;
      return ok([]);
    }
    return ok();
  });

  const result = await svc(pool, makeTemplates()).listSummary(makeCtx(), {
    page: 3,
    limit: 10,
  });
  assert.equal(result.total, 100);
  assert.equal(result.page, 3);
  assert.equal(result.limit, 10);
  assert.ok(capturedParams);
  assert.equal(capturedParams[capturedParams.length - 2], 10);
  assert.equal(capturedParams[capturedParams.length - 1], 20);
});

void test("listSummary: admin scope=group adds prefixed group filter", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];
  const pool = makePool((sql, params) => {
    calls.push({ sql: sql.trim(), params });
    if (sql.includes("count(*)")) return ok([{ count: "0" }]);
    return ok([]);
  });

  const result = await svc(pool, makeTemplates()).listSummary(
    makeCtx("manager"),
    {
      scope: "group",
      visibility: { userId: USER_ID, roleTier: "admin", groupId: "grp-1" },
    },
  );

  assert.equal(result.total, 0);
  const countCall = calls.find((call) => call.sql.includes("count(*)"));
  assert.ok(countCall);
  assert.ok(countCall.sql.includes("cs.group_id = $"));
  assert.equal(countCall.params?.[0], "grp-1");
  const dataCall = calls.find((call) => call.sql.includes("customer_name"));
  assert.ok(dataCall);
  assert.ok(dataCall.sql.includes("cs.group_id = $"));
});

void test("listSummary: invalid customerId filter returns empty without uuid error", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];
  const pool = makePool((sql, params) => {
    calls.push({ sql, params });
    if (sql.includes("count(*)")) return ok([{ count: "0" }]);
    return ok([]);
  });

  const result = await svc(pool, makeTemplates()).listSummary(makeCtx(), {
    customerId: "cust-001",
  });

  assert.equal(result.total, 0);
  assert.equal(result.items.length, 0);
  const countCall = calls.find((call) => call.sql.includes("count(*)"));
  assert.ok(countCall);
  assert.ok(countCall.sql.includes("where 1 = 0"));
  const dataCall = calls.find((call) => call.sql.includes("customer_name"));
  assert.ok(dataCall);
  assert.ok(dataCall.sql.includes("where 1 = 0"));
});

void test("listSummary: invalid groupId filter returns empty without uuid error", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];
  const pool = makePool((sql, params) => {
    calls.push({ sql, params });
    if (sql.includes("count(*)")) return ok([{ count: "0" }]);
    return ok([]);
  });

  const result = await svc(pool, makeTemplates()).listSummary(makeCtx(), {
    groupId: "grp-filter",
  });

  assert.equal(result.total, 0);
  assert.equal(result.items.length, 0);
  const countCall = calls.find((call) => call.sql.includes("count(*)"));
  assert.ok(countCall);
  assert.ok(countCall.sql.includes("where 1 = 0"));
  const dataCall = calls.find((call) => call.sql.includes("customer_name"));
  assert.ok(dataCall);
  assert.ok(dataCall.sql.includes("where 1 = 0"));
});

// ── read model contract: getDetailAggregate ──

void test("getDetailAggregate returns null for missing case", async () => {
  const pool = makePool((sql) => {
    if (sql.includes("customer_name")) return ok([]);
    return ok();
  });

  const result = await svc(pool, makeTemplates()).getDetailAggregate(
    makeCtx(),
    "missing-id",
  );
  assert.equal(result, null);
});

void test("getDetailAggregate returns full aggregate DTO", async () => {
  const summaryRow = {
    ...makeCaseRow({
      quote_price: "150000",
      billing_unpaid_amount_cached: "50000",
    }),
    customer_name: "Bob",
    group_name: "Osaka Group",
    owner_display_name: "Tanaka",
    assistant_display_name: "Li",
  };
  const countsRow = {
    document_items_total: "16",
    document_items_done: "10",
    case_parties: "3",
    tasks: "5",
    tasks_pending: "2",
    communication_logs: "8",
    submission_packages: "1",
    generated_documents: "4",
    validation_runs: "2",
    review_records: "1",
    billing_records: "3",
    payment_records: "2",
  };
  const validationRow = {
    id: "vr-1",
    result_status: "passed",
    executed_at: "2026-04-20T10:00:00.000Z",
    blocking_count: 0,
    warning_count: 1,
  };
  const submissionRow = {
    id: "sp-1",
    submission_no: 1,
    submission_kind: "initial",
    submitted_at: "2026-04-19T10:00:00.000Z",
    related_submission_id: null,
  };
  const reviewRow = {
    id: "rr-1",
    decision: "approved",
    reviewed_at: "2026-04-20T14:00:00.000Z",
    reviewer_user_id: "user-5",
    reviewer_display_name: "Reviewer A",
  };
  const docProgressRows = [
    { provider_role: "applicant", total: "10", done: "6" },
    { provider_role: "internal", total: "6", done: "4" },
  ];

  const pool = makePool((sql) => {
    if (sql.includes("customer_name")) return ok([summaryRow]);
    if (sql.includes("document_items_total")) return ok([countsRow]);
    if (sql.includes("result_status") && sql.includes("validation_runs"))
      return ok([validationRow]);
    if (sql.includes("submission_packages") && sql.includes("submission_kind"))
      return ok([submissionRow]);
    if (sql.includes("review_records") && sql.includes("decision"))
      return ok([reviewRow]);
    if (sql.includes("provided_by_role") && sql.includes("group by"))
      return ok(docProgressRows);
    return ok();
  });

  const result = await svc(pool, makeTemplates()).getDetailAggregate(
    makeCtx(),
    CASE_ID,
  );
  assert.ok(result);
  assert.equal(result.case.id, CASE_ID);
  assert.equal(result.deepLink.customerName, "Bob");
  assert.equal(result.deepLink.groupName, "Osaka Group");
  assert.equal(result.deepLink.ownerDisplayName, "Tanaka");
  assert.equal(result.deepLink.assistantDisplayName, "Li");
  assert.equal(result.deepLink.customerId, result.case.customerId);
  assert.equal(result.counts.documentItemsTotal, 16);
  assert.equal(result.counts.documentItemsDone, 10);
  assert.equal(result.counts.caseParties, 3);
  assert.equal(result.counts.tasksPending, 2);
  assert.equal(result.counts.generatedDocuments, 4);
  assert.equal(result.counts.billingRecords, 3);
  assert.ok(result.latestValidation);
  assert.equal(result.latestValidation.status, "passed");
  assert.equal(result.latestValidation.warningCount, 1);
  assert.ok(result.latestSubmission);
  assert.equal(result.latestSubmission.submissionKind, "initial");
  assert.ok(result.latestReview);
  assert.equal(result.latestReview.decision, "approved");
  assert.equal(result.documentProgressByProvider.length, 2);
  assert.equal(result.documentProgressByProvider[0]?.providerRole, "applicant");
  assert.equal(result.billing.quotePrice, 150000);
  assert.equal(result.billing.unpaidAmount, 50000);
  assert.equal(result.billing.billingRiskAcknowledged, false);
});

void test("getDetailAggregate handles no validation/submission/review", async () => {
  const summaryRow = {
    ...makeCaseRow(),
    customer_name: "Charlie",
    group_name: null,
    owner_display_name: "Admin",
    assistant_display_name: null,
  };
  const countsRow = {
    document_items_total: "0",
    document_items_done: "0",
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

  const pool = makePool((sql) => {
    if (sql.includes("customer_name")) return ok([summaryRow]);
    if (sql.includes("document_items_total")) return ok([countsRow]);
    return ok([]);
  });

  const result = await svc(pool, makeTemplates()).getDetailAggregate(
    makeCtx(),
    CASE_ID,
  );
  assert.ok(result);
  assert.equal(result.latestValidation, null);
  assert.equal(result.latestSubmission, null);
  assert.equal(result.latestReview, null);
  assert.deepEqual(result.documentProgressByProvider, []);
  assert.equal(result.counts.documentItemsTotal, 0);
  assert.equal(result.deepLink.customerName, "Charlie");
  assert.equal(result.deepLink.groupName, null);
});

// ── BUG-064: getDetailAggregate resilience (Promise.allSettled) ──

void test("getDetailAggregate returns partial data when counts sub-query throws", async () => {
  const summaryRow = {
    ...makeCaseRow(),
    customer_name: "Alice",
    group_name: null,
    owner_display_name: "Owner",
    assistant_display_name: null,
  };

  const stderr: string[] = [];
  const origError = console.error;
  console.error = (msg: string) => stderr.push(msg);

  try {
    const pool = makePool((sql) => {
      if (sql.includes("customer_name")) return ok([summaryRow]);
      if (sql.includes("document_items_total"))
        return Promise.reject(new Error("counts query timeout"));
      return ok([]);
    });

    const result = await svc(pool, makeTemplates()).getDetailAggregate(
      makeCtx(),
      CASE_ID,
    );
    assert.ok(result);
    assert.equal(result.case.id, CASE_ID);
    assert.equal(result.counts.documentItemsTotal, 0);
    assert.equal(result.counts.tasks, 0);
    assert.equal(result.latestValidation, null);
    assert.equal(result.deepLink.customerName, "Alice");
    assert.ok(stderr.some((m) => m.includes("counts") && m.includes("failed")));
  } finally {
    console.error = origError;
  }
});

void test("getDetailAggregate returns partial data when latestValidation sub-query throws", async () => {
  const summaryRow = {
    ...makeCaseRow(),
    customer_name: "Bob",
    group_name: null,
    owner_display_name: "Staff",
    assistant_display_name: null,
  };
  const countsRow = {
    document_items_total: "5",
    document_items_done: "3",
    questionnaire_items_total: "0",
    questionnaire_items_done: "0",
    case_parties: "1",
    tasks: "2",
    tasks_pending: "1",
    communication_logs: "0",
    submission_packages: "0",
    generated_documents: "0",
    validation_runs: "0",
    review_records: "0",
    billing_records: "0",
    payment_records: "0",
  };

  const stderr: string[] = [];
  const origError = console.error;
  console.error = (msg: string) => stderr.push(msg);

  try {
    const pool = makePool((sql) => {
      if (sql.includes("customer_name")) return ok([summaryRow]);
      if (sql.includes("document_items_total")) return ok([countsRow]);
      if (sql.includes("result_status") && sql.includes("validation_runs"))
        return Promise.reject(new Error("validation query failed"));
      return ok([]);
    });

    const result = await svc(pool, makeTemplates()).getDetailAggregate(
      makeCtx(),
      CASE_ID,
    );
    assert.ok(result);
    assert.equal(result.counts.documentItemsTotal, 5);
    assert.equal(result.counts.tasks, 2);
    assert.equal(result.latestValidation, null);
    assert.equal(result.latestSubmission, null);
    assert.ok(
      stderr.some(
        (m) => m.includes("latestValidation") && m.includes("failed"),
      ),
    );
  } finally {
    console.error = origError;
  }
});

void test("getDetailAggregate returns partial data when docProgress sub-query throws", async () => {
  const summaryRow = {
    ...makeCaseRow(),
    customer_name: "Charlie",
    group_name: null,
    owner_display_name: "Admin",
    assistant_display_name: null,
  };
  const countsRow = {
    document_items_total: "3",
    document_items_done: "1",
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

  const stderr: string[] = [];
  const origError = console.error;
  console.error = (msg: string) => stderr.push(msg);

  try {
    const pool = makePool((sql) => {
      if (sql.includes("customer_name")) return ok([summaryRow]);
      if (sql.includes("document_items_total")) return ok([countsRow]);
      if (sql.includes("provided_by_role") && sql.includes("group by"))
        return Promise.reject(new Error("docProgress exploded"));
      return ok([]);
    });

    const result = await svc(pool, makeTemplates()).getDetailAggregate(
      makeCtx(),
      CASE_ID,
    );
    assert.ok(result);
    assert.equal(result.counts.documentItemsTotal, 3);
    assert.deepEqual(result.documentProgressByProvider, []);
    assert.ok(
      stderr.some((m) => m.includes("docProgress") && m.includes("failed")),
    );
  } finally {
    console.error = origError;
  }
});

void test("getDetailAggregate returns partial data when all sub-queries throw", async () => {
  const summaryRow = {
    ...makeCaseRow(),
    customer_name: "Dan",
    group_name: null,
    owner_display_name: "Owner",
    assistant_display_name: null,
  };

  const stderr: string[] = [];
  const origError = console.error;
  console.error = (msg: string) => stderr.push(msg);

  try {
    const pool = makePool((sql) => {
      if (sql.includes("customer_name")) return ok([summaryRow]);
      return Promise.reject(new Error("database down"));
    });

    const result = await svc(pool, makeTemplates()).getDetailAggregate(
      makeCtx(),
      CASE_ID,
    );
    assert.ok(result);
    assert.equal(result.case.id, CASE_ID);
    assert.equal(result.counts.documentItemsTotal, 0);
    assert.equal(result.counts.tasks, 0);
    assert.equal(result.latestValidation, null);
    assert.equal(result.latestSubmission, null);
    assert.equal(result.latestReview, null);
    assert.deepEqual(result.documentProgressByProvider, []);
    assert.equal(result.currentResidencePeriod, null);
    assert.equal(result.deepLink.customerName, "Dan");
    assert.ok(
      stderr.length >= 6,
      `expected >= 6 error logs, got ${String(stderr.length)}`,
    );
  } finally {
    console.error = origError;
  }
});

// ---------------------------------------------------------------------------
// §p0-sv-008: S9 write guard — service level
// ---------------------------------------------------------------------------

void test("update rejects when case is S9 (archived)", async () => {
  const pool = makePool((sql) => {
    if (sql.includes("select") && sql.includes("from cases"))
      return ok([makeCaseRow({ stage: "S9", status: "S9" })]);
    return ok();
  });

  const service = svc(pool, makeTemplates());
  await assert.rejects(
    () => service.update(makeCtx(), CASE_ID, { caseName: "test" }),
    (e: unknown) => {
      assert.ok(e instanceof Error);
      assert.ok(e.message.includes("CASE_S9_READONLY"));
      return true;
    },
  );
});

void test("transition rejects when case is S9 (archived)", async () => {
  const pool = makePool((sql) => {
    if (sql.includes("select") && sql.includes("from cases"))
      return ok([makeCaseRow({ stage: "S9", status: "S9" })]);
    return ok();
  });

  const service = svc(pool, makeTemplates());
  await assert.rejects(
    () => service.transition(makeCtx(), CASE_ID, { toStage: "S8" }),
    (e: unknown) => {
      assert.ok(e instanceof Error);
      assert.ok(e.message.includes("CASE_S9_READONLY"));
      return true;
    },
  );
});

void test("acknowledgeBillingRisk rejects when case is S9 (archived)", async () => {
  const pool = makePool((sql) => {
    if (sql.includes("select") && sql.includes("from cases"))
      return ok([makeCaseRow({ stage: "S9", status: "S9" })]);
    return ok();
  });

  const service = svc(pool, makeTemplates());
  await assert.rejects(
    () =>
      service.acknowledgeBillingRisk(makeCtx(), CASE_ID, {
        reasonCode: "test",
      }),
    (e: unknown) => {
      assert.ok(e instanceof Error);
      assert.ok(e.message.includes("CASE_S9_READONLY"));
      return true;
    },
  );
});

void test("updatePostApprovalStage rejects when case is S9 (archived)", async () => {
  const pool = makePool((sql) => {
    if (sql.includes("select") && sql.includes("from cases"))
      return ok([makeCaseRow({ stage: "S9", status: "S9" })]);
    return ok();
  });

  const service = svc(pool, makeTemplates());
  await assert.rejects(
    () =>
      service.updatePostApprovalStage(makeCtx(), CASE_ID, {
        stage: "coe_sent",
      }),
    (e: unknown) => {
      assert.ok(e instanceof Error);
      assert.ok(e.message.includes("CASE_S9_READONLY"));
      return true;
    },
  );
});

// ---------------------------------------------------------------------------
// §p0-sv-008: group transfer — requires reason
// ---------------------------------------------------------------------------

void test("update rejects group change without groupTransferReason", async () => {
  const pool = makePool((sql) => {
    if (sql.includes("select") && sql.includes("from cases"))
      return ok([makeCaseRow({ group_id: "old-group" })]);
    return ok();
  });

  const service = svc(pool, makeTemplates());
  await assert.rejects(
    () =>
      service.update(makeCtx(), CASE_ID, {
        groupId: "new-group",
      }),
    (e: unknown) => {
      assert.ok(e instanceof Error);
      assert.ok(e.message.includes("GROUP_TRANSFER_REASON_REQUIRED"));
      return true;
    },
  );
});

void test("update accepts group change with groupTransferReason", async () => {
  const calls: string[] = [];
  const pool = makePool((sql) => {
    calls.push(sql.trim().substring(0, 40));
    if (sql.includes("select") && sql.includes("from cases"))
      return ok([makeCaseRow({ group_id: "old-group" })]);
    if (sql.includes("update cases"))
      return ok([makeCaseRow({ group_id: "new-group" })]);
    return ok();
  });

  const service = svc(pool, makeTemplates());
  const result = await service.update(makeCtx(), CASE_ID, {
    groupId: "new-group",
    groupTransferReason: "client reassigned",
  });
  assert.ok(result);
  const groupTransferTimeline = calls.filter((c) =>
    c.includes("insert into timeline"),
  );
  assert.ok(groupTransferTimeline.length >= 2);
});

// ---------------------------------------------------------------------------
// §p0-sv-008: cross-group create — requires reason
// ---------------------------------------------------------------------------

void test("create rejects cross-group without crossGroupReason", async () => {
  const pool = makePool((sql, params) => {
    if (
      sql.includes("select id from customers") ||
      sql.includes("select id from users")
    )
      return ok([{ id: params?.[0] }]);
    if (sql.includes("FROM customers c") && sql.includes("JOIN groups g"))
      return ok([{ group_id: "customer-group" }]);
    return ok();
  });

  const service = svc(pool, makeTemplates());
  await assert.rejects(
    () =>
      service.create(makeCtx(), {
        ...CREATE_INPUT,
        groupId: "different-group",
      }),
    (e: unknown) => {
      assert.ok(e instanceof Error);
      assert.ok(e.message.includes("CROSS_GROUP_REASON_REQUIRED"));
      return true;
    },
  );
});

void test("create with cross-group and reason writes audit timeline", async () => {
  const calls: { sql: string }[] = [];
  const pool = makePool((sql, params) => {
    calls.push({ sql: sql.trim() });
    if (
      sql.includes("select id from customers") ||
      sql.includes("select id from users")
    )
      return ok([{ id: params?.[0] }]);
    if (sql.includes("FROM customers c") && sql.includes("JOIN groups g"))
      return ok([{ group_id: "customer-group" }]);
    if (sql.includes("select settings from organizations"))
      return ok([{ settings: {} }]);
    if (sql.includes("select count(*)")) return ok([{ count: "0" }]);
    if (sql.includes("insert into cases"))
      return ok([makeCaseRow({ group_id: "different-group" })]);
    return ok();
  });

  const service = svc(pool, makeTemplates());
  const result = await service.create(makeCtx(), {
    ...CREATE_INPUT,
    groupId: "different-group",
    crossGroupReason: "special arrangement",
  });
  assert.ok(result);
  const timelineCalls = calls.filter((c) =>
    c.sql.includes("insert into timeline"),
  );
  assert.ok(
    timelineCalls.length >= 2,
    "should have both case.created and case.cross_group_created timelines",
  );
});
