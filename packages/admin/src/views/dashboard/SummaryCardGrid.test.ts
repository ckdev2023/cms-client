import { beforeEach, describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { i18n, setAppLocale } from "../../i18n";
import SummaryCardGrid from "./SummaryCardGrid.vue";

describe("SummaryCardGrid", () => {
  beforeEach(() => {
    setAppLocale("zh-CN");
  });

  const mountGrid = (scope: "mine" | "group" | "all" = "mine") =>
    mount(SummaryCardGrid, {
      props: { scope, timeWindow: 7 },
      global: { plugins: [i18n] },
    });

  it("renders four summary cards", () => {
    const w = mountGrid();
    expect(w.findAll(".summary-card")).toHaveLength(4);
  });

  it("displays different values when scope changes", () => {
    const mine = mountGrid("mine");
    const all = mountGrid("all");
    const mineValues = mine
      .findAll(".summary-card-value")
      .map((el) => el.text());
    const allValues = all.findAll(".summary-card-value").map((el) => el.text());
    expect(mineValues).not.toEqual(allValues);
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

  it("switches upcoming-cases value with timeWindow", () => {
    const w7 = mount(SummaryCardGrid, {
      props: { scope: "mine", timeWindow: 7 },
      global: { plugins: [i18n] },
    });
    const w30 = mount(SummaryCardGrid, {
      props: { scope: "mine", timeWindow: 30 },
      global: { plugins: [i18n] },
    });
    const v7 = w7.findAll(".summary-card-value")[1]?.text();
    const v30 = w30.findAll(".summary-card-value")[1]?.text();
    expect(v7).not.toBe(v30);
  });
});
