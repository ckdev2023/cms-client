import test from "node:test";
import assert from "node:assert/strict";

import type { Customer } from "../model/coreEntities";
import {
  createDefaultCustomerBmvProfile,
  mapCustomerToDetailDto,
  mapCustomerToSummaryDto,
  normalizeCustomerBmvProfile,
  resolveCustomerBmvProfile,
} from "./customers.dto-mappers";

const baseCustomer: Customer = {
  id: "cust-bug158",
  orgId: "org-001",
  type: "individual",
  baseProfile: {
    displayName: "テスト太郎",
    legalName: "テスト太郎",
    customerNumber: "C-BUG158",
  },
  contacts: [],
  createdAt: "2026-04-30T00:00:00.000Z",
  updatedAt: "2026-04-30T00:00:00.000Z",
};

void test("BUG-158: normalizeCustomerBmvProfile returns default when raw is empty object", () => {
  const profile = normalizeCustomerBmvProfile({});
  const expected = createDefaultCustomerBmvProfile();
  assert.deepEqual(profile, expected);
  assert.equal(profile.intakeStatus, "not_started");
  assert.equal(profile.questionnaireStatus, "not_started");
  assert.equal(profile.quoteStatus, "not_started");
  assert.equal(profile.signStatus, "not_started");
});

void test("BUG-158: normalizeCustomerBmvProfile returns default when raw is null/undefined", () => {
  assert.deepEqual(
    normalizeCustomerBmvProfile(null),
    createDefaultCustomerBmvProfile(),
  );
  assert.deepEqual(
    normalizeCustomerBmvProfile(undefined),
    createDefaultCustomerBmvProfile(),
  );
});

void test("BUG-158: normalizeCustomerBmvProfile still normalizes non-empty input", () => {
  const profile = normalizeCustomerBmvProfile({
    questionnaireStatus: "returned",
    quoteStatus: "generated",
    signStatus: "pending",
  });
  assert.equal(profile.questionnaireStatus, "returned");
  assert.equal(profile.quoteStatus, "generated");
  assert.equal(profile.signStatus, "pending");
  assert.equal(profile.intakeStatus, "sign_pending");
});

void test("BUG-158: resolveCustomerBmvProfile returns default for baseProfile without bmvProfile key", () => {
  const profile = resolveCustomerBmvProfile({ displayName: "test" });
  assert.deepEqual(profile, createDefaultCustomerBmvProfile());
});

void test("BUG-158: mapCustomerToSummaryDto.bmvProfile is always non-null even when baseProfile has no bmvProfile", () => {
  const summary = mapCustomerToSummaryDto(baseCustomer);
  assert.ok(summary.bmvProfile);
  assert.equal(summary.bmvProfile.intakeStatus, "not_started");
  assert.equal(summary.bmvProfile.questionnaireStatus, "not_started");
});

void test("BUG-158: mapCustomerToDetailDto.bmvProfile is always non-null for new customer", () => {
  const detail = mapCustomerToDetailDto(baseCustomer);
  assert.ok(detail.bmvProfile);
  assert.equal(detail.bmvProfile.intakeStatus, "not_started");
});

void test("BUG-158: mapCustomerToDetailDto.visaType falls back to baseProfile.visaType when bmvProfile has no visaPlan", () => {
  const customer: Customer = {
    ...baseCustomer,
    baseProfile: {
      ...baseCustomer.baseProfile,
      visaType: "engineer_humanities",
    },
  };
  const detail = mapCustomerToDetailDto(customer);
  assert.equal(detail.bmvProfile.intakeStatus, "not_started");
  assert.equal(detail.visaType, "engineer_humanities");
});

void test("BUG-158: mapCustomerToDetailDto.visaType prefers bmvProfile.visaPlan over baseProfile.visaType", () => {
  const customer: Customer = {
    ...baseCustomer,
    baseProfile: {
      ...baseCustomer.baseProfile,
      visaType: "should_be_ignored",
      bmvProfile: {
        questionnaireStatus: "returned",
        quoteStatus: "confirmed",
        signStatus: "signed",
        visaPlan: "new_1year",
      },
    },
  };
  const detail = mapCustomerToDetailDto(customer);
  assert.equal(detail.visaType, "new_1year");
  assert.equal(detail.bmvProfile.intakeStatus, "ready_for_case_creation");
});

void test("BUG-158: mapCustomerToDetailDto.visaType is null when neither bmvProfile.visaPlan nor baseProfile.visaType exist", () => {
  const detail = mapCustomerToDetailDto(baseCustomer);
  assert.equal(detail.visaType, null);
});
