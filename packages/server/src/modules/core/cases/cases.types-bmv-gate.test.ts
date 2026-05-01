import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  checkBmvCaseCreationGate,
  BMV_CASE_CREATION_GATE_CODES,
  CASE_BMV_GATE_ERROR_CODE,
} from "./cases.types-bmv-gate";
import type {
  BmvCaseCreationGateInput,
  LeadConvertToCaseInput,
} from "./cases.types-bmv-gate";

// ── helpers ──

function readyInput(
  overrides?: Partial<BmvCaseCreationGateInput>,
): BmvCaseCreationGateInput {
  return {
    caseTypeCode: "business_manager_visa",
    customerId: "cust-1",
    bmvQuestionnaireStatus: "returned",
    bmvQuoteStatus: "confirmed",
    bmvSignStatus: "signed",
    bmvIntakeStatus: "ready_for_case_creation",
    ...overrides,
  };
}

// ── non-BMV passthrough ──

void describe("checkBmvCaseCreationGate — non-BMV passthrough", () => {
  void test("allows non-BMV case types unconditionally", () => {
    const result = checkBmvCaseCreationGate({
      caseTypeCode: "family_stay",
      customerId: "cust-1",
      bmvQuestionnaireStatus: null,
      bmvQuoteStatus: null,
      bmvSignStatus: null,
      bmvIntakeStatus: null,
    });
    assert.equal(result.allowed, true);
    assert.equal(result.blockers.length, 0);
  });

  void test("allows tech_humanities without BMV profile", () => {
    const result = checkBmvCaseCreationGate({
      caseTypeCode: "tech_humanities",
      customerId: "cust-2",
      bmvQuestionnaireStatus: "not_started",
      bmvQuoteStatus: "not_started",
      bmvSignStatus: "not_started",
      bmvIntakeStatus: "not_started",
    });
    assert.equal(result.allowed, true);
  });
});

// ── BMV happy path ──

void describe("checkBmvCaseCreationGate — BMV happy path", () => {
  void test("allows when all four prerequisites are met", () => {
    const result = checkBmvCaseCreationGate(readyInput());
    assert.equal(result.allowed, true);
    assert.equal(result.blockers.length, 0);
  });
});

// ── BMV individual blockers ──

void describe("checkBmvCaseCreationGate — individual blockers", () => {
  void test("blocks when questionnaire not returned", () => {
    const result = checkBmvCaseCreationGate(
      readyInput({ bmvQuestionnaireStatus: "sent" }),
    );
    assert.equal(result.allowed, false);
    assert.ok(
      result.blockers.some(
        (b) =>
          b.code === BMV_CASE_CREATION_GATE_CODES.QUESTIONNAIRE_NOT_RETURNED,
      ),
    );
  });

  void test("blocks when questionnaire not started", () => {
    const result = checkBmvCaseCreationGate(
      readyInput({ bmvQuestionnaireStatus: "not_started" }),
    );
    assert.equal(result.allowed, false);
    assert.ok(
      result.blockers.some(
        (b) =>
          b.code === BMV_CASE_CREATION_GATE_CODES.QUESTIONNAIRE_NOT_RETURNED,
      ),
    );
  });

  void test("blocks when quote not confirmed (generated only)", () => {
    const result = checkBmvCaseCreationGate(
      readyInput({ bmvQuoteStatus: "generated" }),
    );
    assert.equal(result.allowed, false);
    assert.ok(
      result.blockers.some(
        (b) => b.code === BMV_CASE_CREATION_GATE_CODES.QUOTE_NOT_CONFIRMED,
      ),
    );
  });

  void test("blocks when quote not started", () => {
    const result = checkBmvCaseCreationGate(
      readyInput({ bmvQuoteStatus: "not_started" }),
    );
    assert.equal(result.allowed, false);
    assert.ok(
      result.blockers.some(
        (b) => b.code === BMV_CASE_CREATION_GATE_CODES.QUOTE_NOT_CONFIRMED,
      ),
    );
  });

  void test("blocks when not signed (pending)", () => {
    const result = checkBmvCaseCreationGate(
      readyInput({ bmvSignStatus: "pending" }),
    );
    assert.equal(result.allowed, false);
    assert.ok(
      result.blockers.some(
        (b) => b.code === BMV_CASE_CREATION_GATE_CODES.NOT_SIGNED,
      ),
    );
  });

  void test("blocks when not signed (not_started)", () => {
    const result = checkBmvCaseCreationGate(
      readyInput({ bmvSignStatus: "not_started" }),
    );
    assert.equal(result.allowed, false);
    assert.ok(
      result.blockers.some(
        (b) => b.code === BMV_CASE_CREATION_GATE_CODES.NOT_SIGNED,
      ),
    );
  });

  void test("blocks when intake not ready", () => {
    const result = checkBmvCaseCreationGate(
      readyInput({ bmvIntakeStatus: "sign_pending" }),
    );
    assert.equal(result.allowed, false);
    assert.ok(
      result.blockers.some(
        (b) => b.code === BMV_CASE_CREATION_GATE_CODES.INTAKE_NOT_READY,
      ),
    );
  });
});

