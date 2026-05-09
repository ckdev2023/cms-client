import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { type Pool } from "pg";
import { CasesService } from "./cases.service";
import { type RequestContext } from "../tenancy/requestContext";
import { BMV_CASE_TYPE_CODE } from "./bmvTemplateConfig";

const ORG = "00000000-0000-4000-8000-000000000000";
const USR = "00000000-0000-4000-8000-000000000001";

function makeCtx(): RequestContext {
  return { orgId: ORG, userId: USR, role: "staff" };
}

const isTxSql = (s: string) =>
  /^(begin|commit|rollback|select set_config)/.test(s.trim().toLowerCase());
type QueryFn = (
  sql: string,
  params?: unknown[],
) => Promise<{ rows: Record<string, unknown>[] }>;
const ok = (rows: Record<string, unknown>[] = []) => Promise.resolve({ rows });

function makePool(qf: QueryFn) {
  return {
    connect: () =>
      Promise.resolve({
        query: (s: string, p?: unknown[]) => (isTxSql(s) ? ok() : qf(s, p)),
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

function stdQ(): QueryFn {
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

type TResolver = {
  resolve: (
    _ctx: unknown,
    input: { kind: string; key: string },
  ) => Promise<unknown>;
};

function makeResolver(): TResolver {
  return {
    resolve: () => Promise.resolve({ mode: "legacy", used: false }),
  };
}

const CREATE_INPUT = {
  customerId: "cust-1",
  caseTypeCode: BMV_CASE_TYPE_CODE,
  ownerUserId: USR,
};

void describe("BUG-195: runCreateTransaction 末尾插入初始任务", () => {
  void test("create() 应插入 2 条 pending 任务 + 对应 timeline_logs", async () => {
    const calls: { sql: string; params?: unknown[] }[] = [];
    const pool = makePool((s, p) => {
      calls.push({ sql: s.trim(), params: p });
      if (s.includes("insert into tasks")) {
        return ok([{ id: `task-${String(calls.length)}` }]);
      }
      return stdQ()(s, p);
    });

    const svc = new CasesService(
      pool as unknown as Pool,
      makeResolver() as never,
    );

    await svc.create(makeCtx(), CREATE_INPUT);

    const taskInserts = calls.filter((c) =>
      c.sql.includes("insert into tasks"),
    );
    assert.equal(taskInserts.length, 2, "应插入 2 条初始任务");

    assert.equal(taskInserts[0]?.params?.[0], ORG, "org_id");
    assert.equal(taskInserts[0]?.params?.[1], "case-1", "case_id");
    assert.equal(
      taskInserts[0]?.params?.[2],
      "顧客に基礎資料のアップロードを依頼",
      "title",
    );
    assert.equal(
      taskInserts[0]?.params?.[3],
      "document_follow_up",
      "task_type",
    );
    assert.equal(taskInserts[0]?.params?.[4], USR, "assignee = case owner");
    assert.equal(taskInserts[0]?.params?.[5], "normal", "priority");
    assert.equal(taskInserts[0]?.params?.[6], "case-1", "source_id = case_id");

    assert.equal(
      taskInserts[1]?.params?.[2],
      "顧客との初回面談を確認",
      "second title",
    );
    assert.equal(
      taskInserts[1]?.params?.[3],
      "client_contact",
      "second task_type",
    );

    const taskTimelines = calls.filter(
      (c) =>
        c.sql.includes("insert into timeline_logs") && c.params?.[1] === "task",
    );
    assert.equal(taskTimelines.length, 2, "每条任务对应一条 timeline_log");
    assert.equal(taskTimelines[0]?.params?.[3], "task.created");
  });

  void test("初始任务 source_type=auto_create, source_id=case_id", async () => {
    const calls: { sql: string; params?: unknown[] }[] = [];
    const pool = makePool((s, p) => {
      calls.push({ sql: s.trim(), params: p });
      if (s.includes("insert into tasks")) {
        return ok([{ id: `task-${String(calls.length)}` }]);
      }
      return stdQ()(s, p);
    });

    const svc = new CasesService(
      pool as unknown as Pool,
      makeResolver() as never,
    );

    await svc.create(makeCtx(), CREATE_INPUT);

    const taskInserts = calls.filter((c) =>
      c.sql.includes("insert into tasks"),
    );
    for (const ins of taskInserts) {
      assert.ok(ins.sql.includes("source_type"), "SQL 包含 source_type 列");
      assert.ok(ins.sql.includes("source_id"), "SQL 包含 source_id 列");
    }
  });

  void test("task insert 返回空行（极端边界）时 create 不抛出", async () => {
    const calls: { sql: string; params?: unknown[] }[] = [];
    const pool = makePool((s, p) => {
      calls.push({ sql: s.trim(), params: p });
      if (s.includes("insert into tasks")) return ok([]);
      return stdQ()(s, p);
    });

    const svc = new CasesService(
      pool as unknown as Pool,
      makeResolver() as never,
    );

    await assert.doesNotReject(
      () => svc.create(makeCtx(), CREATE_INPUT),
      "task insert 空行不应导致 create 失败",
    );

    const taskInserts = calls.filter((c) =>
      c.sql.includes("insert into tasks"),
    );
    assert.equal(taskInserts.length, 2, "仍然尝试插入 2 条");

    const taskTimelines = calls.filter(
      (c) =>
        c.sql.includes("insert into timeline_logs") && c.params?.[1] === "task",
    );
    assert.equal(taskTimelines.length, 0, "无 taskId 时跳过 timeline");
  });
});
