import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { CasesService } from "./cases.service";
import {
  BMV_REQUIREMENT_BLUEPRINT,
  BMV_CASE_TYPE_CODE,
} from "./bmvTemplateConfig";
const ORG = "00000000-0000-4000-8000-000000000000";
const USR = "00000000-0000-4000-8000-000000000001";
function makeCtx() {
  return { orgId: ORG, userId: USR, role: "staff" };
}
const isTxSql = (s) =>
  /^(begin|commit|rollback|select set_config)/.test(s.trim().toLowerCase());
const ok = (rows = []) => Promise.resolve({ rows });
function makePool(qf) {
  return {
    connect: () =>
      Promise.resolve({
        query: (s, p) => (isTxSql(s) ? ok() : qf(s, p)),
        release: () => undefined,
      }),
  };
}
const READY_PROFILE = {
  bmvProfile: {
    questionnaireStatus: "returned",
    quoteStatus: "confirmed",
    signStatus: "signed",
    intakeStatus: "ready_for_case_creation",
  },
};
const CASE_ROW = {
  id: "case-1",
  org_id: ORG,
  customer_id: "cust-1",
  case_type_code: BMV_CASE_TYPE_CODE,
  case_no: "TOKYO-202601-0001",
  case_name: null,
  case_subtype: null,
  application_type: null,
  stage: "S1",
  status: "S1",
  business_phase: "CONSULTING",
  visa_plan: null,
  priority: "normal",
  risk_level: "normal",
  owner_user_id: USR,
  assistant_user_id: null,
  group_id: null,
  due_at: null,
  metadata: "{}",
  source_channel: null,
  signed_at: null,
  accepted_at: null,
  submission_date: null,
  result_date: null,
  residence_expiry_date: null,
  result_outcome: null,
  company_id: null,
  quote_price: null,
  coe_issued_at: null,
  coe_expiry_date: null,
  coe_sent_at: null,
  entry_confirmed_at: null,
  overseas_visa_start_at: null,
  supplement_count: 0,
  post_approval_stage: null,
  application_flow_type: null,
  close_reason: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};
