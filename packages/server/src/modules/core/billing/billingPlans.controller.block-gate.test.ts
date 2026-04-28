import assert from "node:assert/strict";
import test from "node:test";
import { BadRequestException } from "@nestjs/common";

import type { BillingPlan } from "../model/billingEntities";
import type { CaseBillingPlanDto } from "../cases/cases.types-billing";
import { BillingPlansController } from "./billingPlans.controller";
import type { BillingPlansService } from "./billingPlans.service";

function makeReq(role = "staff" as const) {
  return {
    requestContext: { orgId: "org-1", userId: "user-1", role },
  };
}

const STUB_PLAN: BillingPlan = {
  id: "bp-1",
  orgId: "org-1",
  caseId: "case-1",
  milestoneName: null,
  amountDue: 100000,
  dueDate: null,
  status: "due",
  gateEffectMode: "block",
  remark: null,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

function makeMockService(
  overrides: Partial<BillingPlansService> = {},
): BillingPlansService {
  return {
    list: () => Promise.resolve({ items: [], total: 0 }),
    create: () => Promise.resolve(STUB_PLAN),
    get: () => Promise.resolve(STUB_PLAN),
    update: () => Promise.resolve(STUB_PLAN),
    transition: () => Promise.resolve(STUB_PLAN),
    ...overrides,
  } as unknown as BillingPlansService;
}

// ─── create with gateEffectMode=block ──────────────────────────

void test("create accepts gateEffectMode='block' (D9 P1 unlock)", async () => {
  let captured: Record<string, unknown> | undefined;
  const ctrl = new BillingPlansController(
    makeMockService({
      create: (_ctx, input) => {
        captured = input as unknown as Record<string, unknown>;
        return Promise.resolve(STUB_PLAN);
      },
    }),
  );

  const result = await ctrl.create(makeReq(), {
    caseId: "case-1",
    amountDue: 100000,
    gateEffectMode: "block",
  });

  assert.ok(captured);
  assert.equal(captured.gateEffectMode, "block");
  assert.equal(result.gateEffectMode, "block");
});

void test("create still accepts gateEffectMode='off'", async () => {
  let captured: Record<string, unknown> | undefined;
  const ctrl = new BillingPlansController(
    makeMockService({
      create: (_ctx, input) => {
        captured = input as unknown as Record<string, unknown>;
        return Promise.resolve({ ...STUB_PLAN, gateEffectMode: "off" });
      },
    }),
  );

  await ctrl.create(makeReq(), {
    caseId: "case-1",
    amountDue: 100000,
    gateEffectMode: "off",
  });

  assert.equal(captured?.gateEffectMode, "off");
});

void test("create still accepts gateEffectMode='warn'", async () => {
  let captured: Record<string, unknown> | undefined;
  const ctrl = new BillingPlansController(
    makeMockService({
      create: (_ctx, input) => {
        captured = input as unknown as Record<string, unknown>;
        return Promise.resolve({ ...STUB_PLAN, gateEffectMode: "warn" });
      },
    }),
  );

  await ctrl.create(makeReq(), {
    caseId: "case-1",
    amountDue: 100000,
    gateEffectMode: "warn",
  });

  assert.equal(captured?.gateEffectMode, "warn");
});

void test("create rejects invalid gateEffectMode", async () => {
  const ctrl = new BillingPlansController(makeMockService());

  await assert.rejects(
    () =>
      ctrl.create(makeReq(), {
        caseId: "case-1",
        amountDue: 100000,
        gateEffectMode: "invalid",
      }),
    (err) => {
      assert.ok(err instanceof BadRequestException);
      assert.ok(err.message.includes("gateEffectMode"));
      return true;
    },
  );
});

// ─── update with gateEffectMode=block ──────────────────────────

void test("update accepts gateEffectMode='block' (D9 P1 unlock)", async () => {
  let captured: Record<string, unknown> | undefined;
  const ctrl = new BillingPlansController(
    makeMockService({
      update: (_ctx, _id, input) => {
        captured = input as unknown as Record<string, unknown>;
        return Promise.resolve(STUB_PLAN);
      },
    }),
  );

  await ctrl.update(makeReq(), "bp-1", { gateEffectMode: "block" });

  assert.ok(captured);
  assert.equal(captured.gateEffectMode, "block");
});

void test("update rejects invalid gateEffectMode", async () => {
  const ctrl = new BillingPlansController(makeMockService());

  await assert.rejects(
    () => ctrl.update(makeReq(), "bp-1", { gateEffectMode: "invalid" }),
    (err) => {
      assert.ok(err instanceof BadRequestException);
      assert.ok(err.message.includes("gateEffectMode"));
      return true;
    },
  );
});

// ─── list deserializes rows carrying gateEffectMode=block ──────

void test("list returns rows with gateEffectMode='block' intact", async () => {
  const blockRow: CaseBillingPlanDto = {
    id: "bp-1",
    caseId: "case-1",
    milestoneName: "尾款",
    amountDue: 200000,
    dueDate: "2026-06-01",
    status: "due",
    gateEffectMode: "block",
    remark: null,
    paidAmount: 0,
    unpaidAmount: 200000,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  };

  const ctrl = new BillingPlansController(
    makeMockService({
      list: () => Promise.resolve({ items: [blockRow], total: 1 }),
    }),
  );

  const result = await ctrl.list(
    { requestContext: { orgId: "org-1", userId: "user-1", role: "viewer" } },
    {} as never,
  );

  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].gateEffectMode, "block");
});
