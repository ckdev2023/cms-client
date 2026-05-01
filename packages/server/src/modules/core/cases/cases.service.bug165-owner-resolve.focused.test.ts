/**
 * BUG-165 [P0][FE/BE]：admin 建案向导 owner UUID 未解析，Step 4 提交永远 500。
 *
 * 走查证据（chrome-devtools-mcp）：
 * - admin Step 3 owner dropdown value 取自前端 fixture catalog（如 `suzuki`）或
 *   `withCurrentUserOwnerOption` 注入的当前登录用户（value 可能是 email
 *   `admin@local.test` 或占位 `current-user:<name>`）。
 * - server `cases.owner_user_id` 是 UUID FK；旧实现直接把 catalog slug 写入
 *   SQL，PG 报 `22P02 invalid input syntax for type uuid: "suzuki"` →
 *   `wrapCreateError` fallback 到 500。
 *
 * 修复契约：在 service 入口对 ownerUserId 做归一化（与 R13 v2
 * `resolveExplicitGroupId` 对称）：
 * - undefined / null / 空白 → 继承 ctx.userId
 * - `current-user:` 前缀（admin 端占位 value）→ 继承 ctx.userId
 * - UUID → 校验存在；不存在 → 400 CASE_OWNER_NOT_FOUND（不再 500）
 * - email / name → 通过 `users.email` / `users.name` 精确匹配归一化为 users.id
 * - 无法解析 → 400 CASE_OWNER_NOT_FOUND
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { type Pool } from "pg";

import { CasesService } from "./cases.service";
import { type RequestContext } from "../tenancy/requestContext";

const ORG_ID = "00000000-0000-4000-8000-000000000000";
const USER_ID = "00000000-0000-4000-8000-000000000001";
const CUSTOMER_ID = "00000000-0000-4000-a000-000000000001";
const REAL_OWNER_UUID = "55555555-5555-4555-8555-555555555555";

function makeCtx(): RequestContext {
  return { orgId: ORG_ID, userId: USER_ID, role: "staff" };
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

function makeTemplates() {
  return {
    resolve: () => Promise.resolve({ mode: "legacy", used: false } as const),
  };
}

function svc(pool: ReturnType<typeof makePool>) {
  return new CasesService(pool as unknown as Pool, makeTemplates() as never);
}

function makeCaseRow(owner_user_id: string) {
  return {
    id: "case-bug165",
    org_id: ORG_ID,
    customer_id: CUSTOMER_ID,
    case_type_code: "visa",
    status: "S1",
    stage: "S1",
    group_id: null,
    owner_user_id,
    opened_at: "2026-04-30T00:00:00.000Z",
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
    created_at: "2026-04-30T00:00:00.000Z",
    updated_at: "2026-04-30T00:00:00.000Z",
  };
}

const BASE_INPUT = {
  customerId: CUSTOMER_ID,
  caseTypeCode: "visa",
};

const OWNER_RESOLVE_SQL_FRAGMENT = "lower(email) = lower($1) or name = $1";

void test("BUG-165(a): ownerUserId = real users.id UUID → 透传写入 cases.owner_user_id", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];
  const pool = makePool((sql, params) => {
    calls.push({ sql, params });
    if (sql.includes("select id from customers"))
      return ok([{ id: params?.[0] }]);
    if (
      sql.includes("select id from users") &&
      sql.includes(OWNER_RESOLVE_SQL_FRAGMENT)
    )
      return ok([{ id: REAL_OWNER_UUID }]);
    if (sql.includes("FROM customers c") && sql.includes("JOIN groups g"))
      return ok([{ group_id: null }]);
    if (sql.includes("insert into cases"))
      return ok([makeCaseRow(REAL_OWNER_UUID)]);
    return ok();
  });

  const created = await svc(pool).create(makeCtx(), {
    ...BASE_INPUT,
    ownerUserId: REAL_OWNER_UUID,
  });
  assert.equal(created.ownerUserId, REAL_OWNER_UUID);

  const insertCall = calls.find((c) => c.sql.includes("insert into cases"));
  assert.ok(insertCall);
  assert.equal(
    insertCall.params?.[6],
    REAL_OWNER_UUID,
    "cases.owner_user_id 必须落 UUID（参数 7 = 第 7 列 owner_user_id）",
  );
});

void test("BUG-165(b): ownerUserId = email → 通过 users.email 精确匹配归一化为 users.id", async () => {
  const EMAIL = "admin@local.test";
  const calls: { sql: string; params?: unknown[] }[] = [];
  const pool = makePool((sql, params) => {
    calls.push({ sql, params });
    if (sql.includes("select id from customers"))
      return ok([{ id: params?.[0] }]);
    if (
      sql.includes("select id from users") &&
      sql.includes(OWNER_RESOLVE_SQL_FRAGMENT)
    )
      return ok([{ id: REAL_OWNER_UUID }]);
    if (sql.includes("FROM customers c") && sql.includes("JOIN groups g"))
      return ok([{ group_id: null }]);
    if (sql.includes("insert into cases"))
      return ok([makeCaseRow(REAL_OWNER_UUID)]);
    return ok();
  });

  const created = await svc(pool).create(makeCtx(), {
    ...BASE_INPUT,
    ownerUserId: EMAIL,
  });
  assert.equal(created.ownerUserId, REAL_OWNER_UUID);

  const ownerResolveCall = calls.find(
    (c) =>
      c.sql.includes("select id from users") &&
      c.sql.includes(OWNER_RESOLVE_SQL_FRAGMENT),
  );
  assert.ok(ownerResolveCall, "应有一次 resolveOwnerUserId SQL 调用");
  assert.equal(ownerResolveCall.params?.[0], EMAIL);

  const insertCall = calls.find((c) => c.sql.includes("insert into cases"));
  assert.ok(insertCall);
  assert.equal(
    insertCall.params?.[6],
    REAL_OWNER_UUID,
    "cases.owner_user_id 必须落 users.id 而非 email，避免 FK 违例",
  );
});

void test("BUG-165(c): ownerUserId = catalog slug 但 users 表无该记录 → 400 CASE_OWNER_NOT_FOUND（不再 500）", async () => {
  const pool = makePool((sql, params) => {
    if (sql.includes("select id from customers"))
      return ok([{ id: params?.[0] }]);
    if (
      sql.includes("select id from users") &&
      sql.includes(OWNER_RESOLVE_SQL_FRAGMENT)
    )
      return ok([]);
    return ok();
  });

  await assert.rejects(
    () =>
      svc(pool).create(makeCtx(), {
        ...BASE_INPUT,
        ownerUserId: "suzuki",
      }),
    (err: Error) => {
      assert.ok(
        err.message.includes("CASE_OWNER_NOT_FOUND"),
        `expected CASE_OWNER_NOT_FOUND, got: ${err.message}`,
      );
      assert.ok(
        err.message.includes('"suzuki"'),
        "错误消息应包含原始 ownerUserId 文本，便于运营定位",
      );
      return true;
    },
  );
});

void test("BUG-165(d): ownerUserId = 空白字符串 → 视同缺省，继承 ctx.userId", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];
  const pool = makePool((sql, params) => {
    calls.push({ sql, params });
    if (sql.includes("select id from customers"))
      return ok([{ id: params?.[0] }]);
    if (sql.includes("FROM customers c") && sql.includes("JOIN groups g"))
      return ok([{ group_id: null }]);
    if (sql.includes("insert into cases")) return ok([makeCaseRow(USER_ID)]);
    return ok();
  });

  const created = await svc(pool).create(makeCtx(), {
    ...BASE_INPUT,
    ownerUserId: "   ",
  });
  assert.equal(
    created.ownerUserId,
    USER_ID,
    "trim 后为空的 ownerUserId 必须继承当前请求用户",
  );

  const ownerResolveCall = calls.find(
    (c) =>
      c.sql.includes("select id from users") &&
      c.sql.includes(OWNER_RESOLVE_SQL_FRAGMENT),
  );
  assert.equal(
    ownerResolveCall,
    undefined,
    "trim 后为空时不应触发 resolveOwnerUserId 的 SQL 查询",
  );

  const insertCall = calls.find((c) => c.sql.includes("insert into cases"));
  assert.ok(insertCall);
  assert.equal(insertCall.params?.[6], USER_ID);
});

void test("BUG-165(e): ownerUserId = 'current-user:<name>' 占位 → 视同缺省，继承 ctx.userId", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];
  const pool = makePool((sql, params) => {
    calls.push({ sql, params });
    if (sql.includes("select id from customers"))
      return ok([{ id: params?.[0] }]);
    if (sql.includes("FROM customers c") && sql.includes("JOIN groups g"))
      return ok([{ group_id: null }]);
    if (sql.includes("insert into cases")) return ok([makeCaseRow(USER_ID)]);
    return ok();
  });

  const created = await svc(pool).create(makeCtx(), {
    ...BASE_INPUT,
    ownerUserId: "current-user:Local Admin",
  });
  assert.equal(created.ownerUserId, USER_ID);

  const ownerResolveCall = calls.find(
    (c) =>
      c.sql.includes("select id from users") &&
      c.sql.includes(OWNER_RESOLVE_SQL_FRAGMENT),
  );
  assert.equal(
    ownerResolveCall,
    undefined,
    "current-user: 占位不应触发 SQL 查询，应直接 fallback",
  );
});

void test("BUG-165(f): resolveOwnerUserId SQL 同时按 id::text / email / name 匹配", async () => {
  const NAME = "Local Admin";
  const calls: { sql: string; params?: unknown[] }[] = [];
  const pool = makePool((sql, params) => {
    calls.push({ sql, params });
    if (sql.includes("select id from customers"))
      return ok([{ id: params?.[0] }]);
    if (
      sql.includes("select id from users") &&
      sql.includes(OWNER_RESOLVE_SQL_FRAGMENT)
    )
      return ok([{ id: REAL_OWNER_UUID }]);
    if (sql.includes("FROM customers c") && sql.includes("JOIN groups g"))
      return ok([{ group_id: null }]);
    if (sql.includes("insert into cases"))
      return ok([makeCaseRow(REAL_OWNER_UUID)]);
    return ok();
  });

  await svc(pool).create(makeCtx(), {
    ...BASE_INPUT,
    ownerUserId: NAME,
  });

  const ownerResolveCall = calls.find(
    (c) =>
      c.sql.includes("select id from users") &&
      c.sql.includes(OWNER_RESOLVE_SQL_FRAGMENT),
  );
  assert.ok(ownerResolveCall, "应有一次 resolveOwnerUserId SQL 调用");
  const sql = ownerResolveCall.sql;
  assert.match(
    sql,
    /id::text\s*=\s*\$1/,
    "SQL 必须按 id::text 匹配（避免 PG 22P02 当输入非 UUID 时直接抛错）",
  );
  assert.match(
    sql,
    /lower\(email\)\s*=\s*lower\(\$1\)/,
    "SQL 必须按 lower(email) 不区分大小写匹配",
  );
  assert.match(sql, /name\s*=\s*\$1/, "SQL 必须按 name 精确匹配");
  assert.equal(ownerResolveCall.params?.[0], NAME);
});
