import { describe, test } from "node:test";
import assert from "node:assert/strict";

import { BMV_CASE_TYPE } from "../cases/cases.template-bmv";
import {
  ctx,
  makeSignedCustomerRow,
  createTestService,
  transitionQueryFn,
} from "./customers.bmv.d7.focused.test-support";

function requireCapturedInput(
  input: Record<string, unknown> | null,
): Record<string, unknown> {
  assert.ok(input);
  return input;
}

// ────────────────────────────────────────────────────────────────
// transition-to-case 字段映射回帰
// ────────────────────────────────────────────────────────────────

void describe("D7 transition field mapping: caseTypeCode", () => {
  void test("caseTypeCode is fixed to BMV_CASE_TYPE (business_manager_visa)", async () => {
    const signedRow = makeSignedCustomerRow();
    let capturedInput: Record<string, unknown> | null = null;
    const { service } = createTestService(transitionQueryFn(signedRow), {
      createCase: (_ctx: unknown, input: unknown) => {
        capturedInput = input as Record<string, unknown>;
        return Promise.resolve({ id: "case-1" });
      },
    });
    await service.transitionBmvToCase(ctx, "c1");
    const transitionInput = requireCapturedInput(capturedInput);
    assert.equal(transitionInput.caseTypeCode, BMV_CASE_TYPE);
    assert.equal(transitionInput.caseTypeCode, "business_manager_visa");
  });
});

void describe("D7 transition field mapping: customerId", () => {
  void test("customerId maps to the path param customer id", async () => {
    const signedRow = makeSignedCustomerRow();
    let capturedInput: Record<string, unknown> | null = null;
    const { service } = createTestService(transitionQueryFn(signedRow), {
      createCase: (_ctx: unknown, input: unknown) => {
        capturedInput = input as Record<string, unknown>;
        return Promise.resolve({ id: "case-1" });
      },
    });
    await service.transitionBmvToCase(ctx, "c1");
    const transitionInput = requireCapturedInput(capturedInput);
    assert.equal(transitionInput.customerId, "c1");
  });
});

void describe("D7 transition field mapping: lead inheritance", () => {
  void test("group_id and owner_user_id inherit from lead", async () => {
    const signedRow = makeSignedCustomerRow();
    let capturedInput: Record<string, unknown> | null = null;
    const { service } = createTestService(transitionQueryFn(signedRow), {
      createCase: (_ctx: unknown, input: unknown) => {
        capturedInput = input as Record<string, unknown>;
        return Promise.resolve({ id: "case-1" });
      },
    });
    await service.transitionBmvToCase(ctx, "c1");
    const transitionInput = requireCapturedInput(capturedInput);
    assert.equal(transitionInput.ownerUserId, "owner-lead-1");
    assert.equal(transitionInput.groupId, "grp-1");
  });

  void test("input overrides take precedence over lead inheritance", async () => {
    const signedRow = makeSignedCustomerRow();
    let capturedInput: Record<string, unknown> | null = null;
    const { service } = createTestService(transitionQueryFn(signedRow), {
      createCase: (_ctx: unknown, input: unknown) => {
        capturedInput = input as Record<string, unknown>;
        return Promise.resolve({ id: "case-1" });
      },
    });
    await service.transitionBmvToCase(ctx, "c1", {
      ownerUserId: "override-owner",
      groupId: "override-group",
    });
    const transitionInput = requireCapturedInput(capturedInput);
    assert.equal(transitionInput.ownerUserId, "override-owner");
    assert.equal(transitionInput.groupId, "override-group");
  });
});

