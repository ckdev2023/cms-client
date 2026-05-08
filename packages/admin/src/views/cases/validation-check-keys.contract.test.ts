import { describe, expect, it } from "vitest";
import casesEnUS from "../../i18n/messages/cases/en-US";
import casesZhCN from "../../i18n/messages/cases/zh-CN";
import casesJaJP from "../../i18n/messages/cases/ja-JP";

type LocaleMessages = typeof casesEnUS;

const LOCALES: { name: string; messages: LocaleMessages }[] = [
  { name: "en-US", messages: casesEnUS },
  { name: "zh-CN", messages: casesZhCN as unknown as LocaleMessages },
  { name: "ja-JP", messages: casesJaJP as unknown as LocaleMessages },
];

const KNOWN_CHECK_CODES = [
  "generated_documents_present",
  "generated_documents_finalized",
] as const;

function resolveKey(obj: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, part) => {
    if (acc && typeof acc === "object")
      return (acc as Record<string, unknown>)[part];
    return undefined;
  }, obj);
}

describe("validation check i18n keys — three-locale parity", () => {
  for (const code of KNOWN_CHECK_CODES) {
    for (const { name, messages } of LOCALES) {
      it(`${name}: validation.checks.${code}.title is a non-empty string`, () => {
        const value = resolveKey(
          messages as unknown as Record<string, unknown>,
          `validation.checks.${code}.title`,
        );
        expect(typeof value).toBe("string");
        expect((value as string).length).toBeGreaterThan(0);
      });

      it(`${name}: validation.checks.${code}.message is a non-empty string`, () => {
        const value = resolveKey(
          messages as unknown as Record<string, unknown>,
          `validation.checks.${code}.message`,
        );
        expect(typeof value).toBe("string");
        expect((value as string).length).toBeGreaterThan(0);
      });
    }
  }
});
