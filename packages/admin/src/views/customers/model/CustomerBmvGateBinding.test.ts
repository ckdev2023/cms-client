import { describe, expect, it } from "vitest";
import {
  BMV_GATE_BLOCKER_CODES,
  BMV_GATE_ERROR_CODE,
  isBmvGateError,
  resolveBmvBlockerI18nKey,
  resolveFirstBlockerI18nKey,
  resolveGateStatusI18nKeys,
} from "./CustomerBmvGateBinding";

describe("BMV_GATE_ERROR_CODE", () => {
  it("equals the server-side CASE_BMV_GATE_ERROR_CODE", () => {
    expect(BMV_GATE_ERROR_CODE).toBe("CASE_BMV_GATE_BLOCKED");
  });
});

describe("BMV_GATE_BLOCKER_CODES", () => {
  it("aligns with server BMV_CASE_CREATION_GATE_CODES", () => {
    expect(BMV_GATE_BLOCKER_CODES.QUESTIONNAIRE_NOT_RETURNED).toBe(
      "BMV_QUESTIONNAIRE_NOT_RETURNED",
    );
    expect(BMV_GATE_BLOCKER_CODES.QUOTE_NOT_CONFIRMED).toBe(
      "BMV_QUOTE_NOT_CONFIRMED",
    );
    expect(BMV_GATE_BLOCKER_CODES.NOT_SIGNED).toBe("BMV_NOT_SIGNED");
    expect(BMV_GATE_BLOCKER_CODES.INTAKE_NOT_READY).toBe(
      "BMV_INTAKE_NOT_READY",
    );
  });

  it("has unique values", () => {
    const values = Object.values(BMV_GATE_BLOCKER_CODES);
    expect(new Set(values).size).toBe(values.length);
  });

  it("all values are BMV_-prefixed", () => {
    for (const v of Object.values(BMV_GATE_BLOCKER_CODES)) {
      expect(v.startsWith("BMV_")).toBe(true);
    }
  });
});

describe("isBmvGateError", () => {
  it("returns true for CASE_BMV_GATE_BLOCKED", () => {
    expect(isBmvGateError("CASE_BMV_GATE_BLOCKED")).toBe(true);
  });

  it("returns false for other error codes", () => {
    expect(isBmvGateError("CASE_TRANSITION_NOT_ALLOWED")).toBe(false);
    expect(isBmvGateError("VALIDATION_ERROR")).toBe(false);
    expect(isBmvGateError(undefined)).toBe(false);
    expect(isBmvGateError("")).toBe(false);
  });
});

describe("resolveBmvBlockerI18nKey", () => {
  it("maps QUESTIONNAIRE_NOT_RETURNED to questionnaire error key", () => {
    expect(resolveBmvBlockerI18nKey("BMV_QUESTIONNAIRE_NOT_RETURNED")).toBe(
      "customers.detail.bmvIntake.errors.questionnaireRequiredForQuote",
    );
  });

  it("maps QUOTE_NOT_CONFIRMED to quote error key", () => {
    expect(resolveBmvBlockerI18nKey("BMV_QUOTE_NOT_CONFIRMED")).toBe(
      "customers.detail.bmvIntake.errors.quoteRequiredForSign",
    );
  });

  it("maps NOT_SIGNED to sign error key", () => {
    expect(resolveBmvBlockerI18nKey("BMV_NOT_SIGNED")).toBe(
      "customers.detail.bmvIntake.errors.signRequiredForCase",
    );
  });

  it("maps INTAKE_NOT_READY to gate sign-not-done key", () => {
    expect(resolveBmvBlockerI18nKey("BMV_INTAKE_NOT_READY")).toBe(
      "customers.detail.bmvIntake.gate.signNotDone",
    );
  });

  it("returns fallback for unknown codes", () => {
    expect(resolveBmvBlockerI18nKey("UNKNOWN_CODE")).toBe(
      "customers.detail.bmvIntake.actionState.validationError",
    );
  });
});

describe("resolveFirstBlockerI18nKey", () => {
  it("returns the first blocker i18n key", () => {
    expect(
      resolveFirstBlockerI18nKey([
        { code: "BMV_NOT_SIGNED" },
        { code: "BMV_INTAKE_NOT_READY" },
      ]),
    ).toBe("customers.detail.bmvIntake.errors.signRequiredForCase");
  });

  it("returns fallback for empty blockers", () => {
    expect(resolveFirstBlockerI18nKey([])).toBe(
      "customers.detail.bmvIntake.actionState.validationError",
    );
  });

  it("returns fallback for undefined blockers", () => {
    expect(resolveFirstBlockerI18nKey(undefined)).toBe(
      "customers.detail.bmvIntake.actionState.validationError",
    );
  });
});

describe("resolveGateStatusI18nKeys", () => {
  it("maps all blockers to gate status i18n keys", () => {
    const keys = resolveGateStatusI18nKeys([
      { code: "BMV_QUESTIONNAIRE_NOT_RETURNED" },
      { code: "BMV_QUOTE_NOT_CONFIRMED" },
      { code: "BMV_NOT_SIGNED" },
      { code: "BMV_INTAKE_NOT_READY" },
    ]);
    expect(keys).toEqual([
      "customers.detail.bmvIntake.gate.questionnaireNotDone",
      "customers.detail.bmvIntake.gate.quoteNotDone",
      "customers.detail.bmvIntake.gate.signNotDone",
      "customers.detail.bmvIntake.gate.signNotDone",
    ]);
  });

  it("returns empty array for undefined blockers", () => {
    expect(resolveGateStatusI18nKeys(undefined)).toEqual([]);
  });
});