void describe("D7 transition field mapping: visaPlan + quotePrice", () => {
  void test("visaPlan maps from bmvProfile.visaPlan", async () => {
    const signedRow = makeSignedCustomerRow();
    let capturedInput: Record<string, unknown> | null = null;
    const { service } = createTestService(transitionQueryFn(signedRow), {
      createCase: (_ctx: unknown, input: unknown) => {
        capturedInput = input as Record<string, unknown>;
        return Promise.resolve({ id: "case-1" });
      },
    });
    await service.transitionBmvToCase(ctx, "c1");
    const transitionInput = requireCapturedInput(capturedInput);
    assert.equal(transitionInput.visaPlan, "new_1year");
  });

  void test("quotePrice resolves from intake_forms form_data.amount", async () => {
    const signedRow = makeSignedCustomerRow();
    let capturedInput: Record<string, unknown> | null = null;
    const { service } = createTestService(transitionQueryFn(signedRow), {
      createCase: (_ctx: unknown, input: unknown) => {
        capturedInput = input as Record<string, unknown>;
        return Promise.resolve({ id: "case-1" });
      },
    });
    await service.transitionBmvToCase(ctx, "c1");
    const transitionInput = requireCapturedInput(capturedInput);
    assert.equal(transitionInput.quotePrice, 550000);
  });

  void test("quotePrice falls back to profile.quoteAmount when form has no amount", async () => {
    const signedRow = makeSignedCustomerRow();
    let capturedInput: Record<string, unknown> | null = null;
    const { service } = createTestService(
      (sql) => {
        if (sql.includes("from leads where"))
          return Promise.resolve({
            rows: [{ group_id: null, owner_user_id: null }],
          });
        if (sql.includes("from intake_forms where id"))
          return Promise.resolve({ rows: [{ form_data: { items: [] } }] });
        if (
          sql.includes("from intake_forms") &&
          sql.includes("bmv_questionnaire")
        )
          return Promise.resolve({ rows: [] });
        if (
          sql.includes("update conversations") ||
          sql.includes("update leads") ||
          sql.includes("insert into residence_periods") ||
          sql.includes("insert into reminders")
        )
          return Promise.resolve({ rows: [] });
        if (
          sql.includes("from billing_records") &&
          sql.includes("milestone_name")
        )
          return Promise.resolve({ rows: [] });
        if (sql.includes("insert into billing_records"))
          return Promise.resolve({ rows: [{ id: "bp-1" }] });
        if (sql.includes("insert into payment_records"))
          return Promise.resolve({ rows: [{ id: "pr-1" }] });
        if (
          sql.includes("update billing_records") &&
          sql.includes("status = 'paid'")
        )
          return Promise.resolve({ rows: [] });
        return Promise.resolve({ rows: [signedRow] });
      },
      {
        createCase: (_ctx: unknown, input: unknown) => {
          capturedInput = input as Record<string, unknown>;
          return Promise.resolve({ id: "case-1" });
        },
      },
    );
    await service.transitionBmvToCase(ctx, "c1");
    const transitionInput = requireCapturedInput(capturedInput);
    assert.equal(transitionInput.quotePrice, 500000);
  });

  void test("sourceChannel is bmv_transition", async () => {
    const signedRow = makeSignedCustomerRow();
    let capturedInput: Record<string, unknown> | null = null;
    const { service } = createTestService(transitionQueryFn(signedRow), {
      createCase: (_ctx: unknown, input: unknown) => {
        capturedInput = input as Record<string, unknown>;
        return Promise.resolve({ id: "case-1" });
      },
    });
    await service.transitionBmvToCase(ctx, "c1");
    const transitionInput = requireCapturedInput(capturedInput);
    assert.equal(transitionInput.sourceChannel, "bmv_transition");
  });
});

void describe("D7 transition side-effects: conversation + lead sync", () => {
  void test("conversations.case_id synced when sourceLeadId exists", async () => {
    const signedRow = makeSignedCustomerRow();
    const { service, calls } = createTestService(transitionQueryFn(signedRow), {
      createCase: () => Promise.resolve({ id: "case-1" }),
    });
    await service.transitionBmvToCase(ctx, "c1");
    const convUpdate = calls.find((c) =>
      c.sql.includes("update conversations"),
    );
    assert.ok(convUpdate, "should sync conversations.case_id");
    assert.ok(convUpdate.params?.includes("case-1"));
    assert.ok(convUpdate.params?.includes("lead-1"));
  });

  void test("leads.converted_case_id synced when sourceLeadId exists", async () => {
    const signedRow = makeSignedCustomerRow();
    const { service, calls } = createTestService(transitionQueryFn(signedRow), {
      createCase: () => Promise.resolve({ id: "case-1" }),
    });
    await service.transitionBmvToCase(ctx, "c1");
    const leadUpdate = calls.find(
      (c) =>
        c.sql.includes("update leads") && c.sql.includes("converted_case_id"),
    );
    assert.ok(leadUpdate, "should sync leads.converted_case_id");
    assert.ok(leadUpdate.params?.includes("case-1"));
    assert.ok(leadUpdate.params?.includes("lead-1"));
  });
});
