import { beforeEach, describe, expect, it } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import { i18n, setAppLocale } from "../../i18n";
import WorkPanelSection from "./WorkPanelSection.vue";
import type { DashboardSummaryData } from "./model/dashboardTypes";

function createPanels(
  overrides: Partial<DashboardSummaryData["panels"]> = {},
): DashboardSummaryData["panels"] {
  return {
    todo: [
      {
        id: "todo-1",
        title: "上传回执",
        meta: [],
        desc: "",
        status: "info",
        statusLabel: "",
        action: "",
        route: "/billing",
        metaKeys: [
          { key: "case", params: { caseLabel: "A-001" } },
          { key: "assignee", params: { name: "田中" } },
        ],
        statusLabelKey: "inProgress",
        descKey: "todo.statusPriority",
        descParams: { status: "active", priority: "high" },
        actionKey: "viewCase",
      },
    ],
    deadlines: [
      {
        id: "deadline-1",
        title: "经营管理签更新",
        meta: [],
        desc: "",
        status: "warn",
        statusLabel: "",
        action: "",
        route: "/billing",
        daysLeft: 4,
        metaKeys: [
          { key: "owner", params: { name: "佐藤" } },
          { key: "due", params: { date: "2026/04/20" } },
        ],
        statusLabelKey: "daysLeft",
        statusLabelParams: { days: 4 },
        descKey: "deadline.currentStage",
        descParams: { status: "pending" },
        actionKey: "viewCase",
      },
    ],
    submissions: [
      {
        id: "submission-1",
        title: "技人国续签",
        meta: [],
        desc: "",
        status: "info",
        statusLabel: "",
        action: "",
        metaKeys: [{ key: "owner", params: { name: "林" } }],
        statusLabelKey: "readyToSubmit",
        descKey: "submission.pendingReview",
        actionKey: "viewCase",
      },
    ],
    risks: [
      {
        id: "risk-1",
        title: "未收款案件",
        meta: [],
        desc: "",
        status: "danger",
        statusLabel: "",
        action: "",
        route: "/billing",
        metaKeys: [{ key: "unpaid", params: { amount: "¥30,000" } }],
        statusLabelKey: "billingRisk",
        descKey: "risk.unpaidAmount",
        descParams: { amount: "¥30,000" },
        actionKey: "viewBilling",
      },
    ],
    ...overrides,
  };
}

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/", name: "dashboard", component: { template: "<div />" } },
      { path: "/billing", name: "billing", component: { template: "<div />" } },
      { path: "/cases", name: "cases", component: { template: "<div />" } },
    ],
  });
}

async function mountSection(
  panels: DashboardSummaryData["panels"] | null = createPanels(),
) {
  const router = makeRouter();
  await router.push("/");
  await router.isReady();

  const wrapper = mount(WorkPanelSection, {
    props: { panels },
    global: { plugins: [i18n, router] },
  });

  return { wrapper, router };
}

