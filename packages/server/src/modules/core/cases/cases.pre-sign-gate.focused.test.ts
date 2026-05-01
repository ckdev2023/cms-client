import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  checkBmvCaseCreationGate,
  BMV_CASE_CREATION_GATE_CODES,
  CASE_BMV_GATE_ERROR_CODE,
} from "./cases.types-bmv-gate";
import type {
  BmvCaseCreationGateInput,
  BmvCaseCreationGateResult,
} from "./cases.types-bmv-gate";
import { CASE_WRITE_ERROR_CODES } from "./cases.types";
import { requiresBmvCaseCreationGate } from "../../portal/intake/intake.types";
import { BMV_CASE_TYPE_CODE } from "./bmvTemplateConfig";
import { BMV_CASE_TYPE } from "./cases.template-bmv";

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

// ────────────────────────────────────────────────────────────────
// 1. 门禁规则：问卷未回收 → 禁止建案
// ────────────────────────────────────────────────────────────────

void describe("pre-sign gate: questionnaire prerequisite", () => {
  void test("blocks when questionnaire status is not_started", () => {
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

  void test("blocks when questionnaire status is sent (not yet returned)", () => {
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

  void test("blocks when questionnaire status is null", () => {
    const result = checkBmvCaseCreationGate(
      readyInput({ bmvQuestionnaireStatus: null }),
    );
    assert.equal(result.allowed, false);
    assert.ok(
      result.blockers.some(
        (b) =>
          b.code === BMV_CASE_CREATION_GATE_CODES.QUESTIONNAIRE_NOT_RETURNED,
      ),
    );
  });

  void test("allows when questionnaire status is returned", () => {
    const result = checkBmvCaseCreationGate(
      readyInput({ bmvQuestionnaireStatus: "returned" }),
    );
    const questionnaireBlocker = result.blockers.find(
      (b) => b.code === BMV_CASE_CREATION_GATE_CODES.QUESTIONNAIRE_NOT_RETURNED,
    );
    assert.equal(questionnaireBlocker, undefined);
  });
});

// ────────────────────────────────────────────────────────────────
// 2. 门禁规则：报价未确认 → 禁止建案
// ────────────────────────────────────────────────────────────────

void describe("pre-sign gate: quote prerequisite", () => {
  void test("blocks when quote status is not_started", () => {
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

  void test("blocks when quote status is generated (not yet confirmed)", () => {
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

  void test("blocks when quote status is null", () => {
    const result = checkBmvCaseCreationGate(
      readyInput({ bmvQuoteStatus: null }),
    );
    assert.equal(result.allowed, false);
    assert.ok(
      result.blockers.some(
        (b) => b.code === BMV_CASE_CREATION_GATE_CODES.QUOTE_NOT_CONFIRMED,
      ),
    );
  });

  void test("allows when quote status is confirmed", () => {
    const result = checkBmvCaseCreationGate(
      readyInput({ bmvQuoteStatus: "confirmed" }),
    );
    const quoteBlocker = result.blockers.find(
      (b) => b.code === BMV_CASE_CREATION_GATE_CODES.QUOTE_NOT_CONFIRMED,
    );
    assert.equal(quoteBlocker, undefined);
  });
});

// ────────────────────────────────────────────────────────────────
// 3. 门禁规则：未签约 → 禁止建案
// ────────────────────────────────────────────────────────────────

void describe("pre-sign gate: sign prerequisite", () => {
  void test("blocks when sign status is not_started", () => {
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

  void test("blocks when sign status is pending", () => {
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

  void test("blocks when sign status is null", () => {
    const result = checkBmvCaseCreationGate(
      readyInput({ bmvSignStatus: null }),
    );
    assert.equal(result.allowed, false);
    assert.ok(
      result.blockers.some(
        (b) => b.code === BMV_CASE_CREATION_GATE_CODES.NOT_SIGNED,
      ),
    );
  });

  void test("allows when sign status is signed", () => {
    const result = checkBmvCaseCreationGate(
      readyInput({ bmvSignStatus: "signed" }),
    );
    const signBlocker = result.blockers.find(
      (b) => b.code === BMV_CASE_CREATION_GATE_CODES.NOT_SIGNED,
    );
    assert.equal(signBlocker, undefined);
  });
});

// ────────────────────────────────────────────────────────────────
// 4. 门禁规则：intake 未就绪 → 禁止建案
// ────────────────────────────────────────────────────────────────

void describe("pre-sign gate: intake prerequisite", () => {
  void test("blocks when intake status is not_started", () => {
    const result = checkBmvCaseCreationGate(
      readyInput({ bmvIntakeStatus: "not_started" }),
    );
    assert.equal(result.allowed, false);
    assert.ok(
      result.blockers.some(
        (b) => b.code === BMV_CASE_CREATION_GATE_CODES.INTAKE_NOT_READY,
      ),
    );
  });

  void test("blocks when intake status is questionnaire_pending", () => {
    const result = checkBmvCaseCreationGate(
      readyInput({ bmvIntakeStatus: "questionnaire_pending" }),
    );
    assert.equal(result.allowed, false);
    assert.ok(
      result.blockers.some(
        (b) => b.code === BMV_CASE_CREATION_GATE_CODES.INTAKE_NOT_READY,
      ),
    );
  });

  void test("blocks when intake status is quote_pending", () => {
    const result = checkBmvCaseCreationGate(
      readyInput({ bmvIntakeStatus: "quote_pending" }),
    );
    assert.equal(result.allowed, false);
    assert.ok(
      result.blockers.some(
        (b) => b.code === BMV_CASE_CREATION_GATE_CODES.INTAKE_NOT_READY,
      ),
    );
  });

  void test("blocks when intake status is sign_pending", () => {
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

  void test("blocks when intake status is null", () => {
    const result = checkBmvCaseCreationGate(
      readyInput({ bmvIntakeStatus: null }),
    );
    assert.equal(result.allowed, false);
    assert.ok(
      result.blockers.some(
        (b) => b.code === BMV_CASE_CREATION_GATE_CODES.INTAKE_NOT_READY,
      ),
    );
  });

  void test("allows when intake status is ready_for_case_creation", () => {
    const result = checkBmvCaseCreationGate(
      readyInput({ bmvIntakeStatus: "ready_for_case_creation" }),
    );
    const intakeBlocker = result.blockers.find(
      (b) => b.code === BMV_CASE_CREATION_GATE_CODES.INTAKE_NOT_READY,
    );
    assert.equal(intakeBlocker, undefined);
  });
});

// ────────────────────────────────────────────────────────────────
// 5. 全四前提満足時のみ許可
// ────────────────────────────────────────────────────────────────

void describe("pre-sign gate: happy path — all prerequisites met", () => {
  void test("allows BMV case creation when all four gates pass", () => {
    const result = checkBmvCaseCreationGate(readyInput());
    assert.equal(result.allowed, true);
    assert.equal(result.blockers.length, 0);
  });

  void test("result shape conforms to BmvCaseCreationGateResult", () => {
    const result: BmvCaseCreationGateResult =
      checkBmvCaseCreationGate(readyInput());
    assert.equal(typeof result.allowed, "boolean");
    assert.ok(Array.isArray(result.blockers));
  });
});

void describe("pre-sign gate: non-BMV case types bypass gate", () => {
  const NON_BMV_TYPES = [
    "family_stay",
    "tech_humanities",
    "specified_skilled_worker",
    "permanent_residence",
    "student",
    "dependent",
  ];

  for (const caseType of NON_BMV_TYPES) {
    void test(`${caseType} bypasses gate even with null profile`, () => {
      const result = checkBmvCaseCreationGate({
        caseTypeCode: caseType,
        customerId: "cust-1",
        bmvQuestionnaireStatus: null,
        bmvQuoteStatus: null,
        bmvSignStatus: null,
        bmvIntakeStatus: null,
      });
      assert.equal(result.allowed, true);
      assert.equal(result.blockers.length, 0);
    });
  }
});
void describe("pre-sign gate: biz_mgmt_* subtypes trigger gate (migration 038)", () => {
  for (const ct of ["biz_mgmt_4m", "biz_mgmt_1y", "biz_mgmt_renewal"]) {
    void test(`${ct}: blocked when prerequisites not met`, () => {
      const r = checkBmvCaseCreationGate({
        caseTypeCode: ct,
        customerId: "cust-1",
        bmvQuestionnaireStatus: null,
        bmvQuoteStatus: null,
        bmvSignStatus: null,
        bmvIntakeStatus: null,
      });
      assert.equal(r.allowed, false);
      assert.equal(r.blockers.length, 4);
    });
    void test(`${ct}: allowed when all prerequisites met`, () => {
      const r = checkBmvCaseCreationGate(readyInput({ caseTypeCode: ct }));
      assert.equal(r.allowed, true);
      assert.equal(r.blockers.length, 0);
    });
  }
});

// ────────────────────────────────────────────────────────────────
// 7. 累積阻断 — 多个前提未满足时全部报告
// ────────────────────────────────────────────────────────────────

void describe("pre-sign gate: blocker accumulation", () => {
  void test("accumulates all four blockers when all prerequisites fail", () => {
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
    const codes = result.blockers.map((b) => b.code).sort();
    assert.deepEqual(codes, [
      BMV_CASE_CREATION_GATE_CODES.INTAKE_NOT_READY,
      BMV_CASE_CREATION_GATE_CODES.NOT_SIGNED,
      BMV_CASE_CREATION_GATE_CODES.QUESTIONNAIRE_NOT_RETURNED,
      BMV_CASE_CREATION_GATE_CODES.QUOTE_NOT_CONFIRMED,
    ]);
  });

  void test("accumulates two blockers when two prerequisites fail", () => {
    const result = checkBmvCaseCreationGate(
      readyInput({
        bmvQuestionnaireStatus: "sent",
        bmvQuoteStatus: "generated",
      }),
    );
    assert.equal(result.allowed, false);
    assert.equal(result.blockers.length, 2);
    const codes = result.blockers.map((b) => b.code).sort();
    assert.ok(
      codes.includes(BMV_CASE_CREATION_GATE_CODES.QUESTIONNAIRE_NOT_RETURNED),
    );
    assert.ok(codes.includes(BMV_CASE_CREATION_GATE_CODES.QUOTE_NOT_CONFIRMED));
  });

  void test("each blocker has a non-empty message", () => {
    const result = checkBmvCaseCreationGate({
      caseTypeCode: "business_manager_visa",
      customerId: "cust-1",
      bmvQuestionnaireStatus: null,
      bmvQuoteStatus: null,
      bmvSignStatus: null,
      bmvIntakeStatus: null,
    });
    for (const blocker of result.blockers) {
      assert.ok(
        blocker.message.length > 0,
        `empty message for ${blocker.code}`,
      );
    }
  });
});

// ────────────────────────────────────────────────────────────────
// 8. エラーコード整合性
// ────────────────────────────────────────────────────────────────

void describe("pre-sign gate: error code alignment", () => {
  void test("CASE_WRITE_ERROR_CODES includes BMV_GATE_BLOCKED", () => {
    assert.equal(
      CASE_WRITE_ERROR_CODES.BMV_GATE_BLOCKED,
      "CASE_BMV_GATE_BLOCKED",
    );
  });

  void test("CASE_BMV_GATE_ERROR_CODE matches CASE_WRITE_ERROR_CODES.BMV_GATE_BLOCKED", () => {
    assert.equal(
      CASE_BMV_GATE_ERROR_CODE,
      CASE_WRITE_ERROR_CODES.BMV_GATE_BLOCKED,
    );
  });

  void test("gate blocker codes are all BMV_ prefixed strings", () => {
    const values = Object.values(BMV_CASE_CREATION_GATE_CODES);
    for (const v of values) {
      assert.equal(typeof v, "string");
      assert.ok(v.startsWith("BMV_"), `${v} should start with BMV_`);
    }
  });

  void test("gate blocker codes are all unique", () => {
    const values = Object.values(BMV_CASE_CREATION_GATE_CODES);
    assert.equal(new Set(values).size, values.length);
  });
});

// ────────────────────────────────────────────────────────────────
// 9. requiresBmvCaseCreationGate 整合
// ────────────────────────────────────────────────────────────────

void describe("pre-sign gate: requiresBmvCaseCreationGate alignment", () => {
  void test("returns true for business_manager_visa", () => {
    assert.equal(requiresBmvCaseCreationGate("business_manager_visa"), true);
  });

  void test("returns true for biz_mgmt_* subtypes (migration 038 alignment)", () => {
    assert.equal(requiresBmvCaseCreationGate("biz_mgmt_4m"), true);
    assert.equal(requiresBmvCaseCreationGate("biz_mgmt_1y"), true);
    assert.equal(requiresBmvCaseCreationGate("biz_mgmt_renewal"), true);
  });

  void test("returns false for non-BMV types", () => {
    assert.equal(requiresBmvCaseCreationGate("family_stay"), false);
    assert.equal(requiresBmvCaseCreationGate("tech_humanities"), false);
    assert.equal(requiresBmvCaseCreationGate(""), false);
  });

  void test("BMV_CASE_TYPE_CODE matches the gate trigger", () => {
    assert.equal(requiresBmvCaseCreationGate(BMV_CASE_TYPE_CODE), true);
  });

  void test("BMV_CASE_TYPE matches BMV_CASE_TYPE_CODE", () => {
    assert.equal(BMV_CASE_TYPE, BMV_CASE_TYPE_CODE);
  });
});

// ────────────────────────────────────────────────────────────────
// 10. 门禁顺序语义：问卷 → 报价 → 签约 → intake 就绪
// ────────────────────────────────────────────────────────────────

void describe("pre-sign gate: sequential prerequisite semantics", () => {
  void test("questionnaire returned alone is not sufficient", () => {
    const result = checkBmvCaseCreationGate(
      readyInput({
        bmvQuoteStatus: "not_started",
        bmvSignStatus: "not_started",
        bmvIntakeStatus: "questionnaire_pending",
      }),
    );
    assert.equal(result.allowed, false);
    assert.ok(result.blockers.length >= 3);
  });

  void test("questionnaire + quote confirmed alone is not sufficient", () => {
    const result = checkBmvCaseCreationGate(
      readyInput({
        bmvSignStatus: "not_started",
        bmvIntakeStatus: "sign_pending",
      }),
    );
    assert.equal(result.allowed, false);
    assert.ok(result.blockers.length >= 2);
  });

  void test("questionnaire + quote + signed but intake not ready is blocked", () => {
    const result = checkBmvCaseCreationGate(
      readyInput({ bmvIntakeStatus: "sign_pending" }),
    );
    assert.equal(result.allowed, false);
    assert.equal(result.blockers.length, 1);
    assert.equal(
      result.blockers[0].code,
      BMV_CASE_CREATION_GATE_CODES.INTAKE_NOT_READY,
    );
  });

  void test("all four prerequisites met → allowed", () => {
    const result = checkBmvCaseCreationGate(readyInput());
    assert.equal(result.allowed, true);
  });
});
