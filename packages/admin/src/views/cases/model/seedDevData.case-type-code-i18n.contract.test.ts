import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { getCaseTypeI18nKey } from "../../../shared/model/caseTypeI18n";
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

function extractSeedCaseTypeCodes(): string[] {
  const seedPath = path.resolve(
    import.meta.dirname,
    "../../../../../server/src/scripts/seedDevData.ts",
  );
  const source = fs.readFileSync(seedPath, "utf8");

  const codes = new Set<string>();

  for (const m of source.matchAll(
    /\[\s*SEED_CASE_\w+,\s*"[^"]*",\s*"[^"]*",\s*"([^"]+)",?\s*\]/g,
  )) {
    codes.add(m[1]);
  }

  for (const m of source.matchAll(/'([a-z][a-z_]+)',\s*'open'/g)) {
    codes.add(m[1]);
  }

  return [...codes].sort();
}

describe("seed case_type_code ↔ i18n contract", () => {
  const codes = extractSeedCaseTypeCodes();

  it("extracts at least 3 distinct case_type_code values from seed", () => {
    expect(codes.length).toBeGreaterThanOrEqual(3);
  });

  it("includes engineer_humanities_intl_visa (CASE-DEV-002)", () => {
    expect(codes).toContain("engineer_humanities_intl_visa");
  });

  for (const code of codes) {
    const i18nKey = getCaseTypeI18nKey(code);
    const relativePath = `constants.caseTypes.${code}`;

    it(`getCaseTypeI18nKey("${code}") returns a non-empty key`, () => {
      expect(i18nKey).not.toBe("");
    });

    for (const { name, messages } of LOCALES) {
      it(`${name}: "${code}" resolves to a real label (not the key itself)`, () => {
        const value = resolveKey(
          messages as unknown as Record<string, unknown>,
          relativePath,
        );
        expect(typeof value).toBe("string");
        expect((value as string).length).toBeGreaterThan(0);
        expect(value).not.toBe(i18nKey);
      });
    }
  }
});
