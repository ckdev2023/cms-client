import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  FINAL_PAYMENT_MILESTONE,
  FINAL_PAYMENT_GATE_TRIGGER_STEP,
  FINAL_PAYMENT_DEFAULT_GATE_MODE,
  FINAL_PAYMENT_GUARD_ERROR_CODES,
  decideFinalPaymentGuard,
} from "./cases.types-final-payment";
import type { FinalPaymentGuardCheckResult } from "./cases.types-final-payment";
import { CASE_WRITE_ERROR_CODES } from "./cases.types";
import { BMV_WORKFLOW_STEPS_BLUEPRINT } from "./cases.template-bmv";

function unsettled(
  mode: "block" | "warn",
  unpaid = 200000,
): FinalPaymentGuardCheckResult {
  return { settled: false, unpaid, gateEffectMode: mode };
}

// ════════════════════════════════════════════════════════════════
// 1. COE block 路径使用 P1 专属错误码，不触碰 P0 warn 码
// ════════════════════════════════════════════════════════════════

void describe("COE block guard: error code separation", () => {
  void test("POST_APPROVAL_BILLING_BLOCKED is distinct from Gate-C warn code", () => {
    assert.notEqual(
      CASE_WRITE_ERROR_CODES.POST_APPROVAL_BILLING_BLOCKED,
      CASE_WRITE_ERROR_CODES.GATE_C_BILLING_RISK_UNACKNOWLEDGED,
    );
  });

  void test("WORKFLOW_STEP_BILLING_BLOCKED is distinct from Gate-C warn code", () => {
    assert.notEqual(
      CASE_WRITE_ERROR_CODES.WORKFLOW_STEP_BILLING_BLOCKED,
      CASE_WRITE_ERROR_CODES.GATE_C_BILLING_RISK_UNACKNOWLEDGED,
    );
  });

  void test("POST_APPROVAL_BILLING_BLOCKED is distinct from P0 billing ack failed", () => {
    assert.notEqual(
      CASE_WRITE_ERROR_CODES.POST_APPROVAL_BILLING_BLOCKED,
      CASE_WRITE_ERROR_CODES.BILLING_RISK_ACK_FAILED,
    );
  });

  void test("POST_APPROVAL_BILLING_RISK_UNACKNOWLEDGED is distinct from POST_APPROVAL_BILLING_BLOCKED", () => {
    assert.notEqual(
      CASE_WRITE_ERROR_CODES.POST_APPROVAL_BILLING_RISK_UNACKNOWLEDGED,
      CASE_WRITE_ERROR_CODES.POST_APPROVAL_BILLING_BLOCKED,
    );
  });

  void test("FINAL_PAYMENT_GUARD_ERROR_CODES align with CASE_WRITE_ERROR_CODES", () => {
    assert.equal(
      FINAL_PAYMENT_GUARD_ERROR_CODES.BILLING_BLOCKED,
      CASE_WRITE_ERROR_CODES.POST_APPROVAL_BILLING_BLOCKED,
    );
    assert.equal(
      FINAL_PAYMENT_GUARD_ERROR_CODES.BILLING_RISK_UNACKNOWLEDGED,
      CASE_WRITE_ERROR_CODES.POST_APPROVAL_BILLING_RISK_UNACKNOWLEDGED,
    );
    assert.equal(
      FINAL_PAYMENT_GUARD_ERROR_CODES.WORKFLOW_STEP_BILLING_BLOCKED,
      CASE_WRITE_ERROR_CODES.WORKFLOW_STEP_BILLING_BLOCKED,
    );
  });
});

// ════════════════════════════════════════════════════════════════
// 2. decideFinalPaymentGuard → 错误码映射契约
// ════════════════════════════════════════════════════════════════

void describe("COE block guard: decision-to-error-code mapping", () => {
  void test("block decision → POST_APPROVAL_BILLING_BLOCKED for post-approval path", () => {
    const d = decideFinalPaymentGuard(unsettled("block", 300000), false);
    assert.equal(d.decision, "block");
    const errorCode = CASE_WRITE_ERROR_CODES.POST_APPROVAL_BILLING_BLOCKED;
    assert.equal(errorCode, "CASE_POST_APPROVAL_BILLING_BLOCKED");
  });

  void test("block decision → WORKFLOW_STEP_BILLING_BLOCKED for workflow step path", () => {
    const d = decideFinalPaymentGuard(unsettled("block", 300000), false);
    assert.equal(d.decision, "block");
    assert.equal(
      CASE_WRITE_ERROR_CODES.WORKFLOW_STEP_BILLING_BLOCKED,
      "CASE_WORKFLOW_STEP_BILLING_BLOCKED",
    );
  });

  void test("warn_requires_ack → POST_APPROVAL_BILLING_RISK_UNACKNOWLEDGED", () => {
    const d = decideFinalPaymentGuard(unsettled("warn", 100000), false);
    assert.equal(d.decision, "warn_requires_ack");
    const errorCode =
      CASE_WRITE_ERROR_CODES.POST_APPROVAL_BILLING_RISK_UNACKNOWLEDGED;
    assert.equal(errorCode, "CASE_POST_APPROVAL_BILLING_RISK_UNACKNOWLEDGED");
  });

  void test("pass decisions produce no error code", () => {
    const pass1 = decideFinalPaymentGuard(null, false);
    const pass2 = decideFinalPaymentGuard({ settled: true }, false);
    const pass3 = decideFinalPaymentGuard(unsettled("warn"), true);
    for (const d of [pass1, pass2, pass3]) {
      assert.equal(d.decision, "pass");
    }
  });
});

