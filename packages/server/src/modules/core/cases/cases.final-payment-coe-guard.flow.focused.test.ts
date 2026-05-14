import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { CASE_WRITE_ERROR_CODES } from "./cases.types";
import {
  FINAL_PAYMENT_GUARD_ERROR_CODES,
  decideFinalPaymentGuard,
} from "./cases.types-final-payment";
import type { FinalPaymentGuardCheckResult } from "./cases.types-final-payment";
import {
  CASE_ID,
  billingRow,
  isBillingReceivableExistenceQuery,
  makeCaseRow,
  makeCtx,
  makePool,
  makeTemplates,
  ok,
  paymentRow,
  svc,
} from "./cases.final-payment-coe-guard.focused.test-support";

void describe("decideFinalPaymentGuard: comprehensive decision-to-error mapping", () => {
  function unsettled(
    mode: "block" | "warn",
    unpaid = 200000,
  ): FinalPaymentGuardCheckResult {
    return { settled: false, unpaid, gateEffectMode: mode };
  }

  void test("block → error code matches FINAL_PAYMENT_GUARD_ERROR_CODES.BILLING_BLOCKED", () => {
    const d = decideFinalPaymentGuard(unsettled("block"), false);
    assert.equal(d.decision, "block");
    assert.equal(
      FINAL_PAYMENT_GUARD_ERROR_CODES.BILLING_BLOCKED,
      CASE_WRITE_ERROR_CODES.POST_APPROVAL_BILLING_BLOCKED,
    );
  });

  void test("warn_requires_ack → error code matches BILLING_RISK_UNACKNOWLEDGED", () => {
    const d = decideFinalPaymentGuard(unsettled("warn"), false);
    assert.equal(d.decision, "warn_requires_ack");
    assert.equal(
      FINAL_PAYMENT_GUARD_ERROR_CODES.BILLING_RISK_UNACKNOWLEDGED,
      CASE_WRITE_ERROR_CODES.POST_APPROVAL_BILLING_RISK_UNACKNOWLEDGED,
    );
  });

  void test("workflow step block → uses distinct WORKFLOW_STEP_BILLING_BLOCKED code", () => {
    assert.equal(
      FINAL_PAYMENT_GUARD_ERROR_CODES.WORKFLOW_STEP_BILLING_BLOCKED,
      CASE_WRITE_ERROR_CODES.WORKFLOW_STEP_BILLING_BLOCKED,
    );
    assert.notEqual(
      CASE_WRITE_ERROR_CODES.WORKFLOW_STEP_BILLING_BLOCKED,
      CASE_WRITE_ERROR_CODES.POST_APPROVAL_BILLING_BLOCKED,
    );
  });

  void test("all three P1 error codes are distinct from P0 Gate-C warn code", () => {
    const p1Codes = [
      CASE_WRITE_ERROR_CODES.POST_APPROVAL_BILLING_BLOCKED,
      CASE_WRITE_ERROR_CODES.POST_APPROVAL_BILLING_RISK_UNACKNOWLEDGED,
      CASE_WRITE_ERROR_CODES.WORKFLOW_STEP_BILLING_BLOCKED,
    ];
    for (const code of p1Codes) {
      assert.notEqual(
        code,
        CASE_WRITE_ERROR_CODES.GATE_C_BILLING_RISK_UNACKNOWLEDGED,
        `${code} should differ from P0 Gate-C code`,
      );
    }
  });

  void test("null guard → pass with 'no_final_payment_guard' reason", () => {
    const d = decideFinalPaymentGuard(null, false);
    assert.equal(d.decision, "pass");
    assert.equal(d.reason, "no_final_payment_guard");
  });

  void test("settled guard → pass with 'settled' reason", () => {
    const d = decideFinalPaymentGuard({ settled: true }, false);
    assert.equal(d.decision, "pass");
    assert.equal(d.reason, "settled");
  });

  void test("settled guard → pass even when riskAcked=true (settled takes priority)", () => {
    const d = decideFinalPaymentGuard({ settled: true }, true);
    assert.equal(d.decision, "pass");
    assert.equal(d.reason, "settled");
  });

  void test("block decision carries exact unpaid amount", () => {
    const d = decideFinalPaymentGuard(unsettled("block", 123456), false);
    assert.equal(d.decision, "block");
    assert.equal((d as { unpaid: number }).unpaid, 123456);
  });

  void test("warn decision carries exact unpaid amount", () => {
    const d = decideFinalPaymentGuard(unsettled("warn", 78900), false);
    assert.equal(d.decision, "warn_requires_ack");
    assert.equal((d as { unpaid: number }).unpaid, 78900);
  });
});

