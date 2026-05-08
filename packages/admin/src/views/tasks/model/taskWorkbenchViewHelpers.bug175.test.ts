import { describe, expect, it, vi } from "vitest";
import type { ReminderRecord } from "../types";
import { reminderTitle } from "./taskWorkbenchViewHelpers";
import { residenceLabelToCode } from "./residenceLabelToTypeCode";
import { getCaseTypeI18nKey } from "../../../shared/model/caseTypeI18n";

function createReminder(
  overrides: Partial<ReminderRecord> = {},
): ReminderRecord {
  return {
    id: "eefe7803-a4a8-4f38-870b-b6ebd12b3e97",
    caseId: "df9d1e84-fd62-4687-9297-decd8848412f",
    caseNo: "CASE-202604-0011",
    caseTitle: "田中太郎 経営管理ビザ",
    targetType: "case",
    targetId: "df9d1e84-fd62-4687-9297-decd8848412f",
    remindAt: "2026-05-01T00:00:00.000Z",
    recipientType: "internal_user",
    recipientId: "00000000-0000-4000-8000-000000000011",
    recipientName: "Local Admin",
    channel: "in_app",
    dedupeKey: "case:residence_expiry:180",
    sendStatus: "pending",
    retryCount: 0,
    sentAt: null,
    payloadSnapshot: null,
    createdAt: "2026-04-28T09:00:00.000Z",
    updatedAt: "2026-04-28T09:00:00.000Z",
    ...overrides,
  };
}

const EN_CATALOG: Record<string, string> = {
  "cases.constants.caseTypes.business_manager": "Business Manager",
  "cases.constants.caseTypes.dependent_visa": "Dependent Visa",
  "cases.constants.caseTypes.engineer_humanities_intl_visa":
    "Engineer/Specialist (CoE)",
};

const ZH_CATALOG: Record<string, string> = {
  "cases.constants.caseTypes.business_manager": "经营管理签",
  "cases.constants.caseTypes.dependent_visa": "家族滞在",
  "cases.constants.caseTypes.engineer_humanities_intl_visa": "技人国（认定）",
};

const JA_CATALOG: Record<string, string> = {
  "cases.constants.caseTypes.business_manager": "経営管理",
  "cases.constants.caseTypes.dependent_visa": "家族滞在",
  "cases.constants.caseTypes.engineer_humanities_intl_visa": "技人国（認定）",
};

function makeT(catalog: Record<string, string>) {
  return (key: string, named?: Record<string, string | number>): string => {
    if (key === "tasks.reminderTitle.daysBefore") {
      return `${String(named?.visa)}Renewal reminder ${String(named?.days)} days before expiry`;
    }
    if (key === "tasks.reminderTitle.daysBeforeNoVisa") {
      return `Renewal reminder ${String(named?.days)} days before expiry`;
    }
    return catalog[key] ?? key;
  };
}

function makeResolver(catalog: Record<string, string>) {
  return (raw: string): string | null => {
    const code = residenceLabelToCode(raw);
    if (!code) return null;
    const key = getCaseTypeI18nKey(code);
    return key ? (catalog[key] ?? null) : null;
  };
}

describe("BUG-175 reminderTitle visa label i18n resolution", () => {
  const reminder = createReminder({
    payloadSnapshot: { statusOfResidence: "経営・管理", daysBefore: 180 },
  });

  it("en-US: resolves ja-JP label to English via i18n catalog", () => {
    const result = reminderTitle(
      reminder,
      makeT(EN_CATALOG),
      makeResolver(EN_CATALOG),
    );
    expect(result).toBe(
      "Business Manager · Renewal reminder 180 days before expiry",
    );
  });

  it("zh-CN: resolves ja-JP label to Chinese via i18n catalog", () => {
    const result = reminderTitle(
      reminder,
      makeT(ZH_CATALOG),
      makeResolver(ZH_CATALOG),
    );
    expect(result).toBe("经营管理签 · Renewal reminder 180 days before expiry");
  });

  it("ja-JP: resolves ja-JP label to catalog value (normalized)", () => {
    const result = reminderTitle(
      reminder,
      makeT(JA_CATALOG),
      makeResolver(JA_CATALOG),
    );
    expect(result).toBe("経営管理 · Renewal reminder 180 days before expiry");
  });

  it("unknown label: preserves raw value and does not throw", () => {
    const unknownReminder = createReminder({
      payloadSnapshot: { statusOfResidence: "未知の在留", daysBefore: 90 },
    });
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = reminderTitle(
      unknownReminder,
      makeT(EN_CATALOG),
      makeResolver(EN_CATALOG),
    );
    expect(result).toBe("未知の在留 · Renewal reminder 90 days before expiry");
    warnSpy.mockRestore();
  });

  it("without resolver: preserves raw label (backward compatible)", () => {
    const result = reminderTitle(reminder, makeT(EN_CATALOG));
    expect(result).toBe("経営・管理 · Renewal reminder 180 days before expiry");
  });
});
