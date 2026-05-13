import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import { createI18n } from "vue-i18n";
import CaseValidationSupport from "./CaseValidationSupport.vue";
import { CASE_DETAIL_SAMPLES } from "../fixtures-detail";
import type { CaseDetail } from "../types-detail";
import casesZhCN from "../../../i18n/messages/cases/zh-CN";
import casesJaJP from "../../../i18n/messages/cases/ja-JP";
import casesEnUS from "../../../i18n/messages/cases/en-US";

type Locale = "zh-CN" | "ja-JP" | "en-US";

const FULL_MESSAGES = {
  "zh-CN": { cases: casesZhCN },
  "ja-JP": { cases: casesJaJP },
  "en-US": { cases: casesEnUS },
};

function makeI18n(locale: Locale) {
  return createI18n({ legacy: false, locale, messages: FULL_MESSAGES });
}

function buildDetail(reviewEnabled: boolean): CaseDetail {
  return {
    ...CASE_DETAIL_SAMPLES.work,
    caseType: "work",
    doubleReview: [],
    reviewEnabled,
    riskConfirmationRecord: null,
  };
}

function mountComponent(
  locale: Locale,
  detail: CaseDetail,
  opts: { readonly?: boolean; reviewLoading?: boolean } = {},
) {
  return mount(CaseValidationSupport, {
    props: {
      detail,
      readonly: opts.readonly ?? false,
      reviewLoading: opts.reviewLoading ?? false,
    },
    global: {
      plugins: [makeI18n(locale)],
      stubs: {
        Card: {
          template:
            "<section><header><slot name='header' /></header><slot /><footer><slot name='footer' /></footer></section>",
        },
        Button: {
          template:
            "<button :disabled='disabled' :title='title'><slot /></button>",
          props: ["disabled", "title", "size", "pill"],
        },
        Chip: {
          template: "<span class='chip'><slot /></span>",
          props: ["tone", "size"],
        },
      },
    },
  });
}

describe("R32-C CaseValidationSupport — review button reviewEnabled gate", () => {
  it("button is disabled with policy tooltip when reviewEnabled=false", () => {
    const wrapper = mountComponent("zh-CN", buildDetail(false));
    const buttons = wrapper.findAll("button");
    const reviewBtn = buttons.find((b) => b.text().includes("发起复核"));
    expect(reviewBtn).toBeDefined();
    expect(reviewBtn!.attributes("disabled")).toBe("");
    expect(reviewBtn!.attributes("title")).toBe("事务所未启用双人复核");
  });

  it("button is enabled when reviewEnabled=true", () => {
    const wrapper = mountComponent("zh-CN", buildDetail(true));
    const buttons = wrapper.findAll("button");
    const reviewBtn = buttons.find((b) => b.text().includes("发起复核"));
    expect(reviewBtn).toBeDefined();
    expect(reviewBtn!.attributes("disabled")).toBeUndefined();
  });

  it("button is disabled during loading even when reviewEnabled=true", () => {
    const wrapper = mountComponent("zh-CN", buildDetail(true), {
      reviewLoading: true,
    });
    const buttons = wrapper.findAll("button");
    const reviewBtn = buttons.find((b) => b.text().includes("发起复核"));
    expect(reviewBtn).toBeDefined();
    expect(reviewBtn!.attributes("disabled")).toBe("");
  });

  it("emits start-review on click when reviewEnabled=true", async () => {
    const wrapper = mountComponent("zh-CN", buildDetail(true));
    const buttons = wrapper.findAll("button");
    const reviewBtn = buttons.find((b) => b.text().includes("发起复核"));
    await reviewBtn!.trigger("click");
    expect(wrapper.emitted("start-review")).toHaveLength(1);
  });

  it("does not emit start-review on click when reviewEnabled=false", async () => {
    const wrapper = mountComponent("zh-CN", buildDetail(false));
    const buttons = wrapper.findAll("button");
    const reviewBtn = buttons.find((b) => b.text().includes("发起复核"));
    await reviewBtn!.trigger("click");
    expect(wrapper.emitted("start-review")).toBeUndefined();
  });

  it("en-US: shows English policy tooltip when disabled", () => {
    const wrapper = mountComponent("en-US", buildDetail(false));
    const buttons = wrapper.findAll("button");
    const reviewBtn = buttons.find((b) => b.text().includes("Start Review"));
    expect(reviewBtn).toBeDefined();
    expect(reviewBtn!.attributes("title")).toBe(
      "Two-person review is not enabled for this office",
    );
  });

  it("ja-JP: shows Japanese policy tooltip when disabled", () => {
    const wrapper = mountComponent("ja-JP", buildDetail(false));
    const buttons = wrapper.findAll("button");
    const reviewBtn = buttons.find((b) => b.text().includes("レビューを開始"));
    expect(reviewBtn).toBeDefined();
    expect(reviewBtn!.attributes("title")).toBe(
      "事務所で二人レビューが有効化されていません",
    );
  });

  it("button is not rendered in readonly mode", () => {
    const wrapper = mountComponent("zh-CN", buildDetail(true), {
      readonly: true,
    });
    const buttons = wrapper.findAll("button");
    const reviewBtn = buttons.find((b) => b.text().includes("发起复核"));
    expect(reviewBtn).toBeUndefined();
  });
});
