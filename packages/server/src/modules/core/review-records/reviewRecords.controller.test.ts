import test from "node:test";
import assert from "node:assert/strict";
import { UnauthorizedException } from "@nestjs/common";

import { ReviewRecordsController } from "./reviewRecords.controller";
import { ReviewRecordsService } from "./reviewRecords.service";

const ORG_ID = "00000000-0000-4000-8000-000000000000";
const USER_ID = "00000000-0000-4000-8000-000000000001";
const CASE_ID = "00000000-0000-4000-8000-000000000002";
const VALIDATION_RUN_ID = "00000000-0000-4000-8000-000000000003";
const REVIEW_RECORD_ID = "00000000-0000-4000-8000-000000000004";

const req = {
  requestContext: { orgId: ORG_ID, userId: USER_ID, role: "staff" as const },
};

const mockReviewRecord = {
  id: REVIEW_RECORD_ID,
  orgId: ORG_ID,
  caseId: CASE_ID,
  validationRunId: VALIDATION_RUN_ID,
  decision: "approved",
  comment: "ok",
  reviewerUserId: USER_ID,
  reviewedAt: "2026-01-01T00:00:00.000Z",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

void test("ReviewRecordsController.create validates body and requires context", async () => {
  let calledInput: Record<string, unknown> | undefined;
  const service = {
    create: (_ctx: unknown, input: Record<string, unknown>) => {
      calledInput = input;
      return Promise.resolve(mockReviewRecord);
    },
  } as unknown as ReviewRecordsService;
  const controller = new ReviewRecordsController(service);

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
        {
          caseId: CASE_ID,
          validationRunId: VALIDATION_RUN_ID,
          decision: "noop",
        } as never,
      ),
    /decision must be approved or rejected/,
  );

  const created = await controller.create(
    req as never,
    {
      caseId: CASE_ID,
      validationRunId: VALIDATION_RUN_ID,
      decision: "approved",
      comment: "ok",
    } as never,
  );
  assert.equal(created.id, REVIEW_RECORD_ID);
  assert.deepEqual(calledInput, {
    caseId: CASE_ID,
    validationRunId: VALIDATION_RUN_ID,
    decision: "approved",
    comment: "ok",
  });
});

void test("ReviewRecordsController.list parses query", async () => {
  let calledQuery: Record<string, unknown> | undefined;
  const service = {
    list: (_ctx: unknown, input: Record<string, unknown>) => {
      calledQuery = input;
      return Promise.resolve({ items: [mockReviewRecord], total: 1 });
    },
  } as unknown as ReviewRecordsService;
  const controller = new ReviewRecordsController(service);

  const result = await controller.list(req as never, {
    caseId: CASE_ID,
    validationRunId: VALIDATION_RUN_ID,
    page: "2",
    limit: "20",
  });
  assert.equal(result.total, 1);
  assert.deepEqual(calledQuery, {
    caseId: CASE_ID,
    validationRunId: VALIDATION_RUN_ID,
    page: 2,
    limit: 20,
  });
});

void test("ReviewRecordsController.get throws when record is missing", async () => {
  const service = {
    get: () => Promise.resolve(null),
  } as unknown as ReviewRecordsService;
  const controller = new ReviewRecordsController(service);

  await assert.rejects(
    () => controller.get(req as never, REVIEW_RECORD_ID),
    /Review record not found/,
  );
});
