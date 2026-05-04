import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { BMV_CASE_TYPE } from "../cases/cases.template-bmv";
import { BMV_SIGNING_DEPOSIT_MILESTONE } from "./customers.bmv-billing";
import {
  ctx,
  makeBaseCustomerRow,
  makeSignedCustomerRow,
  createTestService,
  transitionQueryFn,
} from "./customers.bmv.d7.focused.test-support";
// ────────────────────────────────────────────────────────────────
// BillingPlan 聯動測
// ────────────────────────────────────────────────────────────────
void describe("D7 BillingPlan linkage: transitionBmvToCase", () => {
  void test("creates billing plan + payment record when quoteAmount > 0", async () => {
    const signedRow = makeSignedCustomerRow();
    const timelineWrites = [];
    const { service, calls } = createTestService(transitionQueryFn(signedRow), {
      timelineWrites,
      createCase: () =>
        Promise.resolve({ id: "case-1", caseTypeCode: BMV_CASE_TYPE }),
    });
    await service.transitionBmvToCase(ctx, "c1");
    const billingInsert = calls.find((c) =>
      c.sql.includes("insert into billing_records"),
    );
    assert.ok(billingInsert, "should create billing plan");
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
    assert.ok(paymentInsert, "should create payment record");
    assert.ok(
      paymentInsert.params?.includes("bp-1"),
      "payment record should reference billing plan id",
    );
    const billingTimeline = timelineWrites.find(
      (t) => t.action === "billing_plan.created",
    );
    assert.ok(billingTimeline, "billing_plan.created timeline event");
    assert.equal(billingTimeline.payload.caseId, "case-1");
    assert.equal(
      billingTimeline.payload.milestoneName,
      BMV_SIGNING_DEPOSIT_MILESTONE,
    );
  });
  void test("skips billing when quoteAmount is null", async () => {
    const row = makeBaseCustomerRow({
      base_profile: {
        name: "Alice",
        bmvProfile: {
          questionnaireStatus: "returned",
          quoteStatus: "confirmed",
          signStatus: "signed",
          signedAt: "2026-01-05T00:00:00.000Z",
          questionnaireReturnedAt: "2026-01-02T00:00:00.000Z",
          quoteConfirmedAt: "2026-01-04T00:00:00.000Z",
          sourceLeadId: "lead-1",
          currentQuoteFormId: "quote-form-1",
          visaPlan: "new_1year",
          quoteAmount: null,
        },
      },
    });
    const { service, calls } = createTestService(transitionQueryFn(row), {
      createCase: () => Promise.resolve({ id: "case-1" }),
    });
    await service.transitionBmvToCase(ctx, "c1");
    const billingInsert = calls.find((c) =>
      c.sql.includes("insert into billing_records"),
    );
    assert.equal(billingInsert, undefined, "no billing when quoteAmount null");
  });
  void test("skips billing when quoteAmount is 0", async () => {
    const row = makeBaseCustomerRow({
      base_profile: {
        name: "Alice",
        bmvProfile: {
          questionnaireStatus: "returned",
          quoteStatus: "confirmed",
          signStatus: "signed",
          signedAt: "2026-01-05T00:00:00.000Z",
          questionnaireReturnedAt: "2026-01-02T00:00:00.000Z",
          quoteConfirmedAt: "2026-01-04T00:00:00.000Z",
          sourceLeadId: "lead-1",
          currentQuoteFormId: "quote-form-1",
          visaPlan: "new_1year",
          quoteAmount: 0,
        },
      },
    });
    const { service, calls } = createTestService(transitionQueryFn(row), {
      createCase: () => Promise.resolve({ id: "case-1" }),
    });
    await service.transitionBmvToCase(ctx, "c1");
    const billingInsert = calls.find((c) =>
      c.sql.includes("insert into billing_records"),
    );
    assert.equal(billingInsert, undefined, "no billing when quoteAmount 0");
  });
  void test("BMV_SIGNING_DEPOSIT_MILESTONE is signing_deposit", () => {
    assert.equal(BMV_SIGNING_DEPOSIT_MILESTONE, "signing_deposit");
  });
});
// ────────────────────────────────────────────────────────────────
// ResidencePeriod 初始化測
// ────────────────────────────────────────────────────────────────
void describe("D7 ResidencePeriod: placeholder row", () => {
  void test("inserts with correct case_id, customer_id, org_id", async () => {
    const signedRow = makeSignedCustomerRow();
    const { service, calls } = createTestService(transitionQueryFn(signedRow), {
      createCase: () => Promise.resolve({ id: "case-1" }),
    });
    await service.transitionBmvToCase(ctx, "c1");
    const rpInsert = calls.find((c) =>
      c.sql.includes("insert into residence_periods"),
    );
    assert.ok(rpInsert, "should insert residence_periods placeholder");
    assert.ok(rpInsert.params?.includes("case-1"), "case id");
    assert.ok(rpInsert.params?.includes("c1"), "customer id");
    assert.ok(rpInsert.params?.includes(ctx.orgId), "org id");
  });
  void test("uses sentinel date 1970-01-01 for valid_from/valid_until", async () => {
    const signedRow = makeSignedCustomerRow();
    const { service, calls } = createTestService(transitionQueryFn(signedRow), {
      createCase: () => Promise.resolve({ id: "case-1" }),
    });
    await service.transitionBmvToCase(ctx, "c1");
    const rpInsert = calls.find((c) =>
      c.sql.includes("insert into residence_periods"),
    );
    assert.ok(rpInsert);
    assert.ok(rpInsert.params?.includes("1970-01-01"), "sentinel date");
  });
  void test("visa_type is BMV_CASE_TYPE", async () => {
    const signedRow = makeSignedCustomerRow();
    const { service, calls } = createTestService(transitionQueryFn(signedRow), {
      createCase: () => Promise.resolve({ id: "case-1" }),
    });
    await service.transitionBmvToCase(ctx, "c1");
    const rpInsert = calls.find((c) =>
      c.sql.includes("insert into residence_periods"),
    );
    assert.ok(rpInsert);
    assert.ok(rpInsert.params?.includes(BMV_CASE_TYPE), "visa_type");
  });
});
// ────────────────────────────────────────────────────────────────
// Reminders 排程觸發測
// ────────────────────────────────────────────────────────────────
void describe("D7 Reminders: renewal reminder placeholders", () => {
  void test("inserts 3 placeholders (180/90/30 days) from blueprint", async () => {
    const signedRow = makeSignedCustomerRow();
    const { service, calls } = createTestService(transitionQueryFn(signedRow), {
      createCase: () => Promise.resolve({ id: "case-1" }),
    });
    await service.transitionBmvToCase(ctx, "c1");
    const inserts = calls.filter((c) =>
      c.sql.includes("insert into reminders"),
    );
    assert.equal(inserts.length, 3, "3 reminder placeholders");
    const dedupeKeys = inserts.map((c) =>
      c.params?.find(
        (p) => typeof p === "string" && p.startsWith("bmv_renewal_"),
      ),
    );
    assert.ok(
      dedupeKeys.some((k) => typeof k === "string" && k.includes("180d")),
    );
    assert.ok(
      dedupeKeys.some((k) => typeof k === "string" && k.includes("90d")),
    );
    assert.ok(
      dedupeKeys.some((k) => typeof k === "string" && k.includes("30d")),
    );
  });
  void test("uses far-future sentinel remind_at (9999-12-31)", async () => {
    const signedRow = makeSignedCustomerRow();
    const { service, calls } = createTestService(transitionQueryFn(signedRow), {
      createCase: () => Promise.resolve({ id: "case-1" }),
    });
    await service.transitionBmvToCase(ctx, "c1");
    const inserts = calls.filter((c) =>
      c.sql.includes("insert into reminders"),
    );
    for (const insert of inserts) {
      assert.ok(
        insert.params?.some(
          (p) => typeof p === "string" && p.includes("9999-12-31"),
        ),
        "remind_at sentinel",
      );
    }
  });
  void test("references the created case_id", async () => {
    const signedRow = makeSignedCustomerRow();
    const { service, calls } = createTestService(transitionQueryFn(signedRow), {
      createCase: () => Promise.resolve({ id: "case-1" }),
    });
    await service.transitionBmvToCase(ctx, "c1");
    const inserts = calls.filter((c) =>
      c.sql.includes("insert into reminders"),
    );
    for (const insert of inserts) {
      assert.ok(insert.params?.includes("case-1"), "case id in reminder");
    }
  });
  void test("payload includes pendingCoeDate: true", async () => {
    const signedRow = makeSignedCustomerRow();
    const { service, calls } = createTestService(transitionQueryFn(signedRow), {
      createCase: () => Promise.resolve({ id: "case-1" }),
    });
    await service.transitionBmvToCase(ctx, "c1");
    const inserts = calls.filter((c) =>
      c.sql.includes("insert into reminders"),
    );
    for (const insert of inserts) {
      const jsonParam = insert.params?.find(
        (p) => typeof p === "string" && p.includes("pendingCoeDate"),
      );
      assert.ok(jsonParam, "payload should include pendingCoeDate");
      const parsed = JSON.parse(jsonParam);
      assert.equal(parsed.pendingCoeDate, true);
    }
  });
});
//# sourceMappingURL=customers.bmv.d7-billing-residence.focused.test.js.map
