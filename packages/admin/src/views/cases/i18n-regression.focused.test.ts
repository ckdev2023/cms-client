// ── Test Ownership ──────────────────────────────────────────────
// Owner: i18n regression (p0-fe-013-03).
// Locks down:
//   - every CASE_STAGES entry has a matching i18n key in all 3 locales
//   - every CASE_DETAIL_TABS entry has a matching i18n key in all 3 locales
//   - every CASE_GATES entry has label + desc i18n keys in all 3 locales
//   - every BILLING_STATUSES entry has a matching i18n key in all 3 locales
//   - every LOG_CATEGORIES entry has a matching i18n key in all 3 locales
//   - every MESSAGE_FILTERS entry has a matching i18n key in all 3 locales
//   - every CREATE_CASE_STEPS entry has a matching i18n key in all 3 locales
//   - tabCounters keys exist in all 3 locales
//   - i18n-aware label helpers return valid keys
//   - missing / unknown enum values fall back gracefully
// Does NOT test: component-level t() calls, vue-i18n plugin setup,
//   or runtime locale switching.
// ────────────────────────────────────────────────────────────────

import { describe, expect, it } from "vitest";
import casesEnUS from "../../i18n/messages/cases/en-US";
import casesZhCN from "../../i18n/messages/cases/zh-CN";
import casesJaJP from "../../i18n/messages/cases/ja-JP";
import {
  CASE_STAGES,
  CASE_STAGE_IDS,
  CASE_DETAIL_TABS,
  CASE_DETAIL_TAB_KEYS,
  CASE_GATES,
  BILLING_STATUSES,
  LOG_CATEGORIES,
  MESSAGE_FILTERS,
  CREATE_CASE_STEPS,
  getStageLabel,
  getStageI18nKey,
  getBillingStatusLabel,
  getBillingStatusI18nKey,
  getGateLabel,
  getGateI18nKey,
} from "./constants";
import type { CaseDetailTab, GateId, BillingStatusKey } from "./types";

// ─── Helpers ────────────────────────────────────────────────────

type LocaleMessages = typeof casesEnUS;

const LOCALES: { name: string; messages: LocaleMessages }[] = [
  { name: "en-US", messages: casesEnUS },
  { name: "zh-CN", messages: casesZhCN as unknown as LocaleMessages },
  { name: "ja-JP", messages: casesJaJP as unknown as LocaleMessages },
];

function resolveKey(obj: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, part) => {
    if (acc && typeof acc === "object")
      return (acc as Record<string, unknown>)[part];
    return undefined;
  }, obj);
}

function stripCasesPrefix(i18nKey: string): string {
  return i18nKey.replace(/^cases\./, "");
}

// ─── 1. Stage i18n keys ─────────────────────────────────────────

describe("stage i18n keys (p0-fe-013-03)", () => {
  it("every CASE_STAGE_IDS entry exists in CASE_STAGES", () => {
    for (const id of CASE_STAGE_IDS) {
      expect(CASE_STAGES[id]).toBeDefined();
    }
  });

  it("every stage has a non-empty i18nKey", () => {
    for (const id of CASE_STAGE_IDS) {
      expect(CASE_STAGES[id].i18nKey).toBeTruthy();
    }
  });

  it.each(LOCALES.map((l) => [l.name, l] as const))(
    "all stage i18n keys resolve in %s",
    (_, locale) => {
      for (const id of CASE_STAGE_IDS) {
        const key = stripCasesPrefix(CASE_STAGES[id].i18nKey);
        const value = resolveKey(locale.messages, key);
        expect(
          value,
          `${locale.name} missing ${CASE_STAGES[id].i18nKey}`,
        ).toBeTruthy();
        expect(typeof value).toBe("string");
      }
    },
  );

  it("CASE_STAGE_IDS covers S1–S9 exactly", () => {
    expect(CASE_STAGE_IDS).toEqual([
      "S1",
      "S2",
      "S3",
      "S4",
      "S5",
      "S6",
      "S7",
      "S8",
      "S9",
    ]);
  });
});

// ─── 2. Detail tab i18n keys ────────────────────────────────────

