import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import zhCN from "./messages/zh-CN";

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC_DIR = join(HERE, "..");

const T_CALL_RE = /\bt\(\s*['"]([a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_]+)+)['"]\s*[,)]/g;

function walkFiles(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, e.name);
    if (e.isDirectory() && e.name !== "node_modules") walkFiles(full, out);
    else if (e.isFile()) out.push(full);
  }
  return out;
}

function collectLeafKeys(
  obj: Record<string, unknown>,
  prefix = "",
  keys = new Set<string>(),
): Set<string> {
  for (const [k, v] of Object.entries(obj)) {
    const p = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      collectLeafKeys(v as Record<string, unknown>, p, keys);
    } else {
      keys.add(p);
    }
  }
  return keys;
}

function isCheckTarget(filePath: string): boolean {
  if (filePath.endsWith(".test.ts") || filePath.endsWith(".spec.ts"))
    return false;
  if (filePath.includes("/i18n/messages/")) return false;
  return filePath.endsWith(".vue") || filePath.endsWith(".ts");
}

interface KeyViolation {
  file: string;
  line: number;
  key: string;
}

/**
 * BUG-212 等已知 missing key，待对应修复 PR 落地后从此表中移除。
 * key → 追踪说明
 */
const KNOWN_MISSING_KEYS = new Map<string, string>([
  ["common.comingSoon", "BUG-212 — should be shell.topbar.comingSoon"],
]);

describe("i18n key usage lint — every static t() call must resolve to a dictionary leaf", () => {
  const knownKeys = collectLeafKeys(zhCN as unknown as Record<string, unknown>);
  const files = walkFiles(SRC_DIR).filter(isCheckTarget);
  const violations: KeyViolation[] = [];

  for (const file of files) {
    const lines = readFileSync(file, "utf-8").split("\n");
    for (let i = 0; i < lines.length; i++) {
      for (const m of lines[i].matchAll(T_CALL_RE)) {
        if (!knownKeys.has(m[1])) {
          violations.push({
            file: relative(SRC_DIR, file),
            line: i + 1,
            key: m[1],
          });
        }
      }
    }
  }

  it("must not reference any non-existent i18n key (outside tracked baseline)", () => {
    const unexpected = violations.filter((v) => !KNOWN_MISSING_KEYS.has(v.key));
    const report = unexpected.map(
      (v) => `  ${v.file}:${v.line}  t('${v.key}')`,
    );
    expect(
      report,
      `${unexpected.length} key(s) used in code but missing from zh-CN dictionary:\n${report.join("\n")}`,
    ).toEqual([]);
  });

  it("tracked missing keys are still present (remove from baseline after fix)", () => {
    const trackedHits = new Set(
      violations.filter((v) => KNOWN_MISSING_KEYS.has(v.key)).map((v) => v.key),
    );
    for (const [key, bug] of KNOWN_MISSING_KEYS) {
      if (!trackedHits.has(key)) {
        KNOWN_MISSING_KEYS.delete(key);
        expect
          .soft(
            true,
            `Tracked key "${key}" (${bug}) no longer referenced — remove from KNOWN_MISSING_KEYS`,
          )
          .toBe(true);
      }
    }
  });
});
