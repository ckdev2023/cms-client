import test from "node:test";
import assert from "node:assert/strict";
import { BadRequestException, UnauthorizedException } from "@nestjs/common";
import { DocumentItemsController } from "./documentItems.controller";
const ORG_ID = "00000000-0000-4000-8000-000000000000";
const USER_ID = "00000000-0000-4000-8000-000000000001";
const CASE_ID = "00000000-0000-4000-8000-000000000002";
const req = {
  requestContext: {
    orgId: ORG_ID,
    userId: USER_ID,
    role: "viewer",
  },
};
const mockCompletionRate = {
  caseId: CASE_ID,
  total: 5,
  completed: 3,
  approved: 2,
  waived: 1,
  completionRate: 60,
  questionnaireTotal: 2,
  questionnaireCompleted: 1,
  questionnaireCompletionRate: 50,
};
function makeController(opts = {}) {
  const service = {
    getCompletionRate: () => Promise.resolve(mockCompletionRate),
    ...opts.service,
  };
  const cases = {};
  return new DocumentItemsController(service, cases);
}
// ────────────────────────────────────────────────────────────────
// A5: GET /document-items/completion-rate?caseId=...
// ────────────────────────────────────────────────────────────────
void test("getCompletionRate: forwards caseId to service and returns result", async () => {
  let calledCaseId;
  const controller = makeController({
    service: {
      getCompletionRate: (_ctx, caseId) => {
        calledCaseId = caseId;
        return Promise.resolve(mockCompletionRate);
      },
    },
  });
  const result = await controller.getCompletionRate(req, {
    caseId: CASE_ID,
  });
  assert.equal(calledCaseId, CASE_ID);
  assert.deepEqual(result, mockCompletionRate);
});
void test("getCompletionRate: returns all expected fields", async () => {
  const controller = makeController();
  const result = await controller.getCompletionRate(req, {
    caseId: CASE_ID,
  });
  assert.equal(result.caseId, CASE_ID);
  assert.equal(typeof result.total, "number");
  assert.equal(typeof result.completed, "number");
  assert.equal(typeof result.approved, "number");
  assert.equal(typeof result.waived, "number");
  assert.equal(typeof result.completionRate, "number");
  assert.equal(typeof result.questionnaireTotal, "number");
  assert.equal(typeof result.questionnaireCompleted, "number");
  assert.equal(typeof result.questionnaireCompletionRate, "number");
});
void test("getCompletionRate: throws UnauthorizedException without context", async () => {
  const controller = makeController();
  await assert.rejects(
    () => controller.getCompletionRate({}, { caseId: CASE_ID }),
    UnauthorizedException,
  );
});
void test("getCompletionRate: throws BadRequestException when caseId is missing", async () => {
  const controller = makeController();
  await assert.rejects(
    () => controller.getCompletionRate(req, {}),
    BadRequestException,
  );
});
void test("getCompletionRate: throws BadRequestException when caseId is empty string", async () => {
  const controller = makeController();
  await assert.rejects(
    () => controller.getCompletionRate(req, { caseId: "" }),
    BadRequestException,
  );
});
//# sourceMappingURL=documentItems.controller.completion-rate.test.js.map
