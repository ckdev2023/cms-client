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
    status: "open",
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
      resolve: () => Promise.resolve(r ?? { mode: "legacy", used: false }),
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
  assert.equal(c.status, "open");
  assert.equal(
    calls.filter((c) => c.sql.includes("insert into timeline_logs")).length,
    1,
  );
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
function transitionPool(returnStatus: string, fromStatus = "new_inquiry") {
  return makePool((sql, p) => {
    if (sql.includes("update cases") && sql.includes("status = $"))
      return ok([makeCaseRow({ status: returnStatus })]);
    if (sql.includes("from cases") && p?.[0] === CASE_ID)
      return ok([makeCaseRow({ status: fromStatus })]);
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
      return ok([makeCaseRow({ status: "following_up" })]);
    if (sql.includes("from cases") && p?.[0] === CASE_ID)
      return ok([makeCaseRow({ status: "new_inquiry" })]);
    return ok();
  });
  const r = await svc(pool, makeTemplates()).transition(makeCtx(), CASE_ID, {
    toStatus: "following_up",
  });
  assert.equal(r.status, "following_up");
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
      return ok([makeCaseRow({ status: "following_up" })]);
    if (sql.includes("from cases") && p?.[0] === CASE_ID)
      return ok([makeCaseRow({ status: "new_inquiry" })]);
    return ok();
  });
  await svc(pool, makeTemplates()).transition(makeCtx(), CASE_ID, {
    toStatus: "following_up",
  });
  const u = calls.find(
    (c) => c.sql.includes("update cases") && c.sql.includes("status = $"),
  );
  assert.ok(u);
  assert.ok(u.params);
  assert.equal(u.params[0], CASE_ID);
  assert.equal(u.params[1], "following_up");
  assert.equal(u.params[2], "new_inquiry");
});

void test("transition: concurrent conflict rejected", async () => {
  const pool = makePool((sql, p) => {
    if (sql.includes("update cases") && sql.includes("status = $"))
      return ok([]);
    if (sql.includes("from cases") && p?.[0] === CASE_ID)
      return ok([makeCaseRow({ status: "new_inquiry" })]);
    return ok();
  });
  await assert.rejects(
    () =>
      svc(pool, makeTemplates()).transition(makeCtx(), CASE_ID, {
        toStatus: "following_up",
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
    transitionPool("in_progress"),
    SF_TPL([{ from: "new_inquiry", to: "in_progress" }]),
  ).transition(makeCtx(), CASE_ID, { toStatus: "in_progress" });
  assert.equal(r.status, "in_progress");
});

void test("transition: template blocks invalid transition", async () => {
  const pool = makePool((sql, p) =>
    sql.includes("from cases") && p?.[0] === CASE_ID
      ? ok([makeCaseRow({ status: "new_inquiry" })])
      : ok(),
  );
  await assert.rejects(
    () =>
      svc(
        pool,
        SF_TPL([{ from: "new_inquiry", to: "in_progress" }]),
      ).transition(makeCtx(), CASE_ID, { toStatus: "closed" }),
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
      ? ok([makeCaseRow({ status: "new_inquiry" })])
      : ok(),
  );
  await assert.rejects(
    () =>
      svc(pool, makeTemplatesErr(new Error("svc down"))).transition(
        makeCtx(),
        CASE_ID,
        { toStatus: "following_up" },
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

// ── S5: default state machine transitions ──
import { DEFAULT_CASE_TRANSITIONS } from "./cases.service";

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

// Illegal transitions
const ILLEGAL_PAIRS: [string, string][] = [
  ["new_inquiry", "approved"],
  ["new_inquiry", "signed"],
  ["following_up", "submitted_reviewing"],
  ["signed", "archived"],
  ["approved", "new_inquiry"],
  ["pending_submission", "rejected"],
  ["correction_in_progress", "approved"],
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

// archived is terminal — cannot transition to anything
void test("transition: archived is terminal state", async () => {
  const pool = makePool((sql, p) =>
    sql.includes("from cases") && p?.[0] === CASE_ID
      ? ok([makeCaseRow({ status: "archived" })])
      : ok(),
  );
  await assert.rejects(
    () =>
      svc(pool, makeTemplates()).transition(makeCtx(), CASE_ID, {
        toStatus: "new_inquiry",
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
  // new_inquiry → approved is NOT in defaults, but template allows it
  const r = await svc(
    transitionPool("approved", "new_inquiry"),
    SF_TPL([{ from: "new_inquiry", to: "approved" }]),
  ).transition(makeCtx(), CASE_ID, { toStatus: "approved" });
  assert.equal(r.status, "approved");
});

void test("transition: template overrides default (blocks default-valid)", async () => {
  // new_inquiry → following_up IS in defaults, but template only allows → archived
  const pool = makePool((sql, p) =>
    sql.includes("from cases") && p?.[0] === CASE_ID
      ? ok([makeCaseRow({ status: "new_inquiry" })])
      : ok(),
  );
  await assert.rejects(
    () =>
      svc(pool, SF_TPL([{ from: "new_inquiry", to: "archived" }])).transition(
        makeCtx(),
        CASE_ID,
        { toStatus: "following_up" },
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
  // makeTemplates() returns { mode: "legacy", used: false } — should use defaults
  const r = await svc(
    transitionPool("pending_signing", "following_up"),
    makeTemplates(),
  ).transition(makeCtx(), CASE_ID, { toStatus: "pending_signing" });
  assert.equal(r.status, "pending_signing");
});

void test("transition: template used=false falls back to default", async () => {
  const tpl = makeTemplates({
    mode: "template",
    used: false,
    reason: "Not found",
  });
  const r = await svc(
    transitionPool("following_up", "new_inquiry"),
    tpl,
  ).transition(makeCtx(), CASE_ID, { toStatus: "following_up" });
  assert.equal(r.status, "following_up");
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
