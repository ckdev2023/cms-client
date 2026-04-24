import { computed } from "vue";
import { describe, expect, it } from "vitest";
import { SAMPLE_CUSTOMER_DETAILS } from "../fixtures";
import {
  buildCustomerBmvIntakeCardViewModel,
  useCustomerBmvIntakeCardModel,
} from "./useCustomerBmvIntakeCardModel";

describe("buildCustomerBmvIntakeCardViewModel", () => {
  it("returns null for non-BMV customers", () => {
    expect(
      buildCustomerBmvIntakeCardViewModel(SAMPLE_CUSTOMER_DETAILS["cust-001"]!),
    ).toBeNull();
  });

  it("derives stage, next step, gate hint and timeline from bmvProfile", () => {
    const viewModel = buildCustomerBmvIntakeCardViewModel(
      SAMPLE_CUSTOMER_DETAILS["cust-004"]!,
    );

    expect(viewModel).toMatchObject({
      stage: {
        labelKey: "customers.detail.bmvIntake.stage.sign_pending",
        tone: "warning",
      },
      nextStepKey: "customers.detail.bmvIntake.nextStepValue.sign_pending",
      gateHintKey: "customers.detail.bmvIntake.gateHintValue.locked",
      stepStatuses: [
        {
          labelKey: "customers.detail.bmvIntake.steps.questionnaire",
          valueKey: "customers.detail.bmvIntake.questionnaireStatus.returned",
          tone: "success",
        },
        {
          labelKey: "customers.detail.bmvIntake.steps.quote",
          valueKey: "customers.detail.bmvIntake.quoteStatus.confirmed",
          tone: "success",
        },
        {
          labelKey: "customers.detail.bmvIntake.steps.sign",
          valueKey: "customers.detail.bmvIntake.signStatus.pending",
          tone: "warning",
        },
      ],
      note: "待签约后即可进入建案。",
    });
    expect(viewModel?.timeline[0]?.value).toBe("2026-04-01 09:00");
    expect(viewModel?.timeline[4]?.value).toBe("—");
  });

  it("switches to ready state after signing", () => {
    const customer = structuredClone(SAMPLE_CUSTOMER_DETAILS["cust-004"]!);
    if (!customer.bmvProfile) throw new Error("Expected BMV profile");

    customer.bmvProfile.signStatus = "signed";
    customer.bmvProfile.signedAt = "2026-04-10T10:45:00+09:00";
    customer.bmvProfile.intakeStatus = "ready_for_case_creation";

    const viewModel = buildCustomerBmvIntakeCardViewModel(customer);
    expect(viewModel?.stage).toEqual({
      labelKey: "customers.detail.bmvIntake.stage.ready_for_case_creation",
      tone: "success",
    });
    expect(viewModel?.nextStepKey).toBe(
      "customers.detail.bmvIntake.nextStepValue.ready_for_case_creation",
    );
    expect(viewModel?.gateHintKey).toBe(
      "customers.detail.bmvIntake.gateHintValue.ready",
    );
    expect(viewModel?.timeline[4]?.value).toBe("2026-04-10 10:45");
  });
});

describe("useCustomerBmvIntakeCardModel", () => {
  it("exposes a computed intake card view model", () => {
    const customer = computed(() => SAMPLE_CUSTOMER_DETAILS["cust-004"]!);
    const { intakeCard } = useCustomerBmvIntakeCardModel({ customer });

    expect(intakeCard.value?.stage.labelKey).toBe(
      "customers.detail.bmvIntake.stage.sign_pending",
    );
  });
});
