import test from "node:test";
import assert from "node:assert/strict";
import {
  BadRequestException,
  InternalServerErrorException,
} from "@nestjs/common";
import { TasksService, TASK_WRITE_ERROR_CODES } from "./tasks.service";
const ORG_ID = "00000000-0000-4000-8000-000000000000";
const USER_ID = "00000000-0000-4000-8000-000000000001";
const CASE_ID = "case-1";
function makeCtx() {
  return { orgId: ORG_ID, userId: USER_ID, role: "staff" };
}
function makePool(queryFn) {
  const client = { query: queryFn, release: () => undefined };
  return { connect: () => Promise.resolve(client) };
}
function makeTimeline() {
  return {
    service: { write: () => Promise.resolve() },
  };
}
function svc(pool, tl) {
  return new TasksService(pool, tl.service);
}
function ok(rows) {
  return Promise.resolve({ rows, rowCount: rows.length });
}
void test("PG 23503 FK violation on assignee → TASK_ASSIGNEE_NOT_FOUND", async () => {
  const pool = makePool((sql) => {
    if (sql.includes("select id from cases")) return ok([{ id: CASE_ID }]);
    if (sql.includes("select id from users")) return ok([{ id: USER_ID }]);
    if (sql.includes("insert into tasks")) {
      throw Object.assign(new Error("FK violation"), {
        code: "23503",
        constraint: "fk_tasks_assignee_user",
      });
    }
    return ok([]);
  });
  await assert.rejects(
    () =>
      svc(pool, makeTimeline()).create(makeCtx(), {
        caseId: CASE_ID,
        title: "Test task",
        assigneeUserId: USER_ID,
      }),
    (err) => {
      assert.ok(err instanceof BadRequestException);
      const body = err.getResponse();
      assert.equal(body.errorCode, TASK_WRITE_ERROR_CODES.ASSIGNEE_NOT_FOUND);
      const detail = body.detail;
      assert.equal(detail.pgCode, "23503");
      assert.equal(detail.constraint, "fk_tasks_assignee_user");
      return true;
    },
  );
});
void test("PG 23503 FK violation on non-assignee → TASK_CREATE_FAILED", async () => {
  const pool = makePool((sql) => {
    if (sql.includes("select id from cases")) return ok([{ id: CASE_ID }]);
    if (sql.includes("insert into tasks")) {
      throw Object.assign(new Error("FK violation"), {
        code: "23503",
        constraint: "fk_tasks_case_id",
      });
    }
    return ok([]);
  });
  await assert.rejects(
    () =>
      svc(pool, makeTimeline()).create(makeCtx(), {
        caseId: CASE_ID,
        title: "Test task",
      }),
    (err) => {
      assert.ok(err instanceof BadRequestException);
      const body = err.getResponse();
      assert.equal(body.errorCode, TASK_WRITE_ERROR_CODES.CREATE_FAILED);
      return true;
    },
  );
});
void test("Unknown DB error → 500 TASK_CREATE_FAILED", async () => {
  const pool = makePool((sql) => {
    if (sql.includes("select id from cases")) return ok([{ id: CASE_ID }]);
    if (sql.includes("insert into tasks")) throw new Error("connection reset");
    return ok([]);
  });
  await assert.rejects(
    () =>
      svc(pool, makeTimeline()).create(makeCtx(), {
        caseId: CASE_ID,
        title: "Test task",
      }),
    (err) => {
      assert.ok(err instanceof InternalServerErrorException);
      const body = err.getResponse();
      assert.equal(body.errorCode, TASK_WRITE_ERROR_CODES.CREATE_FAILED);
      return true;
    },
  );
});
void test("HttpException from assertBelongsToOrg re-thrown as-is", async () => {
  const pool = makePool((sql) => {
    if (sql.includes("select id from cases")) return ok([]);
    return ok([]);
  });
  await assert.rejects(
    () =>
      svc(pool, makeTimeline()).create(makeCtx(), {
        caseId: "foreign-case",
        title: "Test task",
      }),
    (err) => {
      assert.ok(err instanceof BadRequestException);
      assert.ok(err.message.includes("cases"));
      return true;
    },
  );
});
//# sourceMappingURL=tasks.service.fk-violation.test.js.map
