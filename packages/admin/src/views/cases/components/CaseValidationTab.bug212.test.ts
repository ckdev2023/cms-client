import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import { createI18n } from "vue-i18n";
import CaseValidationTab from "./CaseValidationTab.vue";
import CaseValidationSupport from "./CaseValidationSupport.vue";
import { CASE_DETAIL_SAMPLES } from "../fixtures-detail";
import type { CaseDetail } from "../types-detail";

type Locale = "zh-CN" | "ja-JP" | "en-US";

const SHELL_MESSAGES: Record<
  Locale,
  { shell: { topbar: { comingSoon: string } } }
> = {
  "zh-CN": { shell: { topbar: { comingSoon: "建设中" } } },
  "ja-JP": { shell: { topbar: { comingSoon: "準備中" } } },
  "en-US": { shell: { topbar: { comingSoon: "Coming soon" } } },
};

const EXPECTED_TITLE: Record<Locale, string> = {
  "zh-CN": "建设中",
  "ja-JP": "準備中",
  "en-US": "Coming soon",
};

function makeI18n(locale: Locale) {
  return createI18n({
    legacy: false,
    locale,
    messages: SHELL_MESSAGES,
  });
}

function buildDetail(): CaseDetail {
  return {
    ...CASE_DETAIL_SAMPLES.work,
    riskConfirmationRecord: null,
  };
}

const TAB_STUBS = {
  Card: {
    template:
      '<section><header><slot name="header" /></header><slot /><footer><slot name="footer" /></footer></section>',
  },
  Button: {
    template: '<button v-bind="$attrs"><slot /></button>',
    inheritAttrs: true,
  },
  Chip: {
    template: '<span class="chip"><slot /></span>',
    props: ["tone", "size"],
  },
  CaseValidationSupport: { template: "<div />" },
};

const SUPPORT_STUBS = {
  Card: {
    template:
      '<section><header><slot name="header" /></header><slot /><footer><slot name="footer" /></footer></section>',
  },
  Button: {
    template: '<button v-bind="$attrs"><slot /></button>',
    inheritAttrs: true,
  },
  Chip: {
    template: '<span class="chip"><slot /></span>',
    props: ["tone", "size"],
  },
};

describe("BUG-212 — common.comingSoon i18n key spelling", () => {
  describe.each<Locale>(["zh-CN", "ja-JP", "en-US"])(
    "%s: CaseValidationTab disabled buttons resolve title",
    (locale) => {
      it("2 disabled buttons have correct translated title, not raw key", () => {
        const wrapper = mount(CaseValidationTab, {
          props: { detail: buildDetail(), readonly: false },
          global: { plugins: [makeI18n(locale)], stubs: TAB_STUBS },
        });

        const disabledButtons = wrapper
          .findAll("button")
          .filter((b) => b.attributes("disabled") !== undefined);

        expect(disabledButtons.length).toBeGreaterThanOrEqual(2);

        for (const btn of disabledButtons) {
          const title = btn.attributes("title") ?? "";
          expect(title).not.toBe("common.comingSoon");
          if (title) {
            expect(title).toBe(EXPECTED_TITLE[locale]);
          }
        }
      });
    },
  );

  describe.each<Locale>(["zh-CN", "ja-JP", "en-US"])(
    "%s: CaseValidationSupport disabled buttons resolve title",
    (locale) => {
      it("2 disabled buttons have correct translated title, not raw key", () => {
        const wrapper = mount(CaseValidationSupport, {
          props: { detail: buildDetail(), readonly: false },
          global: { plugins: [makeI18n(locale)], stubs: SUPPORT_STUBS },
        });

        const disabledButtons = wrapper
          .findAll("button")
          .filter((b) => b.attributes("disabled") !== undefined);

        expect(disabledButtons.length).toBeGreaterThanOrEqual(2);

        for (const btn of disabledButtons) {
          const title = btn.attributes("title") ?? "";
          expect(title).not.toBe("common.comingSoon");
          if (title) {
            expect(title).toBe(EXPECTED_TITLE[locale]);
          }
        }
      });
    },
  );
});
