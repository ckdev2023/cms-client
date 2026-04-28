import { afterEach, describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { i18n, setAppLocale, type AppLocale } from "../../../i18n";
import { LEAD_DETAIL_SAMPLES } from "../fixtures-detail";
import { HEADER_BUTTON_PRESETS } from "../types-detail";
import LeadDetailHeader from "./LeadDetailHeader.vue";

const originalLocale = i18n.global.locale.value as AppLocale;

describe("LeadDetailHeader", () => {
  afterEach(() => {
    setAppLocale(originalLocale);
  });

  it("localizes breadcrumb aria-label in zh-CN", () => {
    setAppLocale("zh-CN");
    const wrapper = mount(LeadDetailHeader, {
      global: { plugins: [i18n] },
      props: {
        lead: LEAD_DETAIL_SAMPLES.following,
        avatarInitials: "李",
        buttonStates: HEADER_BUTTON_PRESETS.normal,
      },
    });

    expect(
      wrapper.find(".detail-header__breadcrumb").attributes("aria-label"),
    ).toBe("面包屑导航");
  });
});
