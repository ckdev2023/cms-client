import { flushPromises } from "@vue/test-utils";
import { nextTick, ref } from "vue";
import { describe, expect, it, vi } from "vitest";
import type { CustomerRepository } from "./CustomerRepository";
import { CustomerRepositoryError } from "./CustomerRepository";
import { useCustomerDetailModel } from "./useCustomerDetailModel";
import { SAMPLE_CUSTOMER_DETAILS } from "../fixtures";

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
  overrides: Partial<Pick<CustomerRepository, "getCustomerDetail">> = {},
): Pick<CustomerRepository, "getCustomerDetail"> {
  return {
    getCustomerDetail: vi
      .fn()
      .mockImplementation(async (id: string) => SAMPLE_CUSTOMER_DETAILS[id]!),
    ...overrides,
  };
}

describe("useCustomerDetailModel", () => {
  it("loads customer data for a known ID", async () => {
    const id = ref("cust-001");
    const { customer, notFound, loading } = useCustomerDetailModel({
      customerId: id,
      repository: createRepository(),
    });

    await flushPromises();

    expect(customer.value).not.toBeNull();
    expect(customer.value!.displayName).toBe("田中太郎");
    expect(notFound.value).toBe(false);
    expect(loading.value).toBe(false);
  });

  it("maps 404 to notFound", async () => {
    const id = ref("nonexistent");
    const repository = createRepository({
      getCustomerDetail: vi.fn().mockRejectedValue(
        new CustomerRepositoryError({
          code: "BAD_RESPONSE",
          message: "not found",
          status: 404,
        }),
      ),
    });
    const { customer, notFound, errorCode } = useCustomerDetailModel({
      customerId: id,
      repository,
    });

    await flushPromises();

    expect(customer.value).toBeNull();
    expect(notFound.value).toBe(true);
    expect(errorCode.value).toBe("notFound");
  });

  it("maps 400 Customer not found (Nest BadRequest) to notFound", async () => {
    const id = ref("00000000-0000-0000-0000-000000000000");
    const repository = createRepository({
      getCustomerDetail: vi.fn().mockRejectedValue(
        new CustomerRepositoryError({
          code: "VALIDATION_ERROR",
          message: "Customer not found",
          status: 400,
        }),
      ),
    });
    const { customer, notFound, errorCode } = useCustomerDetailModel({
      customerId: id,
      repository,
    });

    await flushPromises();

    expect(customer.value).toBeNull();
    expect(notFound.value).toBe(true);
    expect(errorCode.value).toBe("notFound");
  });

  it("maps 400 Invalid id (malformed UUID) to notFound", async () => {
    const id = ref("not-a-uuid");
    const repository = createRepository({
      getCustomerDetail: vi.fn().mockRejectedValue(
        new CustomerRepositoryError({
          code: "VALIDATION_ERROR",
          message: "Invalid id",
          status: 400,
        }),
      ),
    });
    const { customer, notFound, errorCode } = useCustomerDetailModel({
      customerId: id,
      repository,
    });

    await flushPromises();

    expect(customer.value).toBeNull();
    expect(notFound.value).toBe(true);
    expect(errorCode.value).toBe("notFound");
  });

  it("maps unauthorized repository errors to unauthorized", async () => {
    const id = ref("cust-001");
    const repository = createRepository({
      getCustomerDetail: vi.fn().mockRejectedValue(
        new CustomerRepositoryError({
          code: "UNAUTHORIZED",
          message: "forbidden",
          status: 403,
        }),
      ),
    });
    const { customer, notFound, errorCode } = useCustomerDetailModel({
      customerId: id,
      repository,
    });

    await flushPromises();

    expect(customer.value).toBeNull();
    expect(notFound.value).toBe(false);
    expect(errorCode.value).toBe("unauthorized");
  });

  it("maps unknown failures to requestFailed", async () => {
    const id = ref("cust-001");
    const repository = createRepository({
      getCustomerDetail: vi.fn().mockRejectedValue(new Error("boom")),
    });
    const { customer, notFound, errorCode } = useCustomerDetailModel({
      customerId: id,
      repository,
    });

    await flushPromises();

    expect(customer.value).toBeNull();
    expect(notFound.value).toBe(false);
    expect(errorCode.value).toBe("requestFailed");
  });

  it("reacts to ID changes", async () => {
    const id = ref("cust-001");
    const { customer } = useCustomerDetailModel({
      customerId: id,
      repository: createRepository(),
    });

    await flushPromises();
    expect(customer.value!.id).toBe("cust-001");

    id.value = "cust-002";
    await nextTick();
    await flushPromises();

    expect(customer.value!.id).toBe("cust-002");
    expect(customer.value!.displayName).toBe("陈明");
  });

  it("keeps only the latest response when requests overlap", async () => {
    const first = deferred<(typeof SAMPLE_CUSTOMER_DETAILS)[string]>();
    const second = deferred<(typeof SAMPLE_CUSTOMER_DETAILS)[string]>();
    const repository = createRepository({
      getCustomerDetail: vi
        .fn<CustomerRepository["getCustomerDetail"]>()
        .mockImplementationOnce(() => first.promise)
        .mockImplementationOnce(() => second.promise),
    });
    const id = ref("cust-001");
    const { customer } = useCustomerDetailModel({ customerId: id, repository });

    id.value = "cust-002";
    await nextTick();

    second.resolve(SAMPLE_CUSTOMER_DETAILS["cust-002"]!);
    await flushPromises();
    first.resolve(SAMPLE_CUSTOMER_DETAILS["cust-001"]!);
    await flushPromises();

    expect(customer.value!.id).toBe("cust-002");
  });

  it("defaults activeTab to basic and updates avatar initials", async () => {
    const id = ref("cust-001");
    const { activeTab, avatarInitials } = useCustomerDetailModel({
      customerId: id,
      repository: createRepository(),
    });

    await flushPromises();

    expect(activeTab.value).toBe("basic");
    expect(avatarInitials.value).toBe("田");
  });
});
