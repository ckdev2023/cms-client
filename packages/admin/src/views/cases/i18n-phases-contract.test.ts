// ── Test Ownership ──────────────────────────────────────────────
// Owner: T-17 i18n baseline update.
// Locks down:
//   - every BUSINESS_PHASES entry has a matching i18n key in all 3 locales
//   - every caseTypes entry has a matching i18n key in all 3 locales
//   - every bmvSteps entry has a matching i18n key in all 3 locales
//   - create.* section keys (steps, applicationTypes, source, preSignGate)
//   - phase helper functions (getPhaseI18nKey, getPhaseLabel)
//   - writeErrors cross-locale parity
// ────────────────────────────────────────────────────────────────

import { describe, expect, it } from "vitest";
import casesEnUS from "../../i18n/messages/cases/en-US";
import casesZhCN from "../../i18n/messages/cases/zh-CN";
import casesJaJP from "../../i18n/messages/cases/ja-JP";
import {
  BUSINESS_PHASES,
  BUSINESS_PHASE_MAP,
  getPhaseBadge,
  getPhaseI18nKey,
  getPhaseLabel,
} from "./constants";

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

// ─── Phase i18n keys ────────────────────────────────────────────

describe("phase i18n keys (T-17)", () => {
  it("every BUSINESS_PHASES entry has a PHASE_DEF with i18nKey", () => {
    for (const phase of BUSINESS_PHASES) {
      expect(BUSINESS_PHASE_MAP[phase]).toBeDefined();
      expect(BUSINESS_PHASE_MAP[phase].i18nKey).toBe(
        `cases.constants.phases.${phase}`,
      );
    }
  });

  it.each(LOCALES.map((l) => [l.name, l] as const))(
    "all phase i18n keys resolve in %s",
    (_, locale) => {
      for (const phase of BUSINESS_PHASES) {
        const key = stripCasesPrefix(BUSINESS_PHASE_MAP[phase].i18nKey);
        const value = resolveKey(locale.messages, key);
        expect(value, `${locale.name} missing phase ${phase}`).toBeTruthy();
        expect(typeof value).toBe("string");
      }
    },
  );

  it("getPhaseI18nKey returns valid key for known phases", () => {
    for (const phase of BUSINESS_PHASES) {
      expect(getPhaseI18nKey(phase)).toBe(`cases.constants.phases.${phase}`);
    }
  });

  it("getPhaseI18nKey returns empty string for unknown phase", () => {
    expect(getPhaseI18nKey("UNKNOWN")).toBe("");
    expect(getPhaseI18nKey("")).toBe("");
  });

  it("ENTRY_SUCCESS resolves through PHASE_EXTRAS to SUCCESS badge & i18n", () => {
    expect(getPhaseI18nKey("ENTRY_SUCCESS")).toBe(getPhaseI18nKey("SUCCESS"));
    expect(getPhaseBadge("ENTRY_SUCCESS")).toBe(getPhaseBadge("SUCCESS"));
    expect(getPhaseLabel("ENTRY_SUCCESS")).toBe(getPhaseLabel("SUCCESS"));
  });

  it("getPhaseLabel returns fallback label for known phases", () => {
    for (const phase of BUSINESS_PHASES) {
      expect(getPhaseLabel(phase)).toBeTruthy();
    }
  });

  it("getPhaseLabel returns raw input for unknown phase", () => {
    expect(getPhaseLabel("UNKNOWN")).toBe("UNKNOWN");
  });
});

// ─── Case type i18n keys ────────────────────────────────────────

describe("case type i18n keys (T-17)", () => {
  const CASE_TYPE_KEYS = Object.keys(
    casesEnUS.constants.caseTypes,
  ) as (keyof typeof casesEnUS.constants.caseTypes)[];

  it.each(LOCALES.map((l) => [l.name, l] as const))(
    "all caseTypes keys resolve in %s",
    (_, locale) => {
      for (const key of CASE_TYPE_KEYS) {
        const value = resolveKey(locale.messages, `constants.caseTypes.${key}`);
        expect(value, `${locale.name} missing caseTypes.${key}`).toBeTruthy();
        expect(typeof value).toBe("string");
      }
    },
  );
});

