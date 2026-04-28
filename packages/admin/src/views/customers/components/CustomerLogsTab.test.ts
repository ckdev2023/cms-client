import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { i18n, setAppLocale } from "../../../i18n";
import type { CustomerRepository } from "../model/CustomerRepository";
import CustomerLogsTab from "./CustomerLogsTab.vue";

const LOGS = Array.from({ length: 11 }, (_, index) => ({
  id: `log-${index + 1}`,
  type: index === 0 ? "case" : "info",
  actor: index % 2 === 0 ? "Tanaka" : "Takahashi",
  at: `2026-04-${String((index % 9) + 1).padStart(2, "0")}T10:00:00.000Z`,
  message: `Log content ${index + 1}`,
}));

function createRepository(
  overrides: Partial<Pick<CustomerRepository, "listLogs">> = {},
): Pick<CustomerRepository, "listLogs"> {
  return {
    listLogs: vi.fn().mockResolvedValue(LOGS),
    ...overrides,
  };
}

describe("CustomerLogsTab", () => {
  beforeEach(() => {
    setAppLocale("en-US");
  });

  it("renders logs from repository and paginates", async () => {
    const repository = createRepository();
    const wrapper = mount(CustomerLogsTab, {
      props: { customerId: "cust-001", repository },
      global: { plugins: [i18n] },
    });

    await flushPromises();

    expect(repository.listLogs).toHaveBeenCalledWith("cust-001");
    expect(wrapper.text()).toContain("Log content 1");
    expect(wrapper.text()).toContain("Page 1 / 2");
    expect(wrapper.text()).toContain("Info change");

    const nextButton = wrapper
      .findAll("button")
      .find((b) => b.text() === "Next")!;
    await nextButton.trigger("click");
    await flushPromises();

    expect(wrapper.text()).toContain("Log content 11");
    expect(wrapper.text()).toContain("Page 2 / 2");
  });

  it("formats timestamps via locale-aware formatDateTime", async () => {
    const repository = createRepository();
    const wrapper = mount(CustomerLogsTab, {
      props: { customerId: "cust-001", repository },
      global: { plugins: [i18n] },
    });

    await flushPromises();

    const timeCells = wrapper.findAll(".logs-tab__td--time");
    expect(timeCells.length).toBeGreaterThan(0);
    const firstTime = timeCells[0].text();
    expect(firstTime).not.toContain("T10:00:00");
    expect(firstTime).toContain("2026");
  });

  it("renders request failed state and retries", async () => {
    const repository = createRepository({
      listLogs: vi
        .fn<CustomerRepository["listLogs"]>()
        .mockRejectedValueOnce(new Error("boom"))
        .mockResolvedValueOnce([]),
    });
    const wrapper = mount(CustomerLogsTab, {
      props: { customerId: "cust-001", repository },
      global: { plugins: [i18n] },
    });

    await flushPromises();
    expect(wrapper.text()).toContain("Could not load activity logs");

    const retryButton = wrapper
      .findAll("button")
      .find((b) => b.text() === "Retry")!;
    await retryButton.trigger("click");
    await flushPromises();

    expect(repository.listLogs).toHaveBeenCalledTimes(2);
    expect(wrapper.text()).not.toContain("Could not load activity logs");
  });
});
