/**
 * BUG-159 [P2][BE]：建案 `cases.group_id` 不持久化（继承显示与持久化分裂）。
 *
 * 走查证据：
 * - 建案向导 Step 3 文案显示 `Group 继承自主申请人：东京一组`
 * - 但 `POST /api/cases` → `cases.group_id = null`
 * - 下游 `BillingTable` row Group 列三行均 fallback 到 `—`（BUG-140 fix 失效）
 *
 * 修复契约：`resolveCustomerGroupId` 必须接受 customer.base_profile 中两种存储形态
 * - `groups.name = base_profile->>'group/groupId/group_id'`（slug / 显示名）
 * - `groups.id::text = base_profile->>'group/groupId/group_id'`（migration 034 backfill 后形态）
 *
 * 本测试通过断言 SQL where 子句包含 `g.name = cv.group_val OR g.id::text = cv.group_val`
 * 锁定双路径匹配语义；同时回归保证：customer 完全无 group 时返回 null（不写入 cases.group_id）。
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { CasesService } from "./cases.service";
const ORG_ID = "00000000-0000-4000-8000-000000000000";
const USER_ID = "00000000-0000-4000-8000-000000000001";
const CUSTOMER_ID = "00000000-0000-4000-a000-000000000001";
const GROUP_UUID = "11111111-1111-4111-8111-111111111111";
function makeCtx() {
  return { orgId: ORG_ID, userId: USER_ID, role: "staff" };
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
function makeTemplates() {
  return {
    resolve: () => Promise.resolve({ mode: "legacy", used: false }),
  };
}
function svc(pool) {
  return new CasesService(pool, makeTemplates());
}
function makeCaseRow(group_id) {
  return {
    id: "case-bug159",
    org_id: ORG_ID,
    customer_id: CUSTOMER_ID,
    case_type_code: "visa",
    status: "S1",
    stage: "S1",
    group_id,
    owner_user_id: USER_ID,
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
const CREATE_INPUT = {
  customerId: CUSTOMER_ID,
  caseTypeCode: "visa",
  ownerUserId: USER_ID,
};
void test("BUG-159: resolveCustomerGroupId SQL 同时按 g.name 与 g.id::text 匹配", async () => {
  const calls = [];
  const pool = makePool((sql, params) => {
    calls.push({ sql, params });
    if (
      sql.includes("select id from customers") ||
      sql.includes("select id from users")
    )
      return ok([{ id: params?.[0] }]);
    if (sql.includes("FROM customers c") && sql.includes("JOIN groups g"))
      return ok([{ group_id: GROUP_UUID }]);
    if (sql.includes("insert into cases")) return ok([makeCaseRow(GROUP_UUID)]);
    return ok();
  });
  const created = await svc(pool).create(makeCtx(), CREATE_INPUT);
  assert.equal(created.groupId, GROUP_UUID);
  const groupResolveCall = calls.find(
    (c) =>
      c.sql.includes("FROM customers c") && c.sql.includes("JOIN groups g"),
  );
  assert.ok(groupResolveCall, "应有一次 resolveCustomerGroupId SQL 调用");
  const sql = groupResolveCall.sql;
  assert.match(
    sql,
    /g\.name\s*=\s*cv\.group_val/,
    "SQL 必须保留按 groups.name 匹配的路径",
  );
  assert.match(
    sql,
    /g\.id::text\s*=\s*cv\.group_val/,
    "SQL 必须新增按 groups.id::text 匹配的路径（兼容 base_profile.groupId 存 UUID 的形态）",
  );
  const insertCall = calls.find((c) => c.sql.includes("insert into cases"));
  assert.ok(insertCall);
  assert.equal(insertCall.params?.[5], GROUP_UUID);
});
void test("BUG-159: customer 无 group 时不写入 cases.group_id（保持 null，不抛错）", async () => {
  const calls = [];
  const pool = makePool((sql, params) => {
    calls.push({ sql, params });
    if (
      sql.includes("select id from customers") ||
      sql.includes("select id from users")
    )
      return ok([{ id: params?.[0] }]);
    if (sql.includes("FROM customers c") && sql.includes("JOIN groups g"))
      return ok([]);
    if (sql.includes("insert into cases")) return ok([makeCaseRow(null)]);
    return ok();
  });
  const created = await svc(pool).create(makeCtx(), CREATE_INPUT);
  assert.equal(created.groupId, null);
  const insertCall = calls.find((c) => c.sql.includes("insert into cases"));
  assert.ok(insertCall);
  assert.equal(insertCall.params?.[5], null);
});
void test("BUG-159: 显式 groupId 入参不再触发 customer 继承（避免误覆盖）", async () => {
  const EXPLICIT_GROUP = "22222222-2222-4222-8222-222222222222";
  const calls = [];
  const pool = makePool((sql, params) => {
    calls.push({ sql, params });
    if (
      sql.includes("select id from customers") ||
      sql.includes("select id from users")
    )
      return ok([{ id: params?.[0] }]);
    if (sql.includes("FROM customers c") && sql.includes("JOIN groups g"))
      return ok([]);
    if (
      sql.includes("select id from groups") &&
      sql.includes("id::text = $2 or name = $2")
    )
      return ok([{ id: EXPLICIT_GROUP }]);
    if (sql.includes("insert into cases"))
      return ok([makeCaseRow(EXPLICIT_GROUP)]);
    return ok();
  });
  const created = await svc(pool).create(makeCtx(), {
    ...CREATE_INPUT,
    groupId: EXPLICIT_GROUP,
  });
  assert.equal(created.groupId, EXPLICIT_GROUP);
  const insertCall = calls.find((c) => c.sql.includes("insert into cases"));
  assert.ok(insertCall);
  assert.equal(insertCall.params?.[5], EXPLICIT_GROUP);
});
void test("BUG-159: 显式 groupId 为 slug/name 时归一化为 groups.id", async () => {
  const SLUG = "tokyo-1";
  const RESOLVED_UUID = "33333333-3333-4333-8333-333333333333";
  const calls = [];
  const pool = makePool((sql, params) => {
    calls.push({ sql, params });
    if (
      sql.includes("select id from customers") ||
      sql.includes("select id from users")
    )
      return ok([{ id: params?.[0] }]);
    if (sql.includes("FROM customers c") && sql.includes("JOIN groups g"))
      return ok([{ group_id: RESOLVED_UUID }]);
    if (
      sql.includes("select id from groups") &&
      sql.includes("id::text = $2 or name = $2")
    )
      return ok([{ id: RESOLVED_UUID }]);
    if (sql.includes("insert into cases"))
      return ok([makeCaseRow(RESOLVED_UUID)]);
    return ok();
  });
  const created = await svc(pool).create(makeCtx(), {
    ...CREATE_INPUT,
    groupId: SLUG,
  });
  assert.equal(created.groupId, RESOLVED_UUID);
  const groupResolveCall = calls.find(
    (c) =>
      c.sql.includes("select id from groups") &&
      c.sql.includes("id::text = $2 or name = $2"),
  );
  assert.ok(groupResolveCall, "应有一次 resolveExplicitGroupId SQL 调用");
  assert.equal(groupResolveCall.params?.[1], SLUG);
  const insertCall = calls.find((c) => c.sql.includes("insert into cases"));
  assert.ok(insertCall);
  assert.equal(
    insertCall.params?.[5],
    RESOLVED_UUID,
    "cases.group_id 必须落 UUID 而非 slug，避免 FK 违例",
  );
});
void test("BUG-159: 显式 groupId 无法解析时抛 400 GROUP_NOT_FOUND（不再返回 500）", async () => {
  const pool = makePool((sql, params) => {
    if (
      sql.includes("select id from customers") ||
      sql.includes("select id from users")
    )
      return ok([{ id: params?.[0] }]);
    if (sql.includes("FROM customers c") && sql.includes("JOIN groups g"))
      return ok([]);
    if (sql.includes("select id from groups")) return ok([]);
    return ok();
  });
  await assert.rejects(
    () =>
      svc(pool).create(makeCtx(), {
        ...CREATE_INPUT,
        groupId: "ghost-group-slug",
      }),
    (err) => err.message.includes("CASE_GROUP_NOT_FOUND"),
  );
});
void test("BUG-159: 空字符串 groupId 视为缺省并继续走 customer 继承", async () => {
  const RESOLVED_UUID = "44444444-4444-4444-8444-444444444444";
  const calls = [];
  const pool = makePool((sql, params) => {
    calls.push({ sql, params });
    if (
      sql.includes("select id from customers") ||
      sql.includes("select id from users")
    )
      return ok([{ id: params?.[0] }]);
    if (sql.includes("FROM customers c") && sql.includes("JOIN groups g"))
      return ok([{ group_id: RESOLVED_UUID }]);
    if (sql.includes("insert into cases"))
      return ok([makeCaseRow(RESOLVED_UUID)]);
    return ok();
  });
  const created = await svc(pool).create(makeCtx(), {
    ...CREATE_INPUT,
    groupId: "   ",
  });
  assert.equal(created.groupId, RESOLVED_UUID);
  const explicitGroupCall = calls.find(
    (c) =>
      c.sql.includes("select id from groups") &&
      c.sql.includes("id::text = $2 or name = $2"),
  );
  assert.equal(
    explicitGroupCall,
    undefined,
    "trim 后为空的 groupId 不应触发 explicit 解析 SQL",
  );
});
//# sourceMappingURL=cases.service.bug159-group-inheritance.focused.test.js.map