// ════════════════════════════════════════════════════════════════
// 3. block 模式无视风险确认 — 与 P0 warn 语义分离
// ════════════════════════════════════════════════════════════════

void describe("COE block guard: block overrides risk ack", () => {
  void test("block + risk acknowledged → still blocked", () => {
    const d = decideFinalPaymentGuard(unsettled("block", 200000), true);
    assert.equal(d.decision, "block");
  });

  void test("block + risk NOT acknowledged → still blocked", () => {
    const d = decideFinalPaymentGuard(unsettled("block", 200000), false);
    assert.equal(d.decision, "block");
  });

  void test("warn + risk acknowledged → pass (P0 warn semantics preserved)", () => {
    const d = decideFinalPaymentGuard(unsettled("warn", 200000), true);
    assert.equal(d.decision, "pass");
    assert.equal(d.reason, "risk_acknowledged");
  });

  void test("warn + risk NOT acknowledged → warn_requires_ack (P0 warn semantics preserved)", () => {
    const d = decideFinalPaymentGuard(unsettled("warn", 200000), false);
    assert.equal(d.decision, "warn_requires_ack");
  });
});

// ════════════════════════════════════════════════════════════════
// 4. BMV 蓝图 COE_SENT 步骤使用 block 模式
// ════════════════════════════════════════════════════════════════

void describe("COE block guard: BMV blueprint alignment", () => {
  const coeSentStep = BMV_WORKFLOW_STEPS_BLUEPRINT.find(
    (s) => s.stepCode === "COE_SENT",
  );

  void test("COE_SENT step exists in blueprint", () => {
    assert.ok(coeSentStep);
  });

  void test("COE_SENT billing gate mode is block", () => {
    assert.equal(coeSentStep?.billingGate?.mode, "block");
  });

  void test("COE_SENT billing gate milestone is final_payment", () => {
    assert.equal(coeSentStep?.billingGate?.milestone, FINAL_PAYMENT_MILESTONE);
  });

  void test("default gate mode matches blueprint", () => {
    assert.equal(
      FINAL_PAYMENT_DEFAULT_GATE_MODE,
      coeSentStep?.billingGate?.mode,
    );
  });

  void test("trigger step constant matches COE_SENT", () => {
    assert.equal(FINAL_PAYMENT_GATE_TRIGGER_STEP, "COE_SENT");
  });
});

// ════════════════════════════════════════════════════════════════
// 5. 蓝图中非 COE_SENT 步骤不触发 block 门禁
// ════════════════════════════════════════════════════════════════

void describe("COE block guard: other steps are not blocked", () => {
  const otherSteps = BMV_WORKFLOW_STEPS_BLUEPRINT.filter(
    (s) => s.stepCode !== "COE_SENT",
  );

  void test("all non-COE_SENT steps have billingGate=null or mode≠block", () => {
    for (const step of otherSteps) {
      const gate = step.billingGate;
      if (gate !== null) {
        assert.notEqual(
          gate.mode,
          "block",
          `${step.stepCode} should not use block mode`,
        );
      }
    }
  });

  void test("WAITING_PAYMENT has no billing gate", () => {
    const wp = BMV_WORKFLOW_STEPS_BLUEPRINT.find(
      (s) => s.stepCode === "WAITING_PAYMENT",
    );
    assert.equal(wp?.billingGate, null);
  });
});

// ════════════════════════════════════════════════════════════════
// 6. 蓝图 mode=block 提升：当 billing_records 返回 warn 时仍阻断
// ════════════════════════════════════════════════════════════════

void describe("COE block guard: blueprint mode escalation", () => {
  void test("billing records say warn but blueprint says block → decision should block when escalated", () => {
    const escalated: FinalPaymentGuardCheckResult = {
      settled: false,
      unpaid: 150000,
      gateEffectMode: "block",
    };
    const d = decideFinalPaymentGuard(escalated, false);
    assert.equal(d.decision, "block");
  });

  void test("billing records say block and blueprint says block → decision is block", () => {
    const d = decideFinalPaymentGuard(unsettled("block", 200000), false);
    assert.equal(d.decision, "block");
  });

  void test("billing records say warn and blueprint says warn → decision is warn", () => {
    const d = decideFinalPaymentGuard(unsettled("warn", 100000), false);
    assert.equal(d.decision, "warn_requires_ack");
  });
});

// ════════════════════════════════════════════════════════════════
// 7. 边界条件
// ════════════════════════════════════════════════════════════════

void describe("COE block guard: edge cases", () => {
  void test("no billing records (null) → pass", () => {
    const d = decideFinalPaymentGuard(null, false);
    assert.equal(d.decision, "pass");
    assert.equal(d.reason, "no_final_payment_guard");
  });

  void test("all billing records settled → pass", () => {
    const d = decideFinalPaymentGuard({ settled: true }, false);
    assert.equal(d.decision, "pass");
    assert.equal(d.reason, "settled");
  });

  void test("block with zero unpaid → still blocks (semantic: not all plans paid)", () => {
    const d = decideFinalPaymentGuard(unsettled("block", 0), false);
    assert.equal(d.decision, "block");
  });

  void test("block decision carries unpaid amount", () => {
    const d = decideFinalPaymentGuard(unsettled("block", 350000), false);
    assert.equal(d.decision, "block");
    assert.equal((d as { unpaid: number }).unpaid, 350000);
  });

  void test("warn decision carries unpaid amount", () => {
    const d = decideFinalPaymentGuard(unsettled("warn", 50000), false);
    assert.equal(d.decision, "warn_requires_ack");
    assert.equal((d as { unpaid: number }).unpaid, 50000);
  });
});
