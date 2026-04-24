import { flushPromises } from "@vue/test-utils";
import { nextTick, ref } from "vue";
import { describe, expect, it, vi } from "vitest";
import type { CustomerLog } from "../types";
import type { CustomerRepository } from "./CustomerRepository";
import { CustomerRepositoryError } from "./CustomerRepository";
import { useCustomerLogsModel } from "./useCustomerLogsModel";

const LOGS: CustomerLog[] = Array.from({ length: 12 }, (_, index) => ({
  id: `log-${String(index + 1).padStart(3, "0")}`,
  type:
    index === 0
      ? "case"
      : index === 1
        ? "relation"
        : index === 2
          ? "comm"
          : "info",
  actor: index % 2 === 0 ? "田中" : "高桥",
  at: `2026-04-${String((index % 9) + 1).padStart(2, "0")}T10:00:00.000Z`,
  message: `日志 ${index + 1}`,
}));

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
  overrides: Partial<Pick<CustomerRepository, "listLogs">> = {},
): Pick<CustomerRepository, "listLogs"> {
  return {
    listLogs: vi.fn<CustomerRepository["listLogs"]>().mockResolvedValue(LOGS),
    ...overrides,
  };
}

describe("useCustomerLogsModel", () => {
  it("loads logs on mount", async () => {
    const customerId = ref("cust-001");
    const repository = createRepository();
    const model = useCustomerLogsModel({ customerId, repository });

    await flushPromises();

    expect(repository.listLogs).toHaveBeenCalledWith("cust-001");
    expect(model.allLogs.value).toHaveLength(12);
    expect(model.pagedLogs.value).toHaveLength(10);
    expect(model.loading.value).toBe(false);
    expect(model.errorCode.value).toBeNull();
  });

  it("defaults to 'all' filter and page 1", () => {
    const { logFilter, currentPage } = useCustomerLogsModel({
      customerId: ref("cust-001"),
      repository: createRepository(),
    });
    expect(logFilter.value).toBe("all");
    expect(currentPage.value).toBe(1);
  });

  it("returns empty array for blank customer id", async () => {
    const repository = createRepository();
    const { allLogs, filteredLogs } = useCustomerLogsModel({
      customerId: ref("   "),
      repository,
    });

    await flushPromises();

    expect(allLogs.value).toHaveLength(0);
    expect(filteredLogs.value).toHaveLength(0);
    expect(repository.listLogs).not.toHaveBeenCalled();
  });

  it("filters by type 'info'", async () => {
    const { filteredLogs, setLogFilter } = useCustomerLogsModel({
      customerId: ref("cust-001"),
      repository: createRepository(),
    });

    await flushPromises();

    setLogFilter("info");
    expect(filteredLogs.value.length).toBe(9);
    filteredLogs.value.forEach((log) => expect(log.type).toBe("info"));
  });

  it("filters by type 'case'", async () => {
    const { filteredLogs, setLogFilter } = useCustomerLogsModel({
      customerId: ref("cust-001"),
      repository: createRepository(),
    });

    await flushPromises();

    setLogFilter("case");
    expect(filteredLogs.value.length).toBe(1);
    expect(filteredLogs.value[0].type).toBe("case");
  });

  it("filters by type 'relation'", async () => {
    const { filteredLogs, setLogFilter } = useCustomerLogsModel({
      customerId: ref("cust-001"),
      repository: createRepository(),
    });

    await flushPromises();

    setLogFilter("relation");
    expect(filteredLogs.value.length).toBe(1);
    expect(filteredLogs.value[0].type).toBe("relation");
  });

  it("filters by type 'comm'", async () => {
    const { filteredLogs, setLogFilter } = useCustomerLogsModel({
      customerId: ref("cust-001"),
      repository: createRepository(),
    });

    await flushPromises();

    setLogFilter("comm");
    expect(filteredLogs.value.length).toBe(1);
    expect(filteredLogs.value[0].type).toBe("comm");
  });

  it("resets page to 1 when filter changes", async () => {
    const { currentPage, setLogFilter, nextPage } = useCustomerLogsModel({
      customerId: ref("cust-001"),
      repository: createRepository(),
    });

    await flushPromises();

    nextPage();
    currentPage.value = 2;
    setLogFilter("info");
    expect(currentPage.value).toBe(1);
  });

  it("totalCount reflects filtered results", async () => {
    const { totalCount, setLogFilter } = useCustomerLogsModel({
      customerId: ref("cust-001"),
      repository: createRepository(),
    });

    await flushPromises();

    expect(totalCount.value).toBe(12);
    setLogFilter("info");
    expect(totalCount.value).toBe(9);
  });

  it("totalPages is at least 1", () => {
    const { totalPages } = useCustomerLogsModel({
      customerId: ref("cust-004"),
      repository: createRepository({ listLogs: vi.fn().mockResolvedValue([]) }),
    });
    expect(totalPages.value).toBe(1);
  });

  it("pagedLogs returns correct slice", async () => {
    const { pagedLogs, nextPage } = useCustomerLogsModel({
      customerId: ref("cust-001"),
      repository: createRepository(),
    });

    await flushPromises();

    expect(pagedLogs.value.length).toBe(10);
    nextPage();
    expect(pagedLogs.value.length).toBe(2);
  });

  it("prevPage does not go below 1", async () => {
    const { currentPage, prevPage } = useCustomerLogsModel({
      customerId: ref("cust-001"),
      repository: createRepository(),
    });

    await flushPromises();

    expect(currentPage.value).toBe(1);
    prevPage();
    expect(currentPage.value).toBe(1);
  });

  it("nextPage does not exceed totalPages", async () => {
    const { currentPage, totalPages, nextPage } = useCustomerLogsModel({
      customerId: ref("cust-001"),
      repository: createRepository(),
    });

    await flushPromises();

    expect(totalPages.value).toBe(2);
    nextPage();
    nextPage();
    expect(currentPage.value).toBe(2);
  });

  it("reacts to customer ID changes", async () => {
    const customerId = ref("cust-001");
    const repository = createRepository({
      listLogs: vi
        .fn<CustomerRepository["listLogs"]>()
        .mockResolvedValueOnce(LOGS)
        .mockResolvedValueOnce(LOGS.slice(0, 1)),
    });
    const model = useCustomerLogsModel({ customerId, repository });

    await flushPromises();
    customerId.value = "cust-002";
    await nextTick();
    await flushPromises();

    expect(repository.listLogs).toHaveBeenLastCalledWith("cust-002");
    expect(model.allLogs.value).toHaveLength(1);
    expect(model.currentPage.value).toBe(1);
  });

  it("keeps only the latest response when requests overlap", async () => {
    const first = deferred<CustomerLog[]>();
    const second = deferred<CustomerLog[]>();
    const customerId = ref("cust-001");
    const repository = createRepository({
      listLogs: vi
        .fn<CustomerRepository["listLogs"]>()
        .mockImplementationOnce(() => first.promise)
        .mockImplementationOnce(() => second.promise),
    });
    const model = useCustomerLogsModel({ customerId, repository });

    customerId.value = "cust-002";
    await nextTick();

    second.resolve(LOGS.slice(0, 1));
    await flushPromises();
    first.resolve(LOGS);
    await flushPromises();

    expect(model.allLogs.value).toHaveLength(1);
    expect(model.allLogs.value[0]?.id).toBe("log-001");
  });

  it("maps unauthorized repository errors", async () => {
    const model = useCustomerLogsModel({
      customerId: ref("cust-001"),
      repository: createRepository({
        listLogs: vi.fn().mockRejectedValue(
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
    expect(model.allLogs.value).toEqual([]);
  });

  it("retry triggers another load", async () => {
    const repository = createRepository({
      listLogs: vi
        .fn<CustomerRepository["listLogs"]>()
        .mockRejectedValueOnce(new Error("boom"))
        .mockResolvedValueOnce(LOGS.slice(0, 1)),
    });
    const model = useCustomerLogsModel({
      customerId: ref("cust-001"),
      repository,
    });

    await flushPromises();
    await model.retry();

    expect(repository.listLogs).toHaveBeenCalledTimes(2);
    expect(model.errorCode.value).toBeNull();
    expect(model.allLogs.value).toHaveLength(1);
  });
});
