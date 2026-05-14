import assert from "node:assert/strict";
import test from "node:test";

import {
  mapBillingPlanRow,
  mapBillingPlanWithPaymentsRow,
} from "./billingPlans.service";

const ORG_ID = "00000000-0000-4000-8000-000000000000";
const BILLING_PLAN_ID = "bp-1";
const CASE_ID = "case-1";

function makeBillingPlanRow(overrides: Record<string, unknown> = {}) {
  return {
    id: BILLING_PLAN_ID,
    org_id: ORG_ID,
    case_id: CASE_ID,
    milestone_name: null,
    amount_due: "1200.50",
    due_date: "2026-06-01",
    status: "due",
    gate_effect_mode: "warn",
    remark: "initial",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeBillingPlanWithPaymentsRow(
  overrides: Record<string, unknown> = {},
) {
  return {
    ...makeBillingPlanRow(),
    paid_amount: "300.00",
    case_no: "CASE-001",
    case_name: "Test Case",
    customer_name: "田中太郎",
    group_id: "group-1",
    owner_user_id: "owner-1",
    owner_display_name: "鈴木花子",
    ...overrides,
  };
}

void test("mapBillingPlanRow maps database row to BillingPlan", () => {
  const plan = mapBillingPlanRow(makeBillingPlanRow());
  assert.equal(plan.id, BILLING_PLAN_ID);
  assert.equal(plan.caseId, CASE_ID);
  assert.equal(plan.amountDue, 1200.5);
  assert.equal(plan.dueDate, "2026-06-01");
  assert.equal(plan.status, "due");
  assert.equal(plan.gateEffectMode, "warn");
});

void test("mapBillingPlanRow handles null optional fields", () => {
  const plan = mapBillingPlanRow(
    makeBillingPlanRow({
      milestone_name: null,
      due_date: null,
      remark: null,
    }),
  );
  assert.equal(plan.milestoneName, null);
  assert.equal(plan.dueDate, null);
  assert.equal(plan.remark, null);
});

void test("mapBillingPlanWithPaymentsRow maps extended fields", () => {
  const dto = mapBillingPlanWithPaymentsRow(makeBillingPlanWithPaymentsRow());
  assert.equal(dto.id, BILLING_PLAN_ID);
  assert.equal(dto.caseId, CASE_ID);
  assert.equal(dto.amountDue, 1200.5);
  assert.equal(dto.paidAmount, 300);
  assert.equal(dto.unpaidAmount, 900.5);
  assert.equal(dto.caseNo, "CASE-001");
  assert.equal(dto.caseName, "Test Case");
  assert.equal(dto.customerName, "田中太郎");
  assert.equal(dto.groupId, "group-1");
  assert.equal(dto.ownerUserId, "owner-1");
  assert.equal(dto.ownerDisplayName, "鈴木花子");
});

void test("mapBillingPlanWithPaymentsRow clamps unpaidAmount to zero", () => {
  const dto = mapBillingPlanWithPaymentsRow(
    makeBillingPlanWithPaymentsRow({
      amount_due: "100",
      paid_amount: "150",
    }),
  );
  assert.equal(dto.paidAmount, 150);
  assert.equal(dto.unpaidAmount, 0);
});

void test("mapBillingPlanWithPaymentsRow handles null owner/customer", () => {
  const dto = mapBillingPlanWithPaymentsRow(
    makeBillingPlanWithPaymentsRow({
      owner_user_id: null,
      owner_display_name: null,
      customer_name: null,
      case_no: null,
      case_name: null,
      group_id: null,
    }),
  );
  assert.equal(dto.ownerUserId, null);
  assert.equal(dto.ownerDisplayName, null);
  assert.equal(dto.customerName, null);
  assert.equal(dto.caseNo, null);
  assert.equal(dto.caseName, null);
  assert.equal(dto.groupId, null);
});

void test("mapBillingPlanWithPaymentsRow handles zero paid_amount", () => {
  const dto = mapBillingPlanWithPaymentsRow(
    makeBillingPlanWithPaymentsRow({ paid_amount: "0" }),
  );
  assert.equal(dto.paidAmount, 0);
  assert.equal(dto.unpaidAmount, 1200.5);
});
