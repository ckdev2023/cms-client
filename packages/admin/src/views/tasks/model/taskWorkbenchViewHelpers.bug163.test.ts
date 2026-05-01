import { describe, expect, it } from "vitest";
import type { ReminderRecord } from "../types";
import {
  reminderCaseLabel,
  reminderMeta,
  reminderRecipientLabel,
  reminderShortId,
} from "./taskWorkbenchViewHelpers";

function createReminder(
  overrides: Partial<ReminderRecord> = {},
): ReminderRecord {
  return {
    id: "eefe7803-a4a8-4f38-870b-b6ebd12b3e97",
    caseId: "df9d1e84-fd62-4687-9297-decd8848412f",
    caseNo: "CASE-202604-0011",
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
      "Case CASE-202604-0011 · Recipient Local Admin · Dedupe case:residence_expiry:180",
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
    expect(meta).toBe(
      "Case df9d1e84 · Recipient 00000000 · Dedupe case:residence_expiry:180",
    );
  });

  it("returns 8-char short id for the cell-meta hint", () => {
    const reminder = createReminder();
    expect(reminderShortId(reminder)).toBe("eefe7803");
  });
});
