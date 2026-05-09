import { computed } from "vue";
import { describe, expect, it } from "vitest";
import { SAMPLE_CUSTOMER_DETAILS } from "../fixtures";
import {
  buildCustomerCreateCaseGateViewModel,
  customerRequiresBmv,
  useCustomerCreateCaseGateModel,
} from "./useCustomerCreateCaseGateModel";

describe("customerRequiresBmv", () => {
  it("returns true for business_manager visaType", () => {
    expect(customerRequiresBmv(SAMPLE_CUSTOMER_DETAILS["cust-001"]!)).toBe(
      true,
    );
  });

  it("returns false for non-BMV customer with family_stay visa", () => {
    const customer = structuredClone(SAMPLE_CUSTOMER_DETAILS["cust-003"]!);
    customer.visaType = "family_stay";
    customer.bmvProfile = null;
    expect(customerRequiresBmv(customer)).toBe(false);
  });

  it("returns true when bmvProfile questionnaire has started", () => {
    const customer = structuredClone(SAMPLE_CUSTOMER_DETAILS["cust-003"]!);
    customer.visaType = "skilled_labor";
    customer.bmvProfile = {
      questionnaireStatus: "sent",
      quoteStatus: "not_started",
      signStatus: "not_started",
      intakeStatus: "questionnaire_pending",
      questionnaireSentAt: "2026-04-01T09:00:00+09:00",
      questionnaireReturnedAt: null,
      quoteGeneratedAt: null,
      quoteConfirmedAt: null,
      signedAt: null,
      note: null,
      sourceLeadId: null,
      leadGroupId: null,
      leadOwnerUserId: null,
    };
    expect(customerRequiresBmv(customer)).toBe(true);
  });

  it("returns false when bmvProfile exists but questionnaire is not_started and visa is not business_manager", () => {
    const customer = structuredClone(SAMPLE_CUSTOMER_DETAILS["cust-003"]!);
    customer.visaType = "skilled_labor";
    customer.bmvProfile = {
      questionnaireStatus: "not_started",
      quoteStatus: "not_started",
      signStatus: "not_started",
      intakeStatus: "not_started",
      questionnaireSentAt: null,
      questionnaireReturnedAt: null,
      quoteGeneratedAt: null,
      quoteConfirmedAt: null,
      signedAt: null,
      note: null,
      sourceLeadId: null,
      leadGroupId: null,
      leadOwnerUserId: null,
    };
    expect(customerRequiresBmv(customer)).toBe(false);
  });
});

