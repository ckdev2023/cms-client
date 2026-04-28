import { flushPromises, mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { i18n, setAppLocale } from "../../../i18n";
import type { CustomerRepository } from "../model/CustomerRepository";
import CustomerCasesTab from "./CustomerCasesTab.vue";

function createRepository(
  overrides: Partial<Pick<CustomerRepository, "listRelatedCases">> = {},
): Pick<CustomerRepository, "listRelatedCases"> {
  return {
    listRelatedCases: vi.fn().mockResolvedValue([
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
    ]),
    ...overrides,
  };
}

async function factory(
  repository: Pick<CustomerRepository, "listRelatedCases">,
) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: "/customers/:id",
        name: "customer-detail",
        component: { template: "<div />" },
      },
      {
        path: "/cases/:id",
        name: "case-detail",
        component: { template: "<div />" },
      },
    ],
  });

  await router.push({ name: "customer-detail", params: { id: "cust-001" } });
  await router.isReady();

  const wrapper = mount(CustomerCasesTab, {
    props: { customerId: "cust-001", repository },
    global: { plugins: [i18n, router] },
  });

  return { wrapper, router };
}

describe("CustomerCasesTab", () => {
  beforeEach(() => {
    setAppLocale("en-US");
  });

  it("renders related cases from repository", async () => {
    const repository = createRepository();
    const { wrapper } = await factory(repository);

    await flushPromises();

    expect(repository.listRelatedCases).toHaveBeenCalledWith("cust-001");
    expect(wrapper.text()).toContain("技人国更新");
    expect(wrapper.text()).toContain("Active");
  });

  it("shows i18n label for known caseTypeCode", async () => {
    const repository = createRepository({
      listRelatedCases: vi.fn().mockResolvedValue([
        {
          id: "case-002",
          name: "Test Case",
          type: "family",
          stage: "S1",
          status: "active",
          owner: "Owner",
          createdAt: "2026-04-01",
          updatedAt: "2026-04-20T09:00:00Z",
        },
      ]),
    });
    const { wrapper } = await factory(repository);
    await flushPromises();

    expect(wrapper.text()).toContain("Dependent visa");
  });

  it("formats updatedAt with locale and preserves ISO in title", async () => {
    const repository = createRepository({
      listRelatedCases: vi.fn().mockResolvedValue([
        {
          id: "case-003",
          name: "Fmt Case",
          type: "work",
          stage: "S2",
          status: "active",
          owner: "Owner",
          createdAt: "2026-04-01",
          updatedAt: "2026-04-20T09:00:00Z",
        },
      ]),
    });
    const { wrapper } = await factory(repository);
    await flushPromises();

    const updatedTd = wrapper.find(".cases-tab__td--updated");
    expect(updatedTd.attributes("title")).toBe("2026-04-20T09:00:00Z");
    expect(updatedTd.text()).toContain("2026");
    expect(updatedTd.text()).not.toBe("2026-04-20T09:00:00Z");
  });

  it("falls back to raw code for unknown caseTypeCode", async () => {
    const repository = createRepository({
      listRelatedCases: vi.fn().mockResolvedValue([
        {
          id: "case-004",
          name: "Unknown Type",
          type: "exotic_type",
          stage: "S1",
          status: "active",
          owner: "Owner",
          createdAt: "2026-04-01",
          updatedAt: "2026-04-20",
        },
      ]),
    });
    const { wrapper } = await factory(repository);
    await flushPromises();

    const typeTd = wrapper.find(".cases-tab__td--type");
    expect(typeTd.text()).toBe("exotic_type");
  });

  it("renders request failed state and retries", async () => {
    const repository = createRepository({
      listRelatedCases: vi
        .fn<CustomerRepository["listRelatedCases"]>()
        .mockRejectedValueOnce(new Error("boom"))
        .mockResolvedValueOnce([]),
    });
    const { wrapper } = await factory(repository);

    await flushPromises();
    expect(wrapper.text()).toContain("Could not load related cases");

    const retryButton = wrapper
      .findAll("button")
      .find((b) => b.text() === "Retry")!;
    await retryButton.trigger("click");
    await flushPromises();

    expect(repository.listRelatedCases).toHaveBeenCalledTimes(2);
    expect(wrapper.text()).not.toContain("Could not load related cases");
  });

  it("navigates to case detail when clicking open", async () => {
    const repository = createRepository();
    const { wrapper, router } = await factory(repository);

    await flushPromises();

    const openButton = wrapper
      .findAll("button")
      .find((b) => b.text() === "Open")!;
    await openButton.trigger("click");
    await flushPromises();

    expect(router.currentRoute.value.name).toBe("case-detail");
    expect(router.currentRoute.value.params.id).toBe("case-001");
  });
});
