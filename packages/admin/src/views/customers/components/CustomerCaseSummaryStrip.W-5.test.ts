import { describe, expect, it, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import { i18n, setAppLocale } from "../../../i18n";
import { SAMPLE_CUSTOMER_DETAILS } from "../fixtures";
import type { CustomerDetail } from "../types";
import CustomerCaseSummaryStrip from "./CustomerCaseSummaryStrip.vue";

/**
 * W-5：客户详情案件摘要卡「案件名称」必须与 C-1
 * （CustomerAdapterCaseMapper）一致：caseName → caseNumber → "" →
 * 占位符 "—"。
 *
 * 历史回归：服务端 buildCaseNamesExpr 旧实现 case_name 为空时退化到
 * `customerName · case_type_code`，最终给 admin 看到 `dependent_visa`
 * 这种 visa key。这里锁定：
 *   1. caseNames[0] 非空 → 直接渲染；
 *   2. caseNames[0] === "" → 兜底为 "—"，避免空白；
 *   3. visa key（如 `dependent_visa`）若意外回灌也不应通过 fixture 出现
 *      在摘要卡上（属于服务端 SQL 责任，本测试只关注模板兜底）。
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

  it("renders the first caseName (caseName branch)", () => {
    const { wrapper } = factory({ caseNames: ["経営管理1年更新"] });
    expect(wrapper.find(".case-strip__case-link").text()).toBe(
      "経営管理1年更新",
    );
  });

  it("renders case_no when caseName is empty (caseNumber branch)", () => {
    const { wrapper } = factory({ caseNames: ["CASE-202605-0011"] });
    expect(wrapper.find(".case-strip__case-link").text()).toBe(
      "CASE-202605-0011",
    );
  });

  it("falls back to '—' placeholder when caseNames[0] is empty string (no caseName / no caseNumber)", () => {
    const { wrapper } = factory({ caseNames: [""] });
    expect(wrapper.find(".case-strip__case-link").text()).toBe("—");
  });

  it("falls back to '—' placeholder when caseNames[0] is whitespace only", () => {
    const { wrapper } = factory({ caseNames: ["   "] });
    expect(wrapper.find(".case-strip__case-link").text()).toBe("—");
  });

  it("falls back to '—' placeholder when caseNames is empty array", () => {
    const { wrapper } = factory({ caseNames: [] });
    expect(wrapper.find(".case-strip__case-link").text()).toBe("—");
  });

  it("shows extra count badge based on raw array length (not filtered)", () => {
    const { wrapper } = factory({
      caseNames: ["経営管理1年更新", "会社設立", "技人国"],
    });
    expect(wrapper.find(".case-strip__case-more").text()).toBe("+2");
  });
});
