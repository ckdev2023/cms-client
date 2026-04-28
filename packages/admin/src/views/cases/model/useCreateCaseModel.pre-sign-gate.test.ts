// ── Test Ownership ──────────────────────────────────────────────
// Owner: p1-fe-003-02 — Pre-sign gate feedback and disable states
//   Covers: checkCreatePreSignGate pure function behavior,
//   blocker accumulation, non-BMV bypass, null customer handling,
//   recovery i18n key presence.
// Does NOT test: Vue component rendering, model integration (→ integration tests),
//   or server-side gate (→ cases.pre-sign-gate.focused.test.ts).
// ────────────────────────────────────────────────────────────────

import { describe, expect, it } from "vitest";
import {
  checkCreatePreSignGate,
  PRE_SIGN_GATE_BLOCKER_CODES,
  type CreatePreSignGateResult,
} from "./useCreateCaseModel";
import type { CaseCreateCustomerOption } from "../types-detail";

function makeCustomer(
  overrides: Partial<CaseCreateCustomerOption> = {},
): CaseCreateCustomerOption {
  return {
    id: "cust-001",
    name: "テスト太郎",
    kana: "テスト タロウ",
    group: "tokyo-1",
    groupLabel: "東京一組",
    roleHint: "主申請人",
    summary: "",
    contact: "test@example.com",
    bmvQuestionnaireStatus: "returned",
    bmvQuoteStatus: "confirmed",
    bmvSignStatus: "signed",
    bmvIntakeStatus: "ready_for_case_creation",
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════
//  Non-BMV templates bypass gate
// ═══════════════════════════════════════════════════════════════════

describe("non-BMV templates bypass gate (p1-fe-003-02)", () => {
  it("returns inactive for family template", () => {
    const result = checkCreatePreSignGate("family", null);
    expect(result.active).toBe(false);
    expect(result.passed).toBe(true);
    expect(result.blockers).toHaveLength(0);
  });

  it("returns inactive for work template", () => {
    const result = checkCreatePreSignGate("work", makeCustomer());
    expect(result.active).toBe(false);
    expect(result.passed).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════
//  BMV gate — happy path
// ═══════════════════════════════════════════════════════════════════

describe("BMV gate happy path (p1-fe-003-02)", () => {
  it("passes when all four prerequisites met", () => {
    const result = checkCreatePreSignGate("bmv", makeCustomer());
    expect(result.active).toBe(true);
    expect(result.passed).toBe(true);
    expect(result.blockers).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════════════
//  BMV gate — null customer
// ═══════════════════════════════════════════════════════════════════

describe("BMV gate null customer (p1-fe-003-02)", () => {
  it("blocks with all four blockers when customer is null", () => {
    const result = checkCreatePreSignGate("bmv", null);
    expect(result.active).toBe(true);
    expect(result.passed).toBe(false);
    expect(result.blockers).toHaveLength(4);
  });
});

// ═══════════════════════════════════════════════════════════════════
//  BMV gate — individual blocker checks
// ═══════════════════════════════════════════════════════════════════

describe("BMV gate individual blocker checks (p1-fe-003-02)", () => {
  it("blocks when questionnaire not returned", () => {
    const result = checkCreatePreSignGate(
      "bmv",
      makeCustomer({ bmvQuestionnaireStatus: "sent" }),
    );
    expect(result.passed).toBe(false);
    expect(result.blockers).toHaveLength(1);
    expect(result.blockers[0].code).toBe(
      PRE_SIGN_GATE_BLOCKER_CODES.QUESTIONNAIRE_NOT_RETURNED,
    );
  });

  it("blocks when quote not confirmed", () => {
    const result = checkCreatePreSignGate(
      "bmv",
      makeCustomer({ bmvQuoteStatus: "generated" }),
    );
    expect(result.passed).toBe(false);
    expect(result.blockers[0].code).toBe(
      PRE_SIGN_GATE_BLOCKER_CODES.QUOTE_NOT_CONFIRMED,
    );
  });

  it("blocks when not signed", () => {
    const result = checkCreatePreSignGate(
      "bmv",
      makeCustomer({ bmvSignStatus: "pending" }),
    );
    expect(result.passed).toBe(false);
    expect(result.blockers[0].code).toBe(
      PRE_SIGN_GATE_BLOCKER_CODES.NOT_SIGNED,
    );
  });

  it("blocks when intake not ready", () => {
    const result = checkCreatePreSignGate(
      "bmv",
      makeCustomer({ bmvIntakeStatus: "questionnaire_pending" }),
    );
    expect(result.passed).toBe(false);
    expect(result.blockers[0].code).toBe(
      PRE_SIGN_GATE_BLOCKER_CODES.INTAKE_NOT_READY,
    );
  });
});

// ═══════════════════════════════════════════════════════════════════
//  BMV gate — blocker accumulation
// ═══════════════════════════════════════════════════════════════════

describe("BMV gate blocker accumulation (p1-fe-003-02)", () => {
  it("accumulates two blockers when two prerequisites fail", () => {
    const result = checkCreatePreSignGate(
      "bmv",
      makeCustomer({
        bmvQuestionnaireStatus: null,
        bmvQuoteStatus: null,
      }),
    );
    expect(result.passed).toBe(false);
    expect(result.blockers).toHaveLength(2);
    const codes = result.blockers.map((b) => b.code);
    expect(codes).toContain(
      PRE_SIGN_GATE_BLOCKER_CODES.QUESTIONNAIRE_NOT_RETURNED,
    );
    expect(codes).toContain(PRE_SIGN_GATE_BLOCKER_CODES.QUOTE_NOT_CONFIRMED);
  });

  it("accumulates all four blockers when all fail", () => {
    const result = checkCreatePreSignGate(
      "bmv",
      makeCustomer({
        bmvQuestionnaireStatus: null,
        bmvQuoteStatus: null,
        bmvSignStatus: null,
        bmvIntakeStatus: null,
      }),
    );
    expect(result.blockers).toHaveLength(4);
  });
});

// ═══════════════════════════════════════════════════════════════════
//  BMV gate — i18n keys and recovery paths present
// ═══════════════════════════════════════════════════════════════════

describe("BMV gate blocker i18n keys (p1-fe-003-02)", () => {
  it("each blocker has non-empty i18nKey and recoveryI18nKey", () => {
    const result = checkCreatePreSignGate("bmv", null);
    for (const blocker of result.blockers) {
      expect(blocker.i18nKey).toBeTruthy();
      expect(blocker.recoveryI18nKey).toBeTruthy();
      expect(blocker.i18nKey).toMatch(/^cases\.create\.preSignGate\./);
      expect(blocker.recoveryI18nKey).toMatch(/^cases\.create\.preSignGate\./);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════
//  BMV gate — customer without BMV profile fields
// ═══════════════════════════════════════════════════════════════════

describe("BMV gate customer without BMV fields (p1-fe-003-02)", () => {
  it("blocks when customer has no BMV profile fields at all", () => {
    const customer: CaseCreateCustomerOption = {
      id: "cust-old",
      name: "旧客户",
      kana: "キュウ キャク",
      group: "tokyo-1",
      groupLabel: "東京一組",
      roleHint: "主申請人",
      summary: "",
      contact: "old@example.com",
    };
    const result = checkCreatePreSignGate("bmv", customer);
    expect(result.active).toBe(true);
    expect(result.passed).toBe(false);
    expect(result.blockers).toHaveLength(4);
  });
});

// ═══════════════════════════════════════════════════════════════════
//  Return type shape
// ═══════════════════════════════════════════════════════════════════

describe("BMV gate result shape (p1-fe-003-02)", () => {
  it("conforms to CreatePreSignGateResult", () => {
    const result: CreatePreSignGateResult = checkCreatePreSignGate(
      "bmv",
      makeCustomer(),
    );
    expect(typeof result.active).toBe("boolean");
    expect(typeof result.passed).toBe("boolean");
    expect(Array.isArray(result.blockers)).toBe(true);
  });
});
