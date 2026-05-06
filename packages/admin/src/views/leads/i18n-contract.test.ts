import { describe, expect, it } from "vitest";
import leadsEnUS from "../../i18n/messages/leads/en-US";
import leadsZhCN from "../../i18n/messages/leads/zh-CN";
import leadsJaJP from "../../i18n/messages/leads/ja-JP";

type LocaleMessages = typeof leadsEnUS;

const LOCALES: { name: string; messages: LocaleMessages }[] = [
  { name: "en-US", messages: leadsEnUS },
  { name: "zh-CN", messages: leadsZhCN as unknown as LocaleMessages },
  { name: "ja-JP", messages: leadsJaJP as unknown as LocaleMessages },
];

function collectLeafKeys(obj: Record<string, unknown>, prefix = ""): string[] {
  const keys: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      keys.push(...collectLeafKeys(v as Record<string, unknown>, path));
    } else {
      keys.push(path);
    }
  }
  return keys.sort();
}

describe("leads i18n cross-locale key parity (T-17)", () => {
  const enKeys = collectLeafKeys(
    leadsEnUS as unknown as Record<string, unknown>,
  );

  it("zh-CN has same keys as en-US", () => {
    const zhKeys = collectLeafKeys(
      leadsZhCN as unknown as Record<string, unknown>,
    );
    expect(zhKeys).toEqual(enKeys);
  });

  it("ja-JP has same keys as en-US", () => {
    const jaKeys = collectLeafKeys(
      leadsJaJP as unknown as Record<string, unknown>,
    );
    expect(jaKeys).toEqual(enKeys);
  });
});

describe("leads i18n required key groups (T-17)", () => {
  const STATUS_KEYS = [
    "list.status.new",
    "list.status.following",
    "list.status.pending_sign",
    "list.status.signed",
    "list.status.converted_case",
    "list.status.lost",
  ] as const;

  const DETAIL_TAB_KEYS = [
    "detail.tabs.info",
    "detail.tabs.followups",
    "detail.tabs.conversations",
    "detail.tabs.conversion",
    "detail.tabs.log",
  ] as const;

  const LOG_TAB_KEYS = [
    "detail.logTab.title",
    "detail.logTab.categoryAll",
    "detail.logTab.typeStatus",
    "detail.logTab.typeOwner",
    "detail.logTab.typeGroup",
    "detail.logTab.typeInfo",
    "detail.logTab.emptyTitle",
    "detail.logTab.actorUnknown",
  ] as const;

  function resolveKey(obj: Record<string, unknown>, path: string): unknown {
    return path.split(".").reduce<unknown>((acc, part) => {
      if (acc && typeof acc === "object")
        return (acc as Record<string, unknown>)[part];
      return undefined;
    }, obj);
  }

  it.each(LOCALES.map((l) => [l.name, l] as const))(
    "all status keys resolve in %s",
    (_, locale) => {
      for (const key of STATUS_KEYS) {
        const value = resolveKey(
          locale.messages as unknown as Record<string, unknown>,
          key,
        );
        expect(value, `${locale.name} missing ${key}`).toBeTruthy();
      }
    },
  );

  it.each(LOCALES.map((l) => [l.name, l] as const))(
    "all detail tab keys resolve in %s",
    (_, locale) => {
      for (const key of DETAIL_TAB_KEYS) {
        const value = resolveKey(
          locale.messages as unknown as Record<string, unknown>,
          key,
        );
        expect(value, `${locale.name} missing ${key}`).toBeTruthy();
      }
    },
  );

  it.each(LOCALES.map((l) => [l.name, l] as const))(
    "all log tab keys resolve in %s",
    (_, locale) => {
      for (const key of LOG_TAB_KEYS) {
        const value = resolveKey(
          locale.messages as unknown as Record<string, unknown>,
          key,
        );
        expect(value, `${locale.name} missing ${key}`).toBeTruthy();
      }
    },
  );
});
