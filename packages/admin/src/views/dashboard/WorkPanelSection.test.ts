import { beforeEach, describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import { i18n, setAppLocale } from "../../i18n";
import WorkPanelSection from "./WorkPanelSection.vue";

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/", component: { template: "<div />" } },
      { path: "/billing", component: { template: "<div />" } },
    ],
  });
}

describe("WorkPanelSection", () => {
  beforeEach(() => {
    setAppLocale("zh-CN");
  });

  const mountSection = (
    scope: "mine" | "group" | "all" = "mine",
    timeWindow: 7 | 30 = 7,
  ) =>
    mount(WorkPanelSection, {
      props: { scope, timeWindow },
      global: { plugins: [i18n, makeRouter()] },
    });

  it("renders four work panels", () => {
    const w = mountSection();
    expect(w.findAll(".work-panel")).toHaveLength(4);
  });

  it("marks the first panel as featured", () => {
    const w = mountSection();
    expect(w.findAll(".work-panel--featured")).toHaveLength(1);
    expect(w.find(".work-panel").classes()).toContain("work-panel--featured");
  });

  it("renders work items inside the todo panel for 'mine' scope", () => {
    const w = mountSection("mine");
    const firstPanel = w.findAll(".work-panel")[0]!;
    expect(firstPanel.findAll(".work-item").length).toBeGreaterThan(0);
  });

  it("renders panel tags and titles", () => {
    const w = mountSection();
    const tags = w.findAll(".work-panel-tag");
    expect(tags).toHaveLength(4);
    expect(tags[0]?.text()).toBe("Top Priority");
  });

  it("renders translated work item content when locale switches", () => {
    setAppLocale("ja-JP");
    const w = mountSection("mine");
    const firstItem = w.find(".work-item");

    expect(firstItem.text()).toContain("本日必須対応");
    expect(firstItem.text()).toContain("受領書をアップロード");
  });

  it("filters deadline items by timeWindow", () => {
    const w7 = mountSection("mine", 7);
    const w30 = mountSection("mine", 30);
    const deadlinePanel7 = w7.findAll(".work-panel")[1]!;
    const deadlinePanel30 = w30.findAll(".work-panel")[1]!;
    const count7 = deadlinePanel7.findAll(".work-item").length;
    const count30 = deadlinePanel30.findAll(".work-item").length;
    expect(count30).toBeGreaterThanOrEqual(count7);
  });

  it("renders status pills for work items", () => {
    const w = mountSection();
    expect(w.findAll(".status-pill").length).toBeGreaterThan(0);
  });

  it("renders action buttons on panels and work items", () => {
    const w = mountSection();
    expect(w.findAll(".work-panel-action")).toHaveLength(4);
    expect(w.findAll(".work-item-actions .mini-btn").length).toBeGreaterThan(0);
  });
});
