import { computed } from "vue";
import { describe, expect, it } from "vitest";
import { SAMPLE_CUSTOMER_DETAILS } from "../fixtures";
import {
  buildCustomerCreateCaseGateViewModel,
  useCustomerCreateCaseGateModel,
} from "./useCustomerCreateCaseGateModel";

describe("buildCustomerCreateCaseGateViewModel", () => {
  it("keeps non-BMV customers unblocked", () => {
    expect(
      buildCustomerCreateCaseGateViewModel(
        SAMPLE_CUSTOMER_DETAILS["cust-001"]!,
      ),
    ).toEqual({
      single: { disabled: false },
      batch: { disabled: false },
      blockedReasonKey: null,
    });
  });

  it("locks both create-case entries before signing is completed", () => {
    expect(
      buildCustomerCreateCaseGateViewModel(
        SAMPLE_CUSTOMER_DETAILS["cust-004"]!,
      ),
    ).toEqual({
      single: { disabled: true },
      batch: { disabled: true },
      blockedReasonKey: "customers.detail.actions.createCaseGate.needsSign",
    });
  });

  it("keeps the gate locked when signing is recorded but intake is not ready", () => {
    const customer = structuredClone(SAMPLE_CUSTOMER_DETAILS["cust-004"]!);
    if (!customer.bmvProfile) throw new Error("Expected BMV profile");

    customer.bmvProfile.signStatus = "signed";
    customer.bmvProfile.intakeStatus = "sign_pending";

    expect(buildCustomerCreateCaseGateViewModel(customer)).toEqual({
      single: { disabled: true },
      batch: { disabled: true },
      blockedReasonKey:
        "customers.detail.actions.createCaseGate.intakeNotReady",
    });
  });

  it("unlocks both create-case entries once BMV intake is ready", () => {
    const customer = structuredClone(SAMPLE_CUSTOMER_DETAILS["cust-004"]!);
    if (!customer.bmvProfile) throw new Error("Expected BMV profile");

    customer.bmvProfile.signStatus = "signed";
    customer.bmvProfile.intakeStatus = "ready_for_case_creation";

    expect(buildCustomerCreateCaseGateViewModel(customer)).toEqual({
      single: { disabled: false },
      batch: { disabled: false },
      blockedReasonKey: null,
    });
  });
});

describe("useCustomerCreateCaseGateModel", () => {
  it("exposes the computed gate state", () => {
    const customer = computed(() => SAMPLE_CUSTOMER_DETAILS["cust-004"]!);
    const { createCaseGate, canCreateCase } = useCustomerCreateCaseGateModel({
      customer,
    });

    expect(createCaseGate.value.blockedReasonKey).toBe(
      "customers.detail.actions.createCaseGate.needsSign",
    );
    expect(canCreateCase.value).toBe(false);
  });

  it("exposes a ready state for signed BMV customers", () => {
    const customer = structuredClone(SAMPLE_CUSTOMER_DETAILS["cust-004"]!);
    if (!customer.bmvProfile) throw new Error("Expected BMV profile");

    customer.bmvProfile.signStatus = "signed";
    customer.bmvProfile.intakeStatus = "ready_for_case_creation";

    const { createCaseGate, canCreateCase } = useCustomerCreateCaseGateModel({
      customer: computed(() => customer),
    });

    expect(createCaseGate.value.blockedReasonKey).toBeNull();
    expect(createCaseGate.value.single.disabled).toBe(false);
    expect(createCaseGate.value.batch.disabled).toBe(false);
    expect(canCreateCase.value).toBe(true);
  });
});