// ─── BMV step i18n keys ─────────────────────────────────────────

describe("bmvSteps i18n keys (T-17)", () => {
  const BMV_STEP_KEYS = Object.keys(
    casesEnUS.constants.bmvSteps,
  ) as (keyof typeof casesEnUS.constants.bmvSteps)[];

  it.each(LOCALES.map((l) => [l.name, l] as const))(
    "all bmvSteps keys resolve in %s",
    (_, locale) => {
      for (const key of BMV_STEP_KEYS) {
        const value = resolveKey(locale.messages, `constants.bmvSteps.${key}`);
        expect(value, `${locale.name} missing bmvSteps.${key}`).toBeTruthy();
        expect(typeof value).toBe("string");
      }
    },
  );
});

describe("phases ↔ bmvSteps alignment (COE / overseas visa / entry result)", () => {
  /** 业务阶段名与进度条子步骤文案一致，避免状态流转与安全提示口径分裂。 */
  it.each(LOCALES.map((l) => [l.name, l.messages] as const))(
    "%s: COE_SENT and VISA_APPLYING phases match bmvSteps",
    (_, messages) => {
      expect(messages.constants.phases.COE_SENT).toBe(
        messages.constants.bmvSteps.COE_SENT,
      );
      expect(messages.constants.phases.VISA_APPLYING).toBe(
        messages.constants.bmvSteps.VISA_APPLYING,
      );
    },
  );

  it.each(LOCALES.map((l) => [l.name, l.messages] as const))(
    "%s: SUCCESS phase matches ENTRY_SUCCESS bmvStep (返签結果・入境確認)",
    (_, messages) => {
      expect(messages.constants.phases.SUCCESS).toBe(
        messages.constants.bmvSteps.ENTRY_SUCCESS,
      );
    },
  );
});

// ─── Create section i18n keys ───────────────────────────────────

describe("create section i18n keys (T-17)", () => {
  const ALL_CREATE_KEYS = [
    "create.steps.step1",
    "create.steps.step2",
    "create.steps.step3",
    "create.steps.step4",
    "create.applicationTypes.certification",
    "create.applicationTypes.change_of_status",
    "create.applicationTypes.renewal",
    "create.source.kicker",
    "create.source.fromCustomer",
    "create.source.fromLead",
    "create.source.familyBulk",
    "create.source.templateLocked",
    "create.source.resolving",
    "create.preSignGate.title",
    "create.preSignGate.passed",
    "create.preSignGate.blockedTitle",
    "create.preSignGate.blockedDesc",
    "create.preSignGate.blockerQuestionnaire",
    "create.preSignGate.blockerQuote",
    "create.preSignGate.blockerSign",
    "create.preSignGate.blockerIntake",
    "create.preSignGate.goToCustomer",
  ] as const;

  it.each(LOCALES.map((l) => [l.name, l] as const))(
    "all create.* required keys resolve in %s",
    (_, locale) => {
      const missing: string[] = [];
      for (const key of ALL_CREATE_KEYS) {
        const value = resolveKey(locale.messages, key);
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

// ─── Write errors cross-locale parity ───────────────────────────

describe("writeErrors parity (T-17)", () => {
  const enKeys = Object.keys(casesEnUS.writeErrors).sort();
  const zhKeys = Object.keys(casesZhCN.writeErrors).sort();
  const jaKeys = Object.keys(casesJaJP.writeErrors).sort();

  it("zh-CN has same writeErrors keys as en-US", () => {
    expect(zhKeys).toEqual(enKeys);
  });

  it("ja-JP has same writeErrors keys as en-US", () => {
    expect(jaKeys).toEqual(enKeys);
  });
});
