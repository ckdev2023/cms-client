import { describe, expect, it } from "vitest";
import {
  resolveWriteErrorI18nKey,
  isGateBlockError,
  CASE_WRITE_ERROR_I18N_MAP,
} from "./CaseWriteErrorMapping";

describe("CaseWriteErrorMapping — R37-J GD_* generated-document error codes", () => {
  const gdCodes = [
    "GD_CASE_NOT_FOUND",
    "GD_CASE_S9_READONLY",
    "GD_NOT_FOUND",
    "GD_INVALID_STATUS",
    "GD_INVALID_TRANSITION",
    "GD_INVALID_OUTPUT_FORMAT",
    "GD_TITLE_REQUIRED",
  ] as const;

  it.each(gdCodes)("%s is present in CASE_WRITE_ERROR_I18N_MAP", (code) => {
    expect(CASE_WRITE_ERROR_I18N_MAP[code]).toBeDefined();
  });

  it("GD_CASE_NOT_FOUND → cases.writeErrors.gdCaseNotFound", () => {
    expect(resolveWriteErrorI18nKey("GD_CASE_NOT_FOUND")).toBe(
      "cases.writeErrors.gdCaseNotFound",
    );
  });

  it("GD_CASE_S9_READONLY → cases.writeErrors.gdCaseS9Readonly", () => {
    expect(resolveWriteErrorI18nKey("GD_CASE_S9_READONLY")).toBe(
      "cases.writeErrors.gdCaseS9Readonly",
    );
  });

  it("GD_NOT_FOUND → cases.writeErrors.gdNotFound", () => {
    expect(resolveWriteErrorI18nKey("GD_NOT_FOUND")).toBe(
      "cases.writeErrors.gdNotFound",
    );
  });

  it("GD_INVALID_STATUS → cases.writeErrors.gdInvalidStatus", () => {
    expect(resolveWriteErrorI18nKey("GD_INVALID_STATUS")).toBe(
      "cases.writeErrors.gdInvalidStatus",
    );
  });

  it("GD_INVALID_TRANSITION → cases.writeErrors.gdInvalidTransition", () => {
    expect(resolveWriteErrorI18nKey("GD_INVALID_TRANSITION")).toBe(
      "cases.writeErrors.gdInvalidTransition",
    );
  });

  it("GD_INVALID_OUTPUT_FORMAT → cases.writeErrors.gdInvalidOutputFormat", () => {
    expect(resolveWriteErrorI18nKey("GD_INVALID_OUTPUT_FORMAT")).toBe(
      "cases.writeErrors.gdInvalidOutputFormat",
    );
  });

  it("GD_TITLE_REQUIRED → cases.writeErrors.gdTitleRequired", () => {
    expect(resolveWriteErrorI18nKey("GD_TITLE_REQUIRED")).toBe(
      "cases.writeErrors.gdTitleRequired",
    );
  });

  it("none of the GD_* codes are gate-block errors", () => {
    for (const code of gdCodes) {
      expect(isGateBlockError(code), `${code} should NOT be gate block`).toBe(
        false,
      );
    }
  });

  it("all GD_* i18n keys follow the cases.writeErrors.{camelCase} pattern", () => {
    for (const code of gdCodes) {
      const key = resolveWriteErrorI18nKey(code);
      expect(key).toMatch(/^cases\.writeErrors\.[a-z][a-zA-Z0-9]+$/);
    }
  });
});
