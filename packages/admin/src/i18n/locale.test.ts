import { describe, expect, it } from "vitest";
import arcoEnUS from "@arco-design/web-vue/es/locale/lang/en-us";
import arcoJaJP from "@arco-design/web-vue/es/locale/lang/ja-jp";
import arcoZhCN from "@arco-design/web-vue/es/locale/lang/zh-cn";
import { getArcoLocale } from "./index";
import {
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  detectPreferredLocale,
  normalizeLocale,
  persistLocale,
  readStoredLocale,
} from "./locale";

function createStorage(seed?: Record<string, string>) {
  const data = new Map(Object.entries(seed ?? {}));

  return {
    getItem(key: string): string | null {
      return data.get(key) ?? null;
    },
    setItem(key: string, value: string): void {
      data.set(key, value);
    },
  };
}

describe("locale helpers", () => {
  it("normalizes supported language variants", () => {
    expect(normalizeLocale("zh")).toBe("zh-CN");
    expect(normalizeLocale("zh-TW")).toBe("zh-CN");
    expect(normalizeLocale("en")).toBe("en-US");
    expect(normalizeLocale("en-GB")).toBe("en-US");
    expect(normalizeLocale("ja")).toBe("ja-JP");
    expect(normalizeLocale("ja-JP")).toBe("ja-JP");
  });

  it("returns undefined for unsupported languages", () => {
    expect(normalizeLocale("fr")).toBeUndefined();
  });

  it("detects preferred locale from browser languages", () => {
    expect(
      detectPreferredLocale({
        languages: ["fr-FR", "en-GB"],
        language: "zh-CN",
      }),
    ).toBe("en-US");
  });

  it("prefers Japanese when browser languages include ja", () => {
    expect(
      detectPreferredLocale({
        languages: ["fr-FR", "ja-JP"],
        language: "en-US",
      }),
    ).toBe("ja-JP");
  });

  it("falls back to the default locale when no candidate matches", () => {
    expect(
      detectPreferredLocale({
        languages: ["fr-FR"],
        language: "de-DE",
      }),
    ).toBe(DEFAULT_LOCALE);
  });

  it("reads a stored locale when the persisted value is valid", () => {
    const storage = createStorage({ [LOCALE_STORAGE_KEY]: "en-US" });
    expect(readStoredLocale(storage)).toBe("en-US");
  });

  it("ignores invalid stored locale values", () => {
    const storage = createStorage({ [LOCALE_STORAGE_KEY]: "fr-FR" });
    expect(readStoredLocale(storage)).toBeUndefined();
  });

  it("persists the selected locale", () => {
    const storage = createStorage();
    persistLocale("zh-CN", storage);
    expect(storage.getItem(LOCALE_STORAGE_KEY)).toBe("zh-CN");
  });
});

describe("getArcoLocale", () => {
  it("returns matching Arco locale for each supported app locale", () => {
    expect(getArcoLocale("zh-CN")).toBe(arcoZhCN);
    expect(getArcoLocale("en-US")).toBe(arcoEnUS);
    expect(getArcoLocale("ja-JP")).toBe(arcoJaJP);
  });

  it("falls back to zh-CN for an unknown locale", () => {
    expect(getArcoLocale("fr-FR" as never)).toBe(arcoZhCN);
  });
});