// ── BMV null profile (no bmvProfile at all) ──

void describe("checkBmvCaseCreationGate — null profile fields", () => {
  void test("blocks all four when profile fields are null", () => {
    const result = checkBmvCaseCreationGate({
      caseTypeCode: "business_manager_visa",
      customerId: "cust-1",
      bmvQuestionnaireStatus: null,
      bmvQuoteStatus: null,
      bmvSignStatus: null,
      bmvIntakeStatus: null,
    });
    assert.equal(result.allowed, false);
    assert.equal(result.blockers.length, 4);
  });

  void test("each null field produces the correct blocker code", () => {
    const result = checkBmvCaseCreationGate({
      caseTypeCode: "business_manager_visa",
      customerId: "cust-1",
      bmvQuestionnaireStatus: null,
      bmvQuoteStatus: null,
      bmvSignStatus: null,
      bmvIntakeStatus: null,
    });
    const codes = result.blockers.map((b) => b.code).sort();
    assert.deepEqual(codes, [
      "BMV_INTAKE_NOT_READY",
      "BMV_NOT_SIGNED",
      "BMV_QUESTIONNAIRE_NOT_RETURNED",
      "BMV_QUOTE_NOT_CONFIRMED",
    ]);
  });
});

// ── BMV undefined profile fields ──

void describe("checkBmvCaseCreationGate — undefined profile fields", () => {
  void test("blocks all four when profile fields are undefined", () => {
    const result = checkBmvCaseCreationGate({
      caseTypeCode: "business_manager_visa",
      customerId: "cust-1",
      bmvQuestionnaireStatus: undefined,
      bmvQuoteStatus: undefined,
      bmvSignStatus: undefined,
      bmvIntakeStatus: undefined,
    });
    assert.equal(result.allowed, false);
    assert.equal(result.blockers.length, 4);
  });

  void test("each undefined field produces the correct blocker code", () => {
    const result = checkBmvCaseCreationGate({
      caseTypeCode: "business_manager_visa",
      customerId: "cust-1",
      bmvQuestionnaireStatus: undefined,
      bmvQuoteStatus: undefined,
      bmvSignStatus: undefined,
      bmvIntakeStatus: undefined,
    });
    const codes = result.blockers.map((b) => b.code).sort();
    assert.deepEqual(codes, [
      "BMV_INTAKE_NOT_READY",
      "BMV_NOT_SIGNED",
      "BMV_QUESTIONNAIRE_NOT_RETURNED",
      "BMV_QUOTE_NOT_CONFIRMED",
    ]);
  });

  void test("mixed null and undefined fields all produce blockers", () => {
    const result = checkBmvCaseCreationGate({
      caseTypeCode: "business_manager_visa",
      customerId: "cust-1",
      bmvQuestionnaireStatus: null,
      bmvQuoteStatus: undefined,
      bmvSignStatus: null,
      bmvIntakeStatus: undefined,
    });
    assert.equal(result.allowed, false);
    assert.equal(result.blockers.length, 4);
  });

  void test("single undefined field among valid ones produces exactly one blocker", () => {
    const result = checkBmvCaseCreationGate(
      readyInput({ bmvSignStatus: undefined }),
    );
    assert.equal(result.allowed, false);
    assert.equal(result.blockers.length, 1);
    assert.equal(
      result.blockers[0].code,
      BMV_CASE_CREATION_GATE_CODES.NOT_SIGNED,
    );
  });
});