describe("WorkPanelSection", () => {
  beforeEach(() => {
    setAppLocale("zh-CN");
  });

  it("renders four work panels", async () => {
    const { wrapper: w } = await mountSection();
    expect(w.findAll(".work-panel")).toHaveLength(4);
  });

  it("marks the first panel as featured", async () => {
    const { wrapper: w } = await mountSection();
    expect(w.findAll(".work-panel--featured")).toHaveLength(1);
    expect(w.find(".work-panel").classes()).toContain("work-panel--featured");
  });

  it("renders backend work items in the todo panel", async () => {
    const { wrapper: w } = await mountSection();
    const firstPanel = w.findAll(".work-panel")[0]!;
    expect(firstPanel.findAll(".work-item").length).toBeGreaterThan(0);
    expect(firstPanel.text()).toContain("上传回执");
  });

  it("renders panel tags and titles", async () => {
    const { wrapper: w } = await mountSection();
    const tags = w.findAll(".work-panel-tag");
    expect(tags).toHaveLength(4);
    expect(tags[0]?.text()).toBe("Top Priority");
  });

  it("renders i18n-keyed content in current locale while preserving server title", async () => {
    setAppLocale("ja-JP");
    const { wrapper: w } = await mountSection();
    const firstPanel = w.findAll(".work-panel")[0]!;
    const firstItem = w.find(".work-item");

    expect(firstPanel.text()).toContain("本日の対応");
    expect(firstItem.text()).toContain("上传回执");
    expect(firstItem.find(".status-pill").text()).toBe("進行中");
    expect(firstItem.find(".work-item-actions .mini-btn").text()).toBe(
      "案件を見る",
    );
  });

  it("renders panel empty state when a list is empty", async () => {
    const { wrapper: w } = await mountSection(createPanels({ deadlines: [] }));
    const deadlinePanel = w.findAll(".work-panel")[1]!;
    expect(deadlinePanel.findAll(".work-item")).toHaveLength(0);
    expect(deadlinePanel.text()).toContain("当前窗口内暂无逾期或临期案件");
  });

  it("renders status pills for work items", async () => {
    const { wrapper: w } = await mountSection();
    expect(w.findAll(".status-pill").length).toBeGreaterThan(0);
  });

  it("renders action buttons on panels and work items", async () => {
    const { wrapper: w } = await mountSection();
    expect(w.findAll(".work-panel-action")).toHaveLength(4);
    expect(w.findAll(".work-item-actions .mini-btn").length).toBeGreaterThan(0);
  });

  it("disables unfinished panel actions and enables routed ones", async () => {
    const { wrapper: w } = await mountSection();
    const buttons = w.findAll(".work-panel-action");
    expect((buttons[0]!.element as HTMLButtonElement).disabled).toBe(true);
    expect((buttons[1]!.element as HTMLButtonElement).disabled).toBe(false);
    expect((buttons[2]!.element as HTMLButtonElement).disabled).toBe(false);
    expect((buttons[3]!.element as HTMLButtonElement).disabled).toBe(false);
  });

  it("navigates to /cases when the due soon panel action is clicked", async () => {
    const { wrapper: w, router } = await mountSection();
    const buttons = w.findAll(".work-panel-action");
    await buttons[1]!.trigger("click");
    await flushPromises();
    expect(router.currentRoute.value.path).toBe("/cases");
    expect(router.currentRoute.value.query).toEqual({});
  });

  it("navigates to /cases?stage=S6 when the submit panel action is clicked", async () => {
    const { wrapper: w, router } = await mountSection();
    const buttons = w.findAll(".work-panel-action");
    await buttons[2]!.trigger("click");
    await flushPromises();
    expect(router.currentRoute.value.path).toBe("/cases");
    expect(router.currentRoute.value.query).toEqual({ stage: "S6" });
  });

  it("navigates to /cases?risk=critical when the risk panel action is clicked", async () => {
    const { wrapper: w, router } = await mountSection();
    const buttons = w.findAll(".work-panel-action");
    await buttons[3]!.trigger("click");
    await flushPromises();
    expect(router.currentRoute.value.path).toBe("/cases");
    expect(router.currentRoute.value.query).toEqual({ risk: "critical" });
  });

  it.each([
    ["zh-CN", "收费风险", "查看收费", "待收：¥30,000"],
    ["ja-JP", "請求リスク", "請求を見る", "未収：¥30,000"],
    ["en-US", "Billing risk", "View billing", "Unpaid: ¥30,000"],
  ] as const)(
    "renders risk card correctly in %s",
    async (locale, expectedStatus, expectedAction, expectedMeta) => {
      setAppLocale(locale);
      const { wrapper: w } = await mountSection();
      const riskPanel = w.findAll(".work-panel")[3]!;
      const riskItem = riskPanel.find(".work-item");
      expect(riskItem.find(".status-pill").text()).toBe(expectedStatus);
      expect(riskItem.find(".work-item-actions .mini-btn").text()).toBe(
        expectedAction,
      );
      expect(riskItem.find(".work-item-meta span").text()).toBe(expectedMeta);
    },
  );

  it("navigates when a work item action has a route", async () => {
    const { wrapper: w, router } = await mountSection();
    await w
      .find(".work-item-actions .mini-btn:not([disabled])")
      .trigger("click");
    await flushPromises();

    expect(router.currentRoute.value.fullPath).toBe("/billing");
  });
});
