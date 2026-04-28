// ── Test Ownership ──────────────────────────────────────────────
// Owner: p0-fe-013-03 — i18n regression tests for cases module.
// Locks: key structure parity across zh-CN / en-US / ja-JP,
//   critical enum keys, tab labels, missing-key fallback.
// Does NOT test: component rendering, router integration,
//   or adapter-level label mapping.
// ────────────────────────────────────────────────────────────────

import { describe, expect, it } from "vitest";
import casesZhCN from "../../../i18n/messages/cases/zh-CN";
import casesEnUS from "../../../i18n/messages/cases/en-US";
import casesJaJP from "../../../i18n/messages/cases/ja-JP";
import {
  CASE_STAGE_IDS,
  CASE_STAGES,
  CASE_DETAIL_TABS,
  CASE_DETAIL_TAB_KEYS,
  CASE_GATES,
  BILLING_STATUSES,
  LOG_CATEGORIES,
  MESSAGE_FILTERS,
  CREATE_CASE_STEPS,
  BUSINESS_PHASES,
  BUSINESS_PHASE_MAP,
  getStageI18nKey,
  getStageLabel,
  getBillingStatusI18nKey,
  getBillingStatusLabel,
  getGateI18nKey,
  getGateLabel,
  getPhaseI18nKey,
  getPhaseLabel,
} from "../constants";

// ─── Helpers ────────────────────────────────────────────────────

function collectKeys(obj: unknown, prefix = ""): string[] {
  if (!obj || typeof obj !== "object") return prefix ? [prefix] : [];
  const keys: string[] = [];
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      keys.push(...collectKeys(v, path));
    } else {
      keys.push(path);
    }
  }
  return keys.sort();
}

const zhKeys = collectKeys(casesZhCN);
const enKeys = collectKeys(casesEnUS);
const jaKeys = collectKeys(casesJaJP);

// ─── Key Structure Parity ───────────────────────────────────────

describe("cases i18n — key structure parity", () => {
  it("en-US has all keys from zh-CN", () => {
    const missing = zhKeys.filter((k) => !enKeys.includes(k));
    expect(missing).toEqual([]);
  });

  it("ja-JP has all keys from zh-CN", () => {
    const missing = zhKeys.filter((k) => !jaKeys.includes(k));
    expect(missing).toEqual([]);
  });

  it("zh-CN has all keys from en-US (no extra keys in en-US)", () => {
    const extra = enKeys.filter((k) => !zhKeys.includes(k));
    expect(extra).toEqual([]);
  });

  it("zh-CN has all keys from ja-JP (no extra keys in ja-JP)", () => {
    const extra = jaKeys.filter((k) => !zhKeys.includes(k));
    expect(extra).toEqual([]);
  });
});

// ─── Critical Enum Keys ────────────────────────────────────────

describe("cases i18n — stage enum keys", () => {
  for (const stageId of CASE_STAGE_IDS) {
    it(`zh-CN has stages.${stageId}`, () => {
      expect(casesZhCN.constants.stages[stageId]).toBeTruthy();
    });
    it(`en-US has stages.${stageId}`, () => {
      expect(casesEnUS.constants.stages[stageId]).toBeTruthy();
    });
    it(`ja-JP has stages.${stageId}`, () => {
      expect(casesJaJP.constants.stages[stageId]).toBeTruthy();
    });
  }
});

describe("cases i18n — detail tab keys", () => {
  for (const tab of CASE_DETAIL_TABS) {
    it(`zh-CN has detailTabs.${tab.key}`, () => {
      expect(
        casesZhCN.constants.detailTabs[
          tab.key as keyof typeof casesZhCN.constants.detailTabs
        ],
      ).toBeTruthy();
    });
    it(`en-US has detailTabs.${tab.key}`, () => {
      expect(
        casesEnUS.constants.detailTabs[
          tab.key as keyof typeof casesEnUS.constants.detailTabs
        ],
      ).toBeTruthy();
    });
    it(`ja-JP has detailTabs.${tab.key}`, () => {
      expect(
        casesJaJP.constants.detailTabs[
          tab.key as keyof typeof casesJaJP.constants.detailTabs
        ],
      ).toBeTruthy();
    });
  }
});

