import assert from "node:assert/strict";
import test from "node:test";
import { BadRequestException, UnauthorizedException } from "@nestjs/common";

import type { Role } from "../auth/roles";
import { BillingSummaryController } from "./billingSummary.controller";
import type { BillingSummaryService } from "./billingSummary.service";

function makeReq(role: Role = "viewer") {
  return {
    requestContext: { orgId: "org-1", userId: "user-1", role },
  };
}

const STUB_SUMMARY = {
  totalDue: 100000,
  totalReceived: 30000,
  totalOutstanding: 70000,
  overdueAmount: 20000,
};

function makeMockService(
  getSummaryFn?: BillingSummaryService["getSummary"],
): BillingSummaryService {
  return {
    getSummary: getSummaryFn ?? (() => Promise.resolve(STUB_SUMMARY)),
  } as unknown as BillingSummaryService;
}

// ─── RBAC ───────────────────────────────────────────────────────

void test("getSummary: viewer role is accepted", async () => {
  let captured: { ctx: unknown } | undefined;
  const ctrl = new BillingSummaryController(
    makeMockService((ctx) => {
      captured = { ctx };
      return Promise.resolve(STUB_SUMMARY);
    }),
  );

  const result = await ctrl.getSummary(makeReq("viewer"), {});
  assert.ok(captured);
  assert.equal(result.totalDue, 100000);
});

void test("getSummary: staff role is accepted", async () => {
  const ctrl = new BillingSummaryController(makeMockService());
  const result = await ctrl.getSummary(makeReq("staff"), {});
  assert.equal(result.totalDue, 100000);
});

void test("getSummary: manager role is accepted", async () => {
  const ctrl = new BillingSummaryController(makeMockService());
  const result = await ctrl.getSummary(makeReq("manager"), {});
  assert.equal(result.totalDue, 100000);
});

// ─── missing context ────────────────────────────────────────────

void test("getSummary: missing requestContext throws UnauthorizedException", async () => {
  const ctrl = new BillingSummaryController(makeMockService());
  await assert.rejects(
    () => ctrl.getSummary({} as never, {}),
    (err) => {
      assert.ok(err instanceof UnauthorizedException);
      return true;
    },
  );
});

// ─── param forwarding ───────────────────────────────────────────

void test("getSummary: forwards all filter params to service", async () => {
  let captured: Record<string, unknown> | undefined;
  const ctrl = new BillingSummaryController(
    makeMockService((_ctx, filters) => {
      captured = filters as unknown as Record<string, unknown>;
      return Promise.resolve(STUB_SUMMARY);
    }),
  );

  await ctrl.getSummary(makeReq(), {
    status: "overdue",
    groupId: "g-1",
    ownerId: "o-1",
    q: "田中",
    from: "2026-01-01",
    to: "2026-12-31",
  });

  assert.ok(captured);
  assert.equal(captured.status, "overdue");
  assert.equal(captured.groupId, "g-1");
  assert.equal(captured.ownerId, "o-1");
  assert.equal(captured.q, "田中");
  assert.equal(captured.from, "2026-01-01");
  assert.equal(captured.to, "2026-12-31");
});

void test("getSummary: empty optional params are not forwarded", async () => {
  let captured: Record<string, unknown> | undefined;
  const ctrl = new BillingSummaryController(
    makeMockService((_ctx, filters) => {
      captured = filters as unknown as Record<string, unknown>;
      return Promise.resolve(STUB_SUMMARY);
    }),
  );

  await ctrl.getSummary(makeReq(), {});

  assert.ok(captured);
  assert.equal(captured.status, undefined);
  assert.equal(captured.groupId, undefined);
  assert.equal(captured.ownerId, undefined);
  assert.equal(captured.q, undefined);
  assert.equal(captured.from, undefined);
  assert.equal(captured.to, undefined);
});

// ─── param validation ───────────────────────────────────────────

void test("getSummary: rejects invalid status", async () => {
  const ctrl = new BillingSummaryController(makeMockService());
  await assert.rejects(
    () => ctrl.getSummary(makeReq(), { status: "bogus" }),
    (err) => {
      assert.ok(err instanceof BadRequestException);
      assert.ok(err.message.includes("Invalid status"));
      return true;
    },
  );
});

void test("getSummary: accepts all valid status values", async () => {
  for (const status of ["due", "partial", "paid", "overdue"]) {
    let captured: Record<string, unknown> | undefined;
    const ctrl = new BillingSummaryController(
      makeMockService((_ctx, filters) => {
        captured = filters as unknown as Record<string, unknown>;
        return Promise.resolve(STUB_SUMMARY);
      }),
    );
    await ctrl.getSummary(makeReq(), { status });
    assert.equal(captured?.status, status);
  }
});

void test("getSummary: rejects q longer than 100 characters", async () => {
  const ctrl = new BillingSummaryController(makeMockService());
  await assert.rejects(
    () => ctrl.getSummary(makeReq(), { q: "a".repeat(101) }),
    (err) => {
      assert.ok(err instanceof BadRequestException);
      assert.ok(err.message.includes("100"));
      return true;
    },
  );
});

void test("getSummary: accepts q of exactly 100 characters", async () => {
  let captured: Record<string, unknown> | undefined;
  const ctrl = new BillingSummaryController(
    makeMockService((_ctx, filters) => {
      captured = filters as unknown as Record<string, unknown>;
      return Promise.resolve(STUB_SUMMARY);
    }),
  );
  await ctrl.getSummary(makeReq(), { q: "a".repeat(100) });
  assert.ok(captured);
  assert.equal((captured.q as string).length, 100);
});

void test("getSummary: empty q is treated as undefined", async () => {
  let captured: Record<string, unknown> | undefined;
  const ctrl = new BillingSummaryController(
    makeMockService((_ctx, filters) => {
      captured = filters as unknown as Record<string, unknown>;
      return Promise.resolve(STUB_SUMMARY);
    }),
  );
  await ctrl.getSummary(makeReq(), { q: "" });
  assert.equal(captured?.q, undefined);
});

void test("getSummary: rejects invalid from date", async () => {
  const ctrl = new BillingSummaryController(makeMockService());
  await assert.rejects(
    () => ctrl.getSummary(makeReq(), { from: "not-a-date" }),
    (err) => {
      assert.ok(err instanceof BadRequestException);
      assert.ok(err.message.includes("Invalid from"));
      return true;
    },
  );
});

void test("getSummary: rejects invalid to date", async () => {
  const ctrl = new BillingSummaryController(makeMockService());
  await assert.rejects(
    () => ctrl.getSummary(makeReq(), { to: "not-a-date" }),
    (err) => {
      assert.ok(err instanceof BadRequestException);
      assert.ok(err.message.includes("Invalid to"));
      return true;
    },
  );
});

// ─── cross-org isolation: org from ctx ──────────────────────────

void test("getSummary: passes orgId from request context to service", async () => {
  let capturedCtx: Record<string, unknown> | undefined;
  const ctrl = new BillingSummaryController(
    makeMockService((ctx) => {
      capturedCtx = ctx as unknown as Record<string, unknown>;
      return Promise.resolve(STUB_SUMMARY);
    }),
  );
  await ctrl.getSummary(
    { requestContext: { orgId: "org-other", userId: "u", role: "viewer" } },
    {},
  );
  assert.equal(capturedCtx?.orgId, "org-other");
});
