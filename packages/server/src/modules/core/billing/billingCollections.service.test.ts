import assert from "node:assert/strict";
import test from "node:test";
import { ForbiddenException, NotFoundException } from "@nestjs/common";
import type { Pool } from "pg";

import type { RequestContext } from "../tenancy/requestContext";
import { BillingCollectionsService } from "./billingCollections.service";

const ORG_ID = "00000000-0000-4000-8000-000000000001";
const ORG_B = "00000000-0000-4000-8000-000000000002";
const USER_ID = "00000000-0000-4000-8000-000000000010";
const CASE_1 = "case-001";
const CASE_2 = "case-002";
const OWNER = "00000000-0000-4000-8000-000000000020";
const PLAN = "plan-001";
const TASK = "task-001";

function ctx(
  orgId = ORG_ID,
  role: RequestContext["role"] = "staff",
): RequestContext {
  return { orgId, userId: USER_ID, role };
}

type QFn = (
  sql: string,
  params?: unknown[],
) => Promise<{ rows: unknown[]; rowCount: number }>;
function pool(qfn: QFn): Pool {
  const c = { query: qfn, release: () => undefined };
  return { connect: () => Promise.resolve(c) } as unknown as Pool;
}

const OK = Promise.resolve({ rows: [] as unknown[], rowCount: 0 });

function planRow(o: Record<string, unknown> = {}) {
  return {
    id: PLAN,
    case_id: CASE_1,
    milestone_name: "着手金",
    owner_user_id: OWNER,
    case_no: "CAS-2026-0001",
    ...o,
  };
}

function stubTask(o: Record<string, unknown> = {}) {
  return {
    id: TASK,
    orgId: ORG_ID,
    caseId: CASE_1,
    title: "催款",
    description: null,
    taskType: "collection",
    assigneeUserId: OWNER,
    priority: "high",
    dueAt: new Date().toISOString(),
    status: "pending",
    sourceType: "billing_plan",
    sourceId: PLAN,
    completedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...o,
  };
}

function tl() {
  const w: unknown[] = [];
  return {
    svc: {
      write: (_c: unknown, i: unknown) => {
        w.push(i);
        return Promise.resolve();
      },
    },
    w,
  };
}

function svc(opts: {
  pool: Pool;
  cases?: Record<string, unknown>;
  tasks?: Record<string, unknown>;
  timeline?: ReturnType<typeof tl>;
}) {
  const t = opts.timeline ?? tl();
  return new BillingCollectionsService(
    opts.pool,
    {
      assertCanEditCase:
        opts.cases?.assertCanEditCase ?? (() => Promise.resolve()),
    } as never,
    {
      create: opts.tasks?.create ?? (() => Promise.resolve(stubTask())),
    } as never,
    t.svc as never,
  );
}

function stdPool(planOvr?: Record<string, unknown>) {
  return pool((sql) => {
    if (sql.includes("set_config")) return OK;
    if (sql.includes("from billing_records") && sql.includes("due_date"))
      return Promise.resolve({
        rows: planOvr === undefined ? [] : [planRow(planOvr)],
        rowCount: planOvr === undefined ? 0 : 1,
      });
    if (sql.includes("from tasks")) return OK;
    return OK;
  });
}

// ─── success ────────────────────────────────────────────────────

void test("full success: creates task and writes timeline", async () => {
  const inputs: unknown[] = [];
  const t = tl();
  const s = svc({
    pool: stdPool({}),
    tasks: {
      create: (_c: unknown, i: unknown) => {
        inputs.push(i);
        return Promise.resolve(stubTask());
      },
    },
    timeline: t,
  });
  const r = await s.bulkCollect(ctx(), [CASE_1]);

  assert.equal(r.success, 1);
  assert.equal(r.skipped, 0);
  assert.equal(r.failed, 0);
  assert.equal(r.details[0]?.result, "success");
  assert.equal(r.details[0]?.taskId, TASK);
  assert.equal(r.details[0]?.caseNo, "CAS-2026-0001");

  const ti = inputs[0] as Record<string, unknown>;
  assert.equal(ti.taskType, "collection");
  assert.equal(ti.sourceType, "billing_plan");
  assert.equal(ti.sourceId, PLAN);
  assert.equal(ti.priority, "high");
  assert.equal(ti.assigneeUserId, OWNER);

  const tle = t.w[0] as Record<string, unknown>;
  assert.equal(tle.entityType, "case");
  assert.equal(tle.entityId, CASE_1);
  assert.equal(tle.action, "case.collection_task_created");
});

