import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import { i18n, setAppLocale } from "../../i18n";
import { SAMPLE_CUSTOMERS } from "./fixtures";
import type { CustomerRepository } from "./model/CustomerRepository";
import CustomerListView from "./CustomerListView.vue";
import CustomerTable from "./components/CustomerTable.vue";

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

  it("shows a success toast and highlights the created customer row", async () => {
    const createdCustomer = {
      ...SAMPLE_CUSTOMERS[0]!,
      id: "cust-new",
      displayName: "Hanako Yamada",
      legalName: "Hanako Yamada",
      customerNumber: "C-999",
      phone: "090-9999-8888",
      email: "hanako@example.com",
    };
    const repository = createRepository({
      listCustomers: vi
        .fn<CustomerRepository["listCustomers"]>()
        .mockResolvedValueOnce({ items: [SAMPLE_CUSTOMERS[0]!], total: 1 })
        .mockResolvedValueOnce({
          items: [createdCustomer, SAMPLE_CUSTOMERS[0]!],
          total: 2,
        }),
      createCustomer: vi.fn().mockResolvedValue({ id: "cust-new" }),
    });
    mockedRepository.current = repository;

    const { wrapper } = await mountView();

    const addButton = wrapper
      .findAll("button")
      .find((node) => node.text().includes("Add customer"));
    expect(addButton).toBeTruthy();
    await addButton!.trigger("click");

    const groupSelect = wrapper.findAll("select.customer-modal__select")[0]!;
    const groupValue = (groupSelect.element as HTMLSelectElement).options[1]!
      .value;
    const inputs = wrapper.findAll("input.customer-modal__input");

    await groupSelect.setValue(groupValue);
    await inputs[1]!.setValue("Hanako Yamada");
    await inputs[5]!.setValue("090-9999-8888");
    await flushPromises();

    const createButton = wrapper
      .findAll("button")
      .find((node) => node.text().includes("Create customer"));
    expect(createButton).toBeTruthy();
    await createButton!.trigger("click");
    await flushPromises();

    expect(repository.createCustomer).toHaveBeenCalledWith(
      expect.objectContaining({
        group: groupValue,
        legalName: "Hanako Yamada",
        phone: "090-9999-8888",
      }),
    );
    expect(repository.listCustomers).toHaveBeenCalledTimes(2);
    expect(wrapper.text()).toContain("Customer created successfully");

    const createdRow = wrapper
      .findAll(".customer-row")
      .find((row) => row.text().includes("Hanako Yamada"));

    expect(createdRow).toBeTruthy();
    expect(createdRow!.classes()).toContain("customer-row--highlighted");
  });

  it("shows an empty-state cta that opens the create modal", async () => {
    const repository = createRepository({
      listCustomers: vi.fn().mockResolvedValue({ items: [], total: 0 }),
    });
    mockedRepository.current = repository;

    const { wrapper } = await mountView();

    expect(wrapper.findComponent(CustomerTable).exists()).toBe(true);

    wrapper.findComponent(CustomerTable).vm.$emit("openCreateModal");
    await flushPromises();

    expect(wrapper.text()).toContain("Create customer");
  });
});
