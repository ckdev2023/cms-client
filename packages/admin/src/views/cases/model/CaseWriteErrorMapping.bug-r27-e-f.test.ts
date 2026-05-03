import { describe, expect, it } from "vitest";
import {
  resolveWriteErrorI18nKey,
  isGateBlockError,
  CASE_WRITE_ERROR_I18N_MAP,
} from "./CaseWriteErrorMapping";

describe("CaseWriteErrorMapping — R27-E/F task & reminder error codes", () => {
  const r27Codes = [
    "TASK_INVALID_ASSIGNEE_ID",
    "TASK_CREATE_FAILED",
    "TASK_ASSIGNEE_NOT_FOUND",
    "REMINDER_INVALID_CASE_ID",
    "REMINDER_CREATE_FAILED",
  ] as const;

  it.each(r27Codes)("%s is present in CASE_WRITE_ERROR_I18N_MAP", (code) => {
    expect(CASE_WRITE_ERROR_I18N_MAP[code]).toBeDefined();
  });

  it("TASK_INVALID_ASSIGNEE_ID → cases.writeErrors.taskInvalidAssigneeId", () => {
    expect(resolveWriteErrorI18nKey("TASK_INVALID_ASSIGNEE_ID")).toBe(
      "cases.writeErrors.taskInvalidAssigneeId",
    );
  });

  it("TASK_CREATE_FAILED → cases.writeErrors.taskCreateFailed", () => {
    expect(resolveWriteErrorI18nKey("TASK_CREATE_FAILED")).toBe(
      "cases.writeErrors.taskCreateFailed",
    );
  });

  it("TASK_ASSIGNEE_NOT_FOUND → cases.writeErrors.taskAssigneeNotFound", () => {
    expect(resolveWriteErrorI18nKey("TASK_ASSIGNEE_NOT_FOUND")).toBe(
      "cases.writeErrors.taskAssigneeNotFound",
    );
  });

  it("REMINDER_INVALID_CASE_ID → cases.writeErrors.reminderInvalidCaseId", () => {
    expect(resolveWriteErrorI18nKey("REMINDER_INVALID_CASE_ID")).toBe(
      "cases.writeErrors.reminderInvalidCaseId",
    );
  });

  it("REMINDER_CREATE_FAILED → cases.writeErrors.reminderCreateFailed", () => {
    expect(resolveWriteErrorI18nKey("REMINDER_CREATE_FAILED")).toBe(
      "cases.writeErrors.reminderCreateFailed",
    );
  });

  it("none of the R27-E/F codes are gate-block errors", () => {
    for (const code of r27Codes) {
      expect(isGateBlockError(code), `${code} should NOT be gate block`).toBe(
        false,
      );
    }
  });

  it("all R27-E/F i18n keys follow the cases.writeErrors.{camelCase} pattern", () => {
    for (const code of r27Codes) {
      const key = resolveWriteErrorI18nKey(code);
      expect(key).toMatch(/^cases\.writeErrors\.[a-z][a-zA-Z]+$/);
    }
  });
});
