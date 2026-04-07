import test from "node:test";
import assert from "node:assert/strict";
import { UnauthorizedException } from "@nestjs/common";

import type { Task } from "../model/coreEntities";
import { TasksController } from "./tasks.controller";
import { TasksService } from "./tasks.service";

const ORG_ID = "00000000-0000-4000-8000-000000000000";
const USER_ID = "00000000-0000-4000-8000-000000000001";
const TASK_ID = "00000000-0000-4000-8000-000000000002";
const CASE_ID = "00000000-0000-4000-8000-000000000003";

const req = {
  requestContext: { orgId: ORG_ID, userId: USER_ID, role: "staff" as const },
};

const mockTask: Task = {
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
  let calledInput: Record<string, unknown> | undefined;
  const service = {
    create: (_ctx: unknown, input: Record<string, unknown>) => {
      calledInput = input;
      return Promise.resolve(mockTask);
    },
  } as unknown as TasksService;
  const controller = new TasksController(service);

  await assert.rejects(
    () => controller.create({} as never, { title: "x" } as never),
    UnauthorizedException,
  );
  await assert.rejects(
    () => controller.create(req as never, { title: "" } as never),
    /title is required/,
  );
  await assert.rejects(
    () =>
      controller.create(req as never, { title: "x", dueAt: "bad" } as never),
    /Invalid dueAt/,
  );

  const res = await controller.create(
    req as never,
    { title: "Prepare submission", caseId: null, dueAt: "2026-06-01" } as never,
  );
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
  let calledQuery: Record<string, unknown> | undefined;
  const service = {
    list: (_ctx: unknown, query: Record<string, unknown>) => {
      calledQuery = query;
      return Promise.resolve({ items: [mockTask], total: 1 });
    },
  } as unknown as TasksService;
  const controller = new TasksController(service);

  await assert.rejects(
    () => controller.list({} as never, {}),
    UnauthorizedException,
  );
  await assert.rejects(
    () => controller.list(req as never, { page: "0" }),
    /Invalid page/,
  );
  await assert.rejects(
    () => controller.list(req as never, { limit: "201" }),
    /Invalid limit/,
  );

  const res = await controller.list(req as never, {
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
    get: (_ctx: unknown, id: string) =>
      Promise.resolve(id === TASK_ID ? mockTask : null),
  } as unknown as TasksService;
  const controller = new TasksController(service);

  await assert.rejects(
    () => controller.get({} as never, TASK_ID),
    UnauthorizedException,
  );
  await assert.rejects(
    () => controller.get(req as never, "missing"),
    /Task not found/,
  );
  const res = await controller.get(req as never, TASK_ID);
  assert.equal(res.id, TASK_ID);
});

void test("TasksController update parses nullable fields", async () => {
  let calledInput: Record<string, unknown> | undefined;
  const service = {
    update: (_ctx: unknown, _id: string, input: Record<string, unknown>) => {
      calledInput = input;
      return Promise.resolve({ ...mockTask, status: "in_progress" });
    },
  } as unknown as TasksService;
  const controller = new TasksController(service);

  await assert.rejects(
    () => controller.update({} as never, TASK_ID, {}),
    UnauthorizedException,
  );
  await assert.rejects(
    () => controller.update(req as never, TASK_ID, { assigneeUserId: "" }),
    /assigneeUserId is required/,
  );

  const res = await controller.update(req as never, TASK_ID, {
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
    complete: (_ctx: unknown, id: string) => {
      completedId = id;
      return Promise.resolve({
        ...mockTask,
        status: "completed",
        completedAt: "2026-06-02T00:00:00.000Z",
      });
    },
  } as unknown as TasksService;
  const controller = new TasksController(service);

  await assert.rejects(
    () => controller.complete({} as never, TASK_ID),
    UnauthorizedException,
  );
  const res = await controller.complete(req as never, TASK_ID);
  assert.equal(res.status, "completed");
  assert.equal(completedId, TASK_ID);
});

void test("TasksController cancel validates context and forwards id", async () => {
  let cancelledId = "";
  const service = {
    cancel: (_ctx: unknown, id: string) => {
      cancelledId = id;
      return Promise.resolve({ ...mockTask, status: "cancelled" });
    },
  } as unknown as TasksService;
  const controller = new TasksController(service);

  await assert.rejects(
    () => controller.cancel({} as never, TASK_ID),
    UnauthorizedException,
  );
  const res = await controller.cancel(req as never, TASK_ID);
  assert.equal(res.status, "cancelled");
  assert.equal(cancelledId, TASK_ID);
});
