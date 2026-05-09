import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import { createI18n } from "vue-i18n";
import CaseValidationTab from "./CaseValidationTab.vue";
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

function makeI18n(locale: Locale = "zh-CN") {
  return createI18n({ legacy: false, locale, messages: FULL_MESSAGES });
}

const BUTTON_STUB = {
  template: `<button :disabled="disabled" :title="title" @click="$emit('click')"><slot /></button>`,
  emits: ["click"],
  props: ["variant", "tone", "size", "disabled", "ariaBusy", "title"],
};

function buildDetail(stageCode: CaseDetail["stageCode"]): CaseDetail {
  return {
    ...CASE_DETAIL_SAMPLES.work,
    stageCode,
    validation: {
      lastTime: "N/A",
      blocking: [],
      warnings: [],
      info: [],
    },
    submissionPackages: [],
    correctionPackage: null,
  };
}

function mountTab(detail: CaseDetail, locale: Locale = "zh-CN") {
  return mount(CaseValidationTab, {
    props: { detail, readonly: false },
    global: {
      plugins: [makeI18n(locale)],
      stubs: {
        Card: {
          template:
            "<section><header><slot name='header' /></header><slot /><footer><slot name='footer' /></footer></section>",
        },
        Button: BUTTON_STUB,
        Chip: {
          template: "<span class='chip'><slot /></span>",
          props: ["tone", "size"],
        },
        CaseValidationSupport: { template: "<div />" },
      },
    },
  });
}

describe("CaseValidationTab — submission package stage gate", () => {
  it.each([
    ["S1", true],
    ["S2", true],
    ["S3", true],
    ["S4", true],
    ["S5", true],
    ["S6", false],
    ["S7", false],
    ["S8", true],
    ["S9", true],
  ] as const)(
    "stage=%s -> create button disabled=%s (does not emit on click)",
    async (stage, expectDisabled) => {
      const wrapper = mountTab(buildDetail(stage));
      const btn = wrapper.find('[data-testid="sp-create-button"]');
      expect(btn.exists()).toBe(true);
      expect((btn.element as HTMLButtonElement).disabled).toBe(expectDisabled);

      await btn.trigger("click");
      const events = wrapper.emitted("create-submission-package");
      if (expectDisabled) {
        expect(events).toBeFalsy();
      } else {
        expect(events).toBeTruthy();
      }
    },
  );

  it("renders zh-CN tooltip when stage gates the action", () => {
    const wrapper = mountTab(buildDetail("S1"), "zh-CN");
    const btn = wrapper.find('[data-testid="sp-create-button"]');
    expect(btn.attributes("title")).toBe(
      "仅当案件进入 S6（提交准备）或 S7（已提交）阶段后才能创建提交包。",
    );
  });

  it("renders en-US tooltip when stage gates the action", () => {
    const wrapper = mountTab(buildDetail("S1"), "en-US");
    const btn = wrapper.find('[data-testid="sp-create-button"]');
    expect(btn.attributes("title")).toBe(
      "Submission packages can only be created once the case reaches S6 (submission prep) or S7 (submitted).",
    );
  });

  it("renders ja-JP tooltip when stage gates the action", () => {
    const wrapper = mountTab(buildDetail("S1"), "ja-JP");
    const btn = wrapper.find('[data-testid="sp-create-button"]');
    expect(btn.attributes("title")).toBe(
      "案件が S6（提出準備）または S7（提出済）に到達してからパッケージを作成できます。",
    );
  });

  it("S6/S7 stage has no tooltip (button is enabled, click emits event)", async () => {
    const wrapper = mountTab(buildDetail("S6"));
    const btn = wrapper.find('[data-testid="sp-create-button"]');
    expect((btn.element as HTMLButtonElement).disabled).toBe(false);
    expect(btn.attributes("title")).toBeUndefined();
    await btn.trigger("click");
    expect(wrapper.emitted("create-submission-package")).toBeTruthy();
  });
});
