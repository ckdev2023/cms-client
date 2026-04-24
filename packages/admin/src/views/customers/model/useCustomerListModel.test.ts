import { flushPromises } from "@vue/test-utils";
import { nextTick } from "vue";
import { describe, expect, it, vi } from "vitest";
import type { CustomerRepository } from "./CustomerRepository";
import { CustomerRepositoryError } from "./CustomerRepository";
import { useCustomerListModel } from "./useCustomerListModel";
import type { CustomerSummary } from "../types";

function customer(
  partial: Partial<CustomerSummary> & { id: string },
): CustomerSummary {
  return {
    displayName: "",
    legalName: "",
    furigana: "",
    customerNumber: "",
    phone: "",
    email: "",
    totalCases: 0,
    activeCases: 0,
    lastContactDate: null,
    lastContactChannel: null,
    owner: { initials: "", name: "" },
    referralSource: "",
    group: "",
    bmvProfile: null,
    ...partial,
  };
}

const CUSTOMERS: CustomerSummary[] = [
  customer({
    id: "1",
    displayName: "田中太郎",
    furigana: "タナカタロウ",
    phone: "090-1234-5678",
    email: "tanaka@example.com",
    activeCases: 1,
    owner: { initials: "YS", name: "山田翔太" },
    group: "東京一組",
  }),
  customer({
    id: "2",
    displayName: "Li Wei",
    furigana: "リウェイ",
    email: "liwei@example.com",
    activeCases: 0,
    owner: { initials: "TK", name: "高橋健太" },
    group: "大阪組",
  }),
  customer({
    id: "3",
    displayName: "佐藤美咲",
    furigana: "サトウミサキ",
    phone: "070-8888-1208",
    activeCases: 0,
    owner: { initials: "TK", name: "高橋健太" },
    group: "東京一組",
  }),
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
  overrides: Partial<
    Pick<
      CustomerRepository,
      "listCustomers" | "bulkAssignOwner" | "bulkChangeGroup"
    >
  > = {},
): Pick<
  CustomerRepository,
  "listCustomers" | "bulkAssignOwner" | "bulkChangeGroup"
> {
  return {
    listCustomers: vi
      .fn()
      .mockResolvedValue({ items: CUSTOMERS, total: CUSTOMERS.length }),
    bulkAssignOwner: vi.fn().mockResolvedValue({ updatedCount: 2 }),
    bulkChangeGroup: vi.fn().mockResolvedValue({ updatedCount: 2 }),
    ...overrides,
  };
}

describe("useCustomerListModel", () => {
  it("loads customers on mount with default filters", async () => {
    const repository = createRepository();
    const model = useCustomerListModel({ repository, pageSize: 50 });

    await flushPromises();

    expect(repository.listCustomers).toHaveBeenCalledWith({
      scope: "mine",
      search: "",
      group: "",
      owner: "",
      activeCases: "",
      page: 1,
      limit: 50,
    });
    expect(model.filteredCustomers.value).toHaveLength(3);
    expect(model.total.value).toBe(3);
    expect(model.loading.value).toBe(false);
  });

  it("reloads when filters change", async () => {
    const repository = createRepository();
    const model = useCustomerListModel({ repository });

    await flushPromises();
    model.setSearch("田中");
    await nextTick();
    await flushPromises();

    expect(repository.listCustomers).toHaveBeenLastCalledWith({
      scope: "mine",
      search: "田中",
      group: "",
      owner: "",
      activeCases: "",
      page: 1,
      limit: 20,
    });
  });

  it("starts with empty selection", async () => {
    const model = useCustomerListModel({ repository: createRepository() });
    await flushPromises();

    expect(model.selectedIds.value.size).toBe(0);
    expect(model.selectedCount.value).toBe(0);
    expect(model.isAllSelected.value).toBe(false);
    expect(model.isIndeterminate.value).toBe(false);
  });

  it("toggleSelectRow adds and removes ids", async () => {
    const model = useCustomerListModel({ repository: createRepository() });
    await flushPromises();

    model.toggleSelectRow("1", true);
    expect(model.selectedIds.value.has("1")).toBe(true);
    expect(model.selectedCount.value).toBe(1);

    model.toggleSelectRow("1", false);
    expect(model.selectedIds.value.has("1")).toBe(false);
    expect(model.selectedCount.value).toBe(0);
  });

  it("keeps only the latest response when requests overlap", async () => {
    const first = deferred<{ items: CustomerSummary[]; total: number }>();
    const second = deferred<{ items: CustomerSummary[]; total: number }>();
    const repository = createRepository({
      listCustomers: vi
        .fn<CustomerRepository["listCustomers"]>()
        .mockImplementationOnce(() => first.promise)
        .mockImplementationOnce(() => second.promise),
    });
    const model = useCustomerListModel({ repository });

    model.setSearch("Li");
    await nextTick();

    second.resolve({ items: [CUSTOMERS[1]!], total: 1 });
    await flushPromises();

    first.resolve({ items: [CUSTOMERS[0]!], total: 1 });
    await flushPromises();

    expect(model.filteredCustomers.value).toHaveLength(1);
    expect(model.filteredCustomers.value[0]!.id).toBe("2");
  });

  it("toggleSelectAll selects all visible customers", async () => {
    const model = useCustomerListModel({ repository: createRepository() });
    await flushPromises();

    model.toggleSelectAll(true);
    expect(model.selectedCount.value).toBe(3);
    expect(model.isAllSelected.value).toBe(true);
    expect(model.isIndeterminate.value).toBe(false);
  });

  it("bulkAssignOwner refreshes list and clears selection", async () => {
    const repository = createRepository({
      listCustomers: vi
        .fn<CustomerRepository["listCustomers"]>()
        .mockResolvedValueOnce({ items: CUSTOMERS, total: CUSTOMERS.length })
        .mockResolvedValueOnce({ items: CUSTOMERS, total: CUSTOMERS.length }),
    });
    const model = useCustomerListModel({ repository });

    await flushPromises();
    model.toggleSelectRow("1", true);
    model.toggleSelectRow("2", true);

    const updated = await model.bulkAssignOwner("owner-1");

    expect(updated).toBe(1);
    expect(repository.bulkAssignOwner).toHaveBeenCalledWith(
      ["1", "2"],
      "owner-1",
    );
    expect(repository.listCustomers).toHaveBeenCalledTimes(2);
    expect(model.selectedCount.value).toBe(0);
  });

  it("maps unauthorized loading errors", async () => {
    const repository = createRepository({
      listCustomers: vi.fn().mockRejectedValue(
        new CustomerRepositoryError({
          code: "UNAUTHORIZED",
          message: "denied",
          status: 401,
        }),
      ),
    });
    const model = useCustomerListModel({ repository });

    await flushPromises();

    expect(model.errorCode.value).toBe("unauthorized");
    expect(model.filteredCustomers.value).toEqual([]);
  });
});
