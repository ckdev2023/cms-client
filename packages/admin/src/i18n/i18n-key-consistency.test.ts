import { describe, expect, it } from "vitest";
import zhCN from "./messages/zh-CN";
import enUS from "./messages/en-US";
import jaJP from "./messages/ja-JP";

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
