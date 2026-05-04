import assert from "node:assert/strict";
import test from "node:test";
import { BadRequestException, UnauthorizedException } from "@nestjs/common";
import { PaymentRecordsController } from "./paymentRecords.controller";
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
    void: () => Promise.reject(new Error("not implemented")),
    reverse: () => Promise.reject(new Error("not implemented")),
  };
}
void test("list succeeds without billingPlanId or caseId (org-wide)", async () => {
  let captured;
  const ctrl = new PaymentRecordsController(
    makeMockService((_ctx, input) => {
      captured = input;
      return Promise.resolve({ items: [], total: 0 });
    }),
  );
  await ctrl.list(makeReq(), { page: "1", limit: "20" });
  assert.ok(captured);
  assert.equal(captured.billingPlanId, undefined);
  assert.equal(captured.caseId, undefined);
  assert.equal(captured.page, 1);
  assert.equal(captured.limit, 20);
});
void test("list passes all filter params to service", async () => {
  let captured;
  const ctrl = new PaymentRecordsController(
    makeMockService((_ctx, input) => {
      captured = input;
      return Promise.resolve({ items: [], total: 0 });
    }),
  );
  await ctrl.list(makeReq(), {
    billingPlanId: "bp-1",
    caseId: "case-1",
    recordStatus: "reversed",
    q: "振込",
    from: "2026-01-01T00:00:00.000Z",
    to: "2026-12-31T23:59:59.999Z",
    groupId: "group-1",
    ownerId: "owner-1",
    page: "2",
    limit: "50",
  });
  assert.ok(captured);
  assert.equal(captured.billingPlanId, "bp-1");
  assert.equal(captured.caseId, "case-1");
  assert.equal(captured.recordStatus, "reversed");
  assert.equal(captured.q, "振込");
  assert.equal(captured.from, "2026-01-01T00:00:00.000Z");
  assert.equal(captured.to, "2026-12-31T23:59:59.999Z");
  assert.equal(captured.groupId, "group-1");
  assert.equal(captured.ownerId, "owner-1");
  assert.equal(captured.page, 2);
  assert.equal(captured.limit, 50);
});
void test("list rejects invalid recordStatus", async () => {
  const ctrl = new PaymentRecordsController(makeMockService());
  await assert.rejects(
    () => ctrl.list(makeReq(), { recordStatus: "invalid" }),
    (err) => {
      assert.ok(err instanceof BadRequestException);
      assert.ok(err.message.includes("recordStatus must be one of"));
      return true;
    },
  );
});
void test("list accepts all valid recordStatus values", async () => {
  for (const recordStatus of ["valid", "voided", "reversed", "all"]) {
    let captured;
    const ctrl = new PaymentRecordsController(
      makeMockService((_ctx, input) => {
        captured = input;
        return Promise.resolve({ items: [], total: 0 });
      }),
    );
    await ctrl.list(makeReq(), { recordStatus });
    assert.equal(
      captured?.recordStatus,
      recordStatus,
      `recordStatus=${recordStatus} should pass`,
    );
  }
});
void test("list rejects q longer than 100 characters", async () => {
  const ctrl = new PaymentRecordsController(makeMockService());
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
  const ctrl = new PaymentRecordsController(
    makeMockService((_ctx, input) => {
      captured = input;
      return Promise.resolve({ items: [], total: 0 });
    }),
  );
  const q100 = "a".repeat(100);
  await ctrl.list(makeReq(), { q: q100 });
  assert.equal(captured?.q, q100);
});
void test("list rejects invalid from date", async () => {
  const ctrl = new PaymentRecordsController(makeMockService());
  await assert.rejects(
    () => ctrl.list(makeReq(), { from: "not-a-date" }),
    (err) => {
      assert.ok(err instanceof BadRequestException);
      assert.ok(err.message.includes("Invalid from"));
      return true;
    },
  );
});
void test("list rejects invalid to date", async () => {
  const ctrl = new PaymentRecordsController(makeMockService());
  await assert.rejects(
    () => ctrl.list(makeReq(), { to: "not-a-date" }),
    (err) => {
      assert.ok(err instanceof BadRequestException);
      assert.ok(err.message.includes("Invalid to"));
      return true;
    },
  );
});
void test("list rejects limit > 200", async () => {
  const ctrl = new PaymentRecordsController(makeMockService());
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
  const ctrl = new PaymentRecordsController(makeMockService());
  await assert.rejects(
    () => ctrl.list({}, {}),
    (err) => {
      assert.ok(err instanceof UnauthorizedException);
      return true;
    },
  );
});
void test("list treats empty string params as undefined", async () => {
  let captured;
  const ctrl = new PaymentRecordsController(
    makeMockService((_ctx, input) => {
      captured = input;
      return Promise.resolve({ items: [], total: 0 });
    }),
  );
  await ctrl.list(makeReq(), {
    billingPlanId: "",
    caseId: "",
    recordStatus: "",
    q: "",
    from: "",
    to: "",
    groupId: "",
    ownerId: "",
  });
  assert.equal(captured?.billingPlanId, undefined);
  assert.equal(captured?.caseId, undefined);
  assert.equal(captured?.recordStatus, undefined);
  assert.equal(captured?.q, undefined);
  assert.equal(captured?.from, undefined);
  assert.equal(captured?.to, undefined);
  assert.equal(captured?.groupId, undefined);
  assert.equal(captured?.ownerId, undefined);
});
//# sourceMappingURL=paymentRecords.controller.list.test.js.map
