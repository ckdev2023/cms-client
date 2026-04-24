import { flushPromises } from "@vue/test-utils";
import { nextTick, ref } from "vue";
import { describe, expect, it, vi } from "vitest";
import type { CustomerRepository } from "./CustomerRepository";
import { CustomerRepositoryError } from "./CustomerRepository";
import { useCustomerCasesModel } from "./useCustomerCasesModel";
import type { CustomerCase } from "../types";

const CASES: CustomerCase[] = [
  {
    id: "case-001",
    name: "技人国更新",
    type: "visa-change",
    stage: "补件中",
    status: "active",
    owner: "高桥健太",
    createdAt: "2026-04-01",
    updatedAt: "2026-04-10",
  },
  {
    id: "case-002",
    name: "永住申请",
    type: "permanent",
    stage: "已归档",
    status: "archived",
    owner: "山田翔太",
    createdAt: "2026-03-01",
    updatedAt: "2026-03-20",
  },
  {
    id: "case-003",
    name: "家族滞在更新",
    type: "family-stay",
    stage: "已归档",
    status: "archived",
    owner: "山田翔太",
    createdAt: "2026-02-01",
    updatedAt: "2026-02-18",
  },
];

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
  overrides: Partial<Pick<CustomerRepository, "listRelatedCases">> = {},
): Pick<CustomerRepository, "listRelatedCases"> {
  return {
    listRelatedCases: vi
      .fn<CustomerRepository["listRelatedCases"]>()
      .mockResolvedValue(CASES),
    ...overrides,
  };
}

describe("useCustomerCasesModel", () => {
  it("loads related cases on mount", async () => {
    const customerId = ref("cust-001");
    const repository = createRepository();
    const model = useCustomerCasesModel({ customerId, repository });

    await flushPromises();

    expect(repository.listRelatedCases).toHaveBeenCalledWith("cust-001");
    expect(model.allCases.value).toHaveLength(3);
    expect(model.filteredCases.value).toHaveLength(3);
    expect(model.loading.value).toBe(false);
    expect(model.errorCode.value).toBeNull();
  });

  it("defaults to 'all' filter", () => {
    const { caseFilter } = useCustomerCasesModel({
      customerId: ref("cust-001"),
      repository: createRepository(),
    });
    expect(caseFilter.value).toBe("all");
  });

  it("returns empty array when repository returns no cases", async () => {
    const model = useCustomerCasesModel({
      customerId: ref("cust-004"),
      repository: createRepository({
        listRelatedCases: vi.fn().mockResolvedValue([]),
      }),
    });

    await flushPromises();

    expect(model.allCases.value).toHaveLength(0);
    expect(model.filteredCases.value).toHaveLength(0);
  });

  it("filters by active status", async () => {
    const { filteredCases, setCaseFilter } = useCustomerCasesModel({
      customerId: ref("cust-001"),
      repository: createRepository(),
    });

    await flushPromises();

    setCaseFilter("active");
    expect(filteredCases.value.length).toBe(1);
    expect(filteredCases.value[0].status).toBe("active");
  });

  it("filters by archived status", async () => {
    const { filteredCases, setCaseFilter } = useCustomerCasesModel({
      customerId: ref("cust-001"),
      repository: createRepository(),
    });

    await flushPromises();

    setCaseFilter("archived");
    expect(filteredCases.value.length).toBe(2);
    filteredCases.value.forEach((c) => expect(c.status).toBe("archived"));
  });

  it("returns to all when filter is reset", async () => {
    const { filteredCases, allCases, setCaseFilter } = useCustomerCasesModel({
      customerId: ref("cust-001"),
      repository: createRepository(),
    });

    await flushPromises();

    setCaseFilter("active");
    expect(filteredCases.value.length).toBeLessThan(allCases.value.length);
    setCaseFilter("all");
    expect(filteredCases.value.length).toBe(allCases.value.length);
  });

  it("filterOptions reflects counts correctly", async () => {
    const { filterOptions } = useCustomerCasesModel({
      customerId: ref("cust-001"),
      repository: createRepository(),
    });

    await flushPromises();

    const opts = filterOptions.value;
    expect(opts).toHaveLength(3);
    expect(opts[0].count).toBe(3);
    expect(opts[1].count).toBe(1);
    expect(opts[2].count).toBe(2);
  });

  it("reacts to customer ID changes", async () => {
    const customerId = ref("cust-001");
    const repository = createRepository({
      listRelatedCases: vi
        .fn<CustomerRepository["listRelatedCases"]>()
        .mockResolvedValueOnce(CASES)
        .mockResolvedValueOnce(CASES.slice(0, 1)),
    });
    const model = useCustomerCasesModel({ customerId, repository });

    await flushPromises();
    customerId.value = "cust-002";
    await nextTick();
    await flushPromises();

    expect(repository.listRelatedCases).toHaveBeenLastCalledWith("cust-002");
    expect(model.allCases.value).toHaveLength(1);
  });

  it("keeps only the latest response when requests overlap", async () => {
    const first = deferred<CustomerCase[]>();
    const second = deferred<CustomerCase[]>();
    const customerId = ref("cust-001");
    const repository = createRepository({
      listRelatedCases: vi
        .fn<CustomerRepository["listRelatedCases"]>()
        .mockImplementationOnce(() => first.promise)
        .mockImplementationOnce(() => second.promise),
    });
    const model = useCustomerCasesModel({ customerId, repository });

    customerId.value = "cust-002";
    await nextTick();

    second.resolve(CASES.slice(0, 1));
    await flushPromises();
    first.resolve(CASES);
    await flushPromises();

    expect(model.allCases.value).toHaveLength(1);
    expect(model.allCases.value[0]?.id).toBe("case-001");
  });

  it("maps unauthorized repository errors", async () => {
    const model = useCustomerCasesModel({
      customerId: ref("cust-001"),
      repository: createRepository({
        listRelatedCases: vi.fn().mockRejectedValue(
          new CustomerRepositoryError({
            code: "UNAUTHORIZED",
            message: "denied",
            status: 401,
          }),
        ),
      }),
    });

    await flushPromises();

    expect(model.errorCode.value).toBe("unauthorized");
    expect(model.allCases.value).toEqual([]);
  });

  it("retry triggers another load", async () => {
    const repository = createRepository({
      listRelatedCases: vi
        .fn<CustomerRepository["listRelatedCases"]>()
        .mockRejectedValueOnce(new Error("boom"))
        .mockResolvedValueOnce(CASES.slice(0, 1)),
    });
    const model = useCustomerCasesModel({
      customerId: ref("cust-001"),
      repository,
    });

    await flushPromises();
    await model.retry();

    expect(repository.listRelatedCases).toHaveBeenCalledTimes(2);
    expect(model.errorCode.value).toBeNull();
    expect(model.allCases.value).toHaveLength(1);
  });
});
