import { describe, expect, it } from "vitest";
import customersEnUS from "../../i18n/messages/customers/en-US";
import customersZhCN from "../../i18n/messages/customers/zh-CN";
import customersJaJP from "../../i18n/messages/customers/ja-JP";

type LocaleMessages = typeof customersEnUS;

const LOCALES: { name: string; messages: LocaleMessages }[] = [
  { name: "en-US", messages: customersEnUS },
  { name: "zh-CN", messages: customersZhCN as unknown as LocaleMessages },
  { name: "ja-JP", messages: customersJaJP as unknown as LocaleMessages },
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

function resolveKey(obj: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, part) => {
    if (acc && typeof acc === "object")
      return (acc as Record<string, unknown>)[part];
    return undefined;
  }, obj);
}

// ─── Cross-locale key parity ────────────────────────────────────

describe("customers i18n cross-locale key parity (T-17)", () => {
  const enKeys = collectLeafKeys(
    customersEnUS as unknown as Record<string, unknown>,
  );

  it("zh-CN has same keys as en-US", () => {
    const zhKeys = collectLeafKeys(
      customersZhCN as unknown as Record<string, unknown>,
    );
    expect(zhKeys).toEqual(enKeys);
  });

  it("ja-JP has same keys as en-US", () => {
    const jaKeys = collectLeafKeys(
      customersJaJP as unknown as Record<string, unknown>,
    );
    expect(jaKeys).toEqual(enKeys);
  });
});

// ─── basicInfo.fields keys ──────────────────────────────────────

describe("customers i18n — basicInfo.fields keys (T-17)", () => {
  const FIELD_KEYS = [
    "displayName",
    "legalName",
    "furigana",
    "nationality",
    "gender",
    "genderNone",
    "genderMale",
    "genderFemale",
    "birthDate",
    "phone",
    "email",
    "group",
    "owner",
    "referralSource",
    "location",
    "locationNone",
    "locationOverseas",
    "locationJapan",
    "sourceType",
    "sourceTypeNone",
    "sourceTypeReferral",
    "sourceTypeWeb",
    "sourceTypeAds",
    "visaType",
    "visaTypeNone",
    "visaTypeBmvDerived",
    "referrerName",
    "avatar",
    "note",
  ] as const;

  it.each(LOCALES.map((l) => [l.name, l] as const))(
    "all basicInfo.fields keys resolve in %s",
    (_, locale) => {
      const missing: string[] = [];
      for (const key of FIELD_KEYS) {
        const value = resolveKey(
          locale.messages as unknown as Record<string, unknown>,
          `basicInfo.fields.${key}`,
        );
        if (value === undefined || value === null || value === "") {
          missing.push(key);
        }
      }
      expect(
        missing,
        `${locale.name} missing basicInfo.fields: ${missing.join(", ")}`,
      ).toEqual([]);
    },
  );
});

// ─── logsTab (activity log) keys ────────────────────────────────

describe("customers i18n — logsTab (activity log) keys (T-17)", () => {
  const LOG_TAB_KEYS = [
    "logsTab.title",
    "logsTab.loading",
    "logsTab.requestFailed",
    "logsTab.retry",
    "logsTab.filterLabel",
    "logsTab.filterAll",
    "logsTab.filterInfo",
    "logsTab.filterRelation",
    "logsTab.filterCase",
    "logsTab.filterComm",
    "logsTab.colTime",
    "logsTab.colType",
    "logsTab.colContent",
    "logsTab.colActor",
    "logsTab.totalLabel",
    "logsTab.prev",
    "logsTab.next",
    "logsTab.pageInfo",
    "logsTab.emptyTitle",
    "logsTab.types.info",
    "logsTab.types.relation",
    "logsTab.types.case",
    "logsTab.types.comm",
  ] as const;

  it.each(LOCALES.map((l) => [l.name, l] as const))(
    "all logsTab keys resolve in %s",
    (_, locale) => {
      const missing: string[] = [];
      for (const key of LOG_TAB_KEYS) {
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

// ─── caseSummary keys ───────────────────────────────────────────

describe("customers i18n — caseSummary keys (T-17)", () => {
  const SUMMARY_KEYS = [
    "caseSummary.label",
    "caseSummary.total",
    "caseSummary.active",
    "caseSummary.archived",
    "caseSummary.caseName",
    "caseSummary.lastCreated",
  ] as const;

  it.each(LOCALES.map((l) => [l.name, l] as const))(
    "all caseSummary keys resolve in %s",
    (_, locale) => {
      for (const key of SUMMARY_KEYS) {
        const value = resolveKey(
          locale.messages as unknown as Record<string, unknown>,
          key,
        );
        expect(value, `${locale.name} missing ${key}`).toBeTruthy();
        expect(typeof value).toBe("string");
      }
    },
  );
});

// ─── tabs keys ──────────────────────────────────────────────────

describe("customers i18n — tabs keys (T-17)", () => {
  const TAB_KEYS = ["basic", "cases", "contacts", "comms", "log"] as const;

  it.each(LOCALES.map((l) => [l.name, l] as const))(
    "all tab labels resolve in %s",
    (_, locale) => {
      for (const key of TAB_KEYS) {
        const value = resolveKey(
          locale.messages as unknown as Record<string, unknown>,
          `tabs.${key}`,
        );
        expect(value, `${locale.name} missing tabs.${key}`).toBeTruthy();
      }
    },
  );
});

// ─── bmvIntake keys ─────────────────────────────────────────────

describe("customers i18n — bmvIntake required keys (T-17)", () => {
  const BMV_INTAKE_KEYS = [
    "bmvIntake.title",
    "bmvIntake.nextStep",
    "bmvIntake.gateHint",
    "bmvIntake.steps.questionnaire",
    "bmvIntake.steps.quote",
    "bmvIntake.steps.sign",
    "bmvIntake.stage.not_started",
    "bmvIntake.stage.questionnaire_pending",
    "bmvIntake.stage.quote_pending",
    "bmvIntake.stage.sign_pending",
    "bmvIntake.stage.ready_for_case_creation",
  ] as const;

  it.each(LOCALES.map((l) => [l.name, l] as const))(
    "all bmvIntake keys resolve in %s",
    (_, locale) => {
      for (const key of BMV_INTAKE_KEYS) {
        const value = resolveKey(
          locale.messages as unknown as Record<string, unknown>,
          key,
        );
        expect(value, `${locale.name} missing ${key}`).toBeTruthy();
      }
    },
  );
});
