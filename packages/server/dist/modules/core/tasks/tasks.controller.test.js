import test from "node:test";
import assert from "node:assert/strict";
import { BadRequestException, UnauthorizedException } from "@nestjs/common";
import { TasksController } from "./tasks.controller";
const ORG_ID = "00000000-0000-4000-8000-000000000000";
const USER_ID = "00000000-0000-4000-8000-000000000001";
const TASK_ID = "00000000-0000-4000-8000-000000000002";
const CASE_ID = "00000000-0000-4000-8000-000000000003";
const req = {
  requestContext: { orgId: ORG_ID, userId: USER_ID, role: "staff" },
};
const mockTask = {
  id: TASK_ID,
  orgId: ORG_ID,
  caseId: CASE_ID,
  title: "Prepare submission",
  description: "Collect missing documents",
  taskType: "submission",
  assigneeUserId: USER_ID,
  priority: "high",
  dueAt: "2026-06-01T00:00:00.000Z",
  status: "pending",
  sourceType: "case",
  sourceId: CASE_ID,
  completedAt: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};
void test("TasksController create validates input and requires context", async () => {
  let calledInput;
  const service = {
    create: (_ctx, input) => {
      calledInput = input;
      return Promise.resolve(mockTask);
    },
  };
  const controller = new TasksController(service);
  await assert.rejects(
    () => controller.create({}, { title: "x" }),
    UnauthorizedException,
  );
  await assert.rejects(
    () => controller.create(req, { title: "" }),
    /title is required/,
  );
  await assert.rejects(
    () => controller.create(req, { title: "x", dueAt: "bad" }),
    /Invalid dueAt/,
  );
  const res = await controller.create(req, {
    title: "Prepare submission",
    caseId: null,
    dueAt: "2026-06-01",
  });
  assert.equal(res.id, TASK_ID);
  assert.deepEqual(calledInput, {
    caseId: null,
    title: "Prepare submission",
    description: undefined,
    taskType: undefined,
    assigneeUserId: undefined,
    priority: undefined,
    dueAt: "2026-06-01T00:00:00.000Z",
    sourceType: undefined,
    sourceId: undefined,
  });
});
void test("TasksController list parses query", async () => {
  let calledQuery;
  const service = {
    list: (_ctx, query) => {
      calledQuery = query;
      return Promise.resolve({ items: [mockTask], total: 1 });
    },
  };
  const controller = new TasksController(service);
  await assert.rejects(() => controller.list({}, {}), UnauthorizedException);
  await assert.rejects(
    () => controller.list(req, { page: "0" }),
    /Invalid page/,
  );
  await assert.rejects(
    () => controller.list(req, { limit: "201" }),
    /Invalid limit/,
  );
  const res = await controller.list(req, {
    caseId: CASE_ID,
    assigneeUserId: USER_ID,
    status: "pending",
    page: "2",
    limit: "10",
  });
  assert.equal(res.total, 1);
  assert.deepEqual(calledQuery, {
    caseId: CASE_ID,
    assigneeUserId: USER_ID,
    status: "pending",
    page: 2,
    limit: 10,
  });
});
void test("TasksController get validates context and handles not found", async () => {
  const service = {
    get: (_ctx, id) => Promise.resolve(id === TASK_ID ? mockTask : null),
  };
  const controller = new TasksController(service);
  await assert.rejects(
    () => controller.get({}, TASK_ID),
    UnauthorizedException,
  );
  await assert.rejects(() => controller.get(req, "missing"), /Task not found/);
  const res = await controller.get(req, TASK_ID);
  assert.equal(res.id, TASK_ID);
});
void test("TasksController update parses nullable fields", async () => {
  let calledInput;
  const service = {
    update: (_ctx, _id, input) => {
      calledInput = input;
      return Promise.resolve({ ...mockTask, status: "in_progress" });
    },
  };
  const controller = new TasksController(service);
  await assert.rejects(
    () => controller.update({}, TASK_ID, {}),
    UnauthorizedException,
  );
  await assert.rejects(
    () => controller.update(req, TASK_ID, { assigneeUserId: "" }),
    /assigneeUserId is required/,
  );
  const res = await controller.update(req, TASK_ID, {
    description: null,
    assigneeUserId: null,
    dueAt: null,
    status: "in_progress",
  });
  assert.equal(res.status, "in_progress");
  assert.deepEqual(calledInput, {
    caseId: undefined,
    title: undefined,
    description: null,
    taskType: undefined,
    assigneeUserId: null,
    priority: undefined,
    dueAt: null,
    status: "in_progress",
    sourceType: undefined,
    sourceId: undefined,
  });
});
void test("TasksController complete validates context and forwards id", async () => {
  let completedId = "";
  const service = {
    complete: (_ctx, id) => {
      completedId = id;
      return Promise.resolve({
        ...mockTask,
        status: "completed",
        completedAt: "2026-06-02T00:00:00.000Z",
      });
    },
  };
  const controller = new TasksController(service);
  await assert.rejects(
    () => controller.complete({}, TASK_ID),
    UnauthorizedException,
  );
  const res = await controller.complete(req, TASK_ID);
  assert.equal(res.status, "completed");
  assert.equal(completedId, TASK_ID);
});
void test("TasksController cancel validates context and forwards id", async () => {
  let cancelledId = "";
  const service = {
    cancel: (_ctx, id) => {
      cancelledId = id;
      return Promise.resolve({ ...mockTask, status: "cancelled" });
    },
  };
  const controller = new TasksController(service);
  await assert.rejects(
    () => controller.cancel({}, TASK_ID),
    UnauthorizedException,
  );
  const res = await controller.cancel(req, TASK_ID);
  assert.equal(res.status, "cancelled");
  assert.equal(cancelledId, TASK_ID);
});
void test("TasksController create rejects non-UUID assigneeUserId with TASK_INVALID_ASSIGNEE_ID", async () => {
  const service = {
    create: () => Promise.resolve(mockTask),
  };
  const controller = new TasksController(service);
  await assert.rejects(
    () =>
      controller.create(req, {
        title: "Test",
        assigneeUserId: "not-a-uuid",
      }),
    (err) => {
      assert.ok(err instanceof BadRequestException);
      const body = err.getResponse();
      assert.equal(body.errorCode, "TASK_INVALID_ASSIGNEE_ID");
      return true;
    },
  );
  await assert.rejects(
    () =>
      controller.create(req, {
        title: "Test",
        assigneeUserId: "suzuki",
      }),
    (err) => {
      assert.ok(err instanceof BadRequestException);
      const body = err.getResponse();
      assert.equal(body.errorCode, "TASK_INVALID_ASSIGNEE_ID");
      return true;
    },
  );
});
void test("TasksController create allows null assigneeUserId", async () => {
  let calledInput;
  const service = {
    create: (_ctx, input) => {
      calledInput = input;
      return Promise.resolve(mockTask);
    },
  };
  const controller = new TasksController(service);
  await controller.create(req, {
    title: "Test",
    assigneeUserId: null,
  });
  assert.equal(calledInput?.assigneeUserId, null);
});
void test("TasksController create allows valid UUID assigneeUserId", async () => {
  let calledInput;
  const service = {
    create: (_ctx, input) => {
      calledInput = input;
      return Promise.resolve(mockTask);
    },
  };
  const controller = new TasksController(service);
  await controller.create(req, {
    title: "Test",
    assigneeUserId: USER_ID,
  });
  assert.equal(calledInput?.assigneeUserId, USER_ID);
});
void test("TasksController update rejects non-UUID assigneeUserId with TASK_INVALID_ASSIGNEE_ID", async () => {
  const service = {
    update: () => Promise.resolve(mockTask),
  };
  const controller = new TasksController(service);
  await assert.rejects(
    () =>
      controller.update(req, TASK_ID, {
        assigneeUserId: "not-a-uuid",
      }),
    (err) => {
      assert.ok(err instanceof BadRequestException);
      const body = err.getResponse();
      assert.equal(body.errorCode, "TASK_INVALID_ASSIGNEE_ID");
      return true;
    },
  );
});
//# sourceMappingURL=tasks.controller.test.js.map
