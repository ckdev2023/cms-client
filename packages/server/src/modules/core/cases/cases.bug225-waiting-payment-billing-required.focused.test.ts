import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { CASE_WRITE_ERROR_CODES } from "./cases.types";
import {
  CASE_ID,
  billingRow,
  makeCaseRow,
  makeCtx,
  makePool,
  makeTemplates,
  ok,
  svc,
} from "./cases.final-payment-coe-guard.focused.test-support";

// ════════════════════════════════════════════════════════════════
// BUG-225: APPROVED → WAITING_PAYMENT 必须存在至少一条 status=due 的
// billing_records，否则阻断。
// ════════════════════════════════════════════════════════════════

void describe("transitionPhase: WAITING_PAYMENT billing gate (BUG-225)", () => {
  void test("blocks APPROVED → WAITING_PAYMENT when no billing records exist", async () => {
    const pool = makePool((sql, p) => {
      if (
        sql.includes("from billing_records") &&
        sql.includes("status = 'due'")
      )
        return ok([]);
      if (sql.includes("from billing_records") && sql.includes("尾款"))
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
          /At least one billing record with status=due is required/,
        );
        return true;
      },
    );
  });

  void test("allows APPROVED → WAITING_PAYMENT when at least one due billing record exists", async () => {
    const pool = makePool((sql, p) => {
      if (
        sql.includes("from billing_records") &&
        sql.includes("status = 'due'")
      )
        return ok([{ "1": 1 }]);
      if (sql.includes("from billing_records") && sql.includes("尾款"))
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

  void test("gate does not fire for non-WAITING_PAYMENT targets", async () => {
    const pool = makePool((sql, p) => {
      if (
        sql.includes("from billing_records") &&
        sql.includes("status = 'due'")
      )
        return ok([]);
      if (sql.includes("from billing_records") && sql.includes("尾款"))
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