function stdQ() {
  return (sql, params) => {
    if (
      sql.includes("select id from customers") ||
      sql.includes("select id from users")
    )
      return ok([{ id: params?.[0] ?? USR }]);
    if (sql.includes("select base_profile"))
      return ok([{ base_profile: JSON.stringify(READY_PROFILE) }]);
    if (sql.includes("coalesce(max(seq_number)")) return ok([{ next_seq: 1 }]);
    if (sql.includes("insert into cases")) return ok([CASE_ROW]);
    return ok();
  };
}
function makeResolver(response) {
  const calls = [];
  return {
    service: {
      resolve: (_ctx, input) => {
        calls.push({ kind: input.kind, key: input.key });
        return Promise.resolve(
          typeof response === "function" ? response(input) : response,
        );
      },
    },
    calls,
  };
}
const CREATE_INPUT = {
  customerId: "cust-1",
  caseTypeCode: BMV_CASE_TYPE_CODE,
  ownerUserId: USR,
};
// §1  BUG-194 根因诊断
void describe("BUG-194: resolveChecklistItems 链路诊断", () => {
  void test("根因 1: 两种 kind 均返回 legacy → 0 条 document_items", async () => {
    const calls = [];
    const pool = makePool((s, p) => {
      calls.push({ sql: s.trim(), params: p });
      return stdQ()(s, p);
    });
    const resolver = makeResolver({ mode: "legacy", used: false });
    const svc = new CasesService(pool, resolver.service);
    await svc.create(makeCtx(), CREATE_INPUT);
    assert.equal(
      resolver.calls.length,
      2,
      "先查 document_checklist 再 fallback 查 case_type",
    );
    assert.equal(resolver.calls[0]?.kind, "document_checklist");
    assert.equal(resolver.calls[1]?.kind, "case_type");
    assert.equal(resolver.calls[0]?.key, BMV_CASE_TYPE_CODE);
    const docInserts = calls.filter((c) =>
      c.sql.includes("insert into document_items"),
    );
    assert.equal(
      docInserts.length,
      0,
      "两种 kind 均 legacy → 不生成 document_items",
    );
  });
  void test("根因 2: 即使注册了 document_checklist 但 rollout=percentage 且无 entityId → used=false", async () => {
    const calls = [];
    const pool = makePool((s, p) => {
      calls.push({ sql: s.trim(), params: p });
      return stdQ()(s, p);
    });
    const resolver = makeResolver({
      mode: "template",
      used: false,
      reason: "rollout",
    });
    const svc = new CasesService(pool, resolver.service);
    await svc.create(makeCtx(), CREATE_INPUT);
    const docInserts = calls.filter((c) =>
      c.sql.includes("insert into document_items"),
    );
    assert.equal(
      docInserts.length,
      0,
      "rollout 不命中 → 不生成 document_items",
    );
  });
  void test("对照: 当 document_checklist 模板正确注册且 rollout=all 时, requirementBlueprint 被正确解析", async () => {
    const calls = [];
    const pool = makePool((s, p) => {
      calls.push({ sql: s.trim(), params: p });
      return stdQ()(s, p);
    });
    const resolver = makeResolver({
      mode: "template",
      used: true,
      version: 1,
      config: {
        requirementBlueprint: BMV_REQUIREMENT_BLUEPRINT,
      },
    });
    const svc = new CasesService(pool, resolver.service);
    await svc.create(makeCtx(), CREATE_INPUT);
    const docInserts = calls.filter((c) =>
      c.sql.includes("insert into document_items"),
    );
    assert.equal(
      docInserts.length,
      BMV_REQUIREMENT_BLUEPRINT.length,
      `应生成 ${String(BMV_REQUIREMENT_BLUEPRINT.length)} 条 document_items`,
    );
    assert.equal(
      docInserts[0]?.params?.[2],
      "bmv-questionnaire",
      "第一条 code 取自 checklistItemCode",
    );
    assert.equal(
      docInserts[0]?.params?.[3],
      "经营管理签信息采集表",
      "name 正确传递",
    );
  });
  void test("对照: config.items 优先于 config.requirementBlueprint", async () => {
    const calls = [];
    const pool = makePool((s, p) => {
      calls.push({ sql: s.trim(), params: p });
      return stdQ()(s, p);
    });
    const resolver = makeResolver({
      mode: "template",
      used: true,
      version: 1,
      config: {
        items: [{ code: "test-item", name: "Test Item" }],
        requirementBlueprint: BMV_REQUIREMENT_BLUEPRINT,
      },
    });
    const svc = new CasesService(pool, resolver.service);
    await svc.create(makeCtx(), CREATE_INPUT);
    const docInserts = calls.filter((c) =>
      c.sql.includes("insert into document_items"),
    );
    assert.equal(docInserts.length, 1, "items 优先时仅生成 1 条");
    assert.equal(docInserts[0]?.params?.[2], "test-item");
  });
  void test("code 字段 fallback: checklistItemCode → itemCode → code → ''", async () => {
    const calls = [];
    const pool = makePool((s, p) => {
      calls.push({ sql: s.trim(), params: p });
      return stdQ()(s, p);
    });
    const resolver = makeResolver({
      mode: "template",
      used: true,
      version: 1,
      config: {
        items: [
          { checklistItemCode: "ck-1", name: "A" },
          { itemCode: "ic-2", name: "B" },
          { code: "c-3", name: "C" },
          { name: "D" },
        ],
      },
    });
    const svc = new CasesService(pool, resolver.service);
    await svc.create(makeCtx(), CREATE_INPUT);
    const docInserts = calls.filter((c) =>
      c.sql.includes("insert into document_items"),
    );
    assert.equal(docInserts.length, 4);
    assert.equal(docInserts[0]?.params?.[2], "ck-1");
    assert.equal(docInserts[1]?.params?.[2], "ic-2");
    assert.equal(docInserts[2]?.params?.[2], "c-3");
    assert.equal(
      docInserts[3]?.params?.[2],
      "",
      "无 code 字段时 fallback 空字符串",
    );
  });
});
// §2  BUG-194 修复验证：resolveChecklistItems fallback 到 case_type
function makeKindAwareResolver(responses) {
  const calls = [];
  return {
    service: {
      resolve: (_ctx, input) => {
        calls.push({ kind: input.kind, key: input.key });
        const resp = responses[input.kind];
        return Promise.resolve(
          typeof resp === "function"
            ? resp(input)
            : (resp ?? { mode: "legacy", used: false }),
        );
      },
    },
    calls,
  };
}
void describe("BUG-194 修复: document_checklist miss → case_type fallback", () => {
  void test("document_checklist 未注册时 fallback 到 case_type 的 requirementBlueprint, 生成 17+ 条 document_items", async () => {
    const calls = [];
    const pool = makePool((s, p) => {
      calls.push({ sql: s.trim(), params: p });
      return stdQ()(s, p);
    });
    const resolver = makeKindAwareResolver({
      document_checklist: { mode: "legacy", used: false },
      case_type: {
        mode: "template",
        used: true,
        version: 1,
        config: { requirementBlueprint: BMV_REQUIREMENT_BLUEPRINT },
      },
    });
    const svc = new CasesService(pool, resolver.service);
    await svc.create(makeCtx(), CREATE_INPUT);
    assert.equal(
      resolver.calls.length,
      2,
      "应先查 document_checklist 再查 case_type",
    );
    assert.equal(resolver.calls[0]?.kind, "document_checklist");
    assert.equal(resolver.calls[1]?.kind, "case_type");
    const docInserts = calls.filter((c) =>
      c.sql.includes("insert into document_items"),
    );
    assert.ok(
      docInserts.length >= 17,
      `BMV 模板应生成 17+ 条 document_items，实际 ${String(docInserts.length)}`,
    );
    assert.equal(
      docInserts.length,
      BMV_REQUIREMENT_BLUEPRINT.length,
      `应与 BMV_REQUIREMENT_BLUEPRINT.length(${String(BMV_REQUIREMENT_BLUEPRINT.length)}) 一致`,
    );
  });
  void test("document_checklist 已注册时直接使用, 不触发 case_type fallback", async () => {
    const calls = [];
    const pool = makePool((s, p) => {
      calls.push({ sql: s.trim(), params: p });
      return stdQ()(s, p);
    });
    const resolver = makeKindAwareResolver({
      document_checklist: {
        mode: "template",
        used: true,
        version: 1,
        config: {
          items: [{ code: "explicit-item", name: "Explicit" }],
        },
      },
      case_type: {
        mode: "template",
        used: true,
        version: 1,
        config: { requirementBlueprint: BMV_REQUIREMENT_BLUEPRINT },
      },
    });
    const svc = new CasesService(pool, resolver.service);
    await svc.create(makeCtx(), CREATE_INPUT);
    assert.equal(
      resolver.calls.length,
      1,
      "document_checklist 命中后不应查 case_type",
    );
    assert.equal(resolver.calls[0]?.kind, "document_checklist");
    const docInserts = calls.filter((c) =>
      c.sql.includes("insert into document_items"),
    );
    assert.equal(docInserts.length, 1);
    assert.equal(docInserts[0]?.params?.[2], "explicit-item");
  });
  void test("两种 kind 均无模板时返回 0 条 document_items (降级)", async () => {
    const calls = [];
    const pool = makePool((s, p) => {
      calls.push({ sql: s.trim(), params: p });
      return stdQ()(s, p);
    });
    const resolver = makeKindAwareResolver({});
    const svc = new CasesService(pool, resolver.service);
    await svc.create(makeCtx(), CREATE_INPUT);
    const docInserts = calls.filter((c) =>
      c.sql.includes("insert into document_items"),
    );
    assert.equal(docInserts.length, 0, "无模板 → 0 条 document_items");
  });
  void test("BMV_REQUIREMENT_BLUEPRINT 包含 17 required + 1 optional = 18 项", () => {
    const required = BMV_REQUIREMENT_BLUEPRINT.filter((i) => i.requiredFlag);
    const optional = BMV_REQUIREMENT_BLUEPRINT.filter((i) => !i.requiredFlag);
    assert.equal(BMV_REQUIREMENT_BLUEPRINT.length, 18, "总计 18 项");
    assert.equal(required.length, 17, "17 项必须");
    assert.equal(optional.length, 1, "1 项可选");
  });
});
//# sourceMappingURL=cases.service.create-checklist-tasks.focused.test.js.map
