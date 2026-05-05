import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import zhCN from "./messages/zh-CN";
import enUS from "./messages/en-US";
import jaJP from "./messages/ja-JP";

type MessageDict = Record<string, unknown>;

function collectKeys(obj: Record<string, unknown>, prefix = ""): string[] {
  const keys: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      keys.push(...collectKeys(v as Record<string, unknown>, path));
    } else {
      keys.push(path);
    }
  }
  return keys.sort();
}

function diff(a: string[], b: string[]): string[] {
  const setB = new Set(b);
  return a.filter((k) => !setB.has(k));
}

describe("i18n key consistency — zh-CN / ja-JP / en-US leaf keys must match", () => {
  const zhKeys = collectKeys(zhCN as unknown as Record<string, unknown>);
  const jaKeys = collectKeys(jaJP as unknown as Record<string, unknown>);
  const enKeys = collectKeys(enUS as unknown as Record<string, unknown>);

  it("zh-CN must not have keys missing from en-US", () => {
    const missing = diff(zhKeys, enKeys);
    expect(missing, "keys in zh-CN but not in en-US").toEqual([]);
  });

  it("en-US must not have keys missing from zh-CN", () => {
    const missing = diff(enKeys, zhKeys);
    expect(missing, "keys in en-US but not in zh-CN").toEqual([]);
  });

  it("zh-CN must not have keys missing from ja-JP", () => {
    const missing = diff(zhKeys, jaKeys);
    expect(missing, "keys in zh-CN but not in ja-JP").toEqual([]);
  });

  it("ja-JP must not have keys missing from zh-CN", () => {
    const missing = diff(jaKeys, zhKeys);
    expect(missing, "keys in ja-JP but not in zh-CN").toEqual([]);
  });

  it("en-US must not have keys missing from ja-JP", () => {
    const missing = diff(enKeys, jaKeys);
    expect(missing, "keys in en-US but not in ja-JP").toEqual([]);
  });

  it("ja-JP must not have keys missing from en-US", () => {
    const missing = diff(jaKeys, enKeys);
    expect(missing, "keys in ja-JP but not in en-US").toEqual([]);
  });
});

describe("i18n contract — cases.log.timeline must not hardcode colon + {suffix}", () => {
  const FORBIDDEN_PATTERN = /[：:]\s?\{suffix\}/;

  function getTimelineValues(locale: MessageDict): Record<string, string> {
    const cases = locale.cases as MessageDict | undefined;
    const log = cases?.log as MessageDict | undefined;
    const timeline = log?.timeline as Record<string, string> | undefined;
    return timeline ?? {};
  }

  const locales: Array<[string, MessageDict]> = [
    ["zh-CN", zhCN as unknown as MessageDict],
    ["ja-JP", jaJP as unknown as MessageDict],
    ["en-US", enUS as unknown as MessageDict],
  ];

  for (const [name, locale] of locales) {
    it(`${name} timeline values must use {colonSuffix} instead of hardcoded colon + {suffix}`, () => {
      const timeline = getTimelineValues(locale);
      const violations: string[] = [];
      for (const [key, value] of Object.entries(timeline)) {
        if (typeof value === "string" && FORBIDDEN_PATTERN.test(value)) {
          violations.push(`${key}: "${value}"`);
        }
      }
      expect(
        violations,
        `Found hardcoded colon+{suffix} — use {colonSuffix} instead:\n${violations.join("\n")}`,
      ).toEqual([]);
    });
  }
});

// ---------------------------------------------------------------------------
// aria-label / placeholder / title 禁止包含硬编码 CJK 字符
// ---------------------------------------------------------------------------

const I18N_HERE = dirname(fileURLToPath(import.meta.url));
const I18N_SRC_DIR = join(I18N_HERE, "..");

function walkDir(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== "node_modules") {
      walkDir(full, out);
    } else if (entry.isFile()) {
      out.push(full);
    }
  }
  return out;
}

function isScanTarget(filePath: string): boolean {
  if (filePath.endsWith(".test.ts") || filePath.endsWith(".spec.ts"))
    return false;
  if (filePath.includes("/i18n/messages/")) return false;
  return filePath.endsWith(".vue") || filePath.endsWith(".ts");
}

const CJK_RANGE =
  /[\u4E00-\u9FFF\u3400-\u4DBF\u3000-\u303F\u3040-\u309F\u30A0-\u30FF\uFF00-\uFFEF]/;
const HARDCODED_ATTR_RE = /\b(aria-label|placeholder|title)\s*=\s*"([^"]+)"/g;

describe("i18n guard — aria-label / placeholder / title must not contain hardcoded CJK", () => {
  const files = walkDir(I18N_SRC_DIR).filter(isScanTarget);
  const violations: Array<{
    file: string;
    line: number;
    attr: string;
    value: string;
  }> = [];

  for (const file of files) {
    const lines = readFileSync(file, "utf-8").split("\n");
    for (let i = 0; i < lines.length; i++) {
      for (const m of lines[i].matchAll(HARDCODED_ATTR_RE)) {
        if (CJK_RANGE.test(m[2])) {
          violations.push({
            file: relative(I18N_SRC_DIR, file),
            line: i + 1,
            attr: m[1],
            value: m[2],
          });
        }
      }
    }
  }

  it("must not have CJK characters in static aria-label / placeholder / title attributes", () => {
    const report = violations.map(
      (v) => `  ${v.file}:${v.line}  ${v.attr}="${v.value}"`,
    );
    expect(
      report,
      `${violations.length} attribute(s) contain hardcoded CJK — use :${violations[0]?.attr}="t('...')" instead:\n${report.join("\n")}`,
    ).toEqual([]);
  });
});
