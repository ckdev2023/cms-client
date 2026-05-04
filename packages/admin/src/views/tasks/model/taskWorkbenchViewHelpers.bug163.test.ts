import { describe, expect, it } from "vitest";
import type { ReminderRecord } from "../types";
import {
  maskDedupeKeyUuid,
  reminderCaseLabel,
  reminderMeta,
  reminderRecipientLabel,
  reminderShortId,
  reminderTitle,
} from "./taskWorkbenchViewHelpers";

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

const t = (key: string, named?: Record<string, string | number>): string => {
  if (key === "tasks.reminderMeta.case") return `Case ${String(named?.id)}`;
  if (key === "tasks.reminderMeta.recipient")
    return `Recipient ${String(named?.id)}`;
  if (key === "tasks.reminderMeta.dedupeKey")
    return `Dedupe ${String(named?.key)}`;
  if (key === "tasks.reminderMeta.empty") return "—";
  if (key === "tasks.reminderTitle.case")
    return `Case ${String(named?.caseNo)} · ${String(named?.title)}`;
  if (key === "tasks.reminderTitle.fallback")
    return `${String(named?.type)} · ${String(named?.id)}`;
  return key;
};

describe("BUG-163 reminder reference resolution", () => {
  it("prefers caseNo over caseId in case label", () => {
    const reminder = createReminder({
      caseNo: "CASE-202604-0011",
      caseId: "df9d1e84-fd62-4687-9297-decd8848412f",
    });
    expect(reminderCaseLabel(reminder)).toBe("CASE-202604-0011");
  });

  it("falls back to short caseId when caseNo missing", () => {
    const reminder = createReminder({
      caseNo: null,
      caseId: "df9d1e84-fd62-4687-9297-decd8848412f",
    });
    expect(reminderCaseLabel(reminder)).toBe("df9d1e84");
  });

  it("returns null when both caseNo and caseId missing", () => {
    const reminder = createReminder({ caseNo: null, caseId: null });
    expect(reminderCaseLabel(reminder)).toBeNull();
  });

  it("prefers recipientName over recipientId in recipient label", () => {
    const reminder = createReminder({
      recipientName: "Local Admin",
      recipientId: "00000000-0000-4000-8000-000000000011",
    });
    expect(reminderRecipientLabel(reminder)).toBe("Local Admin");
  });

  it("falls back to short recipientId when recipientName missing", () => {
    const reminder = createReminder({
      recipientName: null,
      recipientId: "00000000-0000-4000-8000-000000000011",
    });
    expect(reminderRecipientLabel(reminder)).toBe("00000000");
  });

  it("treats whitespace-only recipientName as missing", () => {
    const reminder = createReminder({
      recipientName: "   ",
      recipientId: "00000000-0000-4000-8000-000000000011",
    });
    expect(reminderRecipientLabel(reminder)).toBe("00000000");
  });

  it("composes meta with human-friendly references", () => {
    const reminder = createReminder();
    expect(reminderMeta(reminder, t)).toBe(
      "Case CASE-202604-0011 · Recipient Local Admin",
    );
  });

  it("never leaks raw UUIDs into meta when refs missing", () => {
    const reminder = createReminder({
      caseNo: null,
      recipientName: null,
      caseId: "df9d1e84-fd62-4687-9297-decd8848412f",
      recipientId: "00000000-0000-4000-8000-000000000011",
    });
    const meta = reminderMeta(reminder, t);
    expect(meta).not.toContain("df9d1e84-fd62-4687");
    expect(meta).not.toContain("0000-4000-8000-000000000011");
    expect(meta).toBe("Case df9d1e84 · Recipient 00000000");
  });

  it("returns 8-char short id for the cell-meta hint", () => {
    const reminder = createReminder();
    expect(reminderShortId(reminder)).toBe("eefe7803");
  });
});

describe("BUG-193 reminderMeta drops dedupeKey segment", () => {
  it("excludes dedupeKey when present, keeps case and recipient", () => {
    const reminder = createReminder({
      dedupeKey: "case:residence_expiry:180",
    });
    const meta = reminderMeta(reminder, t);
    expect(meta).toBe("Case CASE-202604-0011 · Recipient Local Admin");
    expect(meta).not.toContain("dedupeKey");
    expect(meta).not.toContain("Dedupe");
    expect(meta).not.toContain("residence_expiry");
  });

  it("excludes dedupeKey with UUID, keeps case and recipient", () => {
    const reminder = createReminder({
      dedupeKey: "residence_period:e00ea5d2-210a-4f65-a205-5d4e0da4cc7d",
    });
    const meta = reminderMeta(reminder, t);
    expect(meta).toBe("Case CASE-202604-0011 · Recipient Local Admin");
    expect(meta).not.toContain("e00ea5d2");
  });

  it("returns empty placeholder when only dedupeKey present", () => {
    const reminder = createReminder({
      caseNo: null,
      caseId: null,
      recipientName: null,
      recipientId: null,
      dedupeKey: "case:residence_expiry:180",
    });
    expect(reminderMeta(reminder, t)).toBe("—");
  });
});

