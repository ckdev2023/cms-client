/**
 * BUG-181 [P2][BE]：建案路径写入 cases.quote_price 后未同步 INSERT
 * billing_records，导致 admin Billing tab Total fees `—`、Outstanding `¥0`
 * 与 cases.quotePrice / businessPhase 强不一致（R16 §3 reaffirm，R17 §0.1 重申）。
 *
 * 修复契约（cases.service.ts insertInitialBillingPlanFromQuote）：
 * - quotePrice > 0 → 插入一行 billing_records（milestone i18n code `case_fee`、
 *   status 'due'、gate_effect_mode 'warn'）+ timeline `billing_plan.created` + sync 缓存。
 * - quotePrice 为 null/0/负值 → 不插入。
 * - case 已存在任意 billing_records 行（例如 BMV signing_deposit 已先行写入）→ 跳过插入。
 * - milestone 写 i18n code（不再写 `案件報酬` 本地化文案）以便 admin 侧三语渲染；
 *   code 同样刻意避开 deposit / final 关键词，不会触发
 *   billingGuards.isDepositMilestone / isFinalPaymentMilestone（BUG-186）。
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { CasesService } from "./cases.service";
const ORG_ID = "00000000-0000-4000-8000-000000000000";
const USER_ID = "00000000-0000-4000-8000-000000000001";
const CUSTOMER_ID = "00000000-0000-4000-a000-000000000001";
const NEW_CASE_ID = "00000000-0000-4000-c000-000000000111";
const NEW_BILLING_ID = "00000000-0000-4000-c000-000000000222";
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
function makeCaseRow(quotePrice) {
  return {
    id: NEW_CASE_ID,
    org_id: ORG_ID,
    customer_id: CUSTOMER_ID,
    case_type_code: "visa",
    status: "S1",
    stage: "S1",
    group_id: null,
    owner_user_id: USER_ID,
    opened_at: "2026-04-30T00:00:00.000Z",
    due_at: null,
    metadata: {},
    case_no: "CASE-202605-0001",
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
    quote_price: quotePrice,
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
// ownerUserId 留空白字符串，复用 BUG-165 fix 的「继承 ctx.userId」短路路径，
// 避免每条 mock 都要补 users 表查询。
const BASE_INPUT = {
  customerId: CUSTOMER_ID,
  caseTypeCode: "visa",
  ownerUserId: "   ",
};
void test("[BUG-181] quotePrice > 0 + 无既有 plan → 插入一行 billing_records + timeline + sync 缓存", async () => {
  const calls = [];
  const pool = makePool((sql, params) => {
    calls.push({ sql, params });
    if (sql.includes("select id from customers"))
      return ok([{ id: params?.[0] }]);
    if (sql.includes("FROM customers c") && sql.includes("JOIN groups g"))
      return ok([{ group_id: null }]);
    if (sql.includes("insert into cases")) return ok([makeCaseRow(150_000)]);
    if (
      sql.includes("select id from billing_records") &&
      sql.includes("limit 1")
    ) {
      return ok([]);
    }
    if (sql.includes("insert into billing_records"))
      return ok([{ id: NEW_BILLING_ID }]);
    return ok();
  });
  const created = await svc(pool).create(makeCtx(), {
    ...BASE_INPUT,
    quotePrice: 150_000,
  });
  assert.equal(created.quotePrice, 150_000);
  const billingInsert = calls.find((c) =>
    c.sql.includes("insert into billing_records"),
  );
  assert.ok(billingInsert, "quotePrice>0 必须触发 billing_records 插入");
  const billingParams = billingInsert.params;
  assert.ok(billingParams, "billing_records insert 必须带参数");
  assert.equal(billingParams[0], ORG_ID);
  assert.equal(billingParams[1], NEW_CASE_ID);
  assert.equal(
    billingParams[2],
    "case_fee",
    "milestone 写 i18n code（BUG-186），避开 deposit/final 关键词",
  );
  assert.equal(billingParams[3], 150_000);
  const timelineInsert = calls.find((c) => {
    if (!c.sql.includes("insert into timeline_logs")) return false;
    const p = c.params;
    return (
      Array.isArray(p) &&
      p[1] === "billing_plan" &&
      p[3] === "billing_plan.created"
    );
  });
  assert.ok(
    timelineInsert,
    "billing_plan.created timeline 必须落库（entity_type=billing_plan, action=billing_plan.created）",
  );
  const cacheSync = calls.find(
    (c) =>
      c.sql.includes("update cases set") &&
      c.sql.includes("billing_unpaid_amount_cached"),
  );
  assert.ok(cacheSync, "syncBillingCacheForCase 必须被调用");
});
void test("[BUG-181] quotePrice 为 null → 不应触发 billing_records 插入", async () => {
  const calls = [];
  const pool = makePool((sql, params) => {
    calls.push({ sql, params });
    if (sql.includes("select id from customers"))
      return ok([{ id: params?.[0] }]);
    if (sql.includes("FROM customers c") && sql.includes("JOIN groups g"))
      return ok([{ group_id: null }]);
    if (sql.includes("insert into cases")) return ok([makeCaseRow(null)]);
    return ok();
  });
  await svc(pool).create(makeCtx(), { ...BASE_INPUT });
  const billingInsert = calls.find((c) =>
    c.sql.includes("insert into billing_records"),
  );
  assert.equal(
    billingInsert,
    undefined,
    "quotePrice=null 时不应插入 billing_records 行",
  );
});
void test("[BUG-181] quotePrice <= 0 → 不应触发 billing_records 插入", async () => {
  const calls = [];
  const pool = makePool((sql, params) => {
    calls.push({ sql, params });
    if (sql.includes("select id from customers"))
      return ok([{ id: params?.[0] }]);
    if (sql.includes("FROM customers c") && sql.includes("JOIN groups g"))
      return ok([{ group_id: null }]);
    if (sql.includes("insert into cases")) return ok([makeCaseRow(0)]);
    return ok();
  });
  await svc(pool).create(makeCtx(), { ...BASE_INPUT, quotePrice: 0 });
  const billingInsert = calls.find((c) =>
    c.sql.includes("insert into billing_records"),
  );
  assert.equal(
    billingInsert,
    undefined,
    "quotePrice=0 时不应插入 billing_records 行",
  );
});
void test("[BUG-181] 已存在 billing_records 行 → 幂等跳过，不重复插入", async () => {
  const calls = [];
  const pool = makePool((sql, params) => {
    calls.push({ sql, params });
    if (sql.includes("select id from customers"))
      return ok([{ id: params?.[0] }]);
    if (sql.includes("FROM customers c") && sql.includes("JOIN groups g"))
      return ok([{ group_id: null }]);
    if (sql.includes("insert into cases")) return ok([makeCaseRow(150_000)]);
    if (
      sql.includes("select id from billing_records") &&
      sql.includes("limit 1")
    ) {
      return ok([{ id: "existing-bmv-signing-deposit-row" }]);
    }
    if (sql.includes("insert into billing_records")) {
      assert.fail(
        "已存在 billing_records 行时不应再次 INSERT（应被 select limit 1 短路）",
      );
    }
    return ok();
  });
  await svc(pool).create(makeCtx(), {
    ...BASE_INPUT,
    quotePrice: 150_000,
  });
  const billingExistenceCheck = calls.find(
    (c) =>
      c.sql.includes("select id from billing_records") &&
      c.sql.includes("limit 1"),
  );
  assert.ok(
    billingExistenceCheck,
    "插入前必须先 select 已有 billing_records 行做幂等",
  );
});
//# sourceMappingURL=cases.service.bug181-quote-billing.focused.test.js.map
