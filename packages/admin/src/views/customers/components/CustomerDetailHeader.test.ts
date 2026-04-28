import { afterEach, describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { i18n, setAppLocale, type AppLocale } from "../../../i18n";
import { SAMPLE_CUSTOMER_DETAILS } from "../fixtures";
import CustomerDetailHeader from "./CustomerDetailHeader.vue";

const originalLocale = i18n.global.locale.value as AppLocale;

describe("CustomerDetailHeader", () => {
  afterEach(() => {
    setAppLocale(originalLocale);
  });

  it("localizes breadcrumb aria-label in zh-CN", () => {
    setAppLocale("zh-CN");
    const wrapper = mount(CustomerDetailHeader, {
      global: { plugins: [i18n] },
      props: {
        customer: SAMPLE_CUSTOMER_DETAILS["cust-003"]!,
        avatarInitials: "L",
      },
    });

    expect(
      wrapper.find(".detail-header__breadcrumb").attributes("aria-label"),
    ).toBe("面包屑导航");
    expect(wrapper.text()).toContain("大阪组");
    expect(wrapper.text()).toContain("高桥健太");
  });
});
