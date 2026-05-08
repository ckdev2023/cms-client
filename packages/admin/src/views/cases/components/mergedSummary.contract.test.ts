import { describe, it, expect } from "vitest";
import casesEnUS from "../../../i18n/messages/cases/en-US";
import casesZhCN from "../../../i18n/messages/cases/zh-CN";
import casesJaJP from "../../../i18n/messages/cases/ja-JP";

type LocaleMessages = typeof casesEnUS;

const LOCALES: { name: string; messages: LocaleMessages }[] = [
  { name: "en-US", messages: casesEnUS },
  { name: "zh-CN", messages: casesZhCN as unknown as LocaleMessages },
  { name: "ja-JP", messages: casesJaJP as unknown as LocaleMessages },
];

function resolveKey(obj: Record<string, unknown>, dotPath: string): unknown {
  return dotPath.split(".").reduce<unknown>((acc, part) => {
    if (acc && typeof acc === "object")
      return (acc as Record<string, unknown>)[part];
    return undefined;
  }, obj);
}

describe("mergedSummary i18n contract", () => {
  const KEY_PATH = "detail.overview.timeline.mergedSummary";

  for (const { name, messages } of LOCALES) {
    it(`${name}: mergedSummary key exists and is a non-empty string`, () => {
      const value = resolveKey(
        messages as unknown as Record<string, unknown>,
        KEY_PATH,
      );
      expect(value).toBeDefined();
      expect(typeof value).toBe("string");
      expect((value as string).length).toBeGreaterThan(0);
    });

    it(`${name}: mergedSummary contains {count}, {earliest}, {latest} placeholders`, () => {
      const value = resolveKey(
        messages as unknown as Record<string, unknown>,
        KEY_PATH,
      ) as string;
      expect(value).toContain("{count}");
      expect(value).toContain("{earliest}");
      expect(value).toContain("{latest}");
    });
  }
});
