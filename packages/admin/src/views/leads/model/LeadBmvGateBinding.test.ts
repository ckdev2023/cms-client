import { describe, expect, it } from "vitest";
import {
  LEAD_BMV_FEATURE_DISABLED_ERROR_CODE,
  LEAD_BMV_GATE_BLOCKER_CODES,
  LEAD_BMV_GATE_ERROR_CODE,
  isLeadBmvGateError,
  resolveLeadBmvBlockerI18nKey,
  resolveLeadBmvBlockerI18nKeys,
} from "./LeadBmvGateBinding";
import type { ServerBlocker } from "./LeadRepositorySupport";

describe("LeadBmvGateBinding — constants", () => {
  it("LEAD_BMV_GATE_ERROR_CODE matches server CASE_BMV_GATE_ERROR_CODE", () => {
    expect(LEAD_BMV_GATE_ERROR_CODE).toBe("CASE_BMV_GATE_BLOCKED");
  });

  it("blocker codes match server BMV_CASE_CREATION_GATE_CODES + feature flag blocker", () => {
    expect(LEAD_BMV_GATE_BLOCKER_CODES).toEqual({
      QUESTIONNAIRE_NOT_RETURNED: "BMV_QUESTIONNAIRE_NOT_RETURNED",
      QUOTE_NOT_CONFIRMED: "BMV_QUOTE_NOT_CONFIRMED",
      NOT_SIGNED: "BMV_NOT_SIGNED",
      INTAKE_NOT_READY: "BMV_INTAKE_NOT_READY",
      FEATURE_DISABLED: "BMV_FEATURE_DISABLED",
    });
  });

  it("LEAD_BMV_FEATURE_DISABLED_ERROR_CODE matches server CASE_BMV_FEATURE_DISABLED", () => {
    expect(LEAD_BMV_FEATURE_DISABLED_ERROR_CODE).toBe(
      "CASE_BMV_FEATURE_DISABLED",
    );
  });
});

describe("LeadBmvGateBinding — isLeadBmvGateError", () => {
  it("returns true for CASE_BMV_GATE_BLOCKED", () => {
    expect(isLeadBmvGateError("CASE_BMV_GATE_BLOCKED")).toBe(true);
  });

  it("returns true for CASE_BMV_FEATURE_DISABLED", () => {
    expect(isLeadBmvGateError("CASE_BMV_FEATURE_DISABLED")).toBe(true);
  });

  it("returns true for CONVERT_CASE_REQUIRES_CUSTOMER", () => {
    expect(isLeadBmvGateError("CONVERT_CASE_REQUIRES_CUSTOMER")).toBe(true);
  });

  it("returns false for other server error codes", () => {
    expect(isLeadBmvGateError("CASE_VALIDATION_FAILED")).toBe(false);
    expect(isLeadBmvGateError("LEAD_WRITE_ERROR")).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isLeadBmvGateError(undefined)).toBe(false);
  });
});

describe("LeadBmvGateBinding — resolveLeadBmvBlockerI18nKey", () => {
  it("maps each known blocker code to its leads-namespaced i18n key", () => {
    expect(
      resolveLeadBmvBlockerI18nKey(
        LEAD_BMV_GATE_BLOCKER_CODES.QUESTIONNAIRE_NOT_RETURNED,
      ),
    ).toBe("leads.errors.bmvGate.questionnaireNotReturned");
    expect(
      resolveLeadBmvBlockerI18nKey(
        LEAD_BMV_GATE_BLOCKER_CODES.QUOTE_NOT_CONFIRMED,
      ),
    ).toBe("leads.errors.bmvGate.quoteNotConfirmed");
    expect(
      resolveLeadBmvBlockerI18nKey(LEAD_BMV_GATE_BLOCKER_CODES.NOT_SIGNED),
    ).toBe("leads.errors.bmvGate.notSigned");
    expect(
      resolveLeadBmvBlockerI18nKey(
        LEAD_BMV_GATE_BLOCKER_CODES.INTAKE_NOT_READY,
      ),
    ).toBe("leads.errors.bmvGate.intakeNotReady");
    expect(
      resolveLeadBmvBlockerI18nKey(
        LEAD_BMV_GATE_BLOCKER_CODES.FEATURE_DISABLED,
      ),
    ).toBe("leads.errors.bmvGate.featureDisabled");
  });

  it("falls back to leads.errors.bmvGate.unknown for unrecognized codes", () => {
    expect(resolveLeadBmvBlockerI18nKey("BMV_FUTURE_CODE")).toBe(
      "leads.errors.bmvGate.unknown",
    );
  });
});

describe("LeadBmvGateBinding — resolveLeadBmvBlockerI18nKeys", () => {
  it("returns empty list for undefined / empty input", () => {
    expect(resolveLeadBmvBlockerI18nKeys(undefined)).toEqual([]);
    expect(resolveLeadBmvBlockerI18nKeys([])).toEqual([]);
  });

  it("preserves server order for distinct blocker codes", () => {
    const blockers: ServerBlocker[] = [
      { code: LEAD_BMV_GATE_BLOCKER_CODES.NOT_SIGNED },
      { code: LEAD_BMV_GATE_BLOCKER_CODES.QUESTIONNAIRE_NOT_RETURNED },
      { code: LEAD_BMV_GATE_BLOCKER_CODES.INTAKE_NOT_READY },
    ];
    expect(resolveLeadBmvBlockerI18nKeys(blockers)).toEqual([
      "leads.errors.bmvGate.notSigned",
      "leads.errors.bmvGate.questionnaireNotReturned",
      "leads.errors.bmvGate.intakeNotReady",
    ]);
  });

  it("dedupes blockers that resolve to the same i18n key", () => {
    const blockers: ServerBlocker[] = [
      { code: LEAD_BMV_GATE_BLOCKER_CODES.NOT_SIGNED },
      { code: "BMV_NOT_SIGNED", message: "duplicate" },
      { code: LEAD_BMV_GATE_BLOCKER_CODES.QUOTE_NOT_CONFIRMED },
    ];
    expect(resolveLeadBmvBlockerI18nKeys(blockers)).toEqual([
      "leads.errors.bmvGate.notSigned",
      "leads.errors.bmvGate.quoteNotConfirmed",
    ]);
  });

  it("collapses unknown codes onto the shared fallback key", () => {
    const blockers: ServerBlocker[] = [
      { code: "BMV_FUTURE_A" },
      { code: "BMV_FUTURE_B" },
    ];
    expect(resolveLeadBmvBlockerI18nKeys(blockers)).toEqual([
      "leads.errors.bmvGate.unknown",
    ]);
  });
});
