import { describe, expect, it } from "vitest";
import zhCN from "./messages/zh-CN";
import jaJP from "./messages/ja-JP";

function collectValues(
  obj: Record<string, unknown>,
  prefix = "",
): Array<{ key: string; value: string }> {
  const entries: Array<{ key: string; value: string }> = [];
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      entries.push(...collectValues(v as Record<string, unknown>, path));
    } else if (typeof v === "string") {
      entries.push({ key: path, value: v });
    }
  }
  return entries;
}

const ZH_CN_FORBIDDEN_GLYPHS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /文書/, label: "文書 (should be 文书)" },
  { pattern: /書類/, label: "書類 (should be 书类)" },
  { pattern: /関連/, label: "関連 (should be 关联)" },
  { pattern: /検証/, label: "検証 (should be 检证/检验)" },
  { pattern: /経営/, label: "経営 (should be 经营)" },
];

const JA_JP_FORBIDDEN_GLYPHS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /关联/, label: "关联 (Simplified; use 関連)" },
  { pattern: /检查/, label: "检查 (Simplified; use 検査/チェック)" },
  { pattern: /经营/, label: "经营 (Simplified; use 経営)" },
  { pattern: /沟通/, label: "沟通 (Simplified; use 連絡/コミュニケーション)" },
];

describe("i18n glyph purity — zh-CN must not contain Japanese-only glyphs", () => {
  const zhEntries = collectValues(zhCN as unknown as Record<string, unknown>);

  for (const { pattern, label } of ZH_CN_FORBIDDEN_GLYPHS) {
    it(`zh-CN values must not contain ${label}`, () => {
      const violations = zhEntries.filter((e) => pattern.test(e.value));
      expect(
        violations.map((v) => `${v.key}: "${v.value}"`),
        `Found forbidden glyph ${label} in zh-CN`,
      ).toEqual([]);
    });
  }
});

describe("i18n glyph purity — ja-JP must not contain Chinese-only glyphs", () => {
  const jaEntries = collectValues(jaJP as unknown as Record<string, unknown>);

  for (const { pattern, label } of JA_JP_FORBIDDEN_GLYPHS) {
    it(`ja-JP values must not contain ${label}`, () => {
      const violations = jaEntries.filter((e) => pattern.test(e.value));
      expect(
        violations.map((v) => `${v.key}: "${v.value}"`),
        `Found forbidden glyph ${label} in ja-JP`,
      ).toEqual([]);
    });
  }
});
