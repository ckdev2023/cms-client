import { computed, ref } from "vue";
import { describe, expect, it } from "vitest";
import { formatDateTime } from "../../../shared/model/formatDateTime";
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
  it("returns null when customer is null", () => {
    expect(buildCustomerBmvIntakeCardViewModel(null)).toBeNull();
  });

  it("returns not_started empty state when bmvProfile is null", () => {
    // cust-001 已有多个案件 (totalCases=3)，门禁文案应反映「不再作为前置」的实际语义。
    const viewModel = buildCustomerBmvIntakeCardViewModel(
      SAMPLE_CUSTOMER_DETAILS["cust-001"]!,
      undefined,
      "ja-JP",
    );
    expect(viewModel).not.toBeNull();
    expect(viewModel).toMatchObject({
      stage: {
        labelKey: "customers.detail.bmvIntake.stage.not_started",
        tone: "neutral",
      },
      nextStepKey: "customers.detail.bmvIntake.nextStepValue.not_started",
      gateHintKey:
        "customers.detail.bmvIntake.gateHintValue.bypassed_existing_cases",
      stepStatuses: [
        {
          labelKey: "customers.detail.bmvIntake.steps.questionnaire",
          valueKey:
            "customers.detail.bmvIntake.questionnaireStatus.not_started",
          tone: "neutral",
        },
        {
          labelKey: "customers.detail.bmvIntake.steps.quote",
          valueKey: "customers.detail.bmvIntake.quoteStatus.not_started",
          tone: "neutral",
        },
        {
          labelKey: "customers.detail.bmvIntake.steps.sign",
          valueKey: "customers.detail.bmvIntake.signStatus.not_started",
          tone: "neutral",
        },
      ],
      note: null,
      canTransitionToCase: false,
    });
    expect(viewModel!.timeline.every((t) => t.value === "")).toBe(true);
  });

  it("derives stage, next step, gate hint and timeline from bmvProfile", () => {
    const viewModel = buildCustomerBmvIntakeCardViewModel(
      SAMPLE_CUSTOMER_DETAILS["cust-004"]!,
      undefined,
      "ja-JP",
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
    expect(viewModel?.timeline[0]?.value).toBe(
      formatDateTime("2026-04-01T09:00:00+09:00", "ja-JP"),
    );
    expect(viewModel?.timeline[4]?.value).toBe("");
  });

  it("switches to ready state after signing", () => {
    const customer = structuredClone(SAMPLE_CUSTOMER_DETAILS["cust-004"]!);
    if (!customer.bmvProfile) throw new Error("Expected BMV profile");

    customer.bmvProfile.signStatus = "signed";
    customer.bmvProfile.signedAt = "2026-04-10T10:45:00+09:00";
    customer.bmvProfile.intakeStatus = "ready_for_case_creation";

    const viewModel = buildCustomerBmvIntakeCardViewModel(
      customer,
      undefined,
      "ja-JP",
    );
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
    expect(viewModel?.timeline[4]?.value).toBe(
      formatDateTime("2026-04-10T10:45:00+09:00", "ja-JP"),
    );
  });

  it("formats timeline timestamps consistently across locales (no raw ISO or UTC suffix)", () => {
    const customer = structuredClone(SAMPLE_CUSTOMER_DETAILS["cust-004"]!);
    if (!customer.bmvProfile) throw new Error("Expected BMV profile");

    customer.bmvProfile.quoteConfirmedAt = "2026-04-27T06:07:00Z";
    customer.bmvProfile.signStatus = "signed";
    customer.bmvProfile.signedAt = "2026-04-28T03:15:00+00:00";
    customer.bmvProfile.intakeStatus = "ready_for_case_creation";

    for (const locale of ["ja-JP", "zh-CN", "en-US"] as const) {
      const viewModel = buildCustomerBmvIntakeCardViewModel(
        customer,
        undefined,
        locale,
      );
      const confirmed = viewModel?.timeline[3]?.value ?? "";
      const signed = viewModel?.timeline[4]?.value ?? "";

      expect(confirmed).toBe(formatDateTime("2026-04-27T06:07:00Z", locale));
      expect(signed).toBe(formatDateTime("2026-04-28T03:15:00+00:00", locale));
      expect(confirmed).not.toContain("(UTC)");
      expect(signed).not.toContain("(UTC)");
      expect(confirmed).not.toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(signed).not.toMatch(/^\d{4}-\d{2}-\d{2}T/);
    }
  });

  it("defaults aggregate sections to empty when no aggregate provided", () => {
    const viewModel = buildCustomerBmvIntakeCardViewModel(
      SAMPLE_CUSTOMER_DETAILS["cust-004"]!,
      undefined,
      "ja-JP",
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
      "ja-JP",
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
      "ja-JP",
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
      "ja-JP",
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
      "ja-JP",
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
      "ja-JP",
    );
    expect(viewModel?.reminders).toHaveLength(2);
    expect(viewModel?.reminders[0]).toMatchObject({
      id: "rem-001",
      type: "COE 期限確認",
      status: "pending",
    });
  });

  it("emits bypassed_existing_cases gate hint when customer already has cases", () => {
    // 复现 MCP 走查场景：lead.intendedCaseType=business_manager_visa 转客户后实际建出
    // 非 BMV 案件（如 family_stay），totalCases=1。此时承接卡片的「建案门禁」文案
    // 应明确表达不再阻断，避免与 useCustomerCreateCaseGateModel 的放行口径自相矛盾。
    const customer = structuredClone(SAMPLE_CUSTOMER_DETAILS["cust-004"]!);
    customer.totalCases = 1;
    customer.activeCases = 1;

    const viewModel = buildCustomerBmvIntakeCardViewModel(
      customer,
      undefined,
      "ja-JP",
    );
    expect(viewModel?.gateHintKey).toBe(
      "customers.detail.bmvIntake.gateHintValue.bypassed_existing_cases",
    );
  });

  it("emits bypassed_existing_cases gate hint when only archived cases exist", () => {
    const customer = structuredClone(SAMPLE_CUSTOMER_DETAILS["cust-004"]!);
    customer.totalCases = 1;
    customer.activeCases = 0;
    customer.archivedCases = 1;

    const viewModel = buildCustomerBmvIntakeCardViewModel(
      customer,
      undefined,
      "ja-JP",
    );
    expect(viewModel?.gateHintKey).toBe(
      "customers.detail.bmvIntake.gateHintValue.bypassed_existing_cases",
    );
  });

  it("sets canTransitionToCase true only when signed and ready", () => {
    const pending = buildCustomerBmvIntakeCardViewModel(
      SAMPLE_CUSTOMER_DETAILS["cust-004"]!,
      undefined,
      "ja-JP",
    );
    expect(pending?.canTransitionToCase).toBe(false);

    const customer = structuredClone(SAMPLE_CUSTOMER_DETAILS["cust-004"]!);
    customer.bmvProfile!.signStatus = "signed";
    customer.bmvProfile!.intakeStatus = "ready_for_case_creation";

    const ready = buildCustomerBmvIntakeCardViewModel(
      customer,
      undefined,
      "ja-JP",
    );
    expect(ready?.canTransitionToCase).toBe(true);
  });
});

describe("useCustomerBmvIntakeCardModel", () => {
  it("exposes a computed intake card view model", () => {
    const customer = computed(() => SAMPLE_CUSTOMER_DETAILS["cust-004"]!);
    const locale = ref("ja-JP");
    const { intakeCard } = useCustomerBmvIntakeCardModel({
      customer,
      locale,
    });

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
    const locale = ref("ja-JP");
    const { intakeCard } = useCustomerBmvIntakeCardModel({
      customer,
      aggregate,
      locale,
    });

    expect(intakeCard.value?.quoteHistory).toHaveLength(2);
    expect(intakeCard.value?.surveyDataSummary?.fieldCount).toBe(24);
    expect(intakeCard.value?.canTransitionToCase).toBe(true);
  });
});
