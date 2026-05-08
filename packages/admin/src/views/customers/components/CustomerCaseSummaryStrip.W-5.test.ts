import { describe, expect, it, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import { i18n, setAppLocale } from "../../../i18n";
import { SAMPLE_CUSTOMER_DETAILS } from "../fixtures";
import type { CustomerDetail } from "../types";
import CustomerCaseSummaryStrip from "./CustomerCaseSummaryStrip.vue";

/**
 * W-5：客户详情案件摘要卡「案件名称」显示优先级：
 *   caseTitles（P1-9/10 新增）→ caseNames（兜底）→ "—" 占位。
 *
 * caseTitles 由服务端 buildCaseTitlesExpr 生成：
 *   case_name 优先 → displayName · caseTypeCode 兜底。
 * 当 caseTitles 为空数组时，退回到 caseNames 兼容路径。
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

  it("falls back to caseNames when caseTitles is empty", () => {
    const { wrapper } = factory({
      caseTitles: [],
      caseNames: ["CASE-202605-0011"],
    });
    expect(wrapper.find(".case-strip__case-link").text()).toBe(
      "CASE-202605-0011",
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

  it("falls back to '—' placeholder when caseTitles[0] is empty string", () => {
    const { wrapper } = factory({ caseTitles: [""], caseNames: [] });
    expect(wrapper.find(".case-strip__case-link").text()).toBe("—");
  });

  it("falls back to '—' placeholder when caseTitles[0] is whitespace only", () => {
    const { wrapper } = factory({ caseTitles: ["   "], caseNames: [] });
    expect(wrapper.find(".case-strip__case-link").text()).toBe("—");
  });

  it("falls back to '—' placeholder when both arrays are empty", () => {
    const { wrapper } = factory({ caseTitles: [], caseNames: [] });
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
