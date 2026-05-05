// ── Test Ownership ──────────────────────────────────────────────
// Owner: R27-K — Overview "执行检查" button disable 同步 canRunValidation
//   非终态下一关键动作区的 secondary 按钮（执行检查 / runValidation）
//   应当在 canRunValidation=false 时 disabled + title 显示"建设中"。
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

describe("R27-K: overview runValidation button disabled sync", () => {
  const src = readFileSync(
    resolve(__dirname, "CaseOverviewNextAction.vue"),
    "utf-8",
  );

  it("canRunValidation prop is declared", () => {
    expect(src).toContain("canRunValidation");
  });

  it("secondary button is disabled when canRunValidation is false", () => {
    expect(src).toContain(`:disabled="!props.canRunValidation"`);
  });

  it("secondary button has title referencing cases.detail.wip i18n key", () => {
    expect(src).toContain("cases.detail.wip");
  });

  it("title is only set when canRunValidation is false", () => {
    expect(src).toContain("props.canRunValidation ? undefined");
  });

  describe("cases.detail.wip i18n key exists in all locales", () => {
    for (const locale of ["zh-CN", "en-US", "ja-JP"] as const) {
      it(`${locale} has detail.wip`, () => {
        const i18n = makeI18n(locale);
        const text = i18n.global.t("cases.detail.wip");
        expect(text).toBeTruthy();
        expect(text).not.toBe("cases.detail.wip");
      });
    }
  });

  describe("CaseDetailView passes canRunValidation=false", () => {
    const viewSrc = readFileSync(
      resolve(__dirname, "../CaseDetailView.vue"),
      "utf-8",
    );

    it("CaseDetailView passes :can-run-validation to CaseOverviewTab", () => {
      expect(viewSrc).toContain(`:can-run-validation="false"`);
    });
  });
});
