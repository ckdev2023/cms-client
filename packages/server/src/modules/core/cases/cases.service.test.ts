/* eslint-disable max-lines */
import { test } from "node:test";
import assert from "node:assert/strict";
import { type Pool } from "pg";

import { CasesService } from "./cases.service";
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
  return {
    id: CASE_ID,
    org_id: ORG_ID,
    customer_id: "cust-1",
    case_type_code: "visa",
    status: "S1",
    stage: null,
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
  assert.equal(
    calls.filter((c) => c.sql.includes("insert into timeline_logs")).length,
    1,
  );
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
      return ok([makeCaseRow({ case_no: params?.[7] })]);
    }
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
  assert.equal(insertCall?.params?.[7], `TOKYO-${yyyymm}-0013`);
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
    status: "open",
    ownerUserId: USER_ID,
    customerId: "cust-1",
  });
  const cq = calls.find((c) => c.sql.includes("count(*)"));
  assert.ok(cq);
  assert.ok(cq.sql.includes("status = $"));
  assert.ok(cq.sql.includes("owner_user_id = $"));
});

void test("list: handles empty result", async () => {
  const pool = makePool(() => ok());
  const r = await svc(pool, makeTemplates()).list(makeCtx("viewer"));
  assert.equal(r.total, 0);
  assert.equal(r.items.length, 0);
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
  assert.equal(updateCall?.params?.[5], currentCaseNo);
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
    if (sql.includes("update cases") && sql.includes("status = $"))
      return ok([makeCaseRow({ status: returnStatus })]);
    if (sql.includes("from cases") && p?.[0] === CASE_ID)
      return ok([makeCaseRow({ status: fromStatus })]);
    if (sql.includes("from case_parties")) {
      return ok([{ id: "cp-1" }]);
    }
    if (
      sql.includes("from document_items") &&
      sql.includes("required_flag = true")
    ) {
      return ok([]);
    }
    if (sql.includes("from validation_runs")) {
      return ok([{ id: "vr-1", result_status: "passed" }]);
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
    if (sql.includes("update cases") && sql.includes("status = $"))
      return ok([makeCaseRow({ status: "S2" })]);
    if (sql.includes("from cases") && p?.[0] === CASE_ID)
      return ok([makeCaseRow({ status: "S1" })]);
    return ok();
  });
  const r = await svc(pool, makeTemplates()).transition(makeCtx(), CASE_ID, {
    toStatus: "S2",
  });
  assert.equal(r.status, "S2");
  assert.equal(
    calls.filter((c) => c.sql.includes("insert into timeline_logs")).length,
    1,
  );
});

void test("transition: optimistic lock params [id, toStatus, fromStatus]", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];
  const pool = makePool((sql, p) => {
    calls.push({ sql: sql.trim(), params: p });
    if (sql.includes("update cases") && sql.includes("status = $"))
      return ok([makeCaseRow({ status: "S2" })]);
    if (sql.includes("from cases") && p?.[0] === CASE_ID)
      return ok([makeCaseRow({ status: "S1" })]);
    return ok();
  });
  await svc(pool, makeTemplates()).transition(makeCtx(), CASE_ID, {
    toStatus: "S2",
  });
  const u = calls.find(
    (c) => c.sql.includes("update cases") && c.sql.includes("status = $"),
  );
  assert.ok(u);
  assert.ok(u.params);
  assert.equal(u.params[0], CASE_ID);
  assert.equal(u.params[1], "S2");
  assert.equal(u.params[2], "S1");
});

