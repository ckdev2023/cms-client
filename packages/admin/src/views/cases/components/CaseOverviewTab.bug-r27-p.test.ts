// ── Test Ownership ──────────────────────────────────────────────
// Owner: R27-P — 终态退款按钮占位方案
//   CLOSED_FAILED 下"处理退款"按钮 disabled + title 显示"建设中"；
//   CLOSED_SUCCESS 下"查看收费详情"按钮保持可用。
// ────────────────────────────────────────────────────────────────

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

describe("R27-P: terminal refund button placeholder", () => {
  const src = readFileSync(resolve(__dirname, "CaseOverviewTab.vue"), "utf-8");

  it("refund button is disabled when businessPhase !== CLOSED_SUCCESS", () => {
    expect(src).toContain(
      `:disabled="detail.businessPhase !== 'CLOSED_SUCCESS'"`,
    );
  });

  it("refund button has title tooltip referencing refundWip i18n key", () => {
    expect(src).toContain("cases.detail.terminalActions.refundWip");
  });

  it("title is only set when businessPhase !== CLOSED_SUCCESS", () => {
    expect(src).toContain(`detail.businessPhase !== 'CLOSED_SUCCESS'`);
  });

  describe("refundWip i18n key exists in all locales", () => {
    for (const locale of ["zh-CN", "en-US", "ja-JP"] as const) {
      it(`${locale} has terminalActions.refundWip`, () => {
        const i18n = makeI18n(locale);
        const text = i18n.global.t("cases.detail.terminalActions.refundWip");
        expect(text).toBeTruthy();
        expect(text).not.toBe("cases.detail.terminalActions.refundWip");
      });
    }
  });

  describe("terminalNextAction.failed no longer promises refund handling", () => {
    for (const locale of ["zh-CN", "en-US", "ja-JP"] as const) {
      it(`${locale} terminalNextAction.failed does not contain refund promise`, () => {
        const i18n = makeI18n(locale);
        const text = i18n.global.t("cases.detail.terminalNextAction.failed");
        expect(text.toLowerCase()).not.toContain("refund requires");
        expect(text).not.toContain("退款待人工处理");
        expect(text).not.toContain("返金は手動対応");
      });
    }
  });
});