void describe("error message format: post-approval path", () => {
  void test("block message includes error code prefix + unpaid amount + gate description", async () => {
    const pool = makePool((sql, p) => {
      if (isBillingReceivableExistenceQuery(sql)) return ok([{ ok: true }]);
      if (
        sql.includes(
          "select id, amount_due, status, milestone_name, gate_effect_mode",
        )
      )
        return ok([billingRow("block", "due", "300000")]);
      if (sql.includes("from payment_records pr") && sql.includes("any("))
        return ok([paymentRow("50000")]);
      if (sql.includes("from cases") && p?.[0] === CASE_ID)
        return ok([makeCaseRow()]);
      return ok();
    });

    await assert.rejects(
      () =>
        svc(pool, makeTemplates()).updatePostApprovalStage(makeCtx(), CASE_ID, {
          stage: "coe_sent",
        }),
      (err: Error) => {
        assert.match(err.message, /CASE_POST_APPROVAL_BILLING_BLOCKED/);
        assert.match(err.message, /Final payment is still unpaid/);
        assert.match(err.message, /250000/);
        assert.match(err.message, /Billing gate blocks COE sending/);
        return true;
      },
    );
  });

  void test("warn message includes risk-ack instruction", async () => {
    const pool = makePool((sql, p) => {
      if (isBillingReceivableExistenceQuery(sql)) return ok([{ ok: true }]);
      if (
        sql.includes(
          "select id, amount_due, status, milestone_name, gate_effect_mode",
        )
      )
        return ok([billingRow("warn", "due", "100000")]);
      if (sql.includes("from payment_records pr") && sql.includes("any("))
        return ok([paymentRow("0")]);
      if (sql.includes("from cases") && p?.[0] === CASE_ID)
        return ok([makeCaseRow()]);
      return ok();
    });

    await assert.rejects(
      () =>
        svc(pool, makeTemplates()).updatePostApprovalStage(makeCtx(), CASE_ID, {
          stage: "coe_sent",
        }),
      (err: Error) => {
        assert.match(
          err.message,
          /CASE_POST_APPROVAL_BILLING_RISK_UNACKNOWLEDGED/,
        );
        assert.match(err.message, /Please acknowledge billing risk/);
        return true;
      },
    );
  });
});

void describe("error message format: workflow step path", () => {
  void test("block message includes error code prefix + target step name", async () => {
    const pool = makePool((sql, p) => {
      if (
        sql.includes(
          "select id, amount_due, status, milestone_name, gate_effect_mode",
        )
      )
        return ok([billingRow("block", "due", "200000")]);
      if (sql.includes("from payment_records pr") && sql.includes("any("))
        return ok([paymentRow("0")]);
      if (sql.includes("from cases") && p?.[0] === CASE_ID)
        return ok([
          makeCaseRow({ current_workflow_step_code: "WAITING_PAYMENT" }),
        ]);
      return ok();
    });

    await assert.rejects(
      () =>
        svc(pool, makeTemplates()).transitionWorkflowStep(makeCtx(), CASE_ID, {
          toStepCode: "COE_SENT",
        }),
      (err: Error) => {
        assert.match(err.message, /CASE_WORKFLOW_STEP_BILLING_BLOCKED/);
        assert.match(err.message, /COE_SENT/);
        assert.match(err.message, /Billing gate blocks advancing/);
        return true;
      },
    );
  });

  void test("escalated warn→block message still uses WORKFLOW_STEP_BILLING_BLOCKED code", async () => {
    const pool = makePool((sql, p) => {
      if (
        sql.includes(
          "select id, amount_due, status, milestone_name, gate_effect_mode",
        )
      )
        return ok([billingRow("warn", "due", "100000")]);
      if (sql.includes("from payment_records pr") && sql.includes("any("))
        return ok([paymentRow("0")]);
      if (sql.includes("from cases") && p?.[0] === CASE_ID)
        return ok([
          makeCaseRow({ current_workflow_step_code: "WAITING_PAYMENT" }),
        ]);
      return ok();
    });

    await assert.rejects(
      () =>
        svc(pool, makeTemplates()).transitionWorkflowStep(makeCtx(), CASE_ID, {
          toStepCode: "COE_SENT",
        }),
      (err: Error) => {
        assert.match(
          err.message,
          /CASE_WORKFLOW_STEP_BILLING_BLOCKED/,
          "escalated warn should produce WORKFLOW_STEP_BILLING_BLOCKED, not POST_APPROVAL code",
        );
        assert.ok(
          !err.message.includes("CASE_POST_APPROVAL_BILLING"),
          "should not include post-approval error codes",
        );
        return true;
      },
    );
  });
});

