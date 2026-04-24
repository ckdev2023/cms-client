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
    expect(wrapper.text()).toContain("2026-04-01 09:00");
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

  it("hides itself when the customer has no bmvProfile", () => {
    setAppLocale("en-US");
    const repository = createRepository();

    const wrapper = mount(CustomerBmvIntakeCard, {
      props: { customer: SAMPLE_CUSTOMER_DETAILS["cust-001"]!, repository },
      global: { plugins: [i18n] },
    });

    expect(wrapper.find(".bmv-intake-card").exists()).toBe(false);
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
