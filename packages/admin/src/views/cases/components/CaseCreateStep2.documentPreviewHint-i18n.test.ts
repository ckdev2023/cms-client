import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { i18n, setAppLocale, type AppLocale } from "../../../i18n";
import CaseCreateStep2 from "./CaseCreateStep2.vue";

const originalLocale = i18n.global.locale.value as AppLocale;

function createModelStub() {
  return {
    primaryCustomer: { value: null },
    isFamilyBulkScenario: { value: false },
    familyApplicants: { value: [] },
    familySupporters: { value: [] },
    additionalParties: { value: [] },
    currentTemplate: { value: undefined },
    setPrimaryCustomer: vi.fn(),
    removeRelatedParty: vi.fn(),
  };
}

function mountStep2() {
  return mount(CaseCreateStep2, {
    attachTo: document.body,
    props: {
      model: createModelStub() as never,
      customerOptions: [],
      customersLoading: false,
      customersError: null,
      customersLoaded: true,
    },
    global: { plugins: [i18n] },
  });
}

describe("CaseCreateStep2 — documentPreviewHint i18n keywords", () => {
  beforeEach(() => {
    setAppLocale("zh-CN");
  });

  afterEach(() => {
    document.body.innerHTML = "";
    setAppLocale(originalLocale);
  });

  it("zh-CN hint mentions 日文官方名", () => {
    const wrapper = mountStep2();
    const hint = wrapper.find(".preview__hint").text();
    expect(hint).toContain("日文官方名");
  });

  it("ja-JP hint mentions 日本語の正式名称", async () => {
    const wrapper = mountStep2();
    setAppLocale("ja-JP");
    await wrapper.vm.$nextTick();
    const hint = wrapper.find(".preview__hint").text();
    expect(hint).toContain("日本語の正式名称");
  });

  it("en-US hint mentions Japanese official names", async () => {
    const wrapper = mountStep2();
    setAppLocale("en-US");
    await wrapper.vm.$nextTick();
    const hint = wrapper.find(".preview__hint").text();
    expect(hint).toContain("Japanese official names");
  });

  it("does not leak the raw i18n key in any locale", async () => {
    const RAW_KEY = "cases.create.step2.documentPreviewHint";
    const wrapper = mountStep2();
    for (const loc of ["zh-CN", "ja-JP", "en-US"] as const) {
      setAppLocale(loc);
      await wrapper.vm.$nextTick();
      const hint = wrapper.find(".preview__hint").text();
      expect(hint).not.toContain(RAW_KEY);
    }
  });
});
