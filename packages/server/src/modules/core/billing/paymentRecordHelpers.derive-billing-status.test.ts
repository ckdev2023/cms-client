import assert from "node:assert/strict";
import test from "node:test";

import { deriveBillingStatus } from "./paymentRecordHelpers";

void test("deriveBillingStatus: zero amountDue with no payments stays due", () => {
  assert.equal(deriveBillingStatus(0, 0), "due");
});

void test("deriveBillingStatus: zero amountDue with payments is partial (not paid)", () => {
  assert.equal(deriveBillingStatus(150_000, 0), "partial");
  assert.equal(deriveBillingStatus(1, 0), "partial");
});

void test("deriveBillingStatus: positive amountDue behaves as before", () => {
  assert.equal(deriveBillingStatus(0, 100_000), "due");
  assert.equal(deriveBillingStatus(50_000, 100_000), "partial");
  assert.equal(deriveBillingStatus(100_000, 100_000), "paid");
  assert.equal(deriveBillingStatus(120_000, 100_000), "paid");
});
