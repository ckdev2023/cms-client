// ── Test Ownership ──────────────────────────────────────────────
// Owner: BUG-158 — BMV pre-sign gate 4-prerequisite focused tests
//   Covers: all-satisfied → passed=true, single-missing → blockers=1,
//   blocker code & recovery key correctness per prerequisite.
// ────────────────────────────────────────────────────────────────

import { describe, expect, it } from "vitest";
import {
  checkCreatePreSignGate,
  PRE_SIGN_GATE_BLOCKER_CODES,
} from "./useCreateCasePreSignGate";
import type { CaseCreateCustomerOption } from "../types-detail";

function makeReadyCustomer(
  overrides: Partial<CaseCreateCustomerOption> = {},
): CaseCreateCustomerOption {
  return {
    id: "cust-bmv-001",
    name: "経営太郎",
    kana: "ケイエイ タロウ",
    group: "tokyo-1",
    groupLabel: "東京一組",
    roleHint: "主申請人",
    summary: "",
    contact: "keiei@example.com",
    bmvQuestionnaireStatus: "returned",
    bmvQuoteStatus: "confirmed",
    bmvSignStatus: "signed",
    bmvIntakeStatus: "ready_for_case_creation",
    ...overrides,
  };
}

const BMV_TEMPLATE_IDS = [
  "bmv",
  "biz_mgmt_cert_4m",
  "biz_mgmt_cert_1y",
  "biz_mgmt_renewal",
] as const;

describe("Pre-sign gate 4-prerequisite focused (BUG-158)", () => {
  describe("all 4 prerequisites satisfied → gate passed", () => {
    it.each(BMV_TEMPLATE_IDS)(
      "passes for template %s when all prerequisites met",
      (templateId) => {
        const result = checkCreatePreSignGate(templateId, makeReadyCustomer());
        expect(result.active).toBe(true);
        expect(result.passed).toBe(true);
        expect(result.blockers).toHaveLength(0);
      },
    );
  });

  describe("single missing prerequisite → exactly 1 blocker", () => {
    it("questionnaire not returned → QUESTIONNAIRE_NOT_RETURNED", () => {
      const result = checkCreatePreSignGate(
        "bmv",
        makeReadyCustomer({ bmvQuestionnaireStatus: "sent" }),
      );
      expect(result.passed).toBe(false);
      expect(result.blockers).toHaveLength(1);
      expect(result.blockers[0].code).toBe(
        PRE_SIGN_GATE_BLOCKER_CODES.QUESTIONNAIRE_NOT_RETURNED,
      );
      expect(result.blockers[0].recoveryI18nKey).toBe(
        "cases.create.preSignGate.recoveryQuestionnaire",
      );
    });

    it("quote not confirmed → QUOTE_NOT_CONFIRMED", () => {
      const result = checkCreatePreSignGate(
        "bmv",
        makeReadyCustomer({ bmvQuoteStatus: "generated" }),
      );
      expect(result.passed).toBe(false);
      expect(result.blockers).toHaveLength(1);
      expect(result.blockers[0].code).toBe(
        PRE_SIGN_GATE_BLOCKER_CODES.QUOTE_NOT_CONFIRMED,
      );
      expect(result.blockers[0].recoveryI18nKey).toBe(
        "cases.create.preSignGate.recoveryQuote",
      );
    });

    it("not signed → NOT_SIGNED", () => {
      const result = checkCreatePreSignGate(
        "bmv",
        makeReadyCustomer({ bmvSignStatus: "pending" }),
      );
      expect(result.passed).toBe(false);
      expect(result.blockers).toHaveLength(1);
      expect(result.blockers[0].code).toBe(
        PRE_SIGN_GATE_BLOCKER_CODES.NOT_SIGNED,
      );
      expect(result.blockers[0].recoveryI18nKey).toBe(
        "cases.create.preSignGate.recoverySign",
      );
    });

    it("intake not ready → INTAKE_NOT_READY", () => {
      const result = checkCreatePreSignGate(
        "bmv",
        makeReadyCustomer({ bmvIntakeStatus: "questionnaire_pending" }),
      );
      expect(result.passed).toBe(false);
      expect(result.blockers).toHaveLength(1);
      expect(result.blockers[0].code).toBe(
        PRE_SIGN_GATE_BLOCKER_CODES.INTAKE_NOT_READY,
      );
      expect(result.blockers[0].recoveryI18nKey).toBe(
        "cases.create.preSignGate.recoveryIntake",
      );
    });
  });

  describe("all 4 missing → 4 blockers", () => {
    it("null customer produces all 4 blocker codes", () => {
      const result = checkCreatePreSignGate("bmv", null);
      expect(result.active).toBe(true);
      expect(result.passed).toBe(false);
      expect(result.blockers).toHaveLength(4);

      const codes = result.blockers.map((b) => b.code);
      expect(codes).toEqual([
        PRE_SIGN_GATE_BLOCKER_CODES.QUESTIONNAIRE_NOT_RETURNED,
        PRE_SIGN_GATE_BLOCKER_CODES.QUOTE_NOT_CONFIRMED,
        PRE_SIGN_GATE_BLOCKER_CODES.NOT_SIGNED,
        PRE_SIGN_GATE_BLOCKER_CODES.INTAKE_NOT_READY,
      ]);
    });

    it("every blocker carries a valid recoveryI18nKey", () => {
      const result = checkCreatePreSignGate("bmv", null);
      for (const b of result.blockers) {
        expect(b.recoveryI18nKey).toMatch(
          /^cases\.create\.preSignGate\.recovery/,
        );
      }
    });
  });

  describe("non-BMV template → gate inactive", () => {
    it.each(["family", "work", "eng_humanities_intl_cert"] as const)(
      "returns inactive for %s template",
      (templateId) => {
        const result = checkCreatePreSignGate(templateId, null);
        expect(result.active).toBe(false);
        expect(result.passed).toBe(true);
        expect(result.blockers).toHaveLength(0);
      },
    );
  });
});
