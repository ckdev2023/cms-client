import { beforeEach, describe, expect, it } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import { i18n, setAppLocale } from "../../i18n";
import SummaryCardGrid from "./SummaryCardGrid.vue";
import type { DashboardSummaryData } from "./model/dashboardTypes";

function createSummary(
  overrides: Partial<DashboardSummaryData["summary"]> = {},
): DashboardSummaryData["summary"] {
  return {
    todayTasks: 6,
    upcomingCases: 3,
    pendingSubmissions: 2,
    riskCases: 1,
    ...overrides,
  };
}

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/", name: "dashboard", component: { template: "<div />" } },
      { path: "/cases", name: "cases", component: { template: "<div />" } },
    ],
  });
}

describe("SummaryCardGrid", () => {
  beforeEach(() => {
    setAppLocale("zh-CN");
  });

  const mountGrid = async (
    summary: DashboardSummaryData["summary"] | null = createSummary(),
  ) => {
    const router = makeRouter();
    await router.push("/");
    await router.isReady();

    const wrapper = mount(SummaryCardGrid, {
      props: { summary },
      global: { plugins: [i18n, router] },
    });

    return { wrapper, router };
  };

  it("renders four summary cards", async () => {
    const { wrapper: w } = await mountGrid();
    expect(w.findAll(".summary-card")).toHaveLength(4);
  });

  it("renders summary values from the backend payload", async () => {
    const { wrapper: w } = await mountGrid(
      createSummary({
        todayTasks: 12,
        upcomingCases: 5,
        pendingSubmissions: 7,
        riskCases: 4,
      }),
    );

    const values = w.findAll(".summary-card-value").map((el) => el.text());
    expect(values).toEqual(["12", "5", "7", "4"]);
  });

  it("applies correct data-tone attributes", async () => {
    const { wrapper: w } = await mountGrid();
    const tones = w
      .findAll(".summary-card")
      .map((el) => el.attributes("data-tone"));
    expect(tones).toEqual(["info", "warn", "info", "risk"]);
  });

  it("renders a status pill for each card", async () => {
    const { wrapper: w } = await mountGrid();
    expect(w.findAll(".status-pill")).toHaveLength(4);
  });

  it("renders action buttons inside each card footer", async () => {
    const { wrapper: w } = await mountGrid();
    const buttons = w.findAll(".summary-card-footer .mini-btn");
    expect(buttons).toHaveLength(4);
  });

  it("disables the unfinished today tasks action", async () => {
    const { wrapper: w } = await mountGrid();
    const buttons = w.findAll(".summary-card-footer .mini-btn");
    expect((buttons[0]!.element as HTMLButtonElement).disabled).toBe(true);
    expect((buttons[1]!.element as HTMLButtonElement).disabled).toBe(false);
    expect((buttons[2]!.element as HTMLButtonElement).disabled).toBe(false);
    expect((buttons[3]!.element as HTMLButtonElement).disabled).toBe(false);
  });

  it("navigates to /cases when view due soon is clicked", async () => {
    const { wrapper: w, router } = await mountGrid();
    const buttons = w.findAll(".summary-card-footer .mini-btn");
    await buttons[1]!.trigger("click");
    await flushPromises();
    expect(router.currentRoute.value.path).toBe("/cases");
    expect(router.currentRoute.value.query).toEqual({});
  });

  it("navigates to /cases?stage=S6 when go to submit is clicked", async () => {
    const { wrapper: w, router } = await mountGrid();
    const buttons = w.findAll(".summary-card-footer .mini-btn");
    await buttons[2]!.trigger("click");
    await flushPromises();
    expect(router.currentRoute.value.path).toBe("/cases");
    expect(router.currentRoute.value.query).toEqual({ stage: "S6" });
  });

  it("navigates to /cases?risk=critical when fix risk items is clicked", async () => {
    const { wrapper: w, router } = await mountGrid();
    const buttons = w.findAll(".summary-card-footer .mini-btn");
    await buttons[3]!.trigger("click");
    await flushPromises();
    expect(router.currentRoute.value.path).toBe("/cases");
    expect(router.currentRoute.value.query).toEqual({ risk: "critical" });
  });

  it("renders placeholders before the payload is available", async () => {
    const { wrapper: w } = await mountGrid(null);
    const values = w.findAll(".summary-card-value").map((el) => el.text());
    expect(values).toEqual(["—", "—", "—", "—"]);
  });
});
