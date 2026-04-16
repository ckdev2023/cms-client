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
        meta: ["案件：A-001", "执行人：田中"],
        desc: "今天 15:00 前完成上传。",
        status: "info",
        statusLabel: "进行中",
        action: "查看案件",
        route: "/billing",
      },
    ],
    deadlines: [
      {
        id: "deadline-1",
        title: "经营管理签更新",
        meta: ["负责人：佐藤", "期限：2026-04-20"],
        desc: "当前阶段：待提交",
        status: "warn",
        statusLabel: "剩余 4 天",
        action: "查看案件",
        route: "/billing",
        daysLeft: 4,
      },
    ],
    submissions: [
      {
        id: "submission-1",
        title: "技人国续签",
        meta: ["负责人：林"],
        desc: "检查已通过，待复核。",
        status: "info",
        statusLabel: "可提交",
        action: "查看案件",
      },
    ],
    risks: [
      {
        id: "risk-1",
        title: "未收款案件",
        meta: ["待收：¥30,000"],
        desc: "需尽快跟进收费。",
        status: "danger",
        statusLabel: "收费风险",
        action: "查看收费",
        route: "/billing",
      },
    ],
    ...overrides,
  };
}

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/", component: { template: "<div />" } },
      { path: "/billing", component: { template: "<div />" } },
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

  it("keeps backend content while panel chrome follows locale", async () => {
    setAppLocale("ja-JP");
    const { wrapper: w } = await mountSection();
    const firstPanel = w.findAll(".work-panel")[0]!;
    const firstItem = w.find(".work-item");

    expect(firstPanel.text()).toContain("本日の対応");
    expect(firstItem.text()).toContain("上传回执");
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

  it("navigates when a work item action has a route", async () => {
    const { wrapper: w, router } = await mountSection();
    await w
      .find(".work-item-actions .mini-btn:not([disabled])")
      .trigger("click");
    await flushPromises();

    expect(router.currentRoute.value.fullPath).toBe("/billing");
  });
});
