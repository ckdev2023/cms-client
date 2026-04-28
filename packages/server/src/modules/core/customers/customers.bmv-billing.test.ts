import assert from "node:assert/strict";
import test from "node:test";
import type { Pool } from "pg";

import { PermissionsService } from "../auth/permissions.service";
import { BMV_SIGNING_DEPOSIT_MILESTONE } from "./customers.bmv-billing";
import { CustomersService } from "./customers.service";

const ctx = {
  orgId: "00000000-0000-4000-8000-000000000000",
  userId: "00000000-0000-4000-8000-000000000001",
  role: "staff",
} as const;

const CASE_ID = "00000000-0000-4000-8000-cccccccccccc";
const BP_ID = "00000000-0000-4000-8000-bbbbbbbbbbbb";
const PR_ID = "00000000-0000-4000-8000-pppppppppppp";

function createService(
  pool: Pool,
  timelineService: { write?: (...args: unknown[]) => Promise<void> } = {},
) {
  return new CustomersService(
    pool,
    {
      canAccessCustomer: () => true,
      canEditCustomer: () => true,
    } as unknown as PermissionsService,
    { write: () => Promise.resolve(), ...timelineService } as never,
    { create: () => Promise.resolve({}) } as never,
  );
}

function customerRow(bmvProfile: Record<string, unknown>) {
  return {
    id: "c1",
    org_id: ctx.orgId,
    type: "individual",
    base_profile: { name: "Alice", bmvProfile },
    contacts: [],
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-02T00:00:00.000Z",
  };
}

function parseBmvPatch(params?: unknown[]) {
  const raw = params?.[1];
  assert.ok(typeof raw === "string");
  return JSON.parse(raw) as Record<string, unknown>;
}

function createBillingAwareMockClient(options: {
  bmvProfile: Record<string, unknown>;
  hasBmvCase: boolean;
  existingBillingPlan?: boolean;
}) {
  const calls: { sql: string; params?: unknown[] }[] = [];
  const client = {
    query: (sql: string, params?: unknown[]) => {
      const trimmed = sql.trim();
      calls.push({ sql: trimmed, params });

      if (trimmed.includes("update customers")) {
        return Promise.resolve({
          rows: [customerRow(parseBmvPatch(params))],
        });
      }
      if (
        trimmed.includes("from cases") &&
        trimmed.includes("case_type_code") &&
        !trimmed.includes("from customers")
      ) {
        return Promise.resolve({
          rows: options.hasBmvCase ? [{ id: CASE_ID }] : [],
        });
      }
      if (
        trimmed.includes("from billing_records") &&
        trimmed.includes("milestone_name")
      ) {
        return Promise.resolve({
          rows: options.existingBillingPlan ? [{ id: BP_ID }] : [],
        });
      }
      if (trimmed.includes("insert into billing_records")) {
        return Promise.resolve({ rows: [{ id: BP_ID }] });
      }
      if (trimmed.includes("insert into payment_records")) {
        return Promise.resolve({ rows: [{ id: PR_ID }] });
      }
      if (
        trimmed.includes("update billing_records") &&
        trimmed.includes("status = 'paid'")
      ) {
        return Promise.resolve({ rows: [] });
      }

      return Promise.resolve({
        rows: [customerRow(options.bmvProfile)],
      });
    },
    release: () => undefined,
  };
  return { client, calls };
}

