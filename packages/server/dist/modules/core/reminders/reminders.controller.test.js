import test from "node:test";
import assert from "node:assert/strict";
import { BadRequestException, UnauthorizedException } from "@nestjs/common";
import { RemindersController } from "./reminders.controller";
const ORG_ID = "00000000-0000-4000-8000-000000000000";
const USER_ID = "00000000-0000-4000-8000-000000000001";
const CASE_ID = "00000000-0000-4000-8000-000000000003";
const TARGET_ID = "00000000-0000-4000-8000-000000000004";
const REMINDER_ID = "00000000-0000-4000-8000-000000000005";
const req = {
  requestContext: { orgId: ORG_ID, userId: USER_ID, role: "staff" },
};
const mockReminder = {
  id: REMINDER_ID,
  orgId: ORG_ID,
  caseId: CASE_ID,
  targetType: "case",
  targetId: TARGET_ID,
  remindAt: "2026-06-01T00:00:00.000Z",
  recipientType: "user",
  recipientId: USER_ID,
  channel: "in_app",
  dedupeKey: null,
  sendStatus: "pending",
  retryCount: 0,
  sentAt: null,
  payloadSnapshot: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};
function makeController(overrides = {}) {
  const service = {
    create: () => Promise.resolve(mockReminder),
    list: () => Promise.resolve({ items: [mockReminder], total: 1 }),
    get: () => Promise.resolve(mockReminder),
    due: () => Promise.resolve([mockReminder]),
    update: () => Promise.resolve(mockReminder),
    cancel: () => Promise.resolve(),
    ...overrides,
  };
  return new RemindersController(service);
}
void test("RemindersController.create requires request context", async () => {
  const controller = makeController();
  await assert.rejects(
    () =>
      controller.create(
        {},
        {
          targetType: "case",
          targetId: TARGET_ID,
          remindAt: "2026-06-01T00:00:00.000Z",
        },
      ),
    UnauthorizedException,
  );
});
void test("RemindersController.create rejects non-UUID targetId with errorCode", async () => {
  const controller = makeController();
  await assert.rejects(
    () =>
      controller.create(req, {
        targetType: "case",
        targetId: "not-a-uuid",
        remindAt: "2026-06-01T00:00:00.000Z",
      }),
    (err) => {
      assert.ok(err instanceof BadRequestException);
      const response = err.getResponse();
      assert.equal(response.errorCode, "REMINDER_INVALID_TARGET_ID");
      return true;
    },
  );
});
void test("RemindersController.create rejects non-UUID caseId with errorCode", async () => {
  const controller = makeController();
  await assert.rejects(
    () =>
      controller.create(req, {
        targetType: "case",
        targetId: TARGET_ID,
        remindAt: "2026-06-01T00:00:00.000Z",
        caseId: "bad-case-id",
      }),
    (err) => {
      assert.ok(err instanceof BadRequestException);
      const response = err.getResponse();
      assert.equal(response.errorCode, "REMINDER_INVALID_CASE_ID");
      return true;
    },
  );
});
void test("RemindersController.create accepts valid UUIDs and forwards to service", async () => {
  let calledInput;
  const controller = makeController({
    create: (_ctx, input) => {
      calledInput = input;
      return Promise.resolve(mockReminder);
    },
  });
  const res = await controller.create(req, {
    targetType: "case",
    targetId: TARGET_ID,
    remindAt: "2026-06-01T00:00:00.000Z",
    caseId: CASE_ID,
  });
  assert.equal(res.id, REMINDER_ID);
  assert.ok(calledInput);
  assert.equal(calledInput.targetId, TARGET_ID);
  assert.equal(calledInput.caseId, CASE_ID);
});
void test("RemindersController.create accepts omitted caseId", async () => {
  let calledInput;
  const controller = makeController({
    create: (_ctx, input) => {
      calledInput = input;
      return Promise.resolve(mockReminder);
    },
  });
  await controller.create(req, {
    targetType: "case",
    targetId: TARGET_ID,
    remindAt: "2026-06-01T00:00:00.000Z",
  });
  assert.equal(calledInput?.caseId, undefined);
});
void test("RemindersController.create validates required fields", async () => {
  const controller = makeController();
  await assert.rejects(
    () =>
      controller.create(req, {
        targetType: "",
        targetId: TARGET_ID,
        remindAt: "2026-06-01T00:00:00.000Z",
      }),
    /Invalid targetType/,
  );
  await assert.rejects(
    () =>
      controller.create(req, {
        targetType: "case",
        targetId: TARGET_ID,
        remindAt: "bad-date",
      }),
    /Invalid remindAt/,
  );
});
void test("RemindersController.list requires context and parses query", async () => {
  const controller = makeController();
  await assert.rejects(() => controller.list({}, {}), UnauthorizedException);
  const res = await controller.list(req, {
    sendStatus: "pending",
    targetType: "case",
    page: "1",
    limit: "10",
  });
  assert.equal(res.total, 1);
});
void test("RemindersController.get requires context and handles not found", async () => {
  const controller = makeController({
    get: (_ctx, id) =>
      Promise.resolve(id === REMINDER_ID ? mockReminder : null),
  });
  await assert.rejects(
    () => controller.get({}, REMINDER_ID),
    UnauthorizedException,
  );
  await assert.rejects(
    () => controller.get(req, "missing"),
    /Reminder not found/,
  );
  const res = await controller.get(req, REMINDER_ID);
  assert.equal(res.id, REMINDER_ID);
});
//# sourceMappingURL=reminders.controller.test.js.map