describe("detail tab i18n keys (p0-fe-013-03)", () => {
  it("CASE_DETAIL_TABS covers all 10 tabs", () => {
    expect(CASE_DETAIL_TABS).toHaveLength(10);
    expect(CASE_DETAIL_TABS.map((t) => t.key)).toEqual(CASE_DETAIL_TAB_KEYS);
  });

  it("every tab has a non-empty i18nKey", () => {
    for (const tab of CASE_DETAIL_TABS) {
      expect(tab.i18nKey).toBeTruthy();
    }
  });

  it.each(LOCALES.map((l) => [l.name, l] as const))(
    "all tab i18n keys resolve in %s",
    (_, locale) => {
      for (const tab of CASE_DETAIL_TABS) {
        const key = stripCasesPrefix(tab.i18nKey);
        const value = resolveKey(locale.messages, key);
        expect(value, `${locale.name} missing ${tab.i18nKey}`).toBeTruthy();
        expect(typeof value).toBe("string");
      }
    },
  );

  it("tab keys match CaseDetailTab union exactly", () => {
    const expected: CaseDetailTab[] = [
      "overview",
      "validation",
      "documents",
      "tasks",
      "info",
      "forms",
      "deadlines",
      "billing",
      "messages",
      "log",
    ];
    expect(CASE_DETAIL_TAB_KEYS).toEqual(expected);
  });
});

// ─── 3. Gate i18n keys ──────────────────────────────────────────

describe("gate i18n keys (p0-fe-013-03)", () => {
  const GATE_IDS: GateId[] = ["A", "B", "C"];

  it("every gate has label + desc i18n keys", () => {
    for (const id of GATE_IDS) {
      expect(CASE_GATES[id].i18nKey).toBeTruthy();
      expect(CASE_GATES[id].descI18nKey).toBeTruthy();
    }
  });

  it.each(LOCALES.map((l) => [l.name, l] as const))(
    "all gate i18n keys resolve in %s",
    (_, locale) => {
      for (const id of GATE_IDS) {
        const labelKey = stripCasesPrefix(CASE_GATES[id].i18nKey);
        const descKey = stripCasesPrefix(CASE_GATES[id].descI18nKey);
        const labelVal = resolveKey(locale.messages, labelKey);
        const descVal = resolveKey(locale.messages, descKey);
        expect(
          labelVal,
          `${locale.name} missing gate ${id} label`,
        ).toBeTruthy();
        expect(descVal, `${locale.name} missing gate ${id} desc`).toBeTruthy();
      }
    },
  );
});

// ─── 4. Billing status i18n keys ────────────────────────────────

describe("billing status i18n keys (p0-fe-013-03)", () => {
  const BILLING_KEYS: BillingStatusKey[] = [
    "paid",
    "partial",
    "unpaid",
    "arrears",
    "waived",
  ];

  it("every billing status has a non-empty i18nKey", () => {
    for (const key of BILLING_KEYS) {
      expect(BILLING_STATUSES[key].i18nKey).toBeTruthy();
    }
  });

  it.each(LOCALES.map((l) => [l.name, l] as const))(
    "all billing status i18n keys resolve in %s",
    (_, locale) => {
      for (const key of BILLING_KEYS) {
        const i18nPath = stripCasesPrefix(BILLING_STATUSES[key].i18nKey);
        const value = resolveKey(locale.messages, i18nPath);
        expect(value, `${locale.name} missing billing ${key}`).toBeTruthy();
      }
    },
  );
});

// ─── 5. Log category i18n keys ──────────────────────────────────

describe("log category i18n keys (p0-fe-013-03)", () => {
  it("every log category has a non-empty i18nKey", () => {
    for (const cat of LOG_CATEGORIES) {
      expect(cat.i18nKey).toBeTruthy();
    }
  });

  it.each(LOCALES.map((l) => [l.name, l] as const))(
    "all log category i18n keys resolve in %s",
    (_, locale) => {
      for (const cat of LOG_CATEGORIES) {
        const key = stripCasesPrefix(cat.i18nKey);
        const value = resolveKey(locale.messages, key);
        expect(
          value,
          `${locale.name} missing log category ${cat.key}`,
        ).toBeTruthy();
      }
    },
  );
});

// ─── 6. Message filter i18n keys ────────────────────────────────

describe("message filter i18n keys (p0-fe-013-03)", () => {
  it("every message filter has a non-empty i18nKey", () => {
    for (const filter of MESSAGE_FILTERS) {
      expect(filter.i18nKey).toBeTruthy();
    }
  });

  it.each(LOCALES.map((l) => [l.name, l] as const))(
    "all message filter i18n keys resolve in %s",
    (_, locale) => {
      for (const filter of MESSAGE_FILTERS) {
        const key = stripCasesPrefix(filter.i18nKey);
        const value = resolveKey(locale.messages, key);
        expect(
          value,
          `${locale.name} missing messageFilter ${filter.key}`,
        ).toBeTruthy();
      }
    },
  );
});

// ─── 7. Create step i18n keys ───────────────────────────────────

