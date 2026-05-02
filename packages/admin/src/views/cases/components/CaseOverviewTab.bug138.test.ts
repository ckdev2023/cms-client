// ── Test Ownership ──────────────────────────────────────────────
// Owner: BUG-138 — `CaseDetailView` 概览页"下一关键动作"区两个按钮 label
//   必须经 i18n 翻译，禁止把 adapter 输出的 i18n key 字面 (`cases.coach.docManagement`
//   / `cases.coach.runValidation`) 直接当文案显示。
// Locks: 复刻视图侧 `t(detail.overviewActions.primary.label)` /
//   `t(detail.overviewActions.secondary.label)` 解析合约，覆盖 zh-CN / en-US / ja-JP，
//   并锁定三语 i18n 资源中 `cases.coach.docManagement` / `cases.coach.runValidation`
//   两条 key 必须存在且值非空、与 raw key 不同。
// Does NOT test: 真实 mount `CaseOverviewTab.vue`（依赖 detail mock + emit 链路），
//   亦不测试按钮 click → switchTab 的事件流。
// Rationale: 第十二轮走查发现切到 EN/JA 后两按钮均直显 raw key
//   `cases.coach.docManagement` / `cases.coach.runValidation`，原因是模板用
//   `{{ detail.overviewActions.primary.label }}` 直插，未走 `t()`。修复方向为
//   显式 `t(detail.overviewActions.primary.label)` 并保证三语资源已注册。
// ────────────────────────────────────────────────────────────────

import { describe, it, expect } from "vitest";
import { createI18n } from "vue-i18n";
import casesZhCN from "../../../i18n/messages/cases/zh-CN";
import casesJaJP from "../../../i18n/messages/cases/ja-JP";
import casesEnUS from "../../../i18n/messages/cases/en-US";

type Locale = "zh-CN" | "ja-JP" | "en-US";

const FULL_MESSAGES = {
  "zh-CN": { cases: casesZhCN },
  "ja-JP": { cases: casesJaJP },
  "en-US": { cases: casesEnUS },
};

const COACH_KEYS = [
  "cases.coach.docManagement",
  "cases.coach.runValidation",
] as const;

function makeI18n(locale: Locale) {
  return createI18n({ legacy: false, locale, messages: FULL_MESSAGES });
}

function resolveCoachLabel(key: string, locale: Locale): string {
  const i18n = makeI18n(locale);
  return i18n.global.t.bind(i18n.global)(key);
}

describe("CaseOverviewTab BUG-138 — 下一关键动作按钮 label 走 i18n", () => {
  describe("三语 i18n 资源必须注册 cases.coach.{docManagement,runValidation}", () => {
    for (const locale of ["zh-CN", "en-US", "ja-JP"] as const) {
      for (const key of COACH_KEYS) {
        it(`${locale} × ${key} → 解析为非空文案且不等于 raw key`, () => {
          const label = resolveCoachLabel(key, locale);
          expect(label).toBeTruthy();
          expect(label).not.toBe(key);
          expect(label).not.toMatch(/^cases\.coach\./);
        });
      }
    }
  });

  describe("zh-CN / en-US / ja-JP 三语文案锁定（避免回归到 raw key）", () => {
    it("zh-CN: docManagement → 资料管理 / runValidation → 执行检查", () => {
      expect(resolveCoachLabel("cases.coach.docManagement", "zh-CN")).toBe(
        "资料管理",
      );
      expect(resolveCoachLabel("cases.coach.runValidation", "zh-CN")).toBe(
        "执行检查",
      );
    });

    it("en-US: docManagement → Document management / runValidation → Run validation", () => {
      expect(resolveCoachLabel("cases.coach.docManagement", "en-US")).toBe(
        "Document management",
      );
      expect(resolveCoachLabel("cases.coach.runValidation", "en-US")).toBe(
        "Run validation",
      );
    });

    it("ja-JP: docManagement → 資料管理 / runValidation → 検証実行", () => {
      expect(resolveCoachLabel("cases.coach.docManagement", "ja-JP")).toBe(
        "資料管理",
      );
      expect(resolveCoachLabel("cases.coach.runValidation", "ja-JP")).toBe(
        "検証実行",
      );
    });
  });
});
