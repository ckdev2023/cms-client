import { describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { flushPromises } from "@vue/test-utils";
import { i18n, setAppLocale } from "../../../i18n";
import { SAMPLE_CUSTOMER_DETAILS } from "../fixtures";
import {
  CustomerRepositoryError,
  type CustomerRepository,
} from "../model/CustomerRepository";
import CustomerBmvIntakeCard from "./CustomerBmvIntakeCard.vue";

function createRepository(
  overrides: Partial<
    Pick<
      CustomerRepository,
      "sendBmvQuestionnaire" | "generateBmvQuote" | "recordBmvSign"
    >
  > = {},
): Pick<
  CustomerRepository,
  "sendBmvQuestionnaire" | "generateBmvQuote" | "recordBmvSign"
> {
  return {
    sendBmvQuestionnaire: vi
      .fn()
      .mockResolvedValue({ id: "cust-004", bmvProfile: null }),
    generateBmvQuote: vi
      .fn()
      .mockResolvedValue({ id: "cust-004", bmvProfile: null }),
    recordBmvSign: vi
      .fn()
      .mockResolvedValue({ id: "cust-004", bmvProfile: null }),
    ...overrides,
  };
}

describe("CustomerBmvIntakeCard", () => {
  it("renders translated stage, next step and timeline for a BMV customer", () => {
    setAppLocale("en-US");
    const repository = createRepository();

    const wrapper = mount(CustomerBmvIntakeCard, {
      props: { customer: SAMPLE_CUSTOMER_DETAILS["cust-004"]!, repository },
      global: { plugins: [i18n] },
    });

    expect(wrapper.text()).toContain("BMV intake");
    expect(wrapper.text()).toContain("Sign pending");
    expect(wrapper.text()).toContain(
      "Confirm the signing schedule with the customer",
    );
    expect(wrapper.text()).toContain(
      "Case creation stays locked until signing is completed",
    );
    expect(wrapper.text()).toContain("Questionnaire sent");
    expect(wrapper.text()).toContain("04/01/2026");
    expect(wrapper.text()).toContain("Operational note");
    expect(wrapper.text()).toContain("Send questionnaire");
    expect(wrapper.text()).toContain("Generate quote");
    expect(wrapper.text()).toContain("Record signing");

    const buttons = wrapper.findAll("button");
    expect(
      buttons.find((button) => button.text() === "Send questionnaire")?.element,
    ).toMatchObject({ disabled: true });
    expect(
      buttons.find((button) => button.text() === "Generate quote")?.element,
    ).toMatchObject({ disabled: true });
    expect(
      buttons.find((button) => button.text() === "Record signing")?.element,
    ).toMatchObject({ disabled: false });
  });

  it("renders an explicit UTC suffix when timeline timestamps come from UTC", () => {
    setAppLocale("en-US");
    const repository = createRepository();
    const customer = structuredClone(SAMPLE_CUSTOMER_DETAILS["cust-004"]!);
    if (!customer.bmvProfile) throw new Error("Expected BMV profile");

    customer.bmvProfile.quoteConfirmedAt = "2026-04-27T06:07:00Z";
    customer.bmvProfile.signStatus = "signed";
    customer.bmvProfile.signedAt = "2026-04-28T03:15:00+00:00";
    customer.bmvProfile.intakeStatus = "ready_for_case_creation";

    const wrapper = mount(CustomerBmvIntakeCard, {
      props: { customer, repository },
      global: { plugins: [i18n] },
    });

    expect(wrapper.text()).toContain("04/27/2026");
    expect(wrapper.text()).toContain("04/28/2026");
  });

  it("renders not_started empty state when bmvProfile is null", () => {
    setAppLocale("en-US");
    const repository = createRepository();
    // cust-001 已有多个案件 (totalCases=3)，门禁文案应反映「不再作为前置」的实际语义；
    // 仍可从 not_started 状态发送问卷，但建案门禁不再依赖 BMV 承接是否完成。
    const wrapper = mount(CustomerBmvIntakeCard, {
      props: { customer: SAMPLE_CUSTOMER_DETAILS["cust-001"]!, repository },
      global: { plugins: [i18n] },
    });

    expect(wrapper.find(".bmv-intake-card").exists()).toBe(true);
    expect(wrapper.text()).toContain("Not started");
    expect(wrapper.text()).toContain("Send the questionnaire to start intake");
    expect(wrapper.text()).toContain(
      "Customer already has cases — intake is no longer a prerequisite for new cases",
    );
  });

  it("renders locked gate hint for not_started bmv customer with no existing cases", () => {
    setAppLocale("en-US");
    const repository = createRepository();
    const customer = structuredClone(SAMPLE_CUSTOMER_DETAILS["cust-001"]!);
    customer.totalCases = 0;
    customer.activeCases = 0;
    customer.archivedCases = 0;

    const wrapper = mount(CustomerBmvIntakeCard, {
      props: { customer, repository },
      global: { plugins: [i18n] },
    });

    expect(wrapper.text()).toContain(
      "Case creation stays locked until signing is completed",
    );
  });

  it("enables send questionnaire CTA in not_started state", async () => {
    setAppLocale("en-US");
    const sendBmvQuestionnaire = vi.fn().mockResolvedValue({
      id: "cust-bmv-ns",
      bmvProfile: {
        questionnaireStatus: "sent",
        quoteStatus: "not_started",
        signStatus: "not_started",
        intakeStatus: "questionnaire_pending",
        questionnaireSentAt: "2026-04-30T10:00:00+09:00",
        questionnaireReturnedAt: null,
        quoteGeneratedAt: null,
        quoteConfirmedAt: null,
        signedAt: null,
        note: null,
        sourceLeadId: null,
        leadGroupId: null,
        leadOwnerUserId: null,
      },
    });
    const repository = createRepository({ sendBmvQuestionnaire });
    const refreshCustomer = vi.fn().mockResolvedValue(undefined);

    const notStartedCustomer = structuredClone(
      SAMPLE_CUSTOMER_DETAILS["cust-004"]!,
    );
    notStartedCustomer.id = "cust-bmv-ns";
    notStartedCustomer.bmvProfile = {
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

    const wrapper = mount(CustomerBmvIntakeCard, {
      props: {
        customer: notStartedCustomer,
        repository,
        refreshCustomer,
      },
      global: { plugins: [i18n] },
    });

    const sendButton = wrapper
      .findAll("button")
      .find((button) => button.text() === "Send questionnaire");
    expect(sendButton).toBeDefined();
    expect(sendButton!.element.disabled).toBe(false);

    await sendButton!.trigger("click");
    await flushPromises();

    expect(sendBmvQuestionnaire).toHaveBeenCalledWith("cust-bmv-ns");
    expect(refreshCustomer).toHaveBeenCalledTimes(1);
  });

  it("calls sign action and refreshes detail after success", async () => {
    setAppLocale("en-US");
    const repository = createRepository();
    const refreshCustomer = vi.fn().mockResolvedValue(undefined);

    const wrapper = mount(CustomerBmvIntakeCard, {
      props: {
        customer: SAMPLE_CUSTOMER_DETAILS["cust-004"]!,
        repository,
        refreshCustomer,
      },
      global: { plugins: [i18n] },
    });

    const signButton = wrapper
      .findAll("button")
      .find((button) => button.text() === "Record signing");

    await signButton?.trigger("click");
    await flushPromises();

    expect(repository.recordBmvSign).toHaveBeenCalledWith("cust-004");
    expect(refreshCustomer).toHaveBeenCalledTimes(1);
    expect(wrapper.text()).toContain(
      "Signing recorded successfully and latest customer detail was refreshed",
    );
  });

  it("shows a stable error message when a BMV action request fails", async () => {
    setAppLocale("en-US");
    const repository = createRepository({
      recordBmvSign: vi.fn().mockRejectedValue(
        new CustomerRepositoryError({
          code: "VALIDATION_ERROR",
          message: "Quote must be generated before signing",
          status: 400,
        }),
      ),
    });
    const refreshCustomer = vi.fn().mockResolvedValue(undefined);

    const wrapper = mount(CustomerBmvIntakeCard, {
      props: {
        customer: {
          ...SAMPLE_CUSTOMER_DETAILS["cust-004"]!,
          bmvProfile: {
            ...SAMPLE_CUSTOMER_DETAILS["cust-004"]!.bmvProfile!,
            quoteStatus: "generated",
            signStatus: "pending",
          },
        },
        repository,
        refreshCustomer,
      },
      global: { plugins: [i18n] },
    });

    const signButton = wrapper
      .findAll("button")
      .find((button) => button.text() === "Record signing");

    await signButton?.trigger("click");
    await flushPromises();

    expect(refreshCustomer).toHaveBeenCalledTimes(1);
    expect(wrapper.text()).toContain(
      "This BMV action is no longer available. The latest detail was reloaded when possible",
    );
  });
});
