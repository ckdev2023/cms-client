import { computed } from "vue";
import { describe, expect, it, vi } from "vitest";
import { SAMPLE_CUSTOMER_DETAILS } from "../fixtures";
import type { CustomerDetail } from "../types";
import {
  CustomerRepositoryError,
  type CustomerRepository,
} from "./CustomerRepository";
import { useCustomerBmvActionModel } from "./useCustomerBmvActionModel";
import { BMV_GATE_ERROR_CODE } from "./CustomerBmvGateBinding";

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

function makeCustomer(customer: CustomerDetail) {
  return computed(() => customer);
}

describe("useCustomerBmvActionModel — BMV gate error binding", () => {
  it("maps CASE_BMV_GATE_BLOCKED with NOT_SIGNED blocker to sign-required i18n key", async () => {
    const model = useCustomerBmvActionModel({
      customer: makeCustomer(SAMPLE_CUSTOMER_DETAILS["cust-004"]!),
      repository: createRepository({
        recordBmvSign: vi.fn().mockRejectedValue(
          new CustomerRepositoryError({
            code: "VALIDATION_ERROR",
            message: "BMV gate blocked",
            status: 400,
            serverErrorCode: BMV_GATE_ERROR_CODE,
            serverBlockers: [
              { code: "BMV_NOT_SIGNED", message: "Customer must sign first" },
            ],
          }),
        ),
      }),
    });

    const signAction = model.actions.value?.find((a) => a.key === "sign");
    const result = await signAction?.run();

    expect(result).toBe(false);
    expect(model.feedbackTone.value).toBe("danger");
    expect(model.feedbackMessageKey.value).toBe(
      "customers.detail.bmvIntake.errors.signRequiredForCase",
    );
  });

  it("maps CASE_BMV_GATE_BLOCKED with QUESTIONNAIRE_NOT_RETURNED blocker", async () => {
    const customer = structuredClone(SAMPLE_CUSTOMER_DETAILS["cust-004"]!);
    customer.bmvProfile = {
      ...customer.bmvProfile!,
      questionnaireStatus: "returned",
      quoteStatus: "not_started",
      signStatus: "not_started",
    };

    const model = useCustomerBmvActionModel({
      customer: makeCustomer(customer),
      repository: createRepository({
        generateBmvQuote: vi.fn().mockRejectedValue(
          new CustomerRepositoryError({
            code: "VALIDATION_ERROR",
            message: "BMV gate blocked",
            status: 400,
            serverErrorCode: BMV_GATE_ERROR_CODE,
            serverBlockers: [
              {
                code: "BMV_QUESTIONNAIRE_NOT_RETURNED",
                message: "Questionnaire must be returned",
              },
            ],
          }),
        ),
      }),
    });

    const quoteAction = model.actions.value?.find((a) => a.key === "quote");
    const result = await quoteAction?.run();

    expect(result).toBe(false);
    expect(model.feedbackMessageKey.value).toBe(
      "customers.detail.bmvIntake.errors.questionnaireRequiredForQuote",
    );
  });

  it("maps CASE_BMV_GATE_BLOCKED with multiple blockers — uses first one", async () => {
    const model = useCustomerBmvActionModel({
      customer: makeCustomer(SAMPLE_CUSTOMER_DETAILS["cust-004"]!),
      repository: createRepository({
        recordBmvSign: vi.fn().mockRejectedValue(
          new CustomerRepositoryError({
            code: "VALIDATION_ERROR",
            message: "BMV gate blocked",
            status: 400,
            serverErrorCode: BMV_GATE_ERROR_CODE,
            serverBlockers: [
              { code: "BMV_QUOTE_NOT_CONFIRMED" },
              { code: "BMV_NOT_SIGNED" },
            ],
          }),
        ),
      }),
    });

    const signAction = model.actions.value?.find((a) => a.key === "sign");
    await signAction?.run();

    expect(model.feedbackMessageKey.value).toBe(
      "customers.detail.bmvIntake.errors.quoteRequiredForSign",
    );
  });

  it("falls back to generic validation error when CASE_BMV_GATE_BLOCKED has no blockers", async () => {
    const model = useCustomerBmvActionModel({
      customer: makeCustomer(SAMPLE_CUSTOMER_DETAILS["cust-004"]!),
      repository: createRepository({
        recordBmvSign: vi.fn().mockRejectedValue(
          new CustomerRepositoryError({
            code: "VALIDATION_ERROR",
            message: "BMV gate blocked",
            status: 400,
            serverErrorCode: BMV_GATE_ERROR_CODE,
            serverBlockers: [],
          }),
        ),
      }),
    });

    const signAction = model.actions.value?.find((a) => a.key === "sign");
    await signAction?.run();

    expect(model.feedbackMessageKey.value).toBe(
      "customers.detail.bmvIntake.actionState.validationError",
    );
  });

  it("falls back to generic validation error for non-BMV-gate validation errors", async () => {
    const customer = structuredClone(SAMPLE_CUSTOMER_DETAILS["cust-004"]!);
    customer.bmvProfile = {
      ...customer.bmvProfile!,
      questionnaireStatus: "returned",
      quoteStatus: "not_started",
      signStatus: "not_started",
    };

    const model = useCustomerBmvActionModel({
      customer: makeCustomer(customer),
      repository: createRepository({
        generateBmvQuote: vi.fn().mockRejectedValue(
          new CustomerRepositoryError({
            code: "VALIDATION_ERROR",
            message: "Generic validation error",
            status: 422,
            serverErrorCode: "SOME_OTHER_ERROR",
          }),
        ),
      }),
    });

    const quoteAction = model.actions.value?.find((a) => a.key === "quote");
    await quoteAction?.run();

    expect(model.feedbackMessageKey.value).toBe(
      "customers.detail.bmvIntake.actionState.validationError",
    );
  });
});
