import { afterEach, describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { i18n, setAppLocale, type AppLocale } from "../../../i18n";
import LeadPagination from "./LeadPagination.vue";

const originalLocale = i18n.global.locale.value as AppLocale;

describe("LeadPagination BUG-210: empty state text", () => {
  afterEach(() => {
    setAppLocale(originalLocale);
  });

  it("shows empty text when total=0 (zh-CN)", () => {
    setAppLocale("zh-CN");
    const wrapper = mount(LeadPagination, {
      global: { plugins: [i18n] },
      props: { start: 0, end: 0, total: 0 },
    });
    expect(wrapper.find(".lead-pagination__summary").text()).toBe("暂无数据");
  });

  it("shows empty text when total=0 (en-US)", () => {
    setAppLocale("en-US");
    const wrapper = mount(LeadPagination, {
      global: { plugins: [i18n] },
      props: { start: 0, end: 0, total: 0 },
    });
    expect(wrapper.find(".lead-pagination__summary").text()).toBe("No data");
  });

  it("shows empty text when total=0 (ja-JP)", () => {
    setAppLocale("ja-JP");
    const wrapper = mount(LeadPagination, {
      global: { plugins: [i18n] },
      props: { start: 0, end: 0, total: 0 },
    });
    expect(wrapper.find(".lead-pagination__summary").text()).toBe(
      "データがありません",
    );
  });

  it("shows summary text when total > 0", () => {
    setAppLocale("zh-CN");
    const wrapper = mount(LeadPagination, {
      global: { plugins: [i18n] },
      props: { start: 1, end: 10, total: 25 },
    });
    expect(wrapper.find(".lead-pagination__summary").text()).toBe(
      "显示 1 - 10 条，共 25 条",
    );
  });
});
