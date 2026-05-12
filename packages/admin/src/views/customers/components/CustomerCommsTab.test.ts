import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RouterLink, createMemoryHistory, createRouter } from "vue-router";
import { i18n, setAppLocale } from "../../../i18n";
import type { CustomerRepository } from "../model/CustomerRepository";
import CustomerCommsTab from "./CustomerCommsTab.vue";

function createRepository(
  overrides: Partial<Pick<CustomerRepository, "listComms">> = {},
): Pick<CustomerRepository, "listComms"> {
  return {
    listComms: vi.fn().mockResolvedValue([
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
    ]),
    ...overrides,
  };
}

async function mountCustomerCommsTab(props: {
  customerId: string;
  repository: Pick<CustomerRepository, "listComms">;
}) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/", name: "home", component: { template: "<div/>" } },
      {
        path: "/conversations",
        name: "conversations",
        component: { template: "<div/>" },
      },
    ],
  });
  await router.push("/");
  await router.isReady();
  const wrapper = mount(CustomerCommsTab, {
    props,
    global: { plugins: [i18n, router] },
  });
  return { wrapper, router };
}

describe("CustomerCommsTab", () => {
  beforeEach(() => {
    setAppLocale("en-US");
  });

  it("renders communications from repository", async () => {
    const repository = createRepository();
    const { wrapper } = await mountCustomerCommsTab({
      customerId: "cust-001",
      repository,
    });

    await flushPromises();

    expect(repository.listComms).toHaveBeenCalledWith("cust-001");
    expect(wrapper.text()).toContain("确认补件时间表");
    expect(wrapper.text()).toContain("Client-visible");
  });

  it("shows auto-email channel label for email type (aligned with case messages)", async () => {
    const repository = createRepository({
      listComms: vi.fn().mockResolvedValue([
        {
          id: "comm-email",
          type: "email",
          visibility: "internal",
          occurredAt: "2026-05-12T09:47:00.000Z",
          actor: "Local Admin",
          summary: "初回説明",
          detail: "",
          nextAction: "",
        },
      ]),
    });
    const { wrapper } = await mountCustomerCommsTab({
      customerId: "cust-001",
      repository,
    });

    await flushPromises();

    expect(wrapper.text()).toContain("Auto emails");
  });

  it.each([
    { locale: "zh-CN", notExpected: "2026-04-01T10:00:00" },
    { locale: "en-US", notExpected: "2026-04-01T10:00:00" },
    { locale: "ja-JP", notExpected: "2026-04-01T10:00:00" },
  ])(
    "formats datetime via shared formatter ($locale)",
    async ({ locale, notExpected }) => {
      setAppLocale(locale);
      const repository = createRepository();
      const { wrapper } = await mountCustomerCommsTab({
        customerId: "cust-001",
        repository,
      });

      await flushPromises();

      const text = wrapper.text();
      expect(text).not.toContain(notExpected);
      expect(text).not.toContain("T10:00:00");
      expect(text).toContain("2026");
    },
  );

  it("renders request failed state and retries", async () => {
    const repository = createRepository({
      listComms: vi
        .fn<CustomerRepository["listComms"]>()
        .mockRejectedValueOnce(new Error("boom"))
        .mockResolvedValueOnce([]),
    });
    const { wrapper } = await mountCustomerCommsTab({
      customerId: "cust-001",
      repository,
    });

    await flushPromises();
    expect(wrapper.text()).toContain("Could not load communications");

    const retryButton = wrapper
      .findAll("button")
      .find((b) => b.text() === "Retry")!;
    await retryButton.trigger("click");
    await flushPromises();

    expect(repository.listComms).toHaveBeenCalledTimes(2);
    expect(wrapper.text()).not.toContain("Could not load communications");
  });

  it("targets conversations route for navigation buttons", async () => {
    const repository = createRepository({
      listComms: vi.fn().mockResolvedValue([]),
    });
    const { wrapper, router } = await mountCustomerCommsTab({
      customerId: "cust-xyz  ",
      repository,
    });

    await flushPromises();

    const routed = wrapper.findAllComponents(RouterLink);
    expect(routed.length).toBe(2);
    const expectedTo = {
      name: "conversations",
      query: { customerId: "cust-xyz" },
    };
    expect(routed[0]!.props("to")).toEqual(expectedTo);
    expect(routed[1]!.props("to")).toEqual(expectedTo);

    await routed[1]!.find("button").trigger("click");
    await flushPromises();
    expect(router.currentRoute.value.name).toBe("conversations");
    expect(router.currentRoute.value.query).toEqual({
      customerId: "cust-xyz",
    });
  });
});
