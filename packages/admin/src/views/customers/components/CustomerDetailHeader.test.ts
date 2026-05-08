import { afterEach, describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { i18n, setAppLocale, type AppLocale } from "../../../i18n";
import { SAMPLE_CUSTOMER_DETAILS } from "../fixtures";
import {
  clearGroupAliases,
  registerGroupAliases,
} from "../../../shared/model/useGroupOptions";
import CustomerDetailHeader from "./CustomerDetailHeader.vue";

const originalLocale = i18n.global.locale.value as AppLocale;

describe("CustomerDetailHeader", () => {
  afterEach(() => {
    setAppLocale(originalLocale);
    clearGroupAliases();
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

  it("resolvesAliasUuidToCatalogLabel — zh-CN shows 东京一组", () => {
    const UUID = "ef21fdd2-1ffc-4a27-8b47-a640d6bd021c";
    registerGroupAliases([{ id: UUID, name: "tokyo-1" }]);
    setAppLocale("zh-CN");

    const customer = {
      ...SAMPLE_CUSTOMER_DETAILS["cust-001"]!,
      group: UUID,
    };

    const wrapper = mount(CustomerDetailHeader, {
      global: { plugins: [i18n] },
      props: { customer, avatarInitials: "T" },
    });

    const chipTexts = wrapper
      .findAll(".detail-header__chips strong")
      .map((el) => el.text());
    expect(chipTexts).toContain("东京一组");
    expect(wrapper.text()).not.toContain("tokyo-1");
    expect(wrapper.text()).not.toContain(UUID);
  });

  it("resolvesAliasUuidToCatalogLabel — ja-JP shows 東京一組", () => {
    const UUID = "ef21fdd2-1ffc-4a27-8b47-a640d6bd021c";
    registerGroupAliases([{ id: UUID, name: "tokyo-1" }]);
    setAppLocale("ja-JP");

    const customer = {
      ...SAMPLE_CUSTOMER_DETAILS["cust-001"]!,
      group: UUID,
    };

    const wrapper = mount(CustomerDetailHeader, {
      global: { plugins: [i18n] },
      props: { customer, avatarInitials: "T" },
    });

    const chipTexts = wrapper
      .findAll(".detail-header__chips strong")
      .map((el) => el.text());
    expect(chipTexts).toContain("東京一組");
    expect(wrapper.text()).not.toContain("tokyo-1");
    expect(wrapper.text()).not.toContain(UUID);
  });
});
