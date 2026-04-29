import { beforeEach, describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import { i18n, setAppLocale } from "../../i18n";
import WorkPanelSection from "./WorkPanelSection.vue";
import type { DashboardSummaryData } from "./model/dashboardTypes";

function createI18nPanels(
  overrides: Partial<DashboardSummaryData["panels"]> = {},
): DashboardSummaryData["panels"] {
  return {
    todo: [],
    deadlines: [],
    submissions: [],
    risks: [
      {
        id: "risk-i18n",
        title: "Risk case title",
        meta: ["fallback meta"],
        desc: "fallback desc",
        status: "danger",
        statusLabel: "fallback status",
        action: "fallback action",
        statusLabelKey: "billingRisk",
        descKey: "risk.unpaidAmount",
        descParams: { amount: "¥80,000" },
        actionKey: "viewBilling",
        metaKeys: [{ key: "owner", params: { name: "Local Admin" } }],
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
    ],
  });
}

async function mountSection(
  panels: DashboardSummaryData["panels"],
  locale: "zh-CN" | "ja-JP" | "en-US" = "ja-JP",
) {
  setAppLocale(locale);
  const router = makeRouter();
  await router.push("/");
  await router.isReady();

  const wrapper = mount(WorkPanelSection, {
    props: { panels },
    global: { plugins: [i18n, router] },
  });

  return wrapper;
}

describe("WorkPanelSection i18n key rendering", () => {
  beforeEach(() => {
    setAppLocale("zh-CN");
  });

  it("renders translated statusLabel via statusLabelKey (ja-JP)", async () => {
    const w = await mountSection(createI18nPanels(), "ja-JP");
    const pill = w.find(".status-pill");
    expect(pill.text()).toBe("請求リスク");
  });

  it("renders translated statusLabel via statusLabelKey (zh-CN)", async () => {
    const w = await mountSection(createI18nPanels(), "zh-CN");
    const pill = w.find(".status-pill");
    expect(pill.text()).toBe("收费风险");
  });

  it("renders translated statusLabel via statusLabelKey (en-US)", async () => {
    const w = await mountSection(createI18nPanels(), "en-US");
    const pill = w.find(".status-pill");
    expect(pill.text()).toBe("Billing risk");
  });

  it("renders translated desc via descKey with params", async () => {
    const w = await mountSection(createI18nPanels(), "ja-JP");
    const desc = w.find(".work-item-desc");
    expect(desc.text()).toContain("未収金");
    expect(desc.text()).toContain("¥80,000");
  });

  it("renders translated action via actionKey", async () => {
    const w = await mountSection(createI18nPanels(), "ja-JP");
    const btn = w.find(".work-item-actions .mini-btn");
    expect(btn.text()).toBe("請求を見る");
  });

  it("renders translated meta via metaKeys", async () => {
    const w = await mountSection(createI18nPanels(), "ja-JP");
    const metaSpans = w.findAll(".work-item-meta span");
    expect(metaSpans.length).toBe(1);
    expect(metaSpans[0]!.text()).toContain("担当");
    expect(metaSpans[0]!.text()).toContain("Local Admin");
  });

  it("falls back to legacy strings when keys are absent", async () => {
    const panels: DashboardSummaryData["panels"] = {
      todo: [],
      deadlines: [],
      submissions: [],
      risks: [
        {
          id: "legacy-item",
          title: "Legacy title",
          meta: ["legacy meta entry"],
          desc: "legacy description text",
          status: "warn",
          statusLabel: "legacy status label",
          action: "legacy action label",
        },
      ],
    };
    const w = await mountSection(panels, "ja-JP");
    expect(w.find(".status-pill").text()).toBe("legacy status label");
    expect(w.find(".work-item-desc").text()).toBe("legacy description text");
    expect(w.find(".work-item-actions .mini-btn").text()).toBe(
      "legacy action label",
    );
    expect(w.find(".work-item-meta span").text()).toBe("legacy meta entry");
  });
});