describe("cases i18n — log category keys", () => {
  for (const cat of LOG_CATEGORIES) {
    it(`zh-CN has logCategories.${cat.key}`, () => {
      expect(
        casesZhCN.constants.logCategories[
          cat.key as keyof typeof casesZhCN.constants.logCategories
        ],
      ).toBeTruthy();
    });
    it(`en-US has logCategories.${cat.key}`, () => {
      expect(
        casesEnUS.constants.logCategories[
          cat.key as keyof typeof casesEnUS.constants.logCategories
        ],
      ).toBeTruthy();
    });
    it(`ja-JP has logCategories.${cat.key}`, () => {
      expect(
        casesJaJP.constants.logCategories[
          cat.key as keyof typeof casesJaJP.constants.logCategories
        ],
      ).toBeTruthy();
    });
  }
});

describe("cases i18n — message filter keys", () => {
  for (const filter of MESSAGE_FILTERS) {
    const i18nKey =
      filter.key as keyof typeof casesZhCN.constants.messageFilters;
    it(`zh-CN has messageFilters for ${filter.key}`, () => {
      expect(casesZhCN.constants.messageFilters[i18nKey]).toBeTruthy();
    });
    it(`en-US has messageFilters for ${filter.key}`, () => {
      expect(casesEnUS.constants.messageFilters[i18nKey]).toBeTruthy();
    });
    it(`ja-JP has messageFilters for ${filter.key}`, () => {
      expect(casesJaJP.constants.messageFilters[i18nKey]).toBeTruthy();
    });
  }
});

// ─── Gate Labels ───────────────────────────────────────────────

describe("cases i18n — gate labels", () => {
  const GATE_IDS = ["A", "B", "C"] as const;
  for (const gateId of GATE_IDS) {
    it(`all locales have gates.${gateId}.label and desc`, () => {
      expect(casesZhCN.constants.gates[gateId].label).toBeTruthy();
      expect(casesZhCN.constants.gates[gateId].desc).toBeTruthy();
      expect(casesEnUS.constants.gates[gateId].label).toBeTruthy();
      expect(casesEnUS.constants.gates[gateId].desc).toBeTruthy();
      expect(casesJaJP.constants.gates[gateId].label).toBeTruthy();
      expect(casesJaJP.constants.gates[gateId].desc).toBeTruthy();
    });
  }
});

// ─── Billing Status Labels ─────────────────────────────────────

describe("cases i18n — billing status labels", () => {
  const BILLING_KEYS = [
    "paid",
    "partial",
    "unpaid",
    "arrears",
    "waived",
  ] as const;
  for (const key of BILLING_KEYS) {
    it(`all locales have billingStatuses.${key}`, () => {
      expect(casesZhCN.constants.billingStatuses[key]).toBeTruthy();
      expect(casesEnUS.constants.billingStatuses[key]).toBeTruthy();
      expect(casesJaJP.constants.billingStatuses[key]).toBeTruthy();
    });
  }
});

// ─── Create Steps ──────────────────────────────────────────────

describe("cases i18n — create step labels", () => {
  const STEP_KEYS = [1, 2, 3, 4] as const;
  for (const step of STEP_KEYS) {
    it(`all locales have createSteps.${step}`, () => {
      expect(casesZhCN.constants.createSteps[step]).toBeTruthy();
      expect(casesEnUS.constants.createSteps[step]).toBeTruthy();
      expect(casesJaJP.constants.createSteps[step]).toBeTruthy();
    });
  }
});

// ─── Tasks & Messages Tab Labels ────────────────────────────────

describe("cases i18n — tasks tab labels", () => {
  it("all locales have detail.tasks keys", () => {
    for (const key of ["title", "addTask", "addInline", "empty"] as const) {
      expect(casesZhCN.detail.tasks[key]).toBeTruthy();
      expect(casesEnUS.detail.tasks[key]).toBeTruthy();
      expect(casesJaJP.detail.tasks[key]).toBeTruthy();
    }
  });
});

describe("cases i18n — messages tab labels", () => {
  const MSG_KEYS = [
    "composerPlaceholder",
    "composerHint",
    "typeInternal",
    "typeClientVisible",
    "typePhone",
    "typeMeeting",
    "publish",
    "reply",
    "edit",
    "empty",
    "filterTitle",
    "filterReset",
  ] as const;

  it("all locales have detail.messages keys", () => {
    for (const key of MSG_KEYS) {
      expect(casesZhCN.detail.messages[key]).toBeTruthy();
      expect(casesEnUS.detail.messages[key]).toBeTruthy();
      expect(casesJaJP.detail.messages[key]).toBeTruthy();
    }
  });
});

