import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { i18n, setAppLocale } from "../../../i18n";
import LeadBannerStrip from "./LeadBannerStrip.vue";

describe("LeadBannerStrip", () => {
  it("signedNotConverted with highlighted convertCase renders action button", () => {
    setAppLocale("zh-CN");
    const wrapper = mount(LeadBannerStrip, {
      global: { plugins: [i18n] },
      props: {
        banner: "signedNotConverted",
        convertCaseState: "highlighted",
      },
    });

    const banner = wrapper.find(".banner--warning");
    expect(banner.exists()).toBe(true);

    const actionBtn = wrapper.find(".banner__action");
    expect(actionBtn.exists()).toBe(true);
    expect(actionBtn.text()).toBe("签约并开始建档");
  });

  it("signedNotConverted with enabled convertCase also renders action button", () => {
    setAppLocale("zh-CN");
    const wrapper = mount(LeadBannerStrip, {
      global: { plugins: [i18n] },
      props: {
        banner: "signedNotConverted",
        convertCaseState: "enabled",
      },
    });

    expect(wrapper.find(".banner__action").exists()).toBe(true);
  });

  it("signedNotConverted with hidden convertCase does not render action button", () => {
    setAppLocale("zh-CN");
    const wrapper = mount(LeadBannerStrip, {
      global: { plugins: [i18n] },
      props: {
        banner: "signedNotConverted",
        convertCaseState: "hidden",
      },
    });

    const banner = wrapper.find(".banner--warning");
    expect(banner.exists()).toBe(true);
    expect(wrapper.find(".banner__action").exists()).toBe(false);
  });

  it("signedNotConverted action button emits convertCase on click", async () => {
    setAppLocale("zh-CN");
    const wrapper = mount(LeadBannerStrip, {
      global: { plugins: [i18n] },
      props: {
        banner: "signedNotConverted",
        convertCaseState: "highlighted",
      },
    });

    await wrapper.find(".banner__action").trigger("click");
    expect(wrapper.emitted().convertCase).toHaveLength(1);
  });

  it("lost banner renders readonly style without action button", () => {
    setAppLocale("zh-CN");
    const wrapper = mount(LeadBannerStrip, {
      global: { plugins: [i18n] },
      props: {
        banner: "lost",
      },
    });

    expect(wrapper.find(".banner--readonly").exists()).toBe(true);
    expect(wrapper.find(".banner__action").exists()).toBe(false);
  });

  it("null banner renders nothing", () => {
    setAppLocale("zh-CN");
    const wrapper = mount(LeadBannerStrip, {
      global: { plugins: [i18n] },
      props: {
        banner: null,
      },
    });

    expect(wrapper.find(".banner").exists()).toBe(false);
  });
});