describe("BUG-171 dedupeKey UUID masking", () => {
  it("replaces UUID in dedupeKey with 8-char short form", () => {
    expect(
      maskDedupeKeyUuid(
        "residence_period:e00ea5d2-210a-4f65-a205-5d4e0da4cc7d",
      ),
    ).toBe("residence_period:e00ea5d2");
  });

  it("preserves dedupeKey without UUID unchanged", () => {
    expect(maskDedupeKeyUuid("case:residence_expiry:180")).toBe(
      "case:residence_expiry:180",
    );
  });

  it("masks multiple UUIDs in a single key", () => {
    const input =
      "link:aabbccdd-1122-3344-5566-778899aabbcc:ffeeddcc-aabb-ccdd-eeff-001122334455";
    expect(maskDedupeKeyUuid(input)).toBe("link:aabbccdd:ffeeddcc");
  });

  it("handles bare UUID without prefix", () => {
    expect(maskDedupeKeyUuid("e00ea5d2-210a-4f65-a205-5d4e0da4cc7d")).toBe(
      "e00ea5d2",
    );
  });

  it("reminderMeta excludes dedupeKey segment (BUG-193, supersedes BUG-171)", () => {
    const reminder = createReminder({
      dedupeKey: "residence_period:e00ea5d2-210a-4f65-a205-5d4e0da4cc7d",
    });
    const meta = reminderMeta(reminder, t);
    expect(meta).not.toContain("Dedupe");
    expect(meta).not.toContain("residence_period");
    expect(meta).toBe("Case CASE-202604-0011 · Recipient Local Admin");
  });
});

describe("R32-D reminderTitle case-type short-circuit", () => {
  it("returns case title when targetType is case and caseNo present", () => {
    const reminder = createReminder({
      targetType: "case",
      caseNo: "CASE-202604-0011",
      caseTitle: "田中太郎 経営管理ビザ",
      payloadSnapshot: null,
    });
    expect(reminderTitle(reminder, t)).toBe(
      "Case CASE-202604-0011 · 田中太郎 経営管理ビザ",
    );
  });

  it("uses empty string when caseTitle is null", () => {
    const reminder = createReminder({
      targetType: "case",
      caseNo: "CASE-202604-0011",
      caseTitle: null,
      payloadSnapshot: null,
    });
    expect(reminderTitle(reminder, t)).toBe("Case CASE-202604-0011 · ");
  });

  it("falls back to generic fallback when caseNo is missing", () => {
    const reminder = createReminder({
      targetType: "case",
      caseNo: null,
      caseTitle: "田中太郎 経営管理ビザ",
      payloadSnapshot: null,
    });
    expect(reminderTitle(reminder, t)).toBe(
      "case · df9d1e84-fd62-4687-9297-decd8848412f",
    );
  });

  it("prefers payload.label over case branch", () => {
    const reminder = createReminder({
      targetType: "case",
      caseNo: "CASE-202604-0011",
      caseTitle: "田中太郎 経営管理ビザ",
      payloadSnapshot: { label: "Custom label from payload" },
    });
    expect(reminderTitle(reminder, t)).toBe("Custom label from payload");
  });

  it("prefers daysBefore branch over case branch", () => {
    const tWithDays = (
      key: string,
      named?: Record<string, string | number>,
    ): string => {
      if (key === "tasks.reminderTitle.daysBeforeNoVisa")
        return `Renewal reminder ${String(named?.days)} days before expiry`;
      return t(key, named);
    };
    const reminder = createReminder({
      targetType: "case",
      caseNo: "CASE-202604-0011",
      caseTitle: "田中太郎 経営管理ビザ",
      payloadSnapshot: { daysBefore: 30 },
    });
    const result = reminderTitle(reminder, tWithDays);
    expect(result).toContain("30");
    expect(result).not.toContain("CASE-202604-0011");
  });
});
