import { computed } from "vue";
import { describe, expect, it } from "vitest";
import {
  SAMPLE_BMV_AGGREGATE_POST_APPROVAL,
  SAMPLE_BMV_AGGREGATE_SIGNED,
  SAMPLE_BMV_AGGREGATE_WITH_CASE,
  SAMPLE_CUSTOMER_DETAILS,
} from "../fixtures";
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

  it("keeps UTC timeline timestamps explicit with a timezone suffix", () => {
    const customer = structuredClone(SAMPLE_CUSTOMER_DETAILS["cust-004"]!);
    if (!customer.bmvProfile) throw new Error("Expected BMV profile");

    customer.bmvProfile.quoteConfirmedAt = "2026-04-27T06:07:00Z";
    customer.bmvProfile.signStatus = "signed";
    customer.bmvProfile.signedAt = "2026-04-28T03:15:00+00:00";
    customer.bmvProfile.intakeStatus = "ready_for_case_creation";

    const viewModel = buildCustomerBmvIntakeCardViewModel(customer);
    expect(viewModel?.timeline[3]?.value).toBe("2026-04-27 06:07 (UTC)");
    expect(viewModel?.timeline[4]?.value).toBe("2026-04-28 03:15 (UTC)");
  });

  it("defaults aggregate sections to empty when no aggregate provided", () => {
    const viewModel = buildCustomerBmvIntakeCardViewModel(
      SAMPLE_CUSTOMER_DETAILS["cust-004"]!,
    );
    expect(viewModel?.quoteHistory).toEqual([]);
    expect(viewModel?.surveyDataSummary).toBeNull();
    expect(viewModel?.linkedCase).toBeNull();
    expect(viewModel?.reminders).toEqual([]);
    expect(viewModel?.canTransitionToCase).toBe(false);
  });

  it("builds quote history items from aggregate", () => {
    const customer = structuredClone(SAMPLE_CUSTOMER_DETAILS["cust-004"]!);
    customer.bmvProfile!.signStatus = "signed";
    customer.bmvProfile!.intakeStatus = "ready_for_case_creation";

    const viewModel = buildCustomerBmvIntakeCardViewModel(
      customer,
      SAMPLE_BMV_AGGREGATE_SIGNED,
    );
    expect(viewModel?.quoteHistory).toHaveLength(2);
    expect(viewModel?.quoteHistory[0]).toMatchObject({
      id: "quote-v1",
      versionLabel: "v1",
      amount: "¥350,000",
      isCurrent: false,
    });
    expect(viewModel?.quoteHistory[1]).toMatchObject({
      id: "quote-v2",
      versionLabel: "v2",
      amount: "¥380,000",
      isCurrent: true,
    });
  });

  it("builds survey data summary from aggregate", () => {
    const customer = structuredClone(SAMPLE_CUSTOMER_DETAILS["cust-004"]!);
    customer.bmvProfile!.signStatus = "signed";
    customer.bmvProfile!.intakeStatus = "ready_for_case_creation";

    const viewModel = buildCustomerBmvIntakeCardViewModel(
      customer,
      SAMPLE_BMV_AGGREGATE_SIGNED,
    );
    expect(viewModel?.surveyDataSummary).toBeDefined();
    expect(viewModel?.surveyDataSummary?.fieldCount).toBe(24);
    expect(viewModel?.surveyDataSummary?.highlightFields).toHaveLength(3);
    expect(viewModel?.surveyDataSummary?.highlightFields[0]).toEqual({
      label: "会社名",
      value: "ABC株式会社",
    });
  });

  it("builds linked case summary from aggregate", () => {
    const customer = structuredClone(SAMPLE_CUSTOMER_DETAILS["cust-004"]!);
    customer.bmvProfile!.signStatus = "signed";
    customer.bmvProfile!.intakeStatus = "ready_for_case_creation";

    const viewModel = buildCustomerBmvIntakeCardViewModel(
      customer,
      SAMPLE_BMV_AGGREGATE_WITH_CASE,
    );
    expect(viewModel?.linkedCase).toBeDefined();
    expect(viewModel?.linkedCase?.caseId).toBe("CASE-2026-0601");
    expect(viewModel?.linkedCase?.stage).toBe("資料収集中");
    expect(viewModel?.linkedCase?.postApprovalStage).toBeNull();
  });

  it("builds linked case with post-approval stage and COE status", () => {
    const customer = structuredClone(SAMPLE_CUSTOMER_DETAILS["cust-004"]!);
    customer.bmvProfile!.signStatus = "signed";
    customer.bmvProfile!.intakeStatus = "ready_for_case_creation";

    const viewModel = buildCustomerBmvIntakeCardViewModel(
      customer,
      SAMPLE_BMV_AGGREGATE_POST_APPROVAL,
    );
    expect(viewModel?.linkedCase?.postApprovalStage).toBe("COE 発行待ち");
    expect(viewModel?.linkedCase?.coeStatus).toBe("pending");
  });

  it("builds reminders from aggregate", () => {
    const customer = structuredClone(SAMPLE_CUSTOMER_DETAILS["cust-004"]!);
    customer.bmvProfile!.signStatus = "signed";
    customer.bmvProfile!.intakeStatus = "ready_for_case_creation";

    const viewModel = buildCustomerBmvIntakeCardViewModel(
      customer,
      SAMPLE_BMV_AGGREGATE_POST_APPROVAL,
    );
    expect(viewModel?.reminders).toHaveLength(2);
    expect(viewModel?.reminders[0]).toMatchObject({
      id: "rem-001",
      type: "COE 期限確認",
      status: "pending",
    });
  });

  it("sets canTransitionToCase true only when signed and ready", () => {
    const pending = buildCustomerBmvIntakeCardViewModel(
      SAMPLE_CUSTOMER_DETAILS["cust-004"]!,
    );
    expect(pending?.canTransitionToCase).toBe(false);

    const customer = structuredClone(SAMPLE_CUSTOMER_DETAILS["cust-004"]!);
    customer.bmvProfile!.signStatus = "signed";
    customer.bmvProfile!.intakeStatus = "ready_for_case_creation";

    const ready = buildCustomerBmvIntakeCardViewModel(customer);
    expect(ready?.canTransitionToCase).toBe(true);
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

  it("incorporates aggregate data when provided", () => {
    const customer = computed(() => {
      const c = structuredClone(SAMPLE_CUSTOMER_DETAILS["cust-004"]!);
      c.bmvProfile!.signStatus = "signed";
      c.bmvProfile!.intakeStatus = "ready_for_case_creation";
      return c;
    });
    const aggregate = computed(() => SAMPLE_BMV_AGGREGATE_SIGNED);
    const { intakeCard } = useCustomerBmvIntakeCardModel({
      customer,
      aggregate,
    });

    expect(intakeCard.value?.quoteHistory).toHaveLength(2);
    expect(intakeCard.value?.surveyDataSummary?.fieldCount).toBe(24);
    expect(intakeCard.value?.canTransitionToCase).toBe(true);
  });
});
