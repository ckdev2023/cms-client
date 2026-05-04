import assert from "node:assert/strict";
import test from "node:test";
import { BadRequestException, UnauthorizedException } from "@nestjs/common";
import { BillingPlansController } from "./billingPlans.controller";
function makeReq(role = "viewer") {
  return {
    requestContext: { orgId: "org-1", userId: "user-1", role },
  };
}
function makeMockService(listFn) {
  return {
    list: listFn ?? (() => Promise.resolve({ items: [], total: 0 })),
    create: () => Promise.reject(new Error("not implemented")),
    get: () => Promise.reject(new Error("not implemented")),
    update: () => Promise.reject(new Error("not implemented")),
    transition: () => Promise.reject(new Error("not implemented")),
  };
}
void test("list succeeds without caseId (org-wide)", async () => {
  let captured;
  const ctrl = new BillingPlansController(
    makeMockService((_ctx, input) => {
      captured = input;
      return Promise.resolve({ items: [], total: 0 });
    }),
  );
  await ctrl.list(makeReq(), { page: "1", limit: "20" });
  assert.ok(captured);
  assert.equal(captured.caseId, undefined);
  assert.equal(captured.page, 1);
  assert.equal(captured.limit, 20);
});
void test("list passes all filter params to service", async () => {
  let captured;
  const ctrl = new BillingPlansController(
    makeMockService((_ctx, input) => {
      captured = input;
      return Promise.resolve({ items: [], total: 0 });
    }),
  );
  await ctrl.list(makeReq(), {
    caseId: "case-1",
    status: "overdue",
    groupId: "group-1",
    ownerId: "owner-1",
    q: "田中",
    page: "2",
    limit: "50",
  });
  assert.ok(captured);
  assert.equal(captured.caseId, "case-1");
  assert.equal(captured.status, "overdue");
  assert.equal(captured.groupId, "group-1");
  assert.equal(captured.ownerId, "owner-1");
  assert.equal(captured.q, "田中");
  assert.equal(captured.page, 2);
  assert.equal(captured.limit, 50);
});
void test("list rejects invalid status", async () => {
  const ctrl = new BillingPlansController(makeMockService());
  await assert.rejects(
    () => ctrl.list(makeReq(), { status: "invalid" }),
    (err) => {
      assert.ok(err instanceof BadRequestException);
      assert.ok(err.message.includes("status must be one of"));
      return true;
    },
  );
});
void test("list accepts all valid status values", async () => {
  for (const status of ["due", "partial", "paid", "overdue"]) {
    let captured;
    const ctrl = new BillingPlansController(
      makeMockService((_ctx, input) => {
        captured = input;
        return Promise.resolve({ items: [], total: 0 });
      }),
    );
    await ctrl.list(makeReq(), { status });
    assert.equal(captured?.status, status, `status=${status} should pass`);
  }
});
void test("list rejects q longer than 100 characters", async () => {
  const ctrl = new BillingPlansController(makeMockService());
  await assert.rejects(
    () => ctrl.list(makeReq(), { q: "a".repeat(101) }),
    (err) => {
      assert.ok(err instanceof BadRequestException);
      assert.ok(err.message.includes("at most 100"));
      return true;
    },
  );
});
void test("list accepts q of exactly 100 characters", async () => {
  let captured;
  const ctrl = new BillingPlansController(
    makeMockService((_ctx, input) => {
      captured = input;
      return Promise.resolve({ items: [], total: 0 });
    }),
  );
  const q100 = "a".repeat(100);
  await ctrl.list(makeReq(), { q: q100 });
  assert.equal(captured?.q, q100);
});
void test("list rejects limit > 200", async () => {
  const ctrl = new BillingPlansController(makeMockService());
  await assert.rejects(
    () => ctrl.list(makeReq(), { limit: "201" }),
    (err) => {
      assert.ok(err instanceof BadRequestException);
      assert.ok(err.message.includes("Invalid limit"));
      return true;
    },
  );
});
void test("list rejects missing request context", async () => {
  const ctrl = new BillingPlansController(makeMockService());
  await assert.rejects(
    () => ctrl.list({}, {}),
    (err) => {
      assert.ok(err instanceof UnauthorizedException);
      return true;
    },
  );
});
void test("list treats empty string caseId/status/groupId/ownerId/q as undefined", async () => {
  let captured;
  const ctrl = new BillingPlansController(
    makeMockService((_ctx, input) => {
      captured = input;
      return Promise.resolve({ items: [], total: 0 });
    }),
  );
  await ctrl.list(makeReq(), {
    caseId: "",
    status: "",
    groupId: "",
    ownerId: "",
    q: "",
  });
  assert.equal(captured?.caseId, undefined);
  assert.equal(captured?.status, undefined);
  assert.equal(captured?.groupId, undefined);
  assert.equal(captured?.ownerId, undefined);
  assert.equal(captured?.q, undefined);
});
//# sourceMappingURL=billingPlans.controller.list.test.js.map
