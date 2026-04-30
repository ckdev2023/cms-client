// ── Test Ownership ──────────────────────────────────────────────
// Owner: BUG-144 — 建案向导 Step 1 模板按钮副标题必须三语齐备，
//   避免 en-US / ja-JP 下回退到 zh-CN 字面。
// 锁定：每个 CaseTemplateDef.subtitle 必须是 I18nLabel（zh/en/ja 全部非空），
//   并且 zh-CN 与 en-US 解析结果必须不同（防止伪 I18nLabel：三语都填中文）。
// Does NOT test: 标题派生（BUG-149）、ApplicationType 拼接、Step 1 渲染层。
// ────────────────────────────────────────────────────────────────

import { describe, expect, it } from "vitest";
import { SAMPLE_CREATE_TEMPLATES } from "./fixtures";
import { resolveTemplateLabel } from "./types-create";
import type { I18nLabel } from "./types-create";

describe("CaseTemplateDef.subtitle i18n (BUG-144)", () => {
  it("每个模板 subtitle 都是 I18nLabel 对象，且 zh/en/ja 非空", () => {
    for (const tmpl of SAMPLE_CREATE_TEMPLATES) {
      expect(
        typeof tmpl.subtitle,
        `template ${tmpl.id} subtitle must be I18nLabel object, not raw string`,
      ).toBe("object");
      const subtitle = tmpl.subtitle as I18nLabel;
      expect(
        subtitle.zh,
        `template ${tmpl.id} subtitle.zh missing`,
      ).toBeTruthy();
      expect(
        subtitle.en,
        `template ${tmpl.id} subtitle.en missing`,
      ).toBeTruthy();
      expect(
        subtitle.ja,
        `template ${tmpl.id} subtitle.ja missing`,
      ).toBeTruthy();
    }
  });

  it("每个模板 subtitle 在 zh-CN 与 en-US 下解析为不同文本（防止三语全中文）", () => {
    for (const tmpl of SAMPLE_CREATE_TEMPLATES) {
      const zh = resolveTemplateLabel(tmpl.subtitle, "zh-CN");
      const en = resolveTemplateLabel(tmpl.subtitle, "en-US");
      expect(en, `template ${tmpl.id} en-US subtitle empty`).toBeTruthy();
      expect(
        zh === en,
        `template ${tmpl.id} subtitle did not localize between zh-CN and en-US (${zh})`,
      ).toBe(false);
    }
  });

  it("每个模板 subtitle 在所有 3 个 locale 下都解析为非空字符串", () => {
    for (const tmpl of SAMPLE_CREATE_TEMPLATES) {
      for (const loc of ["zh-CN", "en-US", "ja-JP"] as const) {
        const resolved = resolveTemplateLabel(tmpl.subtitle, loc);
        expect(
          resolved,
          `template ${tmpl.id} subtitle empty for locale ${loc}`,
        ).toBeTruthy();
        expect(typeof resolved).toBe("string");
      }
    }
  });
});
