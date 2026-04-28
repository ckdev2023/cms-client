import { beforeEach, describe, expect, it } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import { i18n, setAppLocale } from "../../i18n";
import QuickActionsPanel from "./QuickActionsPanel.vue";

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/", name: "dashboard", component: { template: "<div />" } },
      { path: "/billing", name: "billing", component: { template: "<div />" } },
      { path: "/leads", name: "leads", component: { template: "<div />" } },
      {
        path: "/customers",
        name: "customers",
        component: { template: "<div />" },
      },
      { path: "/cases", name: "cases", component: { template: "<div />" } },
      {
        path: "/cases/create",
        name: "case-create",
        component: { template: "<div />" },
      },
    ],
  });
}

describe("QuickActionsPanel", () => {
  beforeEach(() => {
    setAppLocale("zh-CN");
  });

  const mountPanel = (timeWindow: 7 | 30 = 7) =>
    mount(QuickActionsPanel, {
      props: { timeWindow, scopeSummary: "当前显示我负责的案件。" },
      global: { plugins: [i18n, makeRouter()] },
    });

  it("renders four quick-action cards", () => {
    const w = mountPanel();
    expect(w.findAll(".quick-action-card")).toHaveLength(4);
  });

  it("renders quick action titles in Chinese", () => {
    const w = mountPanel();
    const titles = w.findAll(".quick-action-title").map((el) => el.text());
    expect(titles).toContain("新建咨询线索");
    expect(titles).toContain("新建案件");
  });

  it("renders the time-window segmented control", () => {
    const w = mountPanel();
    const segmentedControl = w.findAll('[role="tablist"]').at(-1);
    const segmentBtns = segmentedControl?.findAll(".segment-btn");
    expect(segmentedControl?.classes()).toContain("segmented-control--sliding");
    expect(segmentedControl?.find(".segmented-control__thumb").exists()).toBe(
      true,
    );
    expect(segmentBtns).toHaveLength(2);
  });

  it("highlights the active timeWindow segment", () => {
    const w7 = mountPanel(7);
    const segmentBtns = w7
      .findAll('[role="tablist"]')
      .at(-1)
      ?.findAll(".segment-btn");
    const firstBtn = segmentBtns?.[0];
    const secondBtn = segmentBtns?.[1];
    expect(firstBtn?.classes()).toContain("active");
    expect(firstBtn?.attributes("aria-selected")).toBe("true");
    expect(secondBtn?.attributes("aria-selected")).toBe("false");
  });

  it("emits update:timeWindow when segment is clicked", async () => {
    const w = mountPanel(7);
    const secondBtn = w
      .findAll('[role="tablist"]')
      .at(-1)
      ?.findAll(".segment-btn")[1];
    await secondBtn?.trigger("click");
    expect(w.emitted("update:timeWindow")).toBeTruthy();
    expect(w.emitted("update:timeWindow")![0]).toEqual([30]);
  });

  it("renders inline action buttons", () => {
    const w = mountPanel();
    const inlineButtons = w.findAll(".toolbar-inline-actions .mini-btn");
    expect(inlineButtons).toHaveLength(4);
  });

  it("displays scope summary text", () => {
    const w = mountPanel();
    expect(w.find(".scope-summary-note").text()).toBe("当前显示我负责的案件。");
  });

  it("navigates to /leads?action=new when createLead card is clicked", async () => {
    const router = makeRouter();
    await router.push("/");
    await router.isReady();
    const w = mount(QuickActionsPanel, {
      props: { timeWindow: 7, scopeSummary: "" },
      global: { plugins: [i18n, router] },
    });
    const cards = w.findAll(".quick-action-card");
    await cards[0]!.trigger("click");
    await flushPromises();
    expect(router.currentRoute.value.path).toBe("/leads");
    expect(router.currentRoute.value.query).toEqual({ action: "new" });
  });

  it("navigates to /cases/create when createCase card is clicked", async () => {
    const router = makeRouter();
    await router.push("/");
    await router.isReady();
    const w = mount(QuickActionsPanel, {
      props: { timeWindow: 7, scopeSummary: "" },
      global: { plugins: [i18n, router] },
    });
    const cards = w.findAll(".quick-action-card");
    await cards[2]!.trigger("click");
    await flushPromises();
    expect(router.currentRoute.value.path).toBe("/cases/create");
  });

  it("navigates to /customers?action=new when createCustomer card is clicked", async () => {
    const router = makeRouter();
    await router.push("/");
    await router.isReady();
    const w = mount(QuickActionsPanel, {
      props: { timeWindow: 7, scopeSummary: "" },
      global: { plugins: [i18n, router] },
    });
    const cards = w.findAll(".quick-action-card");
    await cards[1]!.trigger("click");
    await flushPromises();
    expect(router.currentRoute.value.path).toBe("/customers");
    expect(router.currentRoute.value.query).toEqual({ action: "new" });
  });

  it("navigates to /cases when chase due items card is clicked", async () => {
    const router = makeRouter();
    await router.push("/");
    await router.isReady();
    const w = mount(QuickActionsPanel, {
      props: { timeWindow: 7, scopeSummary: "" },
      global: { plugins: [i18n, router] },
    });
    const cards = w.findAll(".quick-action-card");
    await cards[3]!.trigger("click");
    await flushPromises();
    expect(router.currentRoute.value.path).toBe("/cases");
    expect(router.currentRoute.value.query).toEqual({});
  });

  it("keeps quick actions enabled when routes are wired", () => {
    const w = mountPanel();
    const cards = w.findAll(".quick-action-card");
    expect((cards[0]!.element as HTMLButtonElement).disabled).toBe(false);
    expect((cards[1]!.element as HTMLButtonElement).disabled).toBe(false);
    expect((cards[2]!.element as HTMLButtonElement).disabled).toBe(false);
    expect((cards[3]!.element as HTMLButtonElement).disabled).toBe(false);
  });

  it("disables inline actions that do not have a route yet", () => {
    const w = mountPanel();
    const buttons = w.findAll(".toolbar-inline-actions .mini-btn");
    expect((buttons[0]!.element as HTMLButtonElement).disabled).toBe(true);
    expect((buttons[1]!.element as HTMLButtonElement).disabled).toBe(true);
    expect((buttons[2]!.element as HTMLButtonElement).disabled).toBe(true);
    expect((buttons[3]!.element as HTMLButtonElement).disabled).toBe(false);
  });
});
