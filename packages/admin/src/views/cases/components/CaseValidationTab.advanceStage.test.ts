import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import { createI18n } from "vue-i18n";
import CaseValidationTab from "./CaseValidationTab.vue";
import { CASE_DETAIL_SAMPLES } from "../fixtures-detail";
import type { CaseDetail, GateItem } from "../types-detail";
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

function buildDetail(
  stageCode: CaseDetail["stageCode"],
  overrides?: { blocking?: GateItem[]; retriggerNote?: string },
): CaseDetail {
  return {
    ...CASE_DETAIL_SAMPLES.work,
    stageCode,
    validation: {
      lastTime: "N/A",
      blocking: overrides?.blocking ?? [],
      warnings: [],
      info: [],
      retriggerNote: overrides?.retriggerNote,
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

const BLOCKER: GateItem = {
  gate: "A",
  label: "test blocker",
};

describe("CaseValidationTab — advance stage CTA", () => {
  it.each(["S1", "S2", "S3", "S4", "S5"] as const)(
    "stage=%s shows advance-stage button",
    (stage) => {
      const wrapper = mountTab(buildDetail(stage));
      expect(
        wrapper.find('[data-testid="advance-stage-button"]').exists(),
      ).toBe(true);
    },
  );

  it.each(["S6", "S7", "S8", "S9"] as const)(
    "stage=%s hides advance-stage button",
    (stage) => {
      const wrapper = mountTab(buildDetail(stage));
      expect(
        wrapper.find('[data-testid="advance-stage-button"]').exists(),
      ).toBe(false);
    },
  );

  it.each([
    ["S1", "S2"],
    ["S2", "S3"],
    ["S3", "S4"],
    ["S4", "S5"],
    ["S5", "S6"],
  ] as const)(
    "stage=%s button text references next stage %s",
    (stage, next) => {
      const wrapper = mountTab(buildDetail(stage));
      const btn = wrapper.find('[data-testid="advance-stage-button"]');
      expect(btn.text()).toContain(next);
    },
  );

  it("S1 button is enabled (no client-side gate)", async () => {
    const wrapper = mountTab(buildDetail("S1"));
    const btn = wrapper.find('[data-testid="advance-stage-button"]');
    expect((btn.element as HTMLButtonElement).disabled).toBe(false);
    await btn.trigger("click");
    const events = wrapper.emitted("advance-stage");
    expect(events).toBeTruthy();
    expect(events![0]).toEqual(["S2"]);
  });

  it("S5 with blockers → disabled + tooltip (zh-CN)", () => {
    const wrapper = mountTab(
      buildDetail("S5", { blocking: [BLOCKER] }),
      "zh-CN",
    );
    const btn = wrapper.find('[data-testid="advance-stage-button"]');
    expect((btn.element as HTMLButtonElement).disabled).toBe(true);
    expect(btn.attributes("title")).toBe(
      "存在未处理的阻断项，请先解决后再推进。",
    );
  });

  it("S5 with retriggerNote → disabled + stale tooltip (zh-CN)", () => {
    const wrapper = mountTab(
      buildDetail("S5", { retriggerNote: "some.note" }),
      "zh-CN",
    );
    const btn = wrapper.find('[data-testid="advance-stage-button"]');
    expect((btn.element as HTMLButtonElement).disabled).toBe(true);
    expect(btn.attributes("title")).toBe(
      "校验结果已过期，请重新检查后再推进。",
    );
  });

  it("S4 with blockers → disabled", () => {
    const wrapper = mountTab(buildDetail("S4", { blocking: [BLOCKER] }));
    const btn = wrapper.find('[data-testid="advance-stage-button"]');
    expect((btn.element as HTMLButtonElement).disabled).toBe(true);
  });

  it("S4 no blockers → enabled, emits advance-stage with S5", async () => {
    const wrapper = mountTab(buildDetail("S4"));
    const btn = wrapper.find('[data-testid="advance-stage-button"]');
    expect((btn.element as HTMLButtonElement).disabled).toBe(false);
    await btn.trigger("click");
    expect(wrapper.emitted("advance-stage")![0]).toEqual(["S5"]);
  });

  it("disabled button does not emit advance-stage", async () => {
    const wrapper = mountTab(buildDetail("S5", { blocking: [BLOCKER] }));
    const btn = wrapper.find('[data-testid="advance-stage-button"]');
    await btn.trigger("click");
    expect(wrapper.emitted("advance-stage")).toBeFalsy();
  });

  it("en-US blocker tooltip text", () => {
    const wrapper = mountTab(
      buildDetail("S5", { blocking: [BLOCKER] }),
      "en-US",
    );
    const btn = wrapper.find('[data-testid="advance-stage-button"]');
    expect(btn.attributes("title")).toBe(
      "There are unresolved blockers. Please resolve them before advancing.",
    );
  });

  it("ja-JP blocker tooltip text", () => {
    const wrapper = mountTab(
      buildDetail("S5", { blocking: [BLOCKER] }),
      "ja-JP",
    );
    const btn = wrapper.find('[data-testid="advance-stage-button"]');
    expect(btn.attributes("title")).toBe(
      "未処理のブロック項目があります。先に解決してから進めてください。",
    );
  });
});