// ── BMV accumulation ──

void describe("checkBmvCaseCreationGate — blocker accumulation", () => {
  void test("accumulates multiple blockers when multiple prerequisites fail", () => {
    const result = checkBmvCaseCreationGate(
      readyInput({
        bmvQuestionnaireStatus: "sent",
        bmvSignStatus: "pending",
      }),
    );
    assert.equal(result.allowed, false);
    assert.ok(result.blockers.length >= 2);
    const codes = result.blockers.map((b) => b.code);
    assert.ok(codes.includes("BMV_QUESTIONNAIRE_NOT_RETURNED"));
    assert.ok(codes.includes("BMV_NOT_SIGNED"));
  });
});

// ── gate code constants ──

void describe("BMV gate code constants", () => {
  void test("gate codes are unique strings", () => {
    const values = Object.values(BMV_CASE_CREATION_GATE_CODES);
    assert.equal(new Set(values).size, values.length);
    for (const v of values) {
      assert.equal(typeof v, "string");
      assert.ok(v.startsWith("BMV_"));
    }
  });

  void test("CASE_BMV_GATE_ERROR_CODE is defined", () => {
    assert.equal(CASE_BMV_GATE_ERROR_CODE, "CASE_BMV_GATE_BLOCKED");
  });
});

// ── type contract: LeadConvertToCaseInput ──

void describe("LeadConvertToCaseInput type contract", () => {
  void test("can construct a valid LeadConvertToCaseInput", () => {
    const input: LeadConvertToCaseInput = {
      customerId: "cust-1",
      caseTypeCode: "business_manager_visa",
      ownerUserId: "user-1",
      orgId: "org-1",
      visaPlan: "new_1year",
      quotePrice: 500000,
      sourceChannel: "lead_convert",
      leadId: "lead-1",
    };
    assert.equal(input.sourceChannel, "lead_convert");
    assert.equal(input.leadId, "lead-1");
  });

  void test("visaPlan and quotePrice are optional", () => {
    const input: LeadConvertToCaseInput = {
      customerId: "cust-1",
      caseTypeCode: "business_manager_visa",
      ownerUserId: "user-1",
      orgId: "org-1",
      sourceChannel: "lead_convert",
      leadId: "lead-1",
    };
    assert.equal(input.visaPlan, undefined);
    assert.equal(input.quotePrice, undefined);
  });
});

// ── cross-module alignment ──

void describe("cross-module alignment", () => {
  void test("BMV case type code is consistent", () => {
    const gate = checkBmvCaseCreationGate(
      readyInput({ caseTypeCode: "business_manager_visa" }),
    );
    assert.equal(gate.allowed, true);
  });

  void test("non-BMV type code pattern does not trigger gate", () => {
    const codes = [
      "family_stay",
      "tech_humanities",
      "specified_skilled_worker",
      "permanent_residence",
    ];
    for (const code of codes) {
      const gate = checkBmvCaseCreationGate(readyInput({ caseTypeCode: code }));
      assert.equal(gate.allowed, true, `${code} should not trigger BMV gate`);
    }
  });
});
