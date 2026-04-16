import assert from "node:assert/strict";
import test from "node:test";
import { BadRequestException, UnauthorizedException } from "@nestjs/common";

import { DashboardController } from "./dashboard.controller";
import { DashboardService } from "./dashboard.service";

const req = {
  requestContext: {
    orgId: "00000000-0000-4000-8000-000000000000",
    userId: "00000000-0000-4000-8000-000000000001",
    role: "viewer" as const,
  },
};

void test("DashboardController.summary forwards parsed query", async () => {
  let calledWith: unknown;
  const service = {
    getSummary: (_ctx: unknown, input: unknown) => {
      calledWith = input;
      return Promise.resolve({ ok: true });
    },
  } as unknown as DashboardService;

  const controller = new DashboardController(service);
  const result = await controller.summary(req as never, {
    scope: "all",
    timeWindow: "30",
  });

  assert.deepEqual(calledWith, { scope: "all", timeWindow: 30 });
  assert.deepEqual(result, { ok: true });
});

void test("DashboardController.summary uses default query values", async () => {
  let calledWith: unknown;
  const service = {
    getSummary: (_ctx: unknown, input: unknown) => {
      calledWith = input;
      return Promise.resolve({ ok: true });
    },
  } as unknown as DashboardService;

  const controller = new DashboardController(service);
  await controller.summary(req as never, {});

  assert.deepEqual(calledWith, { scope: "mine", timeWindow: 7 });
});

void test("DashboardController.summary rejects invalid scope", async () => {
  const controller = new DashboardController({} as DashboardService);

  await assert.rejects(
    () => controller.summary(req as never, { scope: "invalid" }),
    BadRequestException,
  );
});

void test("DashboardController.summary requires request context", async () => {
  const controller = new DashboardController({} as DashboardService);

  await assert.rejects(
    () => controller.summary({} as never, {}),
    UnauthorizedException,
  );
});
