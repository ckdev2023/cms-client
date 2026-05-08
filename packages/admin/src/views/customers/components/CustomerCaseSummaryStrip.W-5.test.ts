import { describe, expect, it, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import { i18n, setAppLocale } from "../../../i18n";
import { SAMPLE_CUSTOMER_DETAILS } from "../fixtures";
import type { CustomerDetail } from "../types";
import CustomerCaseSummaryStrip from "./CustomerCaseSummaryStrip.vue";

/**
 * W-5：客户详情案件摘要卡「案件名称」显示优先级：
 *   caseTitles[0] 有值 → 直接展示；
 *   caseTitles 为空 → buildFallbackName(displayName, caseTypeLabel, "—", "—")。
 */
describe("CustomerCaseSummaryStrip W-5 fallback", () => {
  beforeEach(() => {
    setAppLocale("en-US");
  });

  function factory(overrides: Partial<CustomerDetail> = {}) {
    const base = SAMPLE_CUSTOMER_DETAILS["cust-001"]!;
    const customer: CustomerDetail = { ...base, ...overrides };
    const wrapper = mount(CustomerCaseSummaryStrip, {
      props: { customer },
      global: { plugins: [i18n] },
    });
    return { wrapper };
  }

  it("prefers caseTitles[0] when present", () => {
    const { wrapper } = factory({
      caseTitles: ["田中太郎 · dependent_visa"],
      caseNames: ["CASE-202605-0001"],
    });
    expect(wrapper.find(".case-strip__case-link").text()).toBe(
      "田中太郎 · dependent_visa",
    );
  });

  it("uses buildFallbackName when caseTitles is empty and caseTypeCodes present", () => {
    const { wrapper } = factory({
      caseTitles: [],
      caseTypeCodes: ["dependent_visa"],
      displayName: "山田太郎",
      caseNames: [],
    });
    expect(wrapper.find(".case-strip__case-link").text()).toBe(
      "山田太郎 · Dependent Visa",
    );
  });

  it("renders the first caseName (caseName branch) via caseTitles", () => {
    const { wrapper } = factory({
      caseTitles: ["経営管理1年更新"],
      caseNames: [],
    });
    expect(wrapper.find(".case-strip__case-link").text()).toBe(
      "経営管理1年更新",
    );
  });

  it("uses displayName only when caseTitles empty and caseTypeCodes empty", () => {
    const { wrapper } = factory({
      caseTitles: [],
      caseTypeCodes: [],
      caseNames: [],
      displayName: "佐藤花子",
    });
    expect(wrapper.find(".case-strip__case-link").text()).toBe("佐藤花子");
  });

  it("falls back to '—' when caseTitles[0] is empty string and caseTypeCodes triggers buildFallbackName", () => {
    const { wrapper } = factory({
      caseTitles: [""],
      caseTypeCodes: [],
      caseNames: [],
      displayName: "",
    });
    expect(wrapper.find(".case-strip__case-link").text()).toBe("—");
  });

  it("falls back via buildFallbackName when caseTitles[0] is whitespace only", () => {
    const { wrapper } = factory({
      caseTitles: ["   "],
      caseTypeCodes: [],
      caseNames: [],
      displayName: "",
    });
    expect(wrapper.find(".case-strip__case-link").text()).toBe("—");
  });

  it("falls back via buildFallbackName when both arrays are empty and displayName is empty", () => {
    const { wrapper } = factory({
      caseTitles: [],
      caseTypeCodes: [],
      caseNames: [],
      displayName: "",
    });
    expect(wrapper.find(".case-strip__case-link").text()).toBe("—");
  });

  it("shows extra count badge based on caseTitles length", () => {
    const { wrapper } = factory({
      caseTitles: ["経営管理1年更新", "会社設立", "技人国"],
      caseNames: [],
    });
    expect(wrapper.find(".case-strip__case-more").text()).toBe("+2");
  });
});
