import test from "node:test";
import assert from "node:assert/strict";
import { TasksService, mapTaskRow, mapTaskListRow } from "./tasks.service";
const ORG_ID = "00000000-0000-4000-8000-000000000000";
const USER_ID = "00000000-0000-4000-8000-000000000001";
const TASK_ID = "task-1";
const CASE_ID = "case-1";
function makeCtx(role = "staff") {
  return { orgId: ORG_ID, userId: USER_ID, role };
}
function makeTaskRow(overrides = {}) {
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
function makeTaskListRow(overrides = {}) {
  return {
    ...makeTaskRow(),
    case_no: "COE-2026-05-001",
    case_name: "田中太郎 COE申請",
    assignee_name: "佐藤花子",
    ...overrides,
  };
}
function makePool(queryFn) {
  const client = { query: queryFn, release: () => undefined };
  return { connect: () => Promise.resolve(client) };
}
function makeTimeline() {
  const writes = [];
  return {
    service: {
      write: (_ctx, input) => {
        writes.push(input);
        return Promise.resolve();
      },
    },
    writes,
  };
}
function svc(pool, tl) {
  return new TasksService(pool, tl.service);
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
    return Promise.resolve({
      rows: [makeTaskListRow()],
      rowCount: 1,
    });
  });
  const result = await svc(pool, makeTimeline()).list(makeCtx("viewer"));
  assert.equal(result.total, 1);
  assert.equal(result.items.length, 1);
});
void test("TasksService.list filters by caseId/assigneeUserId/status", async () => {
  const calls = [];
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
  assert.ok(countSql.sql.includes("t.case_id = $"));
  assert.ok(countSql.sql.includes("t.assignee_user_id = $"));
  assert.ok(countSql.sql.includes("t.status = $"));
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
  assert.equal(tl.writes[0].action, "task.updated");
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
  assert.equal(tl.writes[0].action, "task.completed");
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
  assert.equal(tl.writes[0].action, "task.cancelled");
});
void test("mapTaskListRow maps joined row with caseNo/caseName/assigneeName", () => {
  const item = mapTaskListRow(makeTaskListRow());
  assert.equal(item.id, TASK_ID);
  assert.equal(item.caseNo, "COE-2026-05-001");
  assert.equal(item.caseName, "田中太郎 COE申請");
  assert.equal(item.assigneeName, "佐藤花子");
  assert.equal(item.caseId, CASE_ID);
  assert.equal(item.taskType, "submission");
});
void test("mapTaskListRow handles null join fields", () => {
  const item = mapTaskListRow(
    makeTaskListRow({
      case_id: null,
      case_no: null,
      case_name: null,
      assignee_user_id: null,
      assignee_name: null,
    }),
  );
  assert.equal(item.caseNo, null);
  assert.equal(item.caseName, null);
  assert.equal(item.assigneeName, null);
  assert.equal(item.caseId, null);
});
void test("TasksService.list SQL joins cases and users tables", async () => {
  const calls = [];
  const pool = makePool((sql) => {
    calls.push(sql.trim());
    if (sql.includes("count(*)")) {
      return Promise.resolve({ rows: [{ count: "1" }], rowCount: 1 });
    }
    return Promise.resolve({ rows: [makeTaskListRow()], rowCount: 1 });
  });
  const result = await svc(pool, makeTimeline()).list(makeCtx("viewer"));
  const listSql = calls.find(
    (s) => !s.includes("count(*)") && s.includes("from tasks"),
  );
  assert.ok(listSql, "list query should exist");
  assert.ok(listSql.includes("left join cases c"), "should join cases");
  assert.ok(listSql.includes("left join users u"), "should join users");
  assert.ok(listSql.includes("c.case_no"), "should select case_no");
  assert.ok(listSql.includes("c.case_name"), "should select case_name");
  assert.ok(
    listSql.includes("u.name as assignee_name"),
    "should select assignee_name",
  );
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].caseNo, "COE-2026-05-001");
  assert.equal(result.items[0].caseName, "田中太郎 COE申請");
  assert.equal(result.items[0].assigneeName, "佐藤花子");
});
//# sourceMappingURL=tasks.service.test.js.map
