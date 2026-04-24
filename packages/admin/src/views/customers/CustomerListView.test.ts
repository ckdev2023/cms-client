import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import { i18n, setAppLocale } from "../../i18n";
import { SAMPLE_CUSTOMERS } from "./fixtures";
import type { CustomerRepository } from "./model/CustomerRepository";
import CustomerListView from "./CustomerListView.vue";

type ListViewRepository = Pick<
  CustomerRepository,
  | "listCustomers"
  | "bulkAssignOwner"
  | "bulkChangeGroup"
  | "checkDuplicates"
  | "createCustomer"
>;

const mockedRepository = vi.hoisted(() => ({
  current: null as ListViewRepository | null,
}));

vi.mock("./model/CustomerRepository", () => ({
  createCustomerRepository: vi.fn(() => mockedRepository.current),
}));

function createRepository(
  overrides: Partial<ListViewRepository> = {},
): ListViewRepository {
  return {
    listCustomers: vi
      .fn()
      .mockResolvedValue({ items: [SAMPLE_CUSTOMERS[0]!], total: 1 }),
    bulkAssignOwner: vi.fn().mockResolvedValue({ updatedCount: 1 }),
    bulkChangeGroup: vi.fn().mockResolvedValue({ updatedCount: 1 }),
    checkDuplicates: vi.fn().mockResolvedValue([]),
    createCustomer: vi.fn().mockResolvedValue({ id: "cust-new" }),
    ...overrides,
  };
}

async function mountView() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/customers", component: CustomerListView }],
  });

  await router.push("/customers");
  await router.isReady();

  const wrapper = mount(CustomerListView, {
    global: {
      plugins: [i18n, router],
      stubs: { teleport: true },
    },
  });

  await flushPromises();
  return { wrapper, router };
}

describe("CustomerListView", () => {
  beforeEach(() => {
    setAppLocale("en-US");
    window.localStorage.clear();
  });

  afterEach(() => {
    mockedRepository.current = null;
  });

  it("loads customers from repository and renders the remote row", async () => {
    const repository = createRepository();
    mockedRepository.current = repository;

    const { wrapper } = await mountView();

    expect(repository.listCustomers).toHaveBeenCalledWith({
      scope: "mine",
      search: "",
      group: "",
      owner: "",
      activeCases: "",
      page: 1,
      limit: 20,
    });
    expect(wrapper.findAll(".customer-row")).toHaveLength(1);
    expect(wrapper.text()).toContain("田中太郎");
  });

  it("runs bulk owner assignment through the injected repository and reloads", async () => {
    const repository = createRepository();
    mockedRepository.current = repository;

    const { wrapper } = await mountView();

    await wrapper.find(".customer-row__checkbox").setValue(true);
    await wrapper
      .findAll(".customer-bulk-bar__select")[0]!
      .setValue("takahashi-k");
    await wrapper.findAll(".customer-bulk-bar__apply")[0]!.trigger("click");
    await flushPromises();

    expect(repository.bulkAssignOwner).toHaveBeenCalledWith(
      [SAMPLE_CUSTOMERS[0]!.id],
      "takahashi-k",
    );
    expect(repository.listCustomers).toHaveBeenCalledTimes(2);
  });
});