// ─── Missing Key Fallback ──────────────────────────────────────

describe("cases i18n — missing key fallback", () => {
  it("constants.detailTabs i18nKey references resolve to existing i18n paths", () => {
    for (const tab of CASE_DETAIL_TABS) {
      const parts = tab.i18nKey.replace("cases.", "").split(".");
      let cursor: unknown = casesZhCN;
      for (const part of parts) {
        expect(cursor).toBeDefined();
        cursor = (cursor as Record<string, unknown>)[part];
      }
      expect(typeof cursor).toBe("string");
    }
  });

  it("constants.logCategories i18nKey references resolve to existing i18n paths", () => {
    for (const cat of LOG_CATEGORIES) {
      const parts = cat.i18nKey.replace("cases.", "").split(".");
      let cursor: unknown = casesZhCN;
      for (const part of parts) {
        expect(cursor).toBeDefined();
        cursor = (cursor as Record<string, unknown>)[part];
      }
      expect(typeof cursor).toBe("string");
    }
  });

  it("constants.messageFilters i18nKey references resolve to existing i18n paths", () => {
    for (const filter of MESSAGE_FILTERS) {
      const parts = filter.i18nKey.replace("cases.", "").split(".");
      let cursor: unknown = casesZhCN;
      for (const part of parts) {
        expect(cursor).toBeDefined();
        cursor = (cursor as Record<string, unknown>)[part];
      }
      expect(typeof cursor).toBe("string");
    }
  });

  it("no leaf value in zh-CN is empty string", () => {
    const emptyKeys = zhKeys.filter((k) => {
      const parts = k.split(".");
      let cursor: unknown = casesZhCN;
      for (const part of parts) {
        cursor = (cursor as Record<string, unknown>)[part];
      }
      return cursor === "";
    });
    expect(emptyKeys).toEqual([]);
  });
});

// ─── i18nKey resolution for constants ────────────────────────────

describe("cases i18n — i18nKey resolution (p0-fe-013-03)", () => {
  it("every CASE_STAGES entry has a correctly formatted i18nKey", () => {
    for (const [code, stage] of Object.entries(CASE_STAGES)) {
      expect(stage.i18nKey).toBe(`cases.constants.stages.${code}`);
    }
  });

  it("every CASE_DETAIL_TABS entry has a correctly formatted i18nKey", () => {
    for (const tab of CASE_DETAIL_TABS) {
      expect(tab.i18nKey).toBe(`cases.constants.detailTabs.${tab.key}`);
    }
  });

  it("CASE_DETAIL_TABS keys match CASE_DETAIL_TAB_KEYS in order", () => {
    expect(CASE_DETAIL_TABS.map((t) => t.key)).toEqual([
      ...CASE_DETAIL_TAB_KEYS,
    ]);
  });

  it("every CASE_GATES entry has correctly formatted i18nKey and descI18nKey", () => {
    for (const [id, gate] of Object.entries(CASE_GATES)) {
      expect(gate.i18nKey).toBe(`cases.constants.gates.${id}.label`);
      expect(gate.descI18nKey).toBe(`cases.constants.gates.${id}.desc`);
    }
  });

  it("every BILLING_STATUSES entry has a correctly formatted i18nKey", () => {
    for (const [key, def] of Object.entries(BILLING_STATUSES)) {
      expect(def.i18nKey).toBe(`cases.constants.billingStatuses.${key}`);
    }
  });

  it("every MESSAGE_FILTERS entry has a correctly formatted i18nKey", () => {
    for (const f of MESSAGE_FILTERS) {
      expect(f.i18nKey).toBe(`cases.constants.messageFilters.${f.key}`);
    }
  });

  it("every CREATE_CASE_STEPS entry has a correctly formatted i18nKey", () => {
    for (const step of CREATE_CASE_STEPS) {
      expect(step.i18nKey).toMatch(/^cases\.create\.steps\.step\d$/);
    }
  });
});

// ─── Summary cards i18n ──────────────────────────────────────────

