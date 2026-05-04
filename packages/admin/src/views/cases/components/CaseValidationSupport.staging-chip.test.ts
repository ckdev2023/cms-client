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

const NOT_REACHED: Record<Locale, string> = {
  "zh-CN": "当前案件未到该阶段",
  "ja-JP": "この案件はまだ当該段階に達していません",
  "en-US": "Case has not reached this stage",
};

function makeI18n(locale: Locale) {
  return createI18n({ legacy: false, locale, messages: FULL_MESSAGES });
}

function buildDetail(phase: string): CaseDetail {
  return {
    ...CASE_DETAIL_SAMPLES.work,
    businessPhase: phase,
    doubleReview: [],
    riskConfirmationRecord: null,
  };
}

function mountComponent(locale: Locale, detail: CaseDetail) {
  return mount(CaseValidationSupport, {
    props: { detail, readonly: false },
    global: {
      plugins: [makeI18n(locale)],
      stubs: {
        Card: {
          template:
            '<section><header><slot name="header" /></header><slot /><footer><slot name="footer" /></footer></section>',
        },
        Button: { template: "<button><slot /></button>" },
        Chip: {
          template: '<span class="chip"><slot /></span>',
          props: ["tone", "size"],
        },
      },
    },
  });
}

const LOCALES: Locale[] = ["zh-CN", "ja-JP", "en-US"];

describe("CaseValidationSupport — stagingChip conditional rendering (R30-P)", () => {
  describe("pre-submission phases show 'not reached' chip", () => {
    const prePhases = ["APPLYING", "WAITING_MATERIAL", "CONSULTING"];

    for (const phase of prePhases) {
      for (const locale of LOCALES) {
        it(`${phase} ${locale} → chip visible`, () => {
          const html = mountComponent(locale, buildDetail(phase)).html();
          expect(html).toContain(NOT_REACHED[locale]);
        });
      }
    }
  });

  describe("post-submission phases hide 'not reached' chip", () => {
    const postPhases = [
      "UNDER_REVIEW",
      "NEED_SUPPLEMENT",
      "SUPPLEMENT_PROCESSING",
    ];

    for (const phase of postPhases) {
      for (const locale of LOCALES) {
        it(`${phase} ${locale} → chip hidden`, () => {
          const html = mountComponent(locale, buildDetail(phase)).html();
          expect(html).not.toContain(NOT_REACHED[locale]);
        });
      }
    }
  });

  describe("awaiting-COE phases hide 'not reached' chip (no contradiction with approved)", () => {
    const coePhases = ["APPROVED", "REJECTED", "WAITING_PAYMENT"];

    for (const phase of coePhases) {
      for (const locale of LOCALES) {
        it(`${phase} ${locale} → chip hidden`, () => {
          const html = mountComponent(locale, buildDetail(phase)).html();
          expect(html).not.toContain(NOT_REACHED[locale]);
        });
      }
    }
  });

  describe("awaiting-visa phases hide 'not reached' chip", () => {
    const visaPhases = ["COE_SENT", "VISA_APPLYING", "VISA_REJECTED"];

    for (const phase of visaPhases) {
      for (const locale of LOCALES) {
        it(`${phase} ${locale} → chip hidden`, () => {
          const html = mountComponent(locale, buildDetail(phase)).html();
          expect(html).not.toContain(NOT_REACHED[locale]);
        });
      }
    }
  });

  describe("completed phases hide 'not reached' chip", () => {
    const completedPhases = ["CLOSED_SUCCESS", "CLOSED_FAILED", "SUCCESS"];

    for (const phase of completedPhases) {
      for (const locale of LOCALES) {
        it(`${phase} ${locale} → chip hidden`, () => {
          const html = mountComponent(locale, buildDetail(phase)).html();
          expect(html).not.toContain(NOT_REACHED[locale]);
        });
      }
    }
  });
});
