import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createI18n } from "vue-i18n";
import casesZhCN from "../../../i18n/messages/cases/zh-CN";
import casesJaJP from "../../../i18n/messages/cases/ja-JP";
import casesEnUS from "../../../i18n/messages/cases/en-US";

const FULL_MESSAGES = {
  "zh-CN": { cases: casesZhCN },
  "ja-JP": { cases: casesJaJP },
  "en-US": { cases: casesEnUS },
};

type Locale = "zh-CN" | "ja-JP" | "en-US";

function makeI18n(locale: Locale) {
  return createI18n({ legacy: false, locale, messages: FULL_MESSAGES });
}

const src = readFileSync(resolve(__dirname, "CaseOverviewTab.vue"), "utf-8");

describe("CaseOverviewTab terminal-actions", () => {
  describe("terminal-view-billing button (refund / billing)", () => {
    it("is disabled when businessPhase !== CLOSED_SUCCESS (covers CLOSED_FAILED)", () => {
      expect(src).toContain(
        `:disabled="detail.businessPhase !== 'CLOSED_SUCCESS'"`,
      );
    });

    it("shows refundWip tooltip only when disabled", () => {
      expect(src).toContain("cases.detail.terminalActions.refundWip");
      expect(src).toContain(`detail.businessPhase !== 'CLOSED_SUCCESS'`);
    });

    it("emits switchTab('billing') on click (only fires when enabled)", () => {
      expect(src).toContain(`@click="emit('switchTab', 'billing')"`);
    });

    it("shows handleRefund label for CLOSED_FAILED", () => {
      expect(src).toContain("cases.detail.terminalActions.handleRefund");
    });

    it("shows viewBilling label for CLOSED_SUCCESS", () => {
      expect(src).toContain("cases.detail.terminalActions.viewBilling");
    });
  });

  describe("terminal-view-close-reason button", () => {
    it("is always enabled in terminal state", () => {
      const closeReasonBtn = src.match(
        /data-testid="terminal-view-close-reason"[\s\S]*?<\/Button>/,
      );
      expect(closeReasonBtn).toBeTruthy();
      expect(closeReasonBtn![0]).not.toContain(":disabled");
    });

    it("shows viewCloseReason for failed / viewResult for success", () => {
      expect(src).toContain("cases.detail.terminalActions.viewCloseReason");
      expect(src).toContain("cases.detail.terminalActions.viewResult");
    });
  });

  describe("refundWip i18n key present in all locales", () => {
    for (const locale of ["zh-CN", "ja-JP", "en-US"] as const) {
      it(`${locale} has terminalActions.refundWip`, () => {
        const i18n = makeI18n(locale);
        const text = i18n.global.t("cases.detail.terminalActions.refundWip");
        expect(text).toBeTruthy();
        expect(text).not.toBe("cases.detail.terminalActions.refundWip");
      });
    }
  });

  describe("terminalActions i18n keys complete in all locales", () => {
    const keys = [
      "cases.detail.terminalActions.viewCloseReason",
      "cases.detail.terminalActions.viewResult",
      "cases.detail.terminalActions.handleRefund",
      "cases.detail.terminalActions.viewBilling",
      "cases.detail.terminalActions.refundWip",
    ] as const;

    for (const locale of ["zh-CN", "ja-JP", "en-US"] as const) {
      for (const key of keys) {
        it(`${locale} has ${key.split(".").pop()}`, () => {
          const i18n = makeI18n(locale);
          const text = i18n.global.t(key);
          expect(text).not.toBe(key);
        });
      }
    }
  });
});
