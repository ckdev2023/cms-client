import { describe, it, expect } from "vitest";
import {
  buildCreateReminderPayload,
  buildRemindersPostUrl,
  type ReminderCreateInput,
} from "./CaseAdapterReminderWriteBuilders";

describe("buildCreateReminderPayload", () => {
  const base: ReminderCreateInput = {
    caseId: "case-001",
    targetType: "case",
    targetId: "case-001",
    remindAt: "2026-06-01T00:00:00.000Z",
    kind: "custom",
  };

  it("maps a basic case deadline", () => {
    const result = buildCreateReminderPayload(base);
    expect(result).toEqual({
      targetType: "case",
      targetId: "case-001",
      remindAt: "2026-06-01T00:00:00.000Z",
      caseId: "case-001",
      channel: "in_app",
      payloadSnapshot: { kind: "custom" },
    });
  });

  it("maps residence_expiry with case_party_residence targetType", () => {
    const input: ReminderCreateInput = {
      ...base,
      targetType: "case_party_residence",
      targetId: "party-001",
      kind: "residence_expiry",
    };
    const result = buildCreateReminderPayload(input);
    expect(result.targetType).toBe("case_party_residence");
    expect(result.targetId).toBe("party-001");
    expect(result.payloadSnapshot.kind).toBe("residence_expiry");
  });

  it("includes memo in payloadSnapshot when provided", () => {
    const result = buildCreateReminderPayload({
      ...base,
      memo: "reminder note",
    });
    expect(result.payloadSnapshot).toEqual({
      kind: "custom",
      memo: "reminder note",
    });
  });

  it("omits memo from payloadSnapshot when empty", () => {
    const result = buildCreateReminderPayload({ ...base, memo: "" });
    expect(result.payloadSnapshot).toEqual({ kind: "custom" });
    expect("memo" in result.payloadSnapshot).toBe(false);
  });

  it("maps renewal_reminder kind", () => {
    const result = buildCreateReminderPayload({
      ...base,
      kind: "renewal_reminder",
    });
    expect(result.payloadSnapshot.kind).toBe("renewal_reminder");
  });

  it("always sets channel to in_app", () => {
    const result = buildCreateReminderPayload(base);
    expect(result.channel).toBe("in_app");
  });
});

describe("buildRemindersPostUrl", () => {
  it("derives /api/reminders from /api/cases", () => {
    expect(buildRemindersPostUrl("/api/cases")).toBe("/api/reminders");
  });

  it("handles trailing slash", () => {
    expect(buildRemindersPostUrl("/api/cases/")).toBe("/api/reminders");
  });

  it("uses custom prefix", () => {
    expect(buildRemindersPostUrl("/custom/cases")).toBe("/custom/reminders");
  });
});
