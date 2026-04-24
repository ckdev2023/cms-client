import { computed } from "vue";
import { describe, expect, it, vi } from "vitest";
import { SAMPLE_CUSTOMER_DETAILS } from "../fixtures";
import type { CustomerDetail } from "../types";
import {
  CustomerRepositoryError,
  type CustomerRepository,
} from "./CustomerRepository";
import { useCustomerBmvActionModel } from "./useCustomerBmvActionModel";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

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

describe("useCustomerBmvActionModel", () => {
  it("derives button gate states from the current BMV profile", () => {
    const model = useCustomerBmvActionModel({
      customer: makeCustomer(SAMPLE_CUSTOMER_DETAILS["cust-004"]!),
      repository: createRepository(),
    });

    expect(model.actions.value).toMatchObject([
      {
        key: "questionnaire",
        disabled: true,
        hintKey:
          "customers.detail.bmvIntake.actionHint.questionnaire.stageCompleted",
      },
      {
        key: "quote",
        disabled: true,
        hintKey: "customers.detail.bmvIntake.actionHint.quote.stageCompleted",
      },
      {
        key: "sign",
        disabled: false,
        hintKey: "customers.detail.bmvIntake.actionHint.sign.ready",
      },
    ]);
  });

  it("runs sign action, refreshes detail, and exposes success feedback", async () => {
    const repository = createRepository();
    const refreshCustomer = vi.fn().mockResolvedValue(undefined);
    const model = useCustomerBmvActionModel({
      customer: makeCustomer(SAMPLE_CUSTOMER_DETAILS["cust-004"]!),
      repository,
      refreshCustomer,
    });

    const signAction = model.actions.value?.find((item) => item.key === "sign");
    const result = await signAction?.run();

    expect(result).toBe(true);
    expect(repository.recordBmvSign).toHaveBeenCalledWith("cust-004");
    expect(refreshCustomer).toHaveBeenCalledTimes(1);
    expect(model.feedbackTone.value).toBe("success");
    expect(model.feedbackMessageKey.value).toBe(
      "customers.detail.bmvIntake.actionState.signSuccess",
    );
  });

  it("reports refresh failure after a successful action and resets busy state", async () => {
    const repository = createRepository();
    const refreshCustomer = vi
      .fn()
      .mockRejectedValue(new Error("refresh failed"));
    const model = useCustomerBmvActionModel({
      customer: makeCustomer(SAMPLE_CUSTOMER_DETAILS["cust-004"]!),
      repository,
      refreshCustomer,
    });

    const signAction = model.actions.value?.find((item) => item.key === "sign");
    const result = await signAction?.run();

    expect(result).toBe(false);
    expect(repository.recordBmvSign).toHaveBeenCalledWith("cust-004");
    expect(refreshCustomer).toHaveBeenCalledTimes(1);
    expect(model.activeActionKey.value).toBeNull();
    expect(model.feedbackTone.value).toBe("danger");
    expect(model.feedbackMessageKey.value).toBe(
      "customers.detail.bmvIntake.actionState.refreshFailed",
    );
  });

  it("refreshes latest detail after validation error and exposes stable feedback", async () => {
    const customer = structuredClone(SAMPLE_CUSTOMER_DETAILS["cust-004"]!);
    customer.bmvProfile = {
      ...customer.bmvProfile!,
      questionnaireStatus: "returned",
      quoteStatus: "not_started",
      signStatus: "not_started",
    };

    const refreshCustomer = vi.fn().mockResolvedValue(undefined);
    const model = useCustomerBmvActionModel({
      customer: makeCustomer(customer),
      repository: createRepository({
        generateBmvQuote: vi.fn().mockRejectedValue(
          new CustomerRepositoryError({
            code: "VALIDATION_ERROR",
            message: "Quote stage already completed",
            status: 400,
          }),
        ),
      }),
      refreshCustomer,
    });

    const quoteAction = model.actions.value?.find(
      (item) => item.key === "quote",
    );
    const result = await quoteAction?.run();

    expect(result).toBe(false);
    expect(refreshCustomer).toHaveBeenCalledTimes(1);
    expect(model.feedbackTone.value).toBe("danger");
    expect(model.feedbackMessageKey.value).toBe(
      "customers.detail.bmvIntake.actionState.validationError",
    );
  });

  it("maps unauthorized repository failures without refreshing detail", async () => {
    const refreshCustomer = vi.fn().mockResolvedValue(undefined);
    const model = useCustomerBmvActionModel({
      customer: makeCustomer(SAMPLE_CUSTOMER_DETAILS["cust-004"]!),
      repository: createRepository({
        recordBmvSign: vi.fn().mockRejectedValue(
          new CustomerRepositoryError({
            code: "UNAUTHORIZED",
            message: "forbidden",
            status: 401,
          }),
        ),
      }),
      refreshCustomer,
    });

    const signAction = model.actions.value?.find((item) => item.key === "sign");
    const result = await signAction?.run();

    expect(result).toBe(false);
    expect(refreshCustomer).not.toHaveBeenCalled();
    expect(model.feedbackTone.value).toBe("danger");
    expect(model.feedbackMessageKey.value).toBe(
      "customers.detail.bmvIntake.actionState.unauthorized",
    );
  });

  it("surfaces the gate reason and skips requests when an action is disabled", async () => {
    const repository = createRepository();
    const model = useCustomerBmvActionModel({
      customer: makeCustomer(SAMPLE_CUSTOMER_DETAILS["cust-004"]!),
      repository,
    });

    const questionnaireAction = model.actions.value?.find(
      (item) => item.key === "questionnaire",
    );
    const result = await questionnaireAction?.run();

    expect(result).toBe(false);
    expect(repository.sendBmvQuestionnaire).not.toHaveBeenCalled();
    expect(model.feedbackTone.value).toBe("danger");
    expect(model.feedbackMessageKey.value).toBe(
      "customers.detail.bmvIntake.actionHint.questionnaire.stageCompleted",
    );
  });

  it("prevents duplicate submissions while a BMV action is in flight", async () => {
    const pendingRequest =
      deferred<Awaited<ReturnType<CustomerRepository["recordBmvSign"]>>>();
    const repository = createRepository({
      recordBmvSign: vi.fn().mockReturnValue(pendingRequest.promise),
    });
    const model = useCustomerBmvActionModel({
      customer: makeCustomer(SAMPLE_CUSTOMER_DETAILS["cust-004"]!),
      repository,
    });

    const signAction = model.actions.value?.find((item) => item.key === "sign");
    const firstRun = signAction?.run();
    const busyActions = model.actions.value ?? [];
    const busySignAction = busyActions.find((item) => item.key === "sign");
    const secondRun = await busySignAction?.run();

    expect(secondRun).toBe(false);
    expect(model.activeActionKey.value).toBe("sign");
    expect(busySignAction?.loading).toBe(true);
    expect(busyActions.every((item) => item.disabled)).toBe(true);
    expect(repository.recordBmvSign).toHaveBeenCalledTimes(1);

    pendingRequest.resolve({ id: "cust-004", bmvProfile: null });
    await firstRun;
  });
});
