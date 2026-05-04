import assert from "node:assert/strict";
import test from "node:test";
import { BadRequestException, UnauthorizedException } from "@nestjs/common";
import { DashboardController } from "./dashboard.controller";
const req = {
  requestContext: {
    orgId: "00000000-0000-4000-8000-000000000000",
    userId: "00000000-0000-4000-8000-000000000001",
    role: "viewer",
  },
};
void test("DashboardController.summary forwards parsed query", async () => {
  let calledWith;
  const service = {
    getSummary: (_ctx, input) => {
      calledWith = input;
      return Promise.resolve({ ok: true });
    },
  };
  const controller = new DashboardController(service);
  const result = await controller.summary(req, {
    scope: "all",
    timeWindow: "30",
  });
  assert.deepEqual(calledWith, {
    scope: "all",
    timeWindow: 30,
    groupId: undefined,
  });
  assert.deepEqual(result, { ok: true });
});
void test("DashboardController.summary uses default query values", async () => {
  let calledWith;
  const service = {
    getSummary: (_ctx, input) => {
      calledWith = input;
      return Promise.resolve({ ok: true });
    },
  };
  const controller = new DashboardController(service);
  await controller.summary(req, {});
  assert.deepEqual(calledWith, {
    scope: "mine",
    timeWindow: 7,
    groupId: undefined,
  });
});
void test("DashboardController.summary rejects invalid scope aliases", async () => {
  const controller = new DashboardController({});
  for (const scope of ["invalid", "team", "my-team", "all-firm", "firm"]) {
    await assert.rejects(
      () => controller.summary(req, { scope }),
      BadRequestException,
    );
  }
});
void test("DashboardController.summary passes valid groupId", async () => {
  let calledWith;
  const service = {
    getSummary: (_ctx, input) => {
      calledWith = input;
      return Promise.resolve({ ok: true });
    },
  };
  const controller = new DashboardController(service);
  await controller.summary(req, {
    scope: "group",
    groupId: "11111111-1111-4111-8111-111111111111",
  });
  assert.deepEqual(calledWith, {
    scope: "group",
    timeWindow: 7,
    groupId: "11111111-1111-4111-8111-111111111111",
  });
});
void test("DashboardController.summary treats empty groupId as undefined", async () => {
  let calledWith;
  const service = {
    getSummary: (_ctx, input) => {
      calledWith = input;
      return Promise.resolve({ ok: true });
    },
  };
  const controller = new DashboardController(service);
  await controller.summary(req, { scope: "group", groupId: "" });
  assert.deepEqual(calledWith, {
    scope: "group",
    timeWindow: 7,
    groupId: undefined,
  });
});
void test("DashboardController.summary rejects non-uuid groupId", async () => {
  const controller = new DashboardController({});
  await assert.rejects(
    () =>
      controller.summary(req, {
        scope: "group",
        groupId: "not-a-uuid",
      }),
    BadRequestException,
  );
});
void test("DashboardController.summary requires request context", async () => {
  const controller = new DashboardController({});
  await assert.rejects(() => controller.summary({}, {}), UnauthorizedException);
});
void test("DashboardController.groups returns service result", async () => {
  const groups = [
    {
      id: "11111111-1111-4111-8111-111111111111",
      name: "Tokyo 1",
      isPrimary: true,
      isMember: true,
    },
  ];
  const service = {
    listVisibleGroups: () => Promise.resolve(groups),
  };
  const controller = new DashboardController(service);
  const result = await controller.groups(req);
  assert.deepEqual(result, groups);
});
void test("DashboardController.groups requires request context", async () => {
  const controller = new DashboardController({});
  await assert.rejects(() => controller.groups({}), UnauthorizedException);
});
//# sourceMappingURL=dashboard.controller.test.js.map
