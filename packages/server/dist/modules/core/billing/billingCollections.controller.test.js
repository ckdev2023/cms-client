import assert from "node:assert/strict";
import test from "node:test";
import { BillingCollectionsController } from "./billingCollections.controller";
const ORG_ID = "00000000-0000-4000-8000-000000000001";
const USER_ID = "00000000-0000-4000-8000-000000000010";
function makeReq(role = "staff") {
  return {
    requestContext: { orgId: ORG_ID, userId: USER_ID, role },
  };
}
function makeService() {
  const calls = [];
  return {
    svc: {
      bulkCollect: (ctx, caseIds) => {
        calls.push({ ctx, caseIds });
        return Promise.resolve({
          success: 0,
          skipped: 0,
          failed: 0,
          details: [],
        });
      },
    },
    calls,
  };
}
void test("controller: rejects empty caseIds", async () => {
  const { svc } = makeService();
  const ctrl = new BillingCollectionsController(svc);
  await assert.rejects(() => ctrl.bulk(makeReq(), { caseIds: [] }), {
    name: "BadRequestException",
  });
});
void test("controller: rejects non-array caseIds", async () => {
  const { svc } = makeService();
  const ctrl = new BillingCollectionsController(svc);
  await assert.rejects(() => ctrl.bulk(makeReq(), { caseIds: "not-array" }), {
    name: "BadRequestException",
  });
});
void test("controller: rejects caseIds with more than 200 items", async () => {
  const { svc } = makeService();
  const ctrl = new BillingCollectionsController(svc);
  const ids = Array.from({ length: 201 }, (_, i) => `case-${String(i)}`);
  await assert.rejects(() => ctrl.bulk(makeReq(), { caseIds: ids }), {
    name: "BadRequestException",
  });
});
void test("controller: rejects caseIds containing empty strings", async () => {
  const { svc } = makeService();
  const ctrl = new BillingCollectionsController(svc);
  await assert.rejects(
    () => ctrl.bulk(makeReq(), { caseIds: ["valid-id", ""] }),
    { name: "BadRequestException" },
  );
});
void test("controller: rejects caseIds containing non-string elements", async () => {
  const { svc } = makeService();
  const ctrl = new BillingCollectionsController(svc);
  await assert.rejects(() => ctrl.bulk(makeReq(), { caseIds: [123] }), {
    name: "BadRequestException",
  });
});
void test("controller: accepts exactly 200 caseIds", async () => {
  const { svc, calls } = makeService();
  const ctrl = new BillingCollectionsController(svc);
  const ids = Array.from({ length: 200 }, (_, i) => `case-${String(i)}`);
  await ctrl.bulk(makeReq(), { caseIds: ids });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].caseIds.length, 200);
});
void test("controller: accepts single caseId", async () => {
  const { svc, calls } = makeService();
  const ctrl = new BillingCollectionsController(svc);
  await ctrl.bulk(makeReq(), { caseIds: ["case-1"] });
  assert.equal(calls.length, 1);
});
void test("controller: throws UnauthorizedException when request context missing", async () => {
  const { svc } = makeService();
  const ctrl = new BillingCollectionsController(svc);
  await assert.rejects(() => ctrl.bulk({}, { caseIds: ["case-1"] }), {
    name: "UnauthorizedException",
  });
});
//# sourceMappingURL=billingCollections.controller.test.js.map
