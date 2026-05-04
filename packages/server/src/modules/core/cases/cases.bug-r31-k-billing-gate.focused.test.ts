import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { CASE_WRITE_ERROR_CODES } from "./cases.types";
import {
  CASE_ID,
  makeCaseRow,
  makeCtx,
  makePool,
  makeTemplates,
  ok,
  svc,
} from "./cases.final-payment-coe-guard.focused.test-support";

// ════════════════════════════════════════════════════════════════
// R31-K: Stage transition to S5/S6/S7 must have at least one
// billing_records row, otherwise blocked.
// ════════════════════════════════════════════════════════════════

void describe("transition: billing record required for S5/S6/S7 (R31-K)", () => {
  void test("blocks S4→S5 when no billing records exist", async () => {
    const pool = makePool((sql, p) => {
      if (sql.includes("from billing_records") && sql.includes("limit 1"))
        return ok([]);
      if (sql.includes("from cases") && p?.[0] === CASE_ID)
        return ok([makeCaseRow({ stage: "S4", status: "S4" })]);
      return ok();
    });

    await assert.rejects(
      () =>
        svc(pool, makeTemplates()).transition(makeCtx(), CASE_ID, {
          toStage: "S5",
        }),
      (err: Error) => {
        assert.match(err.message, /CASE_STAGE_BILLING_RECORD_REQUIRED/);
        assert.match(err.message, /At least one billing record is required/);
        return true;
      },
    );
  });

  void test("blocks S5→S6 when no billing records exist", async () => {
    const pool = makePool((sql, p) => {
      if (sql.includes("from billing_records") && sql.includes("limit 1"))
        return ok([]);
      if (sql.includes("from cases") && p?.[0] === CASE_ID)
        return ok([makeCaseRow({ stage: "S5", status: "S5" })]);
      return ok();
    });

    await assert.rejects(
      () =>
        svc(pool, makeTemplates()).transition(makeCtx(), CASE_ID, {
          toStage: "S6",
        }),
      (err: Error) => {
        assert.match(err.message, /CASE_STAGE_BILLING_RECORD_REQUIRED/);
        return true;
      },
    );
  });

  void test("blocks S6→S7 when no billing records exist", async () => {
    const pool = makePool((sql, p) => {
      if (sql.includes("from billing_records") && sql.includes("limit 1"))
        return ok([]);
      if (sql.includes("from cases") && p?.[0] === CASE_ID)
        return ok([makeCaseRow({ stage: "S6", status: "S6" })]);
      return ok();
    });

    await assert.rejects(
      () =>
        svc(pool, makeTemplates()).transition(makeCtx(), CASE_ID, {
          toStage: "S7",
        }),
      (err: Error) => {
        assert.match(err.message, /CASE_STAGE_BILLING_RECORD_REQUIRED/);
        return true;
      },
    );
  });

  void test("allows S4→S5 when billing record exists", async () => {
    const pool = makePool((sql, p) => {
      if (sql.includes("from billing_records") && sql.includes("limit 1"))
        return ok([{ id: "br-1" }]);
      if (sql.includes("from document_items")) return ok([]);
      if (sql.includes("update cases") && sql.includes("stage = $2"))
        return ok([makeCaseRow({ stage: "S5", status: "S5" })]);
      if (sql.includes("from cases") && p?.[0] === CASE_ID)
        return ok([makeCaseRow({ stage: "S4", status: "S4" })]);
      return ok();
    });

    const c = await svc(pool, makeTemplates()).transition(makeCtx(), CASE_ID, {
      toStage: "S5",
    });
    assert.equal(c.stage, "S5");
  });

  void test("does not fire for transitions not targeting S5/S6/S7", async () => {
    const pool = makePool((sql, p) => {
      if (sql.includes("from billing_records") && sql.includes("limit 1"))
        return ok([]);
      if (sql.includes("from case_parties")) return ok([{ id: "cp-1" }]);
      if (sql.includes("update cases") && sql.includes("stage = $2"))
        return ok([makeCaseRow({ stage: "S4", status: "S4" })]);
      if (sql.includes("from cases") && p?.[0] === CASE_ID)
        return ok([makeCaseRow({ stage: "S3", status: "S3" })]);
      return ok();
    });

    const c = await svc(pool, makeTemplates()).transition(makeCtx(), CASE_ID, {
      toStage: "S4",
    });
    assert.equal(c.stage, "S4");
  });

  void test("error code constant is correct", () => {
    assert.equal(
      CASE_WRITE_ERROR_CODES.STAGE_BILLING_RECORD_REQUIRED,
      "CASE_STAGE_BILLING_RECORD_REQUIRED",
    );
  });
});
