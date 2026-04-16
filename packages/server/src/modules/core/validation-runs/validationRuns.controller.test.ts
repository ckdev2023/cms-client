import test from "node:test";
import assert from "node:assert/strict";
import { UnauthorizedException } from "@nestjs/common";

import { ValidationRunsController } from "./validationRuns.controller";
import { ValidationRunsService } from "./validationRuns.service";

const ORG_ID = "00000000-0000-4000-8000-000000000000";
const USER_ID = "00000000-0000-4000-8000-000000000001";
const CASE_ID = "00000000-0000-4000-8000-000000000002";
const VALIDATION_RUN_ID = "00000000-0000-4000-8000-000000000003";

const req = {
  requestContext: { orgId: ORG_ID, userId: USER_ID, role: "staff" as const },
};

const mockValidationRun = {
  id: VALIDATION_RUN_ID,
  orgId: ORG_ID,
  caseId: CASE_ID,
  rulesetRef: { gate: "submission_readiness" },
  resultStatus: "passed",
  blockingCount: 0,
  warningCount: 0,
  reportPayload: { checks: [] },
  executedBy: USER_ID,
  executedAt: "2026-01-01T00:00:00.000Z",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

void test("ValidationRunsController.create validates body and requires context", async () => {
  let calledInput: Record<string, unknown> | undefined;
  const service = {
    create: (_ctx: unknown, input: Record<string, unknown>) => {
      calledInput = input;
      return Promise.resolve(mockValidationRun);
    },
  } as unknown as ValidationRunsService;
  const controller = new ValidationRunsController(service);

  await assert.rejects(
    () => controller.create({} as never, { caseId: CASE_ID } as never),
    UnauthorizedException,
  );
  await assert.rejects(
    () => controller.create(req as never, { caseId: "" } as never),
    /caseId is required/,
  );
  await assert.rejects(
    () =>
      controller.create(
        req as never,
        { caseId: CASE_ID, rulesetRef: [] } as never,
      ),
    /Invalid rulesetRef/,
  );

  const created = await controller.create(
    req as never,
    {
      caseId: CASE_ID,
      rulesetRef: { version: 2 },
    } as never,
  );
  assert.equal(created.id, VALIDATION_RUN_ID);
  assert.deepEqual(calledInput, {
    caseId: CASE_ID,
    rulesetRef: { version: 2 },
  });
});

void test("ValidationRunsController.list parses query", async () => {
  let calledQuery: Record<string, unknown> | undefined;
  const service = {
    list: (_ctx: unknown, input: Record<string, unknown>) => {
      calledQuery = input;
      return Promise.resolve({ items: [mockValidationRun], total: 1 });
    },
  } as unknown as ValidationRunsService;
  const controller = new ValidationRunsController(service);

  const result = await controller.list(req as never, {
    caseId: CASE_ID,
    page: "2",
    limit: "10",
  });
  assert.equal(result.total, 1);
  assert.deepEqual(calledQuery, { caseId: CASE_ID, page: 2, limit: 10 });
});

void test("ValidationRunsController.get throws when run is missing", async () => {
  const service = {
    get: () => Promise.resolve(null),
  } as unknown as ValidationRunsService;
  const controller = new ValidationRunsController(service);

  await assert.rejects(
    () => controller.get(req as never, VALIDATION_RUN_ID),
    /Validation run not found/,
  );
});
