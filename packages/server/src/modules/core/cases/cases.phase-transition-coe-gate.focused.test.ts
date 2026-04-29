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
  paymentRow,
  svc,
} from "./cases.final-payment-coe-guard.focused.test-support";

// ════════════════════════════════════════════════════════════════
// BUG-097: businessPhase 维度推进到 COE_SENT 必须接尾款 gate
//
// 业务规范来源：
//   - P1/01 §M6「未结清尾款不得推进到 COE_SENT」
//   - P0/07 §3.20 BillingPlan + gate_trigger_step=COE_SENT, gate_effect_mode=block
//
// 与 cases.coe-block-guard.focused.test 区别：
//   - 那一组覆盖 decideFinalPaymentGuard / blueprint 的纯函数契约
//   - 此处覆盖 transitionPhase 调用通路（API 层 phase-transition）
// ════════════════════════════════════════════════════════════════

void describe("transitionPhase: COE_SENT billing gate (BUG-097)", () => {
  void test("blocks WAITING_PAYMENT → COE_SENT when final payment gate is block", async () => {
    const pool = makePool((sql, p) => {
      if (sql.includes("from billing_records") && sql.includes("尾款"))
        return ok([billingRow("block", "due", "250000")]);
      if (
        sql.includes("from payment_records pr") &&
        sql.includes("billing_records br")
      )
        return ok([paymentRow("0")]);
      if (sql.includes("from cases") && p?.[0] === CASE_ID)
        return ok([makeCaseRow({ business_phase: "WAITING_PAYMENT" })]);
      return ok();
    });

    await assert.rejects(
      () =>
        svc(pool, makeTemplates()).transitionPhase(makeCtx(), CASE_ID, {
          toPhase: "COE_SENT",
        }),
      (err: Error) => {
        assert.match(err.message, /CASE_POST_APPROVAL_BILLING_BLOCKED/);
        assert.match(err.message, /Final payment is still unpaid/);
        assert.match(err.message, /Billing gate blocks COE sending/);
        return true;
      },
    );
  });

  void test("requires billing risk ack when warn-mode gate is unsettled", async () => {
    const pool = makePool((sql, p) => {
      if (sql.includes("from billing_records") && sql.includes("尾款"))
        return ok([billingRow("warn", "due", "100000")]);
      if (
        sql.includes("from payment_records pr") &&
        sql.includes("billing_records br")
      )
        return ok([paymentRow("0")]);
      if (sql.includes("from cases") && p?.[0] === CASE_ID)
        return ok([
          makeCaseRow({
            business_phase: "WAITING_PAYMENT",
            billing_risk_acknowledged_at: null,
          }),
        ]);
      return ok();
    });

    await assert.rejects(
      () =>
        svc(pool, makeTemplates()).transitionPhase(makeCtx(), CASE_ID, {
          toPhase: "COE_SENT",
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

  void test("allows COE_SENT for warn gate after billing risk ack", async () => {
    const calls: { sql: string; params?: unknown[] }[] = [];
    const pool = makePool((sql, p) => {
      calls.push({ sql: sql.trim(), params: p });
      if (sql.includes("from billing_records") && sql.includes("尾款"))
        return ok([billingRow("warn", "due", "100000")]);
      if (
        sql.includes("from payment_records pr") &&
        sql.includes("billing_records br")
      )
        return ok([paymentRow("0")]);
      if (sql.includes("update cases") && sql.includes("business_phase = $2"))
        return ok([
          makeCaseRow({
            business_phase: "COE_SENT",
            billing_risk_acknowledged_at: "2026-04-10T00:00:00.000Z",
          }),
        ]);
      if (sql.includes("from cases") && p?.[0] === CASE_ID)
        return ok([
          makeCaseRow({
            business_phase: "WAITING_PAYMENT",
            billing_risk_acknowledged_at: "2026-04-10T00:00:00.000Z",
          }),
        ]);
      return ok();
    });

    const updated = await svc(pool, makeTemplates()).transitionPhase(
      makeCtx(),
      CASE_ID,
      { toPhase: "COE_SENT" },
    );

    assert.equal(updated.businessPhase, "COE_SENT");
    assert.equal(
      calls.filter(
        (c) =>
          c.sql.includes("update cases") &&
          c.sql.includes("business_phase = $2"),
      ).length,
      1,
    );
  });

  void test("blocks COE_SENT when no final-payment billing records exist (BUG-111 default-deny)", async () => {
    const pool = makePool((sql, p) => {
      if (sql.includes("from billing_records") && sql.includes("尾款"))
        return ok();
      if (sql.includes("from cases") && p?.[0] === CASE_ID)
        return ok([makeCaseRow({ business_phase: "WAITING_PAYMENT" })]);
      return ok();
    });

    await assert.rejects(
      () =>
        svc(pool, makeTemplates()).transitionPhase(makeCtx(), CASE_ID, {
          toPhase: "COE_SENT",
        }),
      (err: Error) => {
        assert.match(err.message, /CASE_POST_APPROVAL_BILLING_BLOCKED/);
        assert.match(err.message, /Final payment milestone is missing/);
        return true;
      },
    );
  });

  void test("non-COE phase transition does not require a final-payment plan (BUG-111 scope guard)", async () => {
    let billingQueried = false;
    const pool = makePool((sql, p) => {
      if (sql.includes("from billing_records") && sql.includes("尾款")) {
        billingQueried = true;
        return ok();
      }
      if (sql.includes("update cases") && sql.includes("business_phase = $2"))
        return ok([makeCaseRow({ business_phase: "WAITING_MATERIAL" })]);
      if (sql.includes("from cases") && p?.[0] === CASE_ID)
        return ok([makeCaseRow({ business_phase: "CONTRACTED" })]);
      return ok();
    });

    const updated = await svc(pool, makeTemplates()).transitionPhase(
      makeCtx(),
      CASE_ID,
      { toPhase: "WAITING_MATERIAL" },
    );

    assert.equal(updated.businessPhase, "WAITING_MATERIAL");
    assert.equal(
      billingQueried,
      false,
      "billing_records should not be queried for non-COE_SENT phases",
    );
  });

  void test("allows COE_SENT when final payment is fully settled", async () => {
    const pool = makePool((sql, p) => {
      if (sql.includes("from billing_records") && sql.includes("尾款"))
        return ok([billingRow("block", "paid", "250000")]);
      if (sql.includes("update cases") && sql.includes("business_phase = $2"))
        return ok([makeCaseRow({ business_phase: "COE_SENT" })]);
      if (sql.includes("from cases") && p?.[0] === CASE_ID)
        return ok([makeCaseRow({ business_phase: "WAITING_PAYMENT" })]);
      return ok();
    });

    const updated = await svc(pool, makeTemplates()).transitionPhase(
      makeCtx(),
      CASE_ID,
      { toPhase: "COE_SENT" },
    );

    assert.equal(updated.businessPhase, "COE_SENT");
  });

  void test("does not run gate when target phase is not COE_SENT", async () => {
    let billingQueried = false;
    const pool = makePool((sql, p) => {
      if (sql.includes("from billing_records") && sql.includes("尾款")) {
        billingQueried = true;
        return ok([billingRow("block", "due", "999999")]);
      }
      if (sql.includes("update cases") && sql.includes("business_phase = $2"))
        return ok([makeCaseRow({ business_phase: "WAITING_MATERIAL" })]);
      if (sql.includes("from cases") && p?.[0] === CASE_ID)
        return ok([makeCaseRow({ business_phase: "CONTRACTED" })]);
      return ok();
    });

    const updated = await svc(pool, makeTemplates()).transitionPhase(
      makeCtx(),
      CASE_ID,
      { toPhase: "WAITING_MATERIAL" },
    );

    assert.equal(updated.businessPhase, "WAITING_MATERIAL");
    assert.equal(
      billingQueried,
      false,
      "billing_records should not be queried for non-COE_SENT phases",
    );
  });

  void test("block decision overrides risk ack (P1 hard gate)", async () => {
    const pool = makePool((sql, p) => {
      if (sql.includes("from billing_records") && sql.includes("尾款"))
        return ok([billingRow("block", "due", "200000")]);
      if (
        sql.includes("from payment_records pr") &&
        sql.includes("billing_records br")
      )
        return ok([paymentRow("0")]);
      if (sql.includes("from cases") && p?.[0] === CASE_ID)
        return ok([
          makeCaseRow({
            business_phase: "WAITING_PAYMENT",
            billing_risk_acknowledged_at: "2026-04-10T00:00:00.000Z",
          }),
        ]);
      return ok();
    });

    await assert.rejects(
      () =>
        svc(pool, makeTemplates()).transitionPhase(makeCtx(), CASE_ID, {
          toPhase: "COE_SENT",
        }),
      (err: Error) => {
        assert.ok(
          err.message.includes(
            CASE_WRITE_ERROR_CODES.POST_APPROVAL_BILLING_BLOCKED,
          ),
          "block mode must fire even when risk has been acknowledged",
        );
        return true;
      },
    );
  });
});
