import { describe, expect, it } from "vitest";
import casesEnUS from "./en-US";
import casesJaJP from "./ja-JP";
import casesZhCN from "./zh-CN";

type LocaleMessages = typeof casesEnUS;

const LOCALES: { name: string; messages: LocaleMessages }[] = [
  { name: "en-US", messages: casesEnUS },
  { name: "zh-CN", messages: casesZhCN as unknown as LocaleMessages },
  { name: "ja-JP", messages: casesJaJP as unknown as LocaleMessages },
];

const REQUIRED_KEY = "detail.info.relatedParties.rolePrimary";

function resolveKey(obj: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, part) => {
    if (acc && typeof acc === "object")
      return (acc as Record<string, unknown>)[part];
    return undefined;
  }, obj);
}

describe("cases i18n: relatedParties.rolePrimary exists in all locales", () => {
  it.each(LOCALES.map((l) => [l.name, l] as const))(
    "%s has rolePrimary key",
    (_, locale) => {
      const value = resolveKey(
        locale.messages as unknown as Record<string, unknown>,
        REQUIRED_KEY,
      );
      expect(value).toBeDefined();
      expect(typeof value).toBe("string");
      expect((value as string).length).toBeGreaterThan(0);
    },
  );
});