void describe("P0/P1 error code isolation", () => {
  void test("POST_APPROVAL_BILLING_BLOCKED string value is CASE_ prefixed", () => {
    assert.match(
      CASE_WRITE_ERROR_CODES.POST_APPROVAL_BILLING_BLOCKED,
      /^CASE_/,
    );
  });

  void test("POST_APPROVAL_BILLING_RISK_UNACKNOWLEDGED string value is CASE_ prefixed", () => {
    assert.match(
      CASE_WRITE_ERROR_CODES.POST_APPROVAL_BILLING_RISK_UNACKNOWLEDGED,
      /^CASE_/,
    );
  });

  void test("WORKFLOW_STEP_BILLING_BLOCKED string value is CASE_ prefixed", () => {
    assert.match(
      CASE_WRITE_ERROR_CODES.WORKFLOW_STEP_BILLING_BLOCKED,
      /^CASE_/,
    );
  });

  void test("all three guard error codes are mutually distinct", () => {
    const codes = [
      CASE_WRITE_ERROR_CODES.POST_APPROVAL_BILLING_BLOCKED,
      CASE_WRITE_ERROR_CODES.POST_APPROVAL_BILLING_RISK_UNACKNOWLEDGED,
      CASE_WRITE_ERROR_CODES.WORKFLOW_STEP_BILLING_BLOCKED,
    ];
    assert.equal(new Set(codes).size, 3, "all three codes should be unique");
  });

  void test("FINAL_PAYMENT_GUARD_ERROR_CODES keys are complete", () => {
    const keys = Object.keys(FINAL_PAYMENT_GUARD_ERROR_CODES);
    assert.ok(keys.includes("BILLING_BLOCKED"));
    assert.ok(keys.includes("BILLING_RISK_UNACKNOWLEDGED"));
    assert.ok(keys.includes("WORKFLOW_STEP_BILLING_BLOCKED"));
    assert.equal(keys.length, 3);
  });
});

void describe("edge cases: zero unpaid still blocks/warns", () => {
  void test("post-approval: block mode with zero unpaid still blocks", async () => {
    const pool = makePool((sql, p) => {
      if (isBillingReceivableExistenceQuery(sql)) return ok([{ ok: true }]);
      if (
        sql.includes(
          "select id, amount_due, status, milestone_name, gate_effect_mode",
        )
      )
        return ok([billingRow("block", "partial", "0")]);
      if (sql.includes("from payment_records pr") && sql.includes("any("))
        return ok([paymentRow("0")]);
      if (sql.includes("from cases") && p?.[0] === CASE_ID)
        return ok([makeCaseRow()]);
      return ok();
    });

    await assert.rejects(
      () =>
        svc(pool, makeTemplates()).updatePostApprovalStage(makeCtx(), CASE_ID, {
          stage: "coe_sent",
        }),
      (err: Error) => {
        assert.ok(
          err.message.includes(
            CASE_WRITE_ERROR_CODES.POST_APPROVAL_BILLING_BLOCKED,
          ),
        );
        return true;
      },
    );
  });

  void test("workflow step: escalated warn with zero unpaid still blocks", async () => {
    const pool = makePool((sql, p) => {
      if (
        sql.includes(
          "select id, amount_due, status, milestone_name, gate_effect_mode",
        )
      )
        return ok([billingRow("warn", "partial", "0")]);
      if (sql.includes("from payment_records pr") && sql.includes("any("))
        return ok([paymentRow("0")]);
      if (sql.includes("from cases") && p?.[0] === CASE_ID)
        return ok([
          makeCaseRow({ current_workflow_step_code: "WAITING_PAYMENT" }),
        ]);
      return ok();
    });

    await assert.rejects(
      () =>
        svc(pool, makeTemplates()).transitionWorkflowStep(makeCtx(), CASE_ID, {
          toStepCode: "COE_SENT",
        }),
      (err: Error) => {
        assert.ok(
          err.message.includes(
            CASE_WRITE_ERROR_CODES.WORKFLOW_STEP_BILLING_BLOCKED,
          ),
        );
        return true;
      },
    );
  });
});

void describe("edge cases: multiple billing records", () => {
  void test("post-approval: any block record triggers block even with other warn records", async () => {
    const pool = makePool((sql, p) => {
      if (isBillingReceivableExistenceQuery(sql)) return ok([{ ok: true }]);
      if (
        sql.includes(
          "select id, amount_due, status, milestone_name, gate_effect_mode",
        )
      ) {
        return ok([
          billingRow("warn", "due", "100000", "尾款-第一期"),
          billingRow("block", "due", "100000", "尾款-第二期"),
        ]);
      }
      if (sql.includes("from payment_records pr") && sql.includes("any("))
        return ok([paymentRow("0")]);
      if (sql.includes("from cases") && p?.[0] === CASE_ID)
        return ok([makeCaseRow()]);
      return ok();
    });

    await assert.rejects(
      () =>
        svc(pool, makeTemplates()).updatePostApprovalStage(makeCtx(), CASE_ID, {
          stage: "coe_sent",
        }),
      (err: Error) => {
        assert.ok(
          err.message.includes(
            CASE_WRITE_ERROR_CODES.POST_APPROVAL_BILLING_BLOCKED,
          ),
          "block mode should take precedence over warn",
        );
        return true;
      },
    );
  });
});
