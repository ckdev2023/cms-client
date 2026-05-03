import { describe, expect, it } from "vitest";
import {
  resolveWriteErrorI18nKey,
  isGateBlockError,
  CASE_WRITE_ERROR_I18N_MAP,
} from "./CaseWriteErrorMapping";

describe("CaseWriteErrorMapping — R28-A3 new error codes", () => {
  const r28Codes = [
    "REMINDER_REF_NOT_FOUND",
    "REMINDER_VALIDATION_FAILED",
    "TASK_INVALID_PRIORITY",
  ] as const;

  it.each(r28Codes)("%s is present in CASE_WRITE_ERROR_I18N_MAP", (code) => {
    expect(CASE_WRITE_ERROR_I18N_MAP[code]).toBeDefined();
  });

  it("REMINDER_REF_NOT_FOUND → cases.writeErrors.reminderRefNotFound", () => {
    expect(resolveWriteErrorI18nKey("REMINDER_REF_NOT_FOUND")).toBe(
      "cases.writeErrors.reminderRefNotFound",
    );
  });

  it("REMINDER_VALIDATION_FAILED → cases.writeErrors.reminderValidationFailed", () => {
    expect(resolveWriteErrorI18nKey("REMINDER_VALIDATION_FAILED")).toBe(
      "cases.writeErrors.reminderValidationFailed",
    );
  });

  it("TASK_INVALID_PRIORITY → cases.writeErrors.taskInvalidPriority", () => {
    expect(resolveWriteErrorI18nKey("TASK_INVALID_PRIORITY")).toBe(
      "cases.writeErrors.taskInvalidPriority",
    );
  });

  it("none of the R28-A3 codes are gate-block errors", () => {
    for (const code of r28Codes) {
      expect(isGateBlockError(code), `${code} should NOT be gate block`).toBe(
        false,
      );
    }
  });

  it("all R28-A3 i18n keys follow the cases.writeErrors.{camelCase} pattern", () => {
    for (const code of r28Codes) {
      const key = resolveWriteErrorI18nKey(code);
      expect(key).toMatch(/^cases\.writeErrors\.[a-z][a-zA-Z]+$/);
    }
  });

  it("unmapped code still falls back to cases.writeErrors.unknown", () => {
    expect(resolveWriteErrorI18nKey("TOTALLY_UNKNOWN_CODE")).toBe(
      "cases.writeErrors.unknown",
    );
  });

  it("undefined input falls back to cases.writeErrors.unknown", () => {
    expect(resolveWriteErrorI18nKey(undefined)).toBe(
      "cases.writeErrors.unknown",
    );
  });
});
