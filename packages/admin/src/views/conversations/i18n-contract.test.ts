import { describe, expect, it } from "vitest";
import conversationsEnUS from "../../i18n/messages/conversations/en-US";
import conversationsZhCN from "../../i18n/messages/conversations/zh-CN";
import conversationsJaJP from "../../i18n/messages/conversations/ja-JP";

type LocaleMessages = typeof conversationsEnUS;

const LOCALES: { name: string; messages: LocaleMessages }[] = [
  { name: "en-US", messages: conversationsEnUS },
  { name: "zh-CN", messages: conversationsZhCN as unknown as LocaleMessages },
  { name: "ja-JP", messages: conversationsJaJP as unknown as LocaleMessages },
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

describe("conversations i18n cross-locale key parity (T-17)", () => {
  const enKeys = collectLeafKeys(
    conversationsEnUS as unknown as Record<string, unknown>,
  );

  it("zh-CN has same keys as en-US", () => {
    const zhKeys = collectLeafKeys(
      conversationsZhCN as unknown as Record<string, unknown>,
    );
    expect(zhKeys).toEqual(enKeys);
  });

  it("ja-JP has same keys as en-US", () => {
    const jaKeys = collectLeafKeys(
      conversationsJaJP as unknown as Record<string, unknown>,
    );
    expect(jaKeys).toEqual(enKeys);
  });
});

describe("conversations i18n required key groups (T-17)", () => {
  function resolveKey(obj: Record<string, unknown>, path: string): unknown {
    return path.split(".").reduce<unknown>((acc, part) => {
      if (acc && typeof acc === "object")
        return (acc as Record<string, unknown>)[part];
      return undefined;
    }, obj);
  }

  const MESSAGE_KIND_KEYS = [
    "messages.kind.text",
    "messages.kind.system_event",
    "messages.kind.intake_link",
    "messages.kind.quote_link",
    "messages.kind.sign_link",
  ] as const;

  const MESSAGE_VISIBILITY_KEYS = [
    "messages.visibility.internal_only",
    "messages.visibility.client_visible",
  ] as const;

  const LIST_STATUS_KEYS = ["list.status.open", "list.status.closed"] as const;

  const ERROR_KEYS = [
    "errors.fetchFailed",
    "errors.sendFailed",
    "errors.assignFailed",
    "errors.closeFailed",
    "errors.reopenFailed",
    "errors.retryTranslationFailed",
  ] as const;

  const ALL_REQUIRED = [
    ...MESSAGE_KIND_KEYS,
    ...MESSAGE_VISIBILITY_KEYS,
    ...LIST_STATUS_KEYS,
    ...ERROR_KEYS,
  ];

  it.each(LOCALES.map((l) => [l.name, l] as const))(
    "all required keys resolve in %s",
    (_, locale) => {
      const missing: string[] = [];
      for (const key of ALL_REQUIRED) {
        const value = resolveKey(
          locale.messages as unknown as Record<string, unknown>,
          key,
        );
        if (value === undefined || value === null || value === "") {
          missing.push(key);
        }
      }
      expect(missing, `${locale.name} missing: ${missing.join(", ")}`).toEqual(
        [],
      );
    },
  );

  it.each(LOCALES.map((l) => [l.name, l] as const))(
    "all required keys are strings in %s",
    (_, locale) => {
      for (const key of ALL_REQUIRED) {
        const value = resolveKey(
          locale.messages as unknown as Record<string, unknown>,
          key,
        );
        expect(typeof value, `${locale.name} key ${key} should be string`).toBe(
          "string",
        );
      }
    },
  );
});