// ─── skip: no-permission ────────────────────────────────────────

void test("no-permission skip on ForbiddenException", async () => {
  const s = svc({
    pool: stdPool(),
    cases: {
      assertCanEditCase: () => Promise.reject(new ForbiddenException()),
    },
  });
  const r = await s.bulkCollect(ctx(), [CASE_1]);
  assert.equal(r.skipped, 1);
  assert.equal(r.details[0]?.reason, "no-permission");
});

void test("no-permission skip on NotFoundException", async () => {
  const s = svc({
    pool: stdPool(),
    cases: { assertCanEditCase: () => Promise.reject(new NotFoundException()) },
  });
  const r = await s.bulkCollect(ctx(), [CASE_1]);
  assert.equal(r.skipped, 1);
  assert.equal(r.details[0]?.reason, "no-permission");
});

// ─── skip: not-overdue ──────────────────────────────────────────

void test("not-overdue when no overdue plans", async () => {
  const r = await svc({ pool: stdPool() }).bulkCollect(ctx(), [CASE_1]);
  assert.equal(r.skipped, 1);
  assert.equal(r.details[0]?.reason, "not-overdue");
});

// ─── skip: duplicate-task ───────────────────────────────────────

void test("duplicate-task when existing collection task found", async () => {
  const p = pool((sql) => {
    if (sql.includes("set_config")) return OK;
    if (sql.includes("from billing_records"))
      return Promise.resolve({ rows: [planRow()], rowCount: 1 });
    if (sql.includes("from tasks") && sql.includes("collection"))
      return Promise.resolve({ rows: [{ id: "dup" }], rowCount: 1 });
    return OK;
  });
  const r = await svc({ pool: p }).bulkCollect(ctx(), [CASE_1]);
  assert.equal(r.skipped, 1);
  assert.equal(r.details[0]?.reason, "duplicate-task");
});

// ─── skip: no-assignee ──────────────────────────────────────────

void test("no-assignee when owner_user_id is null", async () => {
  const r = await svc({ pool: stdPool({ owner_user_id: null }) }).bulkCollect(
    ctx(),
    [CASE_1],
  );
  assert.equal(r.skipped, 1);
  assert.equal(r.details[0]?.reason, "no-assignee");
});

// ─── failed: system-error ───────────────────────────────────────

void test("system-error when tasksService.create throws", async () => {
  const s = svc({
    pool: stdPool({}),
    tasks: { create: () => Promise.reject(new Error("boom")) },
  });
  const r = await s.bulkCollect(ctx(), [CASE_1]);
  assert.equal(r.failed, 1);
  assert.equal(r.details[0]?.result, "failed");
  assert.equal(r.details[0]?.reason, "system-error");
});

// ─── isolation: system-error on one case doesn't break others ───

void test("system-error isolation: one failure does not affect others", async () => {
  let n = 0;
  const s = svc({
    pool: stdPool({}),
    tasks: {
      create: () => {
        n++;
        if (n === 1) return Promise.reject(new Error("first"));
        return Promise.resolve(stubTask({ id: "ok" }));
      },
    },
  });
  const r = await s.bulkCollect(ctx(), [CASE_1, CASE_2]);
  assert.equal(r.failed, 1);
  assert.equal(r.success, 1);
  assert.equal(r.details[0]?.result, "failed");
  assert.equal(r.details[1]?.result, "success");
});

// ─── partial success ────────────────────────────────────────────

void test("partial success with mixed skip reasons", async () => {
  let i = 0;
  const s = svc({
    pool: stdPool({}),
    cases: {
      assertCanEditCase: (_c: unknown, id: unknown) => {
        i++;
        return id === CASE_1
          ? Promise.resolve()
          : Promise.reject(new ForbiddenException());
      },
    },
  });
  const r = await s.bulkCollect(ctx(), [CASE_1, CASE_2]);
  assert.equal(r.success, 1);
  assert.equal(r.skipped, 1);
  assert.ok(i >= 2);
});

