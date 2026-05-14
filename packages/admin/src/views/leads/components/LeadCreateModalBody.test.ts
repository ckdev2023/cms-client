import { afterEach, describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { i18n, setAppLocale, type AppLocale } from "../../../i18n";
import LeadCreateModalBody from "./LeadCreateModalBody.vue";

const CHINESE_CHAR_RE = /[\u4e00-\u9fff]/;

const originalLocale = i18n.global.locale.value as AppLocale;

afterEach(() => {
  setAppLocale(originalLocale);
});

const ALWAYS_VISIBLE_IDS = [
  "lead-create-name",
  "lead-create-phone",
  "lead-create-email",
  "lead-create-source",
  "lead-create-businessType",
  "lead-create-group",
  "lead-create-owner",
  "lead-create-language",
  "lead-create-nextAction",
  "lead-create-nextFollowUp",
  "lead-create-note",
];

describe("LeadCreateModalBody — a11y label association", () => {
  it("every input/select has an id, name, and a matching label[for]", () => {
    const wrapper = mount(LeadCreateModalBody, {
      global: { plugins: [i18n] },
    });

    for (const id of ALWAYS_VISIBLE_IDS) {
      const control = wrapper.find(`#${id}`);
      expect(control.exists(), `control #${id} should exist`).toBe(true);
      expect(control.attributes("name")).toBeTruthy();

      const label = wrapper.find(`label[for="${id}"]`);
      expect(label.exists(), `label[for="${id}"] should exist`).toBe(true);
    }
  });

  it("conditionally visible referrer field also has id/name/label[for]", () => {
    const wrapper = mount(LeadCreateModalBody, {
      global: { plugins: [i18n] },
      props: { fields: { source: "referral" } as never },
    });

    const control = wrapper.find("#lead-create-referrer");
    expect(control.exists()).toBe(true);
    expect(control.attributes("name")).toBe("referrer");

    const label = wrapper.find('label[for="lead-create-referrer"]');
    expect(label.exists()).toBe(true);
  });
});

describe("LeadCreateModalBody — i18n option labels", () => {
  it("renders no Chinese characters in select options under en-US locale", () => {
    setAppLocale("en-US");

    const wrapper = mount(LeadCreateModalBody, {
      global: { plugins: [i18n] },
    });

    const options = wrapper.findAll("select option");
    for (const opt of options) {
      const text = opt.text().trim();
      if (!text) continue;
      expect(
        text,
        `option text "${text}" should not contain Chinese characters`,
      ).not.toMatch(CHINESE_CHAR_RE);
    }
  });

  it("renders Japanese labels under ja-JP locale", () => {
    setAppLocale("ja-JP");

    const wrapper = mount(LeadCreateModalBody, {
      global: { plugins: [i18n] },
    });

    const allText = wrapper.text();
    expect(allText).toContain("Webフォーム");
    expect(allText).toContain("高度専門職");
    expect(allText).toContain("日本語");
  });

  it("renders Chinese labels under zh-CN locale", () => {
    setAppLocale("zh-CN");

    const wrapper = mount(LeadCreateModalBody, {
      global: { plugins: [i18n] },
    });

    const allText = wrapper.text();
    expect(allText).toContain("网站表单");
    expect(allText).toContain("高度人才");
    expect(allText).toContain("日语");
  });
});

describe("LeadCreateModalBody — contact validation hints", () => {
  const tPhoneHint = () =>
    i18n.global.t("leads.list.createModal.fields.invalidPhoneHint");
  const tEmailHint = () =>
    i18n.global.t("leads.list.createModal.fields.invalidEmailHint");

  it("shows invalid phone hint when phone is non-empty but invalid", () => {
    setAppLocale("zh-CN");
    const wrapper = mount(LeadCreateModalBody, {
      global: { plugins: [i18n] },
      props: {
        fields: { name: "T", phone: "+8190BAD01", email: "" } as never,
      },
    });

    expect(wrapper.text()).toContain(tPhoneHint());
  });

  it("shows invalid email hint when email is non-empty but invalid", () => {
    setAppLocale("zh-CN");
    const wrapper = mount(LeadCreateModalBody, {
      global: { plugins: [i18n] },
      props: {
        fields: {
          name: "T",
          phone: "",
          email: "not-an-email-address",
        } as never,
      },
    });

    expect(wrapper.text()).toContain(tEmailHint());
  });

  it("does not show invalid phone hint when phone is empty", () => {
    setAppLocale("zh-CN");
    const wrapper = mount(LeadCreateModalBody, {
      global: { plugins: [i18n] },
      props: {
        fields: { name: "T", phone: "", email: "good@example.com" } as never,
      },
    });

    expect(wrapper.text()).not.toContain(tPhoneHint());
  });
});
