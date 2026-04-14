import { describe, expect, it } from "vitest";
import {
  BADGE_TONE_MAP,
  BILLING_STATUSES,
  CASE_DETAIL_TABS,
  CASE_DETAIL_TAB_KEYS,
  CASE_GATES,
  CASE_STAGES,
  CASE_STAGE_IDS,
  getBillingStatusLabel,
  getGateLabel,
  getStageLabel,
} from "./constants";

// ─── Stages ─────────────────────────────────────────────────────

describe("cases/constants — stages", () => {
  it("CASE_STAGE_IDS covers S1 through S9", () => {
    expect(CASE_STAGE_IDS).toHaveLength(9);
    for (const id of CASE_STAGE_IDS) {
      expect(CASE_STAGES[id]).toBeDefined();
      expect(CASE_STAGES[id].label).toBeTruthy();
      expect(CASE_STAGES[id].badge).toBeTruthy();
    }
  });
});

// ─── Detail tabs ────────────────────────────────────────────────

describe("cases/constants — detail tabs", () => {
  it("CASE_DETAIL_TABS has 10 entries", () => {
    expect(CASE_DETAIL_TABS).toHaveLength(10);
  });

  it("CASE_DETAIL_TAB_KEYS matches tab defs", () => {
    expect(CASE_DETAIL_TAB_KEYS).toEqual(CASE_DETAIL_TABS.map((t) => t.key));
  });
});

// ─── Gates ──────────────────────────────────────────────────────

describe("cases/constants — gates", () => {
  it("CASE_GATES has A, B, C entries", () => {
    expect(Object.keys(CASE_GATES).sort()).toEqual(["A", "B", "C"]);
    for (const gate of Object.values(CASE_GATES)) {
      expect(gate.label).toBeTruthy();
      expect(gate.severity).toBeTruthy();
    }
  });
});

// ─── Billing statuses ───────────────────────────────────────────

describe("cases/constants — billing statuses", () => {
  it("covers paid, partial, unpaid, arrears, waived", () => {
    const keys = Object.keys(BILLING_STATUSES).sort();
    expect(keys).toEqual(["arrears", "paid", "partial", "unpaid", "waived"]);
    for (const def of Object.values(BILLING_STATUSES)) {
      expect(def.label).toBeTruthy();
      expect(def.badge).toBeTruthy();
    }
  });
});

// ─── Badge tone map ─────────────────────────────────────────────

describe("cases/constants — BADGE_TONE_MAP", () => {
  it("maps all 5 badge classes to semantic tones", () => {
    expect(Object.keys(BADGE_TONE_MAP)).toHaveLength(5);
    expect(BADGE_TONE_MAP["badge-green"]).toBe("success");
    expect(BADGE_TONE_MAP["badge-red"]).toBe("danger");
    expect(BADGE_TONE_MAP["badge-gray"]).toBe("neutral");
  });
});

// ─── Label helpers ──────────────────────────────────────────────

describe("getStageLabel", () => {
  it("returns label for known stage IDs", () => {
    expect(getStageLabel("S1")).toBe("刚开始办案");
    expect(getStageLabel("S9")).toBe("已归档");
  });

  it("returns raw value for unknown stage", () => {
    expect(getStageLabel("S99")).toBe("S99");
  });
});

describe("getBillingStatusLabel", () => {
  it("returns label for known billing statuses", () => {
    expect(getBillingStatusLabel("paid")).toBe("已结清");
    expect(getBillingStatusLabel("arrears")).toBe("欠款");
  });

  it("returns raw value for unknown billing status", () => {
    expect(getBillingStatusLabel("unknown")).toBe("unknown");
  });
});

describe("getGateLabel", () => {
  it("returns label for known gate IDs", () => {
    expect(getGateLabel("A")).toBe("必须先处理");
    expect(getGateLabel("B")).toBe("建议补强");
    expect(getGateLabel("C")).toBe("补充说明");
  });

  it("returns raw value for unknown gate ID", () => {
    expect(getGateLabel("X")).toBe("X");
  });
});