describe("cases i18n — summary cards (p0-fe-013-03)", () => {
  const SUMMARY_KEYS = [
    "activeCases",
    "failedValidations",
    "dueSoon",
    "unpaidTotal",
  ] as const;

  it("every summary card key has constants.summaryCards.<key> in all locales", () => {
    for (const key of SUMMARY_KEYS) {
      expect(casesZhCN.constants.summaryCards).toHaveProperty(key);
      expect(casesEnUS.constants.summaryCards).toHaveProperty(key);
      expect(casesJaJP.constants.summaryCards).toHaveProperty(key);
    }
  });
});

// ─── Tab counter i18n ────────────────────────────────────────────

describe("cases i18n — tab counters (p0-fe-013-03)", () => {
  const COUNTER_KEYS = ["blocking", "pending"] as const;

  it("every tab counter key exists in all locales", () => {
    for (const key of COUNTER_KEYS) {
      expect(casesZhCN.constants.tabCounters).toHaveProperty(key);
      expect(casesEnUS.constants.tabCounters).toHaveProperty(key);
      expect(casesJaJP.constants.tabCounters).toHaveProperty(key);
    }
  });

  it("tab counter messages contain {count} placeholder", () => {
    for (const key of COUNTER_KEYS) {
      expect(casesZhCN.constants.tabCounters[key]).toContain("{count}");
      expect(casesEnUS.constants.tabCounters[key]).toContain("{count}");
      expect(casesJaJP.constants.tabCounters[key]).toContain("{count}");
    }
  });
});

// ─── Helper function fallback behavior ──────────────────────────

describe("cases i18n — helper function fallback (p0-fe-013-03)", () => {
  it("getStageI18nKey returns matching i18nKey for known stages", () => {
    for (const id of CASE_STAGE_IDS) {
      expect(getStageI18nKey(id)).toBe(CASE_STAGES[id].i18nKey);
    }
  });

  it("getStageI18nKey returns empty for unknown stage", () => {
    expect(getStageI18nKey("S99")).toBe("");
    expect(getStageI18nKey("")).toBe("");
  });

  it("getStageLabel returns fallback for known stages", () => {
    for (const id of CASE_STAGE_IDS) {
      expect(getStageLabel(id)).toBe(CASE_STAGES[id].label);
    }
  });

  it("getStageLabel returns raw value for unknown stage", () => {
    expect(getStageLabel("UNKNOWN")).toBe("UNKNOWN");
  });

  it("getBillingStatusI18nKey returns matching key for known statuses", () => {
    const KEYS = ["paid", "partial", "unpaid", "arrears", "waived"] as const;
    for (const key of KEYS) {
      expect(getBillingStatusI18nKey(key)).toBe(BILLING_STATUSES[key].i18nKey);
    }
  });

  it("getBillingStatusI18nKey returns empty for unknown status", () => {
    expect(getBillingStatusI18nKey("UNKNOWN")).toBe("");
  });

  it("getBillingStatusLabel returns raw value for unknown status", () => {
    expect(getBillingStatusLabel("UNKNOWN")).toBe("UNKNOWN");
  });

  it("getGateI18nKey returns matching key for known gates", () => {
    for (const id of ["A", "B", "C"] as const) {
      expect(getGateI18nKey(id)).toBe(CASE_GATES[id].i18nKey);
    }
  });

  it("getGateI18nKey returns empty for unknown gate", () => {
    expect(getGateI18nKey("X")).toBe("");
  });

  it("getGateLabel returns raw value for unknown gate", () => {
    expect(getGateLabel("X")).toBe("X");
  });

  it("getPhaseI18nKey returns matching key for known phases", () => {
    for (const phase of BUSINESS_PHASES) {
      expect(getPhaseI18nKey(phase)).toBe(BUSINESS_PHASE_MAP[phase].i18nKey);
    }
  });

  it("getPhaseI18nKey returns empty for unknown phase", () => {
    expect(getPhaseI18nKey("UNKNOWN")).toBe("");
  });

  it("getPhaseLabel returns fallback for known phases", () => {
    for (const phase of BUSINESS_PHASES) {
      expect(getPhaseLabel(phase)).toBe(BUSINESS_PHASE_MAP[phase].label);
    }
  });

  it("getPhaseLabel returns raw value for unknown phase", () => {
    expect(getPhaseLabel("UNKNOWN")).toBe("UNKNOWN");
  });
});
