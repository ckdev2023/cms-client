import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { CASE_WRITE_ERROR_CODES } from "./cases.types";
import {
  CASE_ID,
  billingRow,
  isBillingReceivableExistenceQuery,
  makeCaseRow,
  makeCtx,
  makePool,
  makeTemplates,
  ok,
  svc,
} from "./cases.final-payment-coe-guard.focused.test-support";

// ════════════════════════════════════════════════════════════════
// BUG-225: APPROVED → WAITING_PAYMENT 必须存在至少一条仍有未结清应收的
// billing_records（due / partial / overdue），否则阻断。
// ════════════════════════════════════════════════════════════════

function isWaitingPaymentBillingGateQuery(sql: string): boolean {
  return (
    sql.includes("from billing_records") &&
    sql.includes("status in ('due', 'partial', 'overdue')")
  );
}

void describe("transitionPhase: WAITING_PAYMENT billing gate (BUG-225)", () => {
  void test("blocks APPROVED → WAITING_PAYMENT when no billing records exist", async () => {
    const pool = makePool((sql, p) => {
      if (isWaitingPaymentBillingGateQuery(sql)) return ok([]);
      if (
        sql.includes(
          "select id, amount_due, status, milestone_name, gate_effect_mode",
        )
      )
        return ok([]);
      if (sql.includes("from cases") && p?.[0] === CASE_ID)
        return ok([makeCaseRow({ business_phase: "APPROVED" })]);
      return ok();
    });

    await assert.rejects(
      () =>
        svc(pool, makeTemplates()).transitionPhase(makeCtx(), CASE_ID, {
          toPhase: "WAITING_PAYMENT",
        }),
      (err: Error) => {
        assert.match(err.message, /CASE_WAITING_PAYMENT_BILLING_REQUIRED/);
        assert.match(
          err.message,
          /At least one outstanding billing record \(due\/partial\/overdue\) is required/,
        );
        return true;
      },
    );
  });

  void test("allows APPROVED → WAITING_PAYMENT when at least one due billing record exists", async () => {
    const pool = makePool((sql, p) => {
      if (isWaitingPaymentBillingGateQuery(sql)) return ok([{ "1": 1 }]);
      if (
        sql.includes(
          "select id, amount_due, status, milestone_name, gate_effect_mode",
        )
      )
        return ok([]);
      if (sql.includes("update cases") && sql.includes("business_phase = $2"))
        return ok([makeCaseRow({ business_phase: "WAITING_PAYMENT" })]);
      if (sql.includes("from cases") && p?.[0] === CASE_ID)
        return ok([makeCaseRow({ business_phase: "APPROVED" })]);
      return ok();
    });

    const c = await svc(pool, makeTemplates()).transitionPhase(
      makeCtx(),
      CASE_ID,
      { toPhase: "WAITING_PAYMENT" },
    );
    assert.equal(c.businessPhase, "WAITING_PAYMENT");
  });

  void test("allows APPROVED → WAITING_PAYMENT when billing record is partial (not only due)", async () => {
    const pool = makePool((sql, p) => {
      if (isWaitingPaymentBillingGateQuery(sql)) return ok([{ "1": 1 }]);
      if (
        sql.includes(
          "select id, amount_due, status, milestone_name, gate_effect_mode",
        )
      )
        return ok([]);
      if (sql.includes("update cases") && sql.includes("business_phase = $2"))
        return ok([makeCaseRow({ business_phase: "WAITING_PAYMENT" })]);
      if (sql.includes("from cases") && p?.[0] === CASE_ID)
        return ok([makeCaseRow({ business_phase: "APPROVED" })]);
      return ok();
    });

    const c = await svc(pool, makeTemplates()).transitionPhase(
      makeCtx(),
      CASE_ID,
      { toPhase: "WAITING_PAYMENT" },
    );
    assert.equal(c.businessPhase, "WAITING_PAYMENT");
  });

  void test("blocks APPROVED → WAITING_PAYMENT when only paid billing records exist", async () => {
    const pool = makePool((sql, p) => {
      if (isWaitingPaymentBillingGateQuery(sql)) return ok([]);
      if (
        sql.includes(
          "select id, amount_due, status, milestone_name, gate_effect_mode",
        )
      )
        return ok([]);
      if (sql.includes("from cases") && p?.[0] === CASE_ID)
        return ok([makeCaseRow({ business_phase: "APPROVED" })]);
      return ok();
    });

    await assert.rejects(
      () =>
        svc(pool, makeTemplates()).transitionPhase(makeCtx(), CASE_ID, {
          toPhase: "WAITING_PAYMENT",
        }),
      (err: Error) => {
        assert.match(err.message, /CASE_WAITING_PAYMENT_BILLING_REQUIRED/);
        return true;
      },
    );
  });

  void test("gate does not fire for non-WAITING_PAYMENT targets", async () => {
    const pool = makePool((sql, p) => {
      if (isWaitingPaymentBillingGateQuery(sql)) return ok([]);
      if (isBillingReceivableExistenceQuery(sql)) return ok([{ ok: true }]);
      if (
        sql.includes(
          "select id, amount_due, status, milestone_name, gate_effect_mode",
        )
      )
        return ok([billingRow("off", "paid", "0")]);
      if (sql.includes("update cases") && sql.includes("business_phase = $2"))
        return ok([makeCaseRow({ business_phase: "COE_SENT" })]);
      if (sql.includes("from cases") && p?.[0] === CASE_ID)
        return ok([makeCaseRow({ business_phase: "WAITING_PAYMENT" })]);
      return ok();
    });

    const c = await svc(pool, makeTemplates()).transitionPhase(
      makeCtx(),
      CASE_ID,
      { toPhase: "COE_SENT" },
    );
    assert.equal(c.businessPhase, "COE_SENT");
  });

  void test("error code is CASE_WAITING_PAYMENT_BILLING_REQUIRED constant", () => {
    assert.equal(
      CASE_WRITE_ERROR_CODES.WAITING_PAYMENT_BILLING_REQUIRED,
      "CASE_WAITING_PAYMENT_BILLING_REQUIRED",
    );
  });
});