describe("buildCustomerCreateCaseGateViewModel", () => {
  it("nonBmvCustomer_buttonsEnabled (visaType=family_stay)", () => {
    const customer = structuredClone(SAMPLE_CUSTOMER_DETAILS["cust-003"]!);
    customer.visaType = "family_stay";
    customer.bmvProfile = null;

    expect(buildCustomerCreateCaseGateViewModel(customer, true)).toEqual({
      single: { disabled: false },
      batch: { disabled: false },
      blockedReasonKey: null,
    });
  });

  it("keeps non-BMV customers unblocked even when BMV flag is disabled", () => {
    const customer = structuredClone(SAMPLE_CUSTOMER_DETAILS["cust-003"]!);
    customer.visaType = "family_stay";
    customer.bmvProfile = null;

    expect(buildCustomerCreateCaseGateViewModel(customer, false)).toEqual({
      single: { disabled: false },
      batch: { disabled: false },
      blockedReasonKey: null,
    });
  });

  it("keeps non-BMV customers unblocked (cust-001 has business_manager visaType but null bmvProfile)", () => {
    expect(
      buildCustomerCreateCaseGateViewModel(
        SAMPLE_CUSTOMER_DETAILS["cust-001"]!,
        true,
      ),
    ).toEqual({
      single: { disabled: false },
      batch: { disabled: false },
      blockedReasonKey: null,
    });
  });

  it("bmvCustomer_unsigned_buttonsDisabled_withReasonKey", () => {
    expect(
      buildCustomerCreateCaseGateViewModel(
        SAMPLE_CUSTOMER_DETAILS["cust-004"]!,
        true,
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

    expect(buildCustomerCreateCaseGateViewModel(customer, true)).toEqual({
      single: { disabled: true },
      batch: { disabled: true },
      blockedReasonKey:
        "customers.detail.actions.createCaseGate.intakeNotReady",
    });
  });

  it("bmvCustomer_signedAndIntakeReady_buttonsEnabled", () => {
    const customer = structuredClone(SAMPLE_CUSTOMER_DETAILS["cust-004"]!);
    if (!customer.bmvProfile) throw new Error("Expected BMV profile");

    customer.bmvProfile.signStatus = "signed";
    customer.bmvProfile.intakeStatus = "ready_for_case_creation";

    expect(buildCustomerCreateCaseGateViewModel(customer, true)).toEqual({
      single: { disabled: false },
      batch: { disabled: false },
      blockedReasonKey: null,
    });
  });

  it("bmvCustomer_flagDisabled_emitsFeatureDisabledReason", () => {
    expect(
      buildCustomerCreateCaseGateViewModel(
        SAMPLE_CUSTOMER_DETAILS["cust-004"]!,
        false,
      ),
    ).toEqual({
      single: { disabled: true },
      batch: { disabled: true },
      blockedReasonKey:
        "customers.detail.actions.createCaseGate.featureDisabled",
    });
  });

  it("bmvCustomer_flagDisabled_overridesIntakeNotReady", () => {
    const customer = structuredClone(SAMPLE_CUSTOMER_DETAILS["cust-004"]!);
    if (!customer.bmvProfile) throw new Error("Expected BMV profile");

    customer.bmvProfile.signStatus = "signed";
    customer.bmvProfile.intakeStatus = "sign_pending";

    expect(buildCustomerCreateCaseGateViewModel(customer, false)).toEqual({
      single: { disabled: true },
      batch: { disabled: true },
      blockedReasonKey:
        "customers.detail.actions.createCaseGate.featureDisabled",
    });
  });

  it("bmvCustomer_flagLoading_keepsExistingGateBehaviour", () => {
    expect(
      buildCustomerCreateCaseGateViewModel(
        SAMPLE_CUSTOMER_DETAILS["cust-004"]!,
        undefined,
      ),
    ).toEqual({
      single: { disabled: true },
      batch: { disabled: true },
      blockedReasonKey: "customers.detail.actions.createCaseGate.needsSign",
    });
  });
});

describe("useCustomerCreateCaseGateModel", () => {
  it("exposes the computed gate state", () => {
    const customer = computed(() => SAMPLE_CUSTOMER_DETAILS["cust-004"]!);
    const { createCaseGate, canCreateCase } = useCustomerCreateCaseGateModel({
      customer,
      bmvEnabled: computed(() => true),
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
      bmvEnabled: computed(() => true),
    });

    expect(createCaseGate.value.blockedReasonKey).toBeNull();
    expect(createCaseGate.value.single.disabled).toBe(false);
    expect(createCaseGate.value.batch.disabled).toBe(false);
    expect(canCreateCase.value).toBe(true);
  });

  it("emits featureDisabled when flag is disabled for BMV customer", () => {
    const customer = computed(() => SAMPLE_CUSTOMER_DETAILS["cust-004"]!);
    const { createCaseGate, canCreateCase } = useCustomerCreateCaseGateModel({
      customer,
      bmvEnabled: computed(() => false),
    });

    expect(createCaseGate.value.blockedReasonKey).toBe(
      "customers.detail.actions.createCaseGate.featureDisabled",
    );
    expect(createCaseGate.value.single.disabled).toBe(true);
    expect(createCaseGate.value.batch.disabled).toBe(true);
    expect(canCreateCase.value).toBe(false);
  });
});