void test("recordBmvSign creates billing plan + payment record when BMV case exists", async () => {
  const timelineWrites: {
    action: string;
    entityType: string;
    payload: Record<string, unknown>;
  }[] = [];
  const { client, calls } = createBillingAwareMockClient({
    bmvProfile: {
      questionnaireStatus: "returned",
      quoteStatus: "generated",
      signStatus: "pending",
      quoteAmount: 500000,
    },
    hasBmvCase: true,
  });

  const service = createService(
    { connect: () => Promise.resolve(client) } as unknown as Pool,
    {
      write: (_ctx, input) => {
        timelineWrites.push(input as never);
        return Promise.resolve();
      },
    },
  );

  await service.recordBmvSign(ctx, "c1");

  const billingInsert = calls.find((c) =>
    c.sql.includes("insert into billing_records"),
  );
  assert.ok(billingInsert, "billing plan should be created");
  assert.ok(
    billingInsert.params?.includes(BMV_SIGNING_DEPOSIT_MILESTONE),
    "milestone should be signing_deposit",
  );
  assert.ok(
    billingInsert.params?.includes(500000),
    "amountDue should match quoteAmount",
  );

  const paymentInsert = calls.find((c) =>
    c.sql.includes("insert into payment_records"),
  );
  assert.ok(paymentInsert, "payment record should be created");
  assert.ok(
    paymentInsert.params?.includes(BP_ID),
    "payment record should reference the billing plan",
  );
  assert.ok(
    paymentInsert.params?.includes(500000),
    "amountReceived should match depositAmount",
  );

  const billingStatusUpdate = calls.find(
    (c) =>
      c.sql.includes("update billing_records") &&
      c.sql.includes("status = 'paid'"),
  );
  assert.ok(
    billingStatusUpdate,
    "billing plan status should be updated to paid",
  );

  const billingTimeline = timelineWrites.find(
    (t) => t.action === "billing_plan.created",
  );
  assert.ok(billingTimeline, "billing_plan.created timeline should be written");
  assert.equal(billingTimeline.entityType, "billing_plan");
  assert.equal(billingTimeline.payload.caseId, CASE_ID);
  assert.equal(
    billingTimeline.payload.milestoneName,
    BMV_SIGNING_DEPOSIT_MILESTONE,
  );

  const paymentTimeline = timelineWrites.find(
    (t) => t.action === "payment_record.created",
  );
  assert.ok(
    paymentTimeline,
    "payment_record.created timeline should be written",
  );
  assert.equal(paymentTimeline.entityType, "payment_record");
  assert.equal(paymentTimeline.payload.billingPlanId, BP_ID);
});

void test("recordBmvSign skips billing when no BMV case exists", async () => {
  const { client, calls } = createBillingAwareMockClient({
    bmvProfile: {
      questionnaireStatus: "returned",
      quoteStatus: "generated",
      signStatus: "pending",
      quoteAmount: 500000,
    },
    hasBmvCase: false,
  });

  const service = createService({
    connect: () => Promise.resolve(client),
  } as unknown as Pool);

  await service.recordBmvSign(ctx, "c1");

  const billingInsert = calls.find((c) =>
    c.sql.includes("insert into billing_records"),
  );
  assert.equal(billingInsert, undefined, "no billing plan should be created");
});

void test("recordBmvSign skips billing when quoteAmount is null", async () => {
  const { client, calls } = createBillingAwareMockClient({
    bmvProfile: {
      questionnaireStatus: "returned",
      quoteStatus: "generated",
      signStatus: "pending",
      quoteAmount: null,
    },
    hasBmvCase: true,
  });

  const service = createService({
    connect: () => Promise.resolve(client),
  } as unknown as Pool);

  await service.recordBmvSign(ctx, "c1");

  const billingInsert = calls.find((c) =>
    c.sql.includes("insert into billing_records"),
  );
  assert.equal(
    billingInsert,
    undefined,
    "no billing plan should be created for null quoteAmount",
  );
});

void test("recordBmvSign skips billing when quoteAmount is zero", async () => {
  const { client, calls } = createBillingAwareMockClient({
    bmvProfile: {
      questionnaireStatus: "returned",
      quoteStatus: "generated",
      signStatus: "pending",
      quoteAmount: 0,
    },
    hasBmvCase: true,
  });

  const service = createService({
    connect: () => Promise.resolve(client),
  } as unknown as Pool);

  await service.recordBmvSign(ctx, "c1");

  const billingInsert = calls.find((c) =>
    c.sql.includes("insert into billing_records"),
  );
  assert.equal(
    billingInsert,
    undefined,
    "no billing plan should be created for zero quoteAmount",
  );
});

void test("recordBmvSign billing is idempotent when billing plan already exists", async () => {
  const { client, calls } = createBillingAwareMockClient({
    bmvProfile: {
      questionnaireStatus: "returned",
      quoteStatus: "generated",
      signStatus: "pending",
      quoteAmount: 500000,
    },
    hasBmvCase: true,
    existingBillingPlan: true,
  });

  const service = createService({
    connect: () => Promise.resolve(client),
  } as unknown as Pool);

  await service.recordBmvSign(ctx, "c1");

  const billingInsert = calls.find((c) =>
    c.sql.includes("insert into billing_records"),
  );
  assert.equal(
    billingInsert,
    undefined,
    "no duplicate billing plan should be created",
  );
});

void test("BMV_SIGNING_DEPOSIT_MILESTONE is signing_deposit", () => {
  assert.equal(BMV_SIGNING_DEPOSIT_MILESTONE, "signing_deposit");
});
