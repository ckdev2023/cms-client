import { afterEach, describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";

import { i18n, setAppLocale, type AppLocale } from "../../../i18n";
import type { LeadLogEntry } from "../types";
import LeadLogTab from "./LeadLogTab.vue";

const originalLocale = i18n.global.locale.value as AppLocale;

const baseLog: LeadLogEntry = {
  type: "status",
  operator: "田中 太郎",
  time: "今天 10:00",
  fromValue: "新咨询",
  toValue: "跟进中",
  chipClass: "bg-sky-100 text-sky-700",
};

function mountTab(entries: LeadLogEntry[] = [baseLog]) {
  return mount(LeadLogTab, {
    global: { plugins: [i18n] },
    props: {
      log: entries,
      logCategory: "all",
      filteredLog: entries,
    },
  });
}

describe("LeadLogTab — H-5 actor + payload diff rendering", () => {
  afterEach(() => {
    setAppLocale(originalLocale);
  });

  it("renders operator (actor) for a server-derived log entry", () => {
    setAppLocale("zh-CN");
    const wrapper = mountTab();
    const operatorEl = wrapper.find(".log-timeline__operator");
    expect(operatorEl.exists()).toBe(true);
    expect(operatorEl.text()).toContain("田中 太郎");
  });

  it("renders payload diff (from → to) on the timeline card", () => {
    setAppLocale("zh-CN");
    const wrapper = mountTab();
    expect(wrapper.find(".log-timeline__from").text()).toBe("新咨询");
    expect(wrapper.find(".log-timeline__to").text()).toBe("跟进中");
  });

  it("falls back to '未知操作人' when operator is empty", () => {
    setAppLocale("zh-CN");
    const wrapper = mountTab([{ ...baseLog, operator: "" }]);
    expect(wrapper.find(".log-timeline__operator").text()).toContain(
      "未知操作人",
    );
  });

  it("uses i18n actorUnknown label across locales (en-US)", () => {
    setAppLocale("en-US");
    const wrapper = mountTab([{ ...baseLog, operator: "" }]);
    expect(wrapper.find(".log-timeline__operator").text()).toContain(
      "Unknown actor",
    );
  });

  it("renders 'info' (其他) chip label for the new info category", () => {
    setAppLocale("zh-CN");
    const wrapper = mountTab([
      {
        type: "info",
        operator: "Admin",
        time: "今天 09:00",
        fromValue: "—",
        toValue: "phone",
        chipClass: "bg-gray-100 text-gray-700",
      },
    ]);
    expect(wrapper.find(".log-timeline__type-chip").text()).toBe("其他");
  });

  it("filter SegmentedControl exposes 5 categories incl. info (H-5)", () => {
    setAppLocale("zh-CN");
    const wrapper = mountTab();
    const segmentButtons = wrapper.findAll(
      "[role='radiogroup'] button, [role='tab'], button.segmented-option, .segmented-control button",
    );
    const allText = segmentButtons.map((b) => b.text()).join(" ");
    expect(allText).toContain("全部");
    expect(allText).toContain("状态变更");
    expect(allText).toContain("人员变更");
    expect(allText).toContain("所属组变更");
    expect(allText).toContain("其他");
  });
});