// ─── fingerprint SQL shape ──────────────────────────────────────

void test("fingerprint SQL includes task_type='collection' and source_type='billing_plan'", async () => {
  const sqls: string[] = [];
  const p = pool((sql) => {
    sqls.push(sql);
    if (sql.includes("set_config")) return OK;
    if (sql.includes("billing_records"))
      return Promise.resolve({ rows: [planRow()], rowCount: 1 });
    return OK;
  });
  await svc({ pool: p }).bulkCollect(ctx(), [CASE_1]);
  const q = sqls.find(
    (s) => s.includes("from tasks") && s.includes("source_type"),
  );
  assert.ok(q);
  assert.ok(q.includes("task_type = 'collection'"));
  assert.ok(q.includes("source_type = 'billing_plan'"));
});

// ─── cross-org isolation ────────────────────────────────────────

void test("cross-org isolation: separate set_config per org", async () => {
  const cfgs: string[] = [];
  const p = pool((sql, params) => {
    if (sql.includes("set_config") && sql.includes("app.org_id"))
      cfgs.push(String(params?.[0]));
    if (sql.includes("billing_records")) return OK;
    return OK;
  });
  const s = svc({ pool: p });
  await s.bulkCollect(ctx(ORG_ID), [CASE_1]);
  await s.bulkCollect(ctx(ORG_B), [CASE_2]);
  assert.ok(cfgs.includes(ORG_ID));
  assert.ok(cfgs.includes(ORG_B));
});

// ─── overdue plan SQL shape ─────────────────────────────────────

void test("overdue plan query filters by status, due_date < now(), limit 1, order asc", async () => {
  const sqls: string[] = [];
  const p = pool((sql) => {
    sqls.push(sql);
    if (sql.includes("set_config")) return OK;
    if (sql.includes("billing_records")) return OK;
    return OK;
  });
  await svc({ pool: p }).bulkCollect(ctx(), [CASE_1]);
  const q = sqls.find((s) => s.includes("from billing_records"));
  assert.ok(q);
  assert.ok(q.includes("'due', 'partial', 'overdue'"));
  assert.ok(q.includes("due_date < now()"));
  assert.ok(q.includes("order by br.due_date asc"));
  assert.ok(q.includes("limit 1"));
});

// ─── dueAt = now + 1 day ────────────────────────────────────────

void test("task dueAt ≈ now + 1 day", async () => {
  const inputs: Record<string, unknown>[] = [];
  const before = Date.now();
  const s = svc({
    pool: stdPool({}),
    tasks: {
      create: (_c: unknown, i: unknown) => {
        inputs.push(i as Record<string, unknown>);
        return Promise.resolve(stubTask());
      },
    },
  });
  await s.bulkCollect(ctx(), [CASE_1]);
  const after = Date.now();
  const d = new Date(inputs[0]?.dueAt as string).getTime();
  const day = 86400000;
  assert.ok(d >= before + day - 1000);
  assert.ok(d <= after + day + 1000);
});

// ─── title with/without milestone ───────────────────────────────

void test("task title includes milestone name", async () => {
  const inputs: Record<string, unknown>[] = [];
  const s = svc({
    pool: stdPool({ milestone_name: "契約金" }),
    tasks: {
      create: (_c: unknown, i: unknown) => {
        inputs.push(i as Record<string, unknown>);
        return Promise.resolve(stubTask());
      },
    },
  });
  await s.bulkCollect(ctx(), [CASE_1]);
  assert.ok(String(inputs[0]?.title).includes("契約金"));
});

void test("task title uses fallback when milestone_name null", async () => {
  const inputs: Record<string, unknown>[] = [];
  const s = svc({
    pool: stdPool({ milestone_name: null }),
    tasks: {
      create: (_c: unknown, i: unknown) => {
        inputs.push(i as Record<string, unknown>);
        return Promise.resolve(stubTask());
      },
    },
  });
  await s.bulkCollect(ctx(), [CASE_1]);
  assert.ok(String(inputs[0]?.title).includes("収費ノード"));
});
