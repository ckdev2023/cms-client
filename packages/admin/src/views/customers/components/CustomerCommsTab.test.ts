import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
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

describe("CustomerCommsTab", () => {
  beforeEach(() => {
    setAppLocale("en-US");
  });

  it("renders communications from repository", async () => {
    const repository = createRepository();
    const wrapper = mount(CustomerCommsTab, {
      props: { customerId: "cust-001", repository },
      global: { plugins: [i18n] },
    });

    await flushPromises();

    expect(repository.listComms).toHaveBeenCalledWith("cust-001");
    expect(wrapper.text()).toContain("确认补件时间表");
    expect(wrapper.text()).toContain("Client-visible");
  });

  it("renders request failed state and retries", async () => {
    const repository = createRepository({
      listComms: vi
        .fn<CustomerRepository["listComms"]>()
        .mockRejectedValueOnce(new Error("boom"))
        .mockResolvedValueOnce([]),
    });
    const wrapper = mount(CustomerCommsTab, {
      props: { customerId: "cust-001", repository },
      global: { plugins: [i18n] },
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
});
