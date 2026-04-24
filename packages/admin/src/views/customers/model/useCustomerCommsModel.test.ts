import { flushPromises } from "@vue/test-utils";
import { nextTick, ref } from "vue";
import { describe, expect, it, vi } from "vitest";
import type { CustomerComm } from "../types";
import type { CustomerRepository } from "./CustomerRepository";
import { CustomerRepositoryError } from "./CustomerRepository";
import { useCustomerCommsModel } from "./useCustomerCommsModel";

const COMMS: CustomerComm[] = [
  {
    id: "comm-001",
    type: "wechat",
    visibility: "customer",
    occurredAt: "2026-04-01T10:00:00.000Z",
    actor: "田中",
    summary: "确认补件时间表",
    detail: "客户承诺下周前补齐资料。",
    nextAction: "2026-04-02",
  },
  {
    id: "comm-002",
    type: "phone",
    visibility: "internal",
    occurredAt: "2026-04-02T11:00:00.000Z",
    actor: "高桥",
    summary: "内部同步",
    detail: "确认客户材料缺口。",
    nextAction: "",
  },
  {
    id: "comm-003",
    type: "line",
    visibility: "customer",
    occurredAt: "2026-04-03T12:00:00.000Z",
    actor: "田中",
    summary: "发送报价说明",
    detail: "客户等待确认。",
    nextAction: "2026-04-05",
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
  overrides: Partial<Pick<CustomerRepository, "listComms">> = {},
): Pick<CustomerRepository, "listComms"> {
  return {
    listComms: vi
      .fn<CustomerRepository["listComms"]>()
      .mockResolvedValue(COMMS),
    ...overrides,
  };
}

describe("useCustomerCommsModel", () => {
  it("loads comms on mount", async () => {
    const customerId = ref("cust-001");
    const repository = createRepository();
    const model = useCustomerCommsModel({ customerId, repository });

    await flushPromises();

    expect(repository.listComms).toHaveBeenCalledWith("cust-001");
    expect(model.allComms.value).toHaveLength(3);
    expect(model.filteredComms.value).toHaveLength(3);
    expect(model.loading.value).toBe(false);
    expect(model.errorCode.value).toBeNull();
  });

  it("defaults to 'all' filter", () => {
    const { commFilter } = useCustomerCommsModel({
      customerId: ref("cust-001"),
      repository: createRepository(),
    });
    expect(commFilter.value).toBe("all");
  });

  it("returns empty array for blank customer id", async () => {
    const repository = createRepository();
    const { allComms, filteredComms } = useCustomerCommsModel({
      customerId: ref("   "),
      repository,
    });

    await flushPromises();

    expect(allComms.value).toHaveLength(0);
    expect(filteredComms.value).toHaveLength(0);
    expect(repository.listComms).not.toHaveBeenCalled();
  });

  it("filters by internal visibility", async () => {
    const { filteredComms, setCommFilter } = useCustomerCommsModel({
      customerId: ref("cust-001"),
      repository: createRepository(),
    });

    await flushPromises();

    setCommFilter("internal");
    expect(filteredComms.value.length).toBe(1);
    expect(filteredComms.value[0].visibility).toBe("internal");
  });

  it("filters by customer visibility", async () => {
    const { filteredComms, setCommFilter } = useCustomerCommsModel({
      customerId: ref("cust-001"),
      repository: createRepository(),
    });

    await flushPromises();

    setCommFilter("customer");
    expect(filteredComms.value.length).toBe(2);
    filteredComms.value.forEach((c) => expect(c.visibility).toBe("customer"));
  });

  it("returns to all when filter is reset", async () => {
    const { filteredComms, allComms, setCommFilter } = useCustomerCommsModel({
      customerId: ref("cust-001"),
      repository: createRepository(),
    });

    await flushPromises();

    setCommFilter("internal");
    expect(filteredComms.value.length).toBeLessThan(allComms.value.length);
    setCommFilter("all");
    expect(filteredComms.value.length).toBe(allComms.value.length);
  });

  it("computes correct counts", async () => {
    const { totalCount, internalCount, customerCount } = useCustomerCommsModel({
      customerId: ref("cust-001"),
      repository: createRepository(),
    });

    await flushPromises();

    expect(totalCount.value).toBe(3);
    expect(internalCount.value).toBe(1);
    expect(customerCount.value).toBe(2);
  });

  it("reacts to customer ID changes", async () => {
    const customerId = ref("cust-001");
    const repository = createRepository({
      listComms: vi
        .fn<CustomerRepository["listComms"]>()
        .mockResolvedValueOnce(COMMS)
        .mockResolvedValueOnce(COMMS.slice(0, 1)),
    });
    const model = useCustomerCommsModel({ customerId, repository });

    await flushPromises();
    customerId.value = "cust-002";
    await nextTick();
    await flushPromises();

    expect(repository.listComms).toHaveBeenLastCalledWith("cust-002");
    expect(model.allComms.value).toHaveLength(1);
  });

  it("keeps only the latest response when requests overlap", async () => {
    const first = deferred<CustomerComm[]>();
    const second = deferred<CustomerComm[]>();
    const customerId = ref("cust-001");
    const repository = createRepository({
      listComms: vi
        .fn<CustomerRepository["listComms"]>()
        .mockImplementationOnce(() => first.promise)
        .mockImplementationOnce(() => second.promise),
    });
    const model = useCustomerCommsModel({ customerId, repository });

    customerId.value = "cust-002";
    await nextTick();

    second.resolve(COMMS.slice(0, 1));
    await flushPromises();
    first.resolve(COMMS);
    await flushPromises();

    expect(model.allComms.value).toHaveLength(1);
    expect(model.allComms.value[0]?.id).toBe("comm-001");
  });

  it("maps unauthorized repository errors", async () => {
    const model = useCustomerCommsModel({
      customerId: ref("cust-001"),
      repository: createRepository({
        listComms: vi.fn().mockRejectedValue(
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
    expect(model.allComms.value).toEqual([]);
  });

  it("retry triggers another load", async () => {
    const repository = createRepository({
      listComms: vi
        .fn<CustomerRepository["listComms"]>()
        .mockRejectedValueOnce(new Error("boom"))
        .mockResolvedValueOnce(COMMS.slice(0, 1)),
    });
    const model = useCustomerCommsModel({
      customerId: ref("cust-001"),
      repository,
    });

    await flushPromises();
    await model.retry();

    expect(repository.listComms).toHaveBeenCalledTimes(2);
    expect(model.errorCode.value).toBeNull();
    expect(model.allComms.value).toHaveLength(1);
  });
});
