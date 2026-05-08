import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import { createI18n, type I18n } from "vue-i18n";
import CaseValidationTab from "./CaseValidationTab.vue";
import { CASE_DETAIL_SAMPLES } from "../fixtures-detail";
import type { CaseDetail, ValidationData } from "../types-detail";
import casesZhCN from "../../../i18n/messages/cases/zh-CN";
import casesJaJP from "../../../i18n/messages/cases/ja-JP";
import casesEnUS from "../../../i18n/messages/cases/en-US";

const FULL_MESSAGES = {
  "zh-CN": { cases: casesZhCN },
  "ja-JP": { cases: casesJaJP },
  "en-US": { cases: casesEnUS },
};

type Locale = "zh-CN" | "en-US" | "ja-JP";

function makeI18n(locale: Locale): I18n {
  return createI18n({
    legacy: false,
    locale,
    messages: FULL_MESSAGES,
  });
}

function buildValidation(
  overrides: Partial<ValidationData> = {},
): ValidationData {
  return {
    lastTime: "2026/05/07 14:30",
    blocking: [],
    warnings: [],
    info: [],
    ...overrides,
  };
}

function buildDetail(validation: ValidationData): CaseDetail {
  return {
    ...CASE_DETAIL_SAMPLES.work,
    validation,
    submissionPackages: [],
    correctionPackage: null,
  };
}

function mountTab(locale: Locale, validation: ValidationData) {
  return mount(CaseValidationTab, {
    props: {
      detail: buildDetail(validation),
      readonly: false,
      rerunLoading: false,
      rerunError: null,
    },
    global: {
      plugins: [makeI18n(locale)],
      stubs: {
        Card: {
          template:
            '<section><header><slot name="header" /></header><slot /><footer><slot name="footer" /></footer></section>',
        },
        Button: {
          template: '<button :disabled="disabled"><slot /></button>',
          props: ["disabled", "ariaBusy", "variant", "tone", "size", "title"],
        },
        Chip: {
          template: "<span class='chip'><slot /></span>",
          props: ["tone", "size"],
        },
        GateItem: { template: "<div />" },
        CaseValidationSupport: { template: "<div />" },
      },
    },
  });
}

describe("CaseValidationTab lastTime precision (locale-aware)", () => {
  const ISO_TIMESTAMP = "2026-05-07T14:30:00.000Z";

  describe("when lastTimeIso is provided — renders locale-formatted time with :", () => {
    it("zh-CN: contains colon (HH:mm) and no raw ISO T", () => {
      const wrapper = mountTab(
        "zh-CN",
        buildValidation({ lastTimeIso: ISO_TIMESTAMP }),
      );
      const html = wrapper.html();
      expect(html).toContain(":");
      expect(html).not.toContain("T14:30:00");
    });

    it("ja-JP: contains colon (HH:mm) and no raw ISO T", () => {
      const wrapper = mountTab(
        "ja-JP",
        buildValidation({ lastTimeIso: ISO_TIMESTAMP }),
      );
      const html = wrapper.html();
      expect(html).toContain(":");
      expect(html).not.toContain("T14:30:00");
    });

    it("en-US: contains colon (HH:mm) and no raw ISO T", () => {
      const wrapper = mountTab(
        "en-US",
        buildValidation({ lastTimeIso: ISO_TIMESTAMP }),
      );
      const html = wrapper.html();
      expect(html).toContain(":");
      expect(html).not.toContain("T14:30:00");
    });
  });

  describe("when lastTimeIso is missing — falls back to lastTime", () => {
    it("renders the raw lastTime string", () => {
      const wrapper = mountTab(
        "zh-CN",
        buildValidation({ lastTime: "2026/05/07 14:30" }),
      );
      const html = wrapper.html();
      expect(html).toContain("2026/05/07 14:30");
    });

    it("no lastTimeIso and empty lastTime → renders empty or whitespace", () => {
      const wrapper = mountTab(
        "zh-CN",
        buildValidation({ lastTime: "", lastTimeIso: undefined }),
      );
      const lastTimeEl = wrapper.find(".vt__last-time");
      if (lastTimeEl.exists()) {
        expect(lastTimeEl.text().trim()).toBe("");
      }
    });
  });

  describe("when lastTimeIso is invalid — falls back to lastTime", () => {
    it("invalid ISO string → falls back to lastTime", () => {
      const wrapper = mountTab(
        "en-US",
        buildValidation({
          lastTime: "2026/05/07 14:30",
          lastTimeIso: "not-a-date",
        }),
      );
      const html = wrapper.html();
      expect(html).toContain("2026/05/07 14:30");
    });
  });
});
