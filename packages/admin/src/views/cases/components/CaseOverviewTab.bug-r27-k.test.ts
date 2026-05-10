// ── Test Ownership ──────────────────────────────────────────────
// Owner: R27-K — Overview secondary 按钮与 canRunValidation 的同步
//   当次按钮目标是「提交前检查」(validation) 时，canRunValidation=false
//   应 disabled + title「建设中」。指向其他 tab（如期限）时不应被该标志误禁用。
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

  it("secondary disable is gated by validation tab + canRunValidation", () => {
    expect(src).toContain('secondaryTab.value === "validation"');
    expect(src).toContain(':disabled="secondaryDisabled"');
  });

  it("secondary button has title referencing cases.detail.wip i18n key", () => {
    expect(src).toContain("cases.detail.wip");
  });

  it("wip title is bound via secondaryDisabledTitle computed", () => {
    expect(src).toContain(':title="secondaryDisabledTitle"');
    expect(src).toContain("secondaryDisabledTitle");
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