describe("create step i18n keys (p0-fe-013-03)", () => {
  it("every create step has a non-empty i18nKey", () => {
    for (const step of CREATE_CASE_STEPS) {
      expect(step.i18nKey).toBeTruthy();
    }
  });

  it.each(LOCALES.map((l) => [l.name, l] as const))(
    "all create step i18n keys resolve in %s",
    (_, locale) => {
      for (const step of CREATE_CASE_STEPS) {
        const key = stripCasesPrefix(step.i18nKey);
        const value = resolveKey(locale.messages, key);
        expect(
          value,
          `${locale.name} missing createStep ${step.step}`,
        ).toBeTruthy();
      }
    },
  );
});

// ─── 8. Tab counter i18n keys ───────────────────────────────────

describe("tab counter i18n keys (p0-fe-013-03)", () => {
  const TAB_COUNTER_KEYS = ["blocking", "pending"] as const;

  it.each(LOCALES.map((l) => [l.name, l] as const))(
    "tabCounters keys exist in %s",
    (_, locale) => {
      for (const key of TAB_COUNTER_KEYS) {
        const value = resolveKey(
          locale.messages,
          `constants.tabCounters.${key}`,
        );
        expect(value, `${locale.name} missing tabCounters.${key}`).toBeTruthy();
        expect(typeof value).toBe("string");
      }
    },
  );

  it("tabCounters templates contain {count} placeholder", () => {
    for (const locale of LOCALES) {
      for (const key of TAB_COUNTER_KEYS) {
        const value = resolveKey(
          locale.messages,
          `constants.tabCounters.${key}`,
        ) as string;
        expect(value).toContain("{count}");
      }
    }
  });
});

// ─── 9. i18n-aware label helpers ────────────────────────────────

describe("i18n-aware label helpers (p0-fe-013-03)", () => {
  it("getStageI18nKey returns valid key for known stages", () => {
    for (const id of CASE_STAGE_IDS) {
      const key = getStageI18nKey(id);
      expect(key).toBeTruthy();
      expect(key).toMatch(/^cases\.constants\.stages\.S\d$/);
    }
  });

  it("getStageI18nKey returns empty string for unknown stage", () => {
    expect(getStageI18nKey("UNKNOWN")).toBe("");
    expect(getStageI18nKey("")).toBe("");
  });

  it("getStageLabel returns fallback label for known stages", () => {
    for (const id of CASE_STAGE_IDS) {
      expect(getStageLabel(id)).toBeTruthy();
    }
  });

  it("getStageLabel returns raw input for unknown stage", () => {
    expect(getStageLabel("UNKNOWN")).toBe("UNKNOWN");
  });

  it("getBillingStatusI18nKey returns valid key for known statuses", () => {
    const keys: BillingStatusKey[] = [
      "paid",
      "partial",
      "unpaid",
      "arrears",
      "waived",
    ];
    for (const k of keys) {
      expect(getBillingStatusI18nKey(k)).toBeTruthy();
      expect(getBillingStatusI18nKey(k)).toMatch(
        /^cases\.constants\.billingStatuses\./,
      );
    }
  });

  it("getBillingStatusI18nKey returns empty string for unknown key", () => {
    expect(getBillingStatusI18nKey("UNKNOWN")).toBe("");
  });

  it("getBillingStatusLabel returns raw input for unknown key", () => {
    expect(getBillingStatusLabel("UNKNOWN")).toBe("UNKNOWN");
  });

  it("getGateI18nKey returns valid key for known gates", () => {
    const gateIds: GateId[] = ["A", "B", "C"];
    for (const id of gateIds) {
      expect(getGateI18nKey(id)).toBeTruthy();
      expect(getGateI18nKey(id)).toMatch(
        /^cases\.constants\.gates\.[ABC]\.label$/,
      );
    }
  });

  it("getGateI18nKey returns empty string for unknown gate", () => {
    expect(getGateI18nKey("X")).toBe("");
  });

  it("getGateLabel returns raw input for unknown gate", () => {
    expect(getGateLabel("X")).toBe("X");
  });
});

// ─── 10. Cross-locale key parity ────────────────────────────────

describe("cross-locale key parity (p0-fe-013-03)", () => {
  function collectLeafKeys(
    obj: Record<string, unknown>,
    prefix = "",
  ): string[] {
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

  it("zh-CN has same full key set as en-US", () => {
    const enKeys = collectLeafKeys(
      casesEnUS as unknown as Record<string, unknown>,
    );
    const zhKeys = collectLeafKeys(
      casesZhCN as unknown as Record<string, unknown>,
    );
    expect(zhKeys).toEqual(enKeys);
  });

  it("ja-JP has same full key set as en-US", () => {
    const enKeys = collectLeafKeys(
      casesEnUS as unknown as Record<string, unknown>,
    );
    const jaKeys = collectLeafKeys(
      casesJaJP as unknown as Record<string, unknown>,
    );
    expect(jaKeys).toEqual(enKeys);
  });
});
