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

function buildDetail(phase: string): CaseDetail {
  return {
    ...CASE_DETAIL_SAMPLES.work,
    businessPhase: phase,
    doubleReview: [],
    reviewEnabled: false,
    riskConfirmationRecord: null,
  };
}

function mountSupport(locale: Locale, detail: CaseDetail) {
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

function getPostApprovalNote(locale: Locale, phase: string): string {
  return mountSupport(locale, buildDetail(phase))
    .find(".valsup__post-note")
    .text();
}

const POST_APPROVAL_KEYS = [
  "notePreSubmission",
  "notePostSubmission",
  "noteAwaitingCoe",
  "noteAwaitingVisaStamp",
  "noteCompleted",
] as const;

describe("CaseValidationSupport — coeNoteKeySuffix phase-text mapping", () => {
  describe("i18n dictionaries completeness", () => {
    const dicts: Record<Locale, Record<string, unknown>> = {
      "zh-CN": casesZhCN.detail.validation.postApproval,
      "ja-JP": casesJaJP.detail.validation.postApproval,
      "en-US": casesEnUS.detail.validation.postApproval,
    };

    for (const key of POST_APPROVAL_KEYS) {
      it(`all 3 locales define postApproval.${key}`, () => {
        for (const locale of ["zh-CN", "ja-JP", "en-US"] as Locale[]) {
          const val = dicts[locale][key];
          expect(val, `${locale} missing ${key}`).toBeDefined();
          expect(typeof val, `${locale} ${key} should be string`).toBe(
            "string",
          );
          expect(
            (val as string).length,
            `${locale} ${key} should not be empty`,
          ).toBeGreaterThan(0);
        }
      });
    }
  });

  describe("pre-submission phases → notePreSubmission", () => {
    const phases = [
      "CONSULTING",
      "CONTRACTED",
      "WAITING_MATERIAL",
      "MATERIAL_PREPARING",
      "REVIEWING",
      "APPLYING",
    ];

    for (const phase of phases) {
      it(`${phase} → notePreSubmission (zh-CN)`, () => {
        const text = getPostApprovalNote("zh-CN", phase);
        expect(text).toContain("提交前或补正处理阶段");
      });
    }
  });

  describe("post-submission phases → notePostSubmission", () => {
    const phases = ["UNDER_REVIEW", "NEED_SUPPLEMENT", "SUPPLEMENT_PROCESSING"];

    for (const phase of phases) {
      it(`${phase} → notePostSubmission (zh-CN)`, () => {
        const text = getPostApprovalNote("zh-CN", phase);
        expect(text).toContain("已提交至入管局");
      });
    }
  });

  describe("awaiting-COE phases → noteAwaitingCoe", () => {
    const phases = ["APPROVED", "REJECTED", "WAITING_PAYMENT"];

    for (const phase of phases) {
      it(`${phase} → noteAwaitingCoe (zh-CN)`, () => {
        const text = getPostApprovalNote("zh-CN", phase);
        expect(text).toContain("已获批准");
        expect(text).toContain("COE");
      });
    }

    it("WAITING_PAYMENT → noteAwaitingCoe (ja-JP)", () => {
      const text = getPostApprovalNote("ja-JP", "WAITING_PAYMENT");
      expect(text).toContain("許可済み");
      expect(text).toContain("COE");
    });

    it("WAITING_PAYMENT → noteAwaitingCoe (en-US)", () => {
      const text = getPostApprovalNote("en-US", "WAITING_PAYMENT");
      expect(text).toContain("approved");
      expect(text).toContain("COE");
    });
  });

  describe("awaiting-visa-stamp phases → noteAwaitingVisaStamp", () => {
    const phases = ["COE_SENT", "VISA_APPLYING", "VISA_REJECTED"];

    for (const phase of phases) {
      it(`${phase} → noteAwaitingVisaStamp (zh-CN)`, () => {
        const text = getPostApprovalNote("zh-CN", phase);
        expect(text).toContain("COE 已发送");
      });
    }

    it("COE_SENT → noteAwaitingVisaStamp (ja-JP)", () => {
      const text = getPostApprovalNote("ja-JP", "COE_SENT");
      expect(text).toContain("COE は送付済み");
    });

    it("COE_SENT → noteAwaitingVisaStamp (en-US)", () => {
      const text = getPostApprovalNote("en-US", "COE_SENT");
      expect(text).toContain("COE has been dispatched");
    });
  });

  describe("completed phases → noteCompleted", () => {
    const phases = [
      "SUCCESS",
      "ENTRY_SUCCESS",
      "RESIDENCE_PERIOD_RECORDED",
      "RENEWAL_REMINDER_SCHEDULED",
      "CLOSED_SUCCESS",
      "CLOSED_FAILED",
    ];

    for (const phase of phases) {
      it(`${phase} → noteCompleted (zh-CN)`, () => {
        const text = getPostApprovalNote("zh-CN", phase);
        expect(text).toContain("已完成");
      });
    }

    it("CLOSED_SUCCESS → noteCompleted (ja-JP)", () => {
      const text = getPostApprovalNote("ja-JP", "CLOSED_SUCCESS");
      expect(text).toContain("完了");
    });

    it("CLOSED_SUCCESS → noteCompleted (en-US)", () => {
      const text = getPostApprovalNote("en-US", "CLOSED_SUCCESS");
      expect(text).toContain("complete");
    });
  });

  describe("unknown phase falls through to notePreSubmission", () => {
    it("SOME_UNKNOWN_PHASE → notePreSubmission (zh-CN)", () => {
      const text = getPostApprovalNote("zh-CN", "SOME_UNKNOWN_PHASE");
      expect(text).toContain("提交前或补正处理阶段");
    });
  });
});