void test("transition: concurrent conflict rejected", async () => {
  const pool = makePool((sql, p) => {
    if (sql.includes("update cases") && sql.includes("status = $"))
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
    const r = await svc(transitionPool(to, from), makeTemplates()).transition(
      makeCtx(),
      CASE_ID,
      { toStatus: to },
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

// S9 is terminal — cannot transition to anything
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
      assert.ok(e.message.includes("not allowed"));
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

void test("transition: S4→S5 requires a validation run", async () => {
  const pool = makePool((sql, p) => {
    if (sql.includes("from cases") && p?.[0] === CASE_ID) {
      return ok([makeCaseRow({ status: "S4" })]);
    }
    if (
      sql.includes("from document_items") &&
      sql.includes("required_flag = true")
    ) {
      return ok([]);
    }
    if (sql.includes("from validation_runs")) {
      return ok([]);
    }
    return ok();
  });

  await assert.rejects(
    () =>
      svc(pool, makeTemplates()).transition(makeCtx(), CASE_ID, {
        toStatus: "S5",
      }),
    /requires a validation run/,
  );
});

void test("transition: S5→S6 requires latest passed validation run instead of Gate-B", async () => {
  const calls: string[] = [];
  const pool = makePool((sql, p) => {
    calls.push(sql.trim());
    if (sql.includes("from cases") && p?.[0] === CASE_ID) {
      return ok([makeCaseRow({ status: "S5" })]);
    }
    if (sql.includes("from validation_runs")) {
      return ok([{ id: "vr-1", result_status: "failed" }]);
    }
    return ok();
  });

  await assert.rejects(
    () =>
      svc(pool, makeTemplates()).transition(makeCtx(), CASE_ID, {
        toStatus: "S6",
      }),
    /latest validation run to be passed/,
  );
  assert.ok(calls.some((sql) => sql.includes("from validation_runs")));
  assert.ok(!calls.some((sql) => sql.includes("from generated_documents")));
});

void test("transition: S5→S6 requires approved review when review_required_flag is enabled", async () => {
  const pool = makePool((sql, p) => {
    if (sql.includes("from cases") && p?.[0] === CASE_ID) {
      return ok([makeCaseRow({ status: "S5" })]);
    }
    if (sql.includes("from validation_runs")) {
      return ok([{ id: "vr-1", result_status: "passed" }]);
    }
    if (sql.includes("from review_records")) {
      return ok([{ id: "rr-1", decision: "rejected" }]);
    }
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
    /approved latest review record/,
  );
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

void test("CASE_RESULT_OUTCOMES matches P0 spec", () => {
  assert.ok(CASE_RESULT_OUTCOMES.has("pending"));
  assert.ok(CASE_RESULT_OUTCOMES.has("approved"));
  assert.ok(CASE_RESULT_OUTCOMES.has("rejected"));
  assert.ok(CASE_RESULT_OUTCOMES.has("withdrawn"));
  assert.equal(CASE_RESULT_OUTCOMES.size, 4);
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
    /Current billing gate blocks COE sending/,
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
    if (sql.includes("update cases") && sql.includes("status = $"))
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
    if (sql.includes("update cases") && sql.includes("status = $"))
      return ok([makeCaseRow({ status: "S9" })]);
    if (sql.includes("from cases") && p?.[0] === CASE_ID)
      return ok([makeCaseRow({ status: "S7" })]);
    return ok();
  });
  await svc(pool, makeTemplates()).transition(makeCtx(), CASE_ID, {
    toStatus: "S9",
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
      if (sql.includes("update cases") && sql.includes("status = $"))
        return ok([makeCaseRow({ status: to })]);
      if (sql.includes("from cases") && p?.[0] === CASE_ID)
        return ok([makeCaseRow({ status: from })]);
      if (sql.includes("from case_parties")) {
        return ok([{ id: "cp-1" }]);
      }
      if (
        sql.includes("from document_items") &&
        sql.includes("required_flag = true")
      ) {
        return ok([]);
      }
      if (sql.includes("from validation_runs")) {
        return ok([{ id: "vr-1", result_status: "passed" }]);
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
  for (const target of ["S8", "S9"]) {
    const r = await svc(
      transitionPool(target, "S7"),
      makeTemplates(),
    ).transition(makeCtx(), CASE_ID, { toStatus: target });
    assert.equal(r.status, target);
  }
});

// ── Focused regression: result archival path ──

void test("transition: S8→S9 result archival path", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];
  const pool = makePool((sql, p) => {
    calls.push({ sql: sql.trim(), params: p });
    if (sql.includes("update cases") && sql.includes("status = $"))
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

// ── Focused regression: every stage can emergency-close to S9 ──

void test("transition: every non-terminal stage allows direct S9", async () => {
  for (const stage of ["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8"]) {
    const r = await svc(
      transitionPool("S9", stage),
      makeTemplates(),
    ).transition(makeCtx(), CASE_ID, { toStatus: "S9" });
    assert.equal(r.status, "S9", `${stage} → S9 should succeed`);
  }
});
