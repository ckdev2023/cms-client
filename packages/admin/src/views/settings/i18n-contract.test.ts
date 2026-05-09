import { describe, expect, it } from "vitest";
import settingsEnUS from "../../i18n/messages/settings/en-US";
import settingsZhCN from "../../i18n/messages/settings/zh-CN";
import settingsJaJP from "../../i18n/messages/settings/ja-JP";

type LocaleMessages = typeof settingsEnUS;

const LOCALES: { name: string; messages: LocaleMessages }[] = [
  { name: "en-US", messages: settingsEnUS },
  { name: "zh-CN", messages: settingsZhCN as unknown as LocaleMessages },
  { name: "ja-JP", messages: settingsJaJP as unknown as LocaleMessages },
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

describe("settings i18n cross-locale key parity (T-17)", () => {
  const enKeys = collectLeafKeys(
    settingsEnUS as unknown as Record<string, unknown>,
  );

  it("zh-CN has same keys as en-US", () => {
    const zhKeys = collectLeafKeys(
      settingsZhCN as unknown as Record<string, unknown>,
    );
    expect(zhKeys).toEqual(enKeys);
  });

  it("ja-JP has same keys as en-US", () => {
    const jaKeys = collectLeafKeys(
      settingsJaJP as unknown as Record<string, unknown>,
    );
    expect(jaKeys).toEqual(enKeys);
  });
});

describe("settings i18n required key groups (T-17)", () => {
  function resolveKey(obj: Record<string, unknown>, path: string): unknown {
    return path.split(".").reduce<unknown>((acc, part) => {
      if (acc && typeof acc === "object")
        return (acc as Record<string, unknown>)[part];
      return undefined;
    }, obj);
  }

  const SUBNAV_KEYS = [
    "subnav.ariaLabel",
    "subnav.groupManagement",
    "subnav.visibilityConfig",
    "subnav.storageRoot",
    "subnav.featureFlags",
  ] as const;

  const GROUP_COLUMN_KEYS = [
    "group.columns.name",
    "group.columns.status",
    "group.columns.createdAt",
    "group.columns.activeCases",
    "group.columns.members",
  ] as const;

  const VISIBILITY_KEYS = [
    "visibility.crossGroupCase.label",
    "visibility.crossGroupCase.description",
    "visibility.crossGroupView.label",
    "visibility.crossGroupView.description",
    "visibility.saveButton",
  ] as const;

  const FEATURE_FLAG_KEYS = [
    "featureFlags.loading",
    "featureFlags.loadError",
    "featureFlags.currentlyResolvedAs",
    "featureFlags.rowMissing",
    "featureFlags.recommendedDefaultHint",
    "featureFlags.resetButton",
    "featureFlags.resetTooltip",
    "featureFlags.state.enabled",
    "featureFlags.state.disabled",
    "featureFlags.unknownFlag.description",
    "featureFlags.unknownFlag.warning",
    "featureFlags.bmv.label",
    "featureFlags.bmv.description",
    "toast.featureFlagUpdated.title",
    "toast.featureFlagUpdated.description",
    "toast.featureFlagFailed.title",
    "toast.featureFlagFailed.description",
    "aria.featureFlags",
  ] as const;

  const ALL_REQUIRED = [
    ...SUBNAV_KEYS,
    ...GROUP_COLUMN_KEYS,
    ...VISIBILITY_KEYS,
    ...FEATURE_FLAG_KEYS,
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
});
