import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMemoryHistory, createRouter } from "vue-router";
import { i18n, setAppLocale } from "../../../i18n";
import type { CustomerRelation } from "../types";
import type { CustomerRepository } from "../model/CustomerRepository";
import CustomerContactsTab from "./CustomerContactsTab.vue";

const RELATIONS: CustomerRelation[] = [
  {
    id: "rel-001",
    name: "田中次郎",
    kana: "",
    relationType: "parent",
    phone: "090-1111-2222",
    email: "tanaka@example.com",
    tags: ["父亲"],
    note: "",
  },
];

function createRepository(
  overrides: Partial<
    Pick<
      CustomerRepository,
      "createRelation" | "listRelations" | "updateRelation"
    >
  > = {},
): Pick<
  CustomerRepository,
  "createRelation" | "listRelations" | "updateRelation"
> {
  return {
    listRelations: vi.fn().mockResolvedValue(RELATIONS),
    createRelation: vi.fn().mockResolvedValue({
      id: "rel-002",
      name: "新关联人",
      kana: "",
      relationType: "agent",
      phone: "03-2222-3333",
      email: "new@example.com",
      tags: ["顾问"],
      note: "",
    }),
    updateRelation: vi.fn().mockResolvedValue({
      id: "rel-001",
      name: "田中次郎（更新）",
      kana: "",
      relationType: "parent",
      phone: "090-1111-2222",
      email: "updated@example.com",
      tags: ["监护人"],
      note: "",
    }),
    ...overrides,
  };
}

async function mountTab(
  repository: Pick<
    CustomerRepository,
    "createRelation" | "listRelations" | "updateRelation"
  >,
  options: {
    batchCreateCaseDisabled?: boolean;
    batchCreateCaseHint?: string | null;
  } = {},
) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/", name: "home", component: { template: "<div />" } },
      {
        path: "/cases/create",
        name: "case-create",
        component: { template: "<div />" },
      },
    ],
  });

  await router.push("/");
  await router.isReady();

  const wrapper = mount(CustomerContactsTab, {
    props: { customerId: "cust-001", repository, ...options },
    attachTo: document.body,
    global: {
      plugins: [i18n, router],
      stubs: { teleport: true },
    },
  });

  return { wrapper, router };
}

describe("CustomerContactsTab", () => {
  beforeEach(() => {
    setAppLocale("en-US");
  });

  it("renders related contacts from repository", async () => {
    const repository = createRepository();
    const { wrapper } = await mountTab(repository);

    await flushPromises();

    expect(repository.listRelations).toHaveBeenCalledWith("cust-001");
    expect(wrapper.text()).toContain("田中次郎");
    expect(wrapper.text()).toContain("tanaka@example.com");
  });

  it("renders request failed state and retries", async () => {
    const repository = createRepository({
      listRelations: vi
        .fn<CustomerRepository["listRelations"]>()
        .mockRejectedValueOnce(new Error("boom"))
        .mockResolvedValueOnce([]),
    });
    const { wrapper } = await mountTab(repository);

    await flushPromises();
    expect(wrapper.text()).toContain("Could not load contacts");

    await wrapper.get(".contacts-tab__state button").trigger("click");
    await flushPromises();

    expect(repository.listRelations).toHaveBeenCalledTimes(2);
    expect(wrapper.text()).not.toContain("Could not load contacts");
  });

  it("creates relation from modal and writes back list", async () => {
    const repository = createRepository();
    const { wrapper } = await mountTab(repository);

    await flushPromises();

    await wrapper
      .findAll("button")
      .find((button) => button.text() === "Add contact")!
      .trigger("click");
    await wrapper.get('input[placeholder="Name"]').setValue("新关联人");
    await wrapper.get("select").setValue("agent");
    await wrapper.get('input[placeholder="Role / title"]').setValue("顾问");
    await wrapper.findAll(".crm-input")[3].setValue("03-2222-3333");
    await wrapper.findAll(".crm-input")[4].setValue("new@example.com");
    await wrapper
      .findAll("button")
      .find((button) => button.text() === "Create")!
      .trigger("click");
    await flushPromises();

    expect(repository.createRelation).toHaveBeenCalledWith({
      customerId: "cust-001",
      name: "新关联人",
      relationType: "agent",
      roleTitle: "顾问",
      phone: "03-2222-3333",
      email: "new@example.com",
    });
    expect(wrapper.text()).toContain("新关联人");
  });

  it("updates relation from modal and writes back list", async () => {
    const repository = createRepository();
    const { wrapper } = await mountTab(repository);

    await flushPromises();

    await wrapper
      .findAll("button")
      .find((button) => button.text() === "Edit")!
      .trigger("click");
    await wrapper.findAll(".crm-input")[0].setValue("田中次郎（更新）");
    await wrapper.findAll(".crm-input")[2].setValue("监护人");
    await wrapper.findAll(".crm-input")[4].setValue("updated@example.com");
    await wrapper
      .findAll("button")
      .find((button) => button.text() === "Save")!
      .trigger("click");
    await flushPromises();

    expect(repository.updateRelation).toHaveBeenCalledWith("rel-001", {
      customerId: "cust-001",
      name: "田中次郎（更新）",
      relationType: "parent",
      roleTitle: "监护人",
      phone: "090-1111-2222",
      email: "updated@example.com",
    });
    expect(wrapper.text()).toContain("田中次郎（更新）");
  });

  it("navigates to family bulk case create with selected relations", async () => {
    const repository = createRepository();
    const { wrapper, router } = await mountTab(repository);

    await flushPromises();
    await wrapper.findAll(".contacts-tab__checkbox")[1]!.trigger("change");
    await flushPromises();

    const batchButton = wrapper
      .findAll("button")
      .find((button) => button.text() === "Batch create cases for contacts")!;
    await batchButton.trigger("click");
    await flushPromises();

    expect(router.currentRoute.value.name).toBe("case-create");
    expect(router.currentRoute.value.hash).toBe("#family-bulk");
    expect(router.currentRoute.value.query.customerId).toBe("cust-001");
    expect(router.currentRoute.value.query.relationIds).toBe("rel-001");
    expect(
      JSON.parse(String(router.currentRoute.value.query.selectedRelations)),
    ).toEqual([
      {
        id: "rel-001",
        name: "田中次郎",
        relationType: "parent",
        roleTitle: "父亲",
        phone: "090-1111-2222",
        email: "tanaka@example.com",
        tags: ["父亲"],
        note: undefined,
      },
    ]);
  });

  it("disables batch create and shows hint when sign gate blocks creation", async () => {
    const repository = createRepository();
    const { wrapper, router } = await mountTab(repository, {
      batchCreateCaseDisabled: true,
      batchCreateCaseHint:
        "BMV customers must complete signing before a case can be created.",
    });

    await flushPromises();
    await wrapper.findAll(".contacts-tab__checkbox")[1]!.trigger("change");
    await flushPromises();

    const batchButton = wrapper
      .findAll("button")
      .find((button) => button.text() === "Batch create cases for contacts")!;
    expect(batchButton.attributes("disabled")).toBeDefined();
    expect(wrapper.text()).toContain(
      "BMV customers must complete signing before a case can be created.",
    );

    await batchButton.trigger("click");
    await flushPromises();

    expect(router.currentRoute.value.name).toBe("home");
  });
});
