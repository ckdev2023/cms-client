import { describe, expect, it } from "vitest";
import zhCN from "./messages/zh-CN";
import jaJP from "./messages/ja-JP";

const BARE_GROUP_RE = /\bGroup\b/;

function collectLeafStrings(
  obj: Record<string, unknown>,
  prefix = "",
): { path: string; value: string }[] {
  const result: { path: string; value: string }[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      result.push(...collectLeafStrings(v as Record<string, unknown>, path));
    } else if (typeof v === "string") {
      result.push({ path, value: v });
    }
  }
  return result;
}

describe("i18n regression — no bare English 'Group' in zh-CN / ja-JP", () => {
  const zhLeaves = collectLeafStrings(
    zhCN as unknown as Record<string, unknown>,
  );
  const jaLeaves = collectLeafStrings(
    jaJP as unknown as Record<string, unknown>,
  );

  it("zh-CN messages must not contain standalone English 'Group'", () => {
    const violations = zhLeaves.filter((l) => BARE_GROUP_RE.test(l.value));
    expect(
      violations.map((v) => `${v.path}: "${v.value}"`),
      "zh-CN leaf values containing bare 'Group'",
    ).toEqual([]);
  });

  it("ja-JP messages must not contain standalone English 'Group'", () => {
    const violations = jaLeaves.filter((l) => BARE_GROUP_RE.test(l.value));
    expect(
      violations.map((v) => `${v.path}: "${v.value}"`),
      "ja-JP leaf values containing bare 'Group'",
    ).toEqual([]);
  });
});
