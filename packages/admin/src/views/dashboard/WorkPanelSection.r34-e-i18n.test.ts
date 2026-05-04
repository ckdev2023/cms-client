import { beforeEach, describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import { i18n, setAppLocale } from "../../i18n";
import WorkPanelSection from "./WorkPanelSection.vue";
import type { DashboardSummaryData } from "./model/dashboardTypes";

function createPanelsWithTodo(
  descParams: Record<string, unknown>,
): DashboardSummaryData["panels"] {
  return {
    todo: [
      {
        id: "todo-i18n",
        title: "テストタスク",
        meta: [],
        desc: "",
        status: "info",
        statusLabel: "",
        action: "",
        route: "/billing",
        metaKeys: [],
        statusLabelKey: "inProgress",
        descKey: "todo.statusPriority",
        descParams,
        actionKey: "viewCase",
      },
    ],
    deadlines: [],
    submissions: [],
    risks: [],
  };
}

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/", name: "dashboard", component: { template: "<div />" } },
      { path: "/billing", name: "billing", component: { template: "<div />" } },
    ],
  });
}

async function mountSection(panels: DashboardSummaryData["panels"]) {
  const router = makeRouter();
  await router.push("/");
  await router.isReady();

  const wrapper = mount(WorkPanelSection, {
    props: { panels },
    global: { plugins: [i18n, router] },
  });

  return wrapper;
}

describe("WorkPanelSection — R34-E i18n: descTranslate renders translated status/priority", () => {
  beforeEach(() => {
    setAppLocale("zh-CN");
  });

  it.each([
    [
      "zh-CN",
      { status: "pending", priority: "normal" },
      "状态：待处理 · 优先级：普通",
    ],
    [
      "en-US",
      { status: "pending", priority: "normal" },
      "Status: Pending · Priority: Normal",
    ],
    [
      "ja-JP",
      { status: "pending", priority: "normal" },
      "ステータス：未処理 · 優先度：通常",
    ],
  ] as const)(
    "renders translated status/priority in %s (pending/normal)",
    async (locale, descParams, expected) => {
      setAppLocale(locale);
      const wrapper = await mountSection(
        createPanelsWithTodo(descParams as unknown as Record<string, unknown>),
      );
      const desc = wrapper.find(".work-item-desc");
      expect(desc.text()).toBe(expected);
    },
  );

  it.each([
    [
      "zh-CN",
      { status: "in_progress", priority: "high" },
      "状态：处理中 · 优先级：高",
    ],
    [
      "en-US",
      { status: "in_progress", priority: "high" },
      "Status: In progress · Priority: High",
    ],
    [
      "ja-JP",
      { status: "in_progress", priority: "high" },
      "ステータス：対応中 · 優先度：高",
    ],
  ] as const)(
    "renders translated status/priority in %s (in_progress/high)",
    async (locale, descParams, expected) => {
      setAppLocale(locale);
      const wrapper = await mountSection(
        createPanelsWithTodo(descParams as unknown as Record<string, unknown>),
      );
      const desc = wrapper.find(".work-item-desc");
      expect(desc.text()).toBe(expected);
    },
  );

  it.each(["zh-CN", "ja-JP"] as const)(
    "does not render raw enum values 'pending' or 'normal' in %s",
    async (locale) => {
      setAppLocale(locale);
      const wrapper = await mountSection(
        createPanelsWithTodo({ status: "pending", priority: "normal" }),
      );
      const desc = wrapper.find(".work-item-desc").text();
      expect(desc).not.toContain("pending");
      expect(desc).not.toContain("normal");
    },
  );
});
