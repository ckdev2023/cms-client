import test from "node:test";
import assert from "node:assert/strict";
import type { Pool } from "pg";

import { TasksService, mapTaskRow } from "./tasks.service";
import type { RequestContext } from "../tenancy/requestContext";

const ORG_ID = "00000000-0000-4000-8000-000000000000";
const USER_ID = "00000000-0000-4000-8000-000000000001";
const TASK_ID = "task-1";
const CASE_ID = "case-1";

function makeCtx(
  role: "staff" | "viewer" | "manager" = "staff",
): RequestContext {
  return { orgId: ORG_ID, userId: USER_ID, role };
}

function makeTaskRow(overrides: Record<string, unknown> = {}) {
  return {
    id: TASK_ID,
    org_id: ORG_ID,
    case_id: CASE_ID,
    title: "Prepare submission",
    description: "collect docs",
    task_type: "submission",
    assignee_user_id: USER_ID,
    priority: "high",
    due_at: "2026-06-01T00:00:00.000Z",
    status: "pending",
    source_type: "case",
    source_id: CASE_ID,
    completed_at: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

type PoolClientLike = {
  query: (
    sql: string,
    params?: unknown[],
  ) => Promise<{ rows: unknown[]; rowCount: number }>;
  release: () => void;
};

function makePool(queryFn: PoolClientLike["query"]): Pool {
  const client: PoolClientLike = { query: queryFn, release: () => undefined };
  return { connect: () => Promise.resolve(client) } as unknown as Pool;
}

function makeTimeline() {
  const writes: unknown[] = [];
  return {
    service: {
      write: (_ctx: unknown, input: unknown) => {
        writes.push(input);
        return Promise.resolve();
      },
    },
    writes,
  };
}

function svc(pool: Pool, tl: ReturnType<typeof makeTimeline>) {
  return new TasksService(pool, tl.service as never);
}

void test("mapTaskRow maps row to Task entity", () => {
  const task = mapTaskRow(makeTaskRow());
  assert.equal(task.id, TASK_ID);
  assert.equal(task.caseId, CASE_ID);
  assert.equal(task.taskType, "submission");
  assert.equal(task.priority, "high");
  assert.equal(task.completedAt, null);
});

void test("mapTaskRow handles null optional fields", () => {
  const task = mapTaskRow(
    makeTaskRow({
      case_id: null,
      description: null,
      assignee_user_id: null,
      due_at: null,
      source_type: null,
      source_id: null,
    }),
  );
  assert.equal(task.caseId, null);
  assert.equal(task.description, null);
  assert.equal(task.assigneeUserId, null);
  assert.equal(task.dueAt, null);
});

void test("TasksService.create inserts row and writes timeline", async () => {
  const pool = makePool((sql) => {
    if (sql.includes("select id from cases")) {
      return Promise.resolve({ rows: [{ id: CASE_ID }], rowCount: 1 });
    }
    if (sql.includes("select id from users")) {
      return Promise.resolve({ rows: [{ id: USER_ID }], rowCount: 1 });
    }
    if (sql.includes("insert into tasks")) {
      return Promise.resolve({ rows: [makeTaskRow()], rowCount: 1 });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  const tl = makeTimeline();
  const created = await svc(pool, tl).create(makeCtx(), {
    caseId: CASE_ID,
    title: "Prepare submission",
    taskType: "submission",
    assigneeUserId: USER_ID,
    priority: "high",
  });

  assert.equal(created.id, TASK_ID);
  assert.equal(created.status, "pending");
  assert.equal(tl.writes.length, 1);
  assert.deepEqual(tl.writes[0], {
    entityType: "task",
    entityId: TASK_ID,
    action: "task.created",
    payload: {
      caseId: CASE_ID,
      title: "Prepare submission",
      status: "pending",
    },
  });
});

void test("TasksService.create rejects cross-tenant caseId", async () => {
  const pool = makePool((sql) => {
    if (sql.includes("select id from cases")) {
      return Promise.resolve({ rows: [], rowCount: 0 });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  await assert.rejects(
    () =>
      svc(pool, makeTimeline()).create(makeCtx(), {
        caseId: "foreign-case",
        title: "Prepare submission",
      }),
    (err) => {
      assert.ok(err instanceof Error);
      assert.ok(err.message.includes("cases"));
      return true;
    },
  );
});

void test("TasksService.get returns task or null", async () => {
  const pool = makePool((sql, params) => {
    if (sql.includes("from tasks") && params?.[0] === TASK_ID) {
      return Promise.resolve({ rows: [makeTaskRow()], rowCount: 1 });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  const service = svc(pool, makeTimeline());
  const found = await service.get(makeCtx("viewer"), TASK_ID);
  assert.ok(found);
  assert.equal(found.id, TASK_ID);

  const missing = await service.get(makeCtx("viewer"), "missing");
  assert.equal(missing, null);
});

void test("TasksService.list returns items and total", async () => {
  const pool = makePool((sql) => {
    if (sql.includes("count(*)")) {
      return Promise.resolve({ rows: [{ count: "1" }], rowCount: 1 });
    }
    return Promise.resolve({ rows: [makeTaskRow()], rowCount: 1 });
  });

  const result = await svc(pool, makeTimeline()).list(makeCtx("viewer"));
  assert.equal(result.total, 1);
  assert.equal(result.items.length, 1);
});

void test("TasksService.list filters by caseId/assigneeUserId/status", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];
  const pool = makePool((sql, params) => {
    calls.push({ sql: sql.trim(), params });
    if (sql.includes("count(*)")) {
      return Promise.resolve({ rows: [{ count: "0" }], rowCount: 1 });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  await svc(pool, makeTimeline()).list(makeCtx("viewer"), {
    caseId: CASE_ID,
    assigneeUserId: USER_ID,
    status: "pending",
  });

  const countSql = calls.find((call) => call.sql.includes("count(*)"));
  assert.ok(countSql);
  assert.ok(countSql.sql.includes("case_id = $"));
  assert.ok(countSql.sql.includes("assignee_user_id = $"));
  assert.ok(countSql.sql.includes("status = $"));
});

void test("TasksService.update updates fields, advances to in_progress and writes timeline", async () => {
  const pool = makePool((sql, params) => {
    if (sql.includes("from tasks") && params?.[0] === TASK_ID) {
      return Promise.resolve({ rows: [makeTaskRow()], rowCount: 1 });
    }
    if (sql.includes("select id from cases")) {
      return Promise.resolve({ rows: [{ id: CASE_ID }], rowCount: 1 });
    }
    if (sql.includes("select id from users")) {
      return Promise.resolve({ rows: [{ id: USER_ID }], rowCount: 1 });
    }
    if (sql.includes("update tasks")) {
      return Promise.resolve({
        rows: [makeTaskRow({ status: "in_progress", title: "Updated title" })],
        rowCount: 1,
      });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  const tl = makeTimeline();
  const updated = await svc(pool, tl).update(makeCtx(), TASK_ID, {
    title: "Updated title",
    status: "in_progress",
    assigneeUserId: USER_ID,
  });

  assert.equal(updated.title, "Updated title");
  assert.equal(updated.status, "in_progress");
  assert.equal(tl.writes.length, 1);
  assert.equal(
    (tl.writes[0] as Record<string, unknown>).action,
    "task.updated",
  );
});

void test("TasksService.update rejects invalid mutable status transition", async () => {
  const pool = makePool((sql, params) => {
    if (sql.includes("from tasks") && params?.[0] === TASK_ID) {
      return Promise.resolve({ rows: [makeTaskRow()], rowCount: 1 });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  await assert.rejects(
    () =>
      svc(pool, makeTimeline()).update(makeCtx(), TASK_ID, {
        status: "completed",
      }),
    (err) => {
      assert.ok(err instanceof Error);
      assert.ok(err.message.includes("complete/cancel"));
      return true;
    },
  );
});

void test("TasksService.update blocks changes to terminal task", async () => {
  const pool = makePool((sql, params) => {
    if (sql.includes("from tasks") && params?.[0] === TASK_ID) {
      return Promise.resolve({
        rows: [
          makeTaskRow({
            status: "completed",
            completed_at: "2026-02-01T00:00:00.000Z",
          }),
        ],
        rowCount: 1,
      });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  await assert.rejects(
    () =>
      svc(pool, makeTimeline()).update(makeCtx(), TASK_ID, { title: "Nope" }),
    {
      name: "BadRequestException",
      message: "Terminal tasks cannot be updated",
    },
  );
});

void test("TasksService.complete sets completed_at and writes timeline", async () => {
  const pool = makePool((sql, params) => {
    if (sql.includes("from tasks") && params?.[0] === TASK_ID) {
      return Promise.resolve({
        rows: [makeTaskRow({ status: "in_progress" })],
        rowCount: 1,
      });
    }
    if (sql.includes("update tasks")) {
      return Promise.resolve({
        rows: [
          makeTaskRow({
            status: "completed",
            completed_at: "2026-02-01T00:00:00.000Z",
          }),
        ],
        rowCount: 1,
      });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  const tl = makeTimeline();
  const completed = await svc(pool, tl).complete(makeCtx(), TASK_ID);
  assert.equal(completed.status, "completed");
  assert.equal(completed.completedAt, "2026-02-01T00:00:00.000Z");
  assert.equal(
    (tl.writes[0] as Record<string, unknown>).action,
    "task.completed",
  );
});

void test("TasksService.complete rejects terminal transition", async () => {
  const pool = makePool((sql, params) => {
    if (sql.includes("from tasks") && params?.[0] === TASK_ID) {
      return Promise.resolve({
        rows: [makeTaskRow({ status: "cancelled" })],
        rowCount: 1,
      });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  await assert.rejects(
    () => svc(pool, makeTimeline()).complete(makeCtx(), TASK_ID),
    {
      name: "BadRequestException",
      message: "Transition from 'cancelled' to 'completed' is not allowed",
    },
  );
});

void test("TasksService.cancel sets status and writes timeline", async () => {
  const pool = makePool((sql, params) => {
    if (sql.includes("from tasks") && params?.[0] === TASK_ID) {
      return Promise.resolve({
        rows: [makeTaskRow({ status: "pending" })],
        rowCount: 1,
      });
    }
    if (sql.includes("update tasks")) {
      return Promise.resolve({
        rows: [makeTaskRow({ status: "cancelled" })],
        rowCount: 1,
      });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  const tl = makeTimeline();
  const cancelled = await svc(pool, tl).cancel(makeCtx(), TASK_ID);
  assert.equal(cancelled.status, "cancelled");
  assert.equal(
    (tl.writes[0] as Record<string, unknown>).action,
    "task.cancelled",
  );
});
