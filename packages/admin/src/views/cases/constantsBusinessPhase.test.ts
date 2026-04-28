import { describe, expect, it } from "vitest";
import {
  BUSINESS_PHASES,
  BUSINESS_PHASE_MAP,
  getPhaseLabel,
  getPhaseI18nKey,
  getPhaseBadge,
  type BusinessPhaseDef,
} from "./constantsBusinessPhase";

describe("BUSINESS_PHASES enum", () => {
  it("has exactly 20 entries", () => {
    expect(BUSINESS_PHASES).toHaveLength(20);
  });

  it("every entry is a non-empty uppercase string", () => {
    for (const phase of BUSINESS_PHASES) {
      expect(phase.length).toBeGreaterThan(0);
      expect(phase).toBe(phase.toUpperCase());
    }
  });

  it("has no duplicates", () => {
    expect(new Set(BUSINESS_PHASES).size).toBe(BUSINESS_PHASES.length);
  });

  it("starts with CONSULTING and ends with CLOSED_FAILED", () => {
    expect(BUSINESS_PHASES[0]).toBe("CONSULTING");
    expect(BUSINESS_PHASES[BUSINESS_PHASES.length - 1]).toBe("CLOSED_FAILED");
  });

  it("aligns with server-side BUSINESS_PHASES list", () => {
    const serverPhases = [
      "CONSULTING",
      "CONTRACTED",
      "WAITING_MATERIAL",
      "MATERIAL_PREPARING",
      "REVIEWING",
      "APPLYING",
      "UNDER_REVIEW",
      "NEED_SUPPLEMENT",
      "SUPPLEMENT_PROCESSING",
      "APPROVED",
      "REJECTED",
      "WAITING_PAYMENT",
      "COE_SENT",
      "VISA_APPLYING",
      "SUCCESS",
      "VISA_REJECTED",
      "RESIDENCE_PERIOD_RECORDED",
      "RENEWAL_REMINDER_SCHEDULED",
      "CLOSED_SUCCESS",
      "CLOSED_FAILED",
    ];
    expect([...BUSINESS_PHASES]).toEqual(serverPhases);
  });
});

describe("BUSINESS_PHASE_MAP", () => {
  it("has an entry for every phase in BUSINESS_PHASES", () => {
    for (const phase of BUSINESS_PHASES) {
      expect(BUSINESS_PHASE_MAP[phase]).toBeDefined();
    }
  });

  it("each entry has code, label, i18nKey, badge", () => {
    for (const phase of BUSINESS_PHASES) {
      const def: BusinessPhaseDef = BUSINESS_PHASE_MAP[phase];
      expect(def.code).toBe(phase);
      expect(def.label.length).toBeGreaterThan(0);
      expect(def.i18nKey).toBe(`cases.constants.phases.${phase}`);
      expect(def.badge).toMatch(/^badge-/);
    }
  });

  it("terminal phases have distinct badges (green for success, red for failed)", () => {
    expect(BUSINESS_PHASE_MAP.CLOSED_SUCCESS.badge).toBe("badge-green");
    expect(BUSINESS_PHASE_MAP.CLOSED_FAILED.badge).toBe("badge-red");
  });

  it("failure phases (REJECTED, VISA_REJECTED) use badge-red", () => {
    expect(BUSINESS_PHASE_MAP.REJECTED.badge).toBe("badge-red");
    expect(BUSINESS_PHASE_MAP.VISA_REJECTED.badge).toBe("badge-red");
  });
});

describe("getPhaseLabel", () => {
  it("returns Chinese label for known phase", () => {
    expect(getPhaseLabel("CONSULTING")).toBe("咨询中");
    expect(getPhaseLabel("APPROVED")).toBe("已批准");
    expect(getPhaseLabel("CLOSED_SUCCESS")).toBe("成功归档");
  });

  it("returns raw code for unknown phase", () => {
    expect(getPhaseLabel("UNKNOWN_XYZ")).toBe("UNKNOWN_XYZ");
  });

  it("returns empty string for empty input", () => {
    expect(getPhaseLabel("")).toBe("");
  });
});

describe("getPhaseI18nKey", () => {
  it("returns i18n key for known phase", () => {
    expect(getPhaseI18nKey("CONSULTING")).toBe(
      "cases.constants.phases.CONSULTING",
    );
    expect(getPhaseI18nKey("CLOSED_FAILED")).toBe(
      "cases.constants.phases.CLOSED_FAILED",
    );
  });

  it("returns empty string for unknown phase", () => {
    expect(getPhaseI18nKey("NOT_A_PHASE")).toBe("");
  });

  it("returns empty string for empty input", () => {
    expect(getPhaseI18nKey("")).toBe("");
  });
});

describe("getPhaseBadge", () => {
  it("returns badge for known phase", () => {
    expect(getPhaseBadge("CONSULTING")).toBe("badge-gray");
    expect(getPhaseBadge("APPROVED")).toBe("badge-green");
    expect(getPhaseBadge("UNDER_REVIEW")).toBe("badge-orange");
  });

  it("returns badge-gray for unknown phase", () => {
    expect(getPhaseBadge("UNKNOWN")).toBe("badge-gray");
  });

  it("returns badge-gray for empty input", () => {
    expect(getPhaseBadge("")).toBe("badge-gray");
  });
});
