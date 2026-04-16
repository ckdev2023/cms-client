import { beforeEach, describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
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

describe("SummaryCardGrid", () => {
  beforeEach(() => {
    setAppLocale("zh-CN");
  });

  const mountGrid = (
    summary: DashboardSummaryData["summary"] | null = createSummary(),
  ) =>
    mount(SummaryCardGrid, {
      props: { summary },
      global: { plugins: [i18n] },
    });

  it("renders four summary cards", () => {
    const w = mountGrid();
    expect(w.findAll(".summary-card")).toHaveLength(4);
  });

  it("renders summary values from the backend payload", () => {
    const w = mountGrid(
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

  it("applies correct data-tone attributes", () => {
    const w = mountGrid();
    const tones = w
      .findAll(".summary-card")
      .map((el) => el.attributes("data-tone"));
    expect(tones).toEqual(["info", "warn", "info", "risk"]);
  });

  it("renders a status pill for each card", () => {
    const w = mountGrid();
    expect(w.findAll(".status-pill")).toHaveLength(4);
  });

  it("renders action buttons inside each card footer", () => {
    const w = mountGrid();
    const buttons = w.findAll(".summary-card-footer .mini-btn");
    expect(buttons).toHaveLength(4);
  });

  it("renders placeholders before the payload is available", () => {
    const w = mountGrid(null);
    const values = w.findAll(".summary-card-value").map((el) => el.text());
    expect(values).toEqual(["—", "—", "—", "—"]);
  });
});
