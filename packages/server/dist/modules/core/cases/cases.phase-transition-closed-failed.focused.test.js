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
// BUG-117: CLOSED_FAILED 时 closeReason 必填
//
// 业务规范：
//   - 推到 CLOSED_FAILED 时 closeReason 必填，缺则 400
//   - result_outcome 默认 'failure'，可覆写
//   - close_reason 写入 DB
// ════════════════════════════════════════════════════════════════
void describe("transitionPhase: CLOSED_FAILED closeReason guard (BUG-117)", () => {
  void test("REJECTED → CLOSED_FAILED without closeReason → 400", async () => {
    const pool = makePool((sql, p) => {
      if (sql.includes("from cases") && p?.[0] === CASE_ID)
        return ok([makeCaseRow({ business_phase: "REJECTED" })]);
      return ok();
    });
    await assert.rejects(
      () =>
        svc(pool, makeTemplates()).transitionPhase(makeCtx(), CASE_ID, {
          toPhase: "CLOSED_FAILED",
        }),
      (err) => {
        assert.match(
          err.message,
          new RegExp(CASE_WRITE_ERROR_CODES.CLOSE_REASON_REQUIRED),
        );
        return true;
      },
    );
  });
  void test("REJECTED → CLOSED_FAILED with closeReason → 201, DB row has close_reason/result_outcome/stage=S9", async () => {
    const calls = [];
    const pool = makePool((sql, p) => {
      calls.push({ sql: sql.trim(), params: p });
      if (sql.includes("update cases") && sql.includes("business_phase = $2"))
        return ok([
          makeCaseRow({
            business_phase: "CLOSED_FAILED",
            stage: "S9",
            status: "S9",
            close_reason: "BMV-VISA-REJECTED",
            result_outcome: "failure",
          }),
        ]);
      if (sql.includes("from cases") && p?.[0] === CASE_ID)
        return ok([makeCaseRow({ business_phase: "REJECTED" })]);
      return ok();
    });
    const updated = await svc(pool, makeTemplates()).transitionPhase(
      makeCtx(),
      CASE_ID,
      {
        toPhase: "CLOSED_FAILED",
        closeReason: "BMV-VISA-REJECTED",
      },
    );
    assert.equal(updated.businessPhase, "CLOSED_FAILED");
    assert.equal(updated.stage, "S9");
    assert.equal(updated.closeReason, "BMV-VISA-REJECTED");
    assert.equal(updated.resultOutcome, "failure");
    const updateCall = calls.find(
      (c) => c.sql.includes("update cases") && c.sql.includes("business_phase"),
    );
    assert.ok(updateCall, "should issue update cases statement");
    assert.deepEqual(updateCall.params, [
      CASE_ID,
      "CLOSED_FAILED",
      "REJECTED",
      false,
      false,
      false,
      "BMV-VISA-REJECTED",
      "failure",
    ]);
  });
  void test("CLOSED_FAILED with custom resultOutcome passes through", async () => {
    const calls = [];
    const pool = makePool((sql, p) => {
      calls.push({ sql: sql.trim(), params: p });
      if (sql.includes("update cases") && sql.includes("business_phase = $2"))
        return ok([
          makeCaseRow({
            business_phase: "CLOSED_FAILED",
            stage: "S9",
            status: "S9",
            close_reason: "CLIENT-CANCEL",
            result_outcome: "withdrawn",
          }),
        ]);
      if (sql.includes("from cases") && p?.[0] === CASE_ID)
        return ok([makeCaseRow({ business_phase: "REJECTED" })]);
      return ok();
    });
    const updated = await svc(pool, makeTemplates()).transitionPhase(
      makeCtx(),
      CASE_ID,
      {
        toPhase: "CLOSED_FAILED",
        closeReason: "CLIENT-CANCEL",
        resultOutcome: "withdrawn",
      },
    );
    assert.equal(updated.resultOutcome, "withdrawn");
    const updateCall = calls.find(
      (c) => c.sql.includes("update cases") && c.sql.includes("business_phase"),
    );
    assert.ok(updateCall);
    assert.equal(updateCall.params?.[7], "withdrawn");
  });
  void test("VISA_REJECTED → CLOSED_FAILED with closeReason succeeds", async () => {
    const pool = makePool((sql, p) => {
      if (sql.includes("update cases") && sql.includes("business_phase = $2"))
        return ok([
          makeCaseRow({
            business_phase: "CLOSED_FAILED",
            stage: "S9",
            status: "S9",
            close_reason: "VISA-REJECTED-OVERSEAS",
            result_outcome: "failure",
          }),
        ]);
      if (sql.includes("from cases") && p?.[0] === CASE_ID)
        return ok([makeCaseRow({ business_phase: "VISA_REJECTED" })]);
      return ok();
    });
    const updated = await svc(pool, makeTemplates()).transitionPhase(
      makeCtx(),
      CASE_ID,
      {
        toPhase: "CLOSED_FAILED",
        closeReason: "VISA-REJECTED-OVERSEAS",
      },
    );
    assert.equal(updated.businessPhase, "CLOSED_FAILED");
    assert.equal(updated.stage, "S9");
    assert.equal(updated.closeReason, "VISA-REJECTED-OVERSEAS");
  });
  void test("timeline payload includes closeReason and resultOutcome", async () => {
    const calls = [];
    const pool = makePool((sql, p) => {
      calls.push({ sql: sql.trim(), params: p });
      if (sql.includes("update cases") && sql.includes("business_phase = $2"))
        return ok([
          makeCaseRow({
            business_phase: "CLOSED_FAILED",
            stage: "S9",
            close_reason: "BMV-VISA-REJECTED",
            result_outcome: "failure",
          }),
        ]);
      if (sql.includes("from cases") && p?.[0] === CASE_ID)
        return ok([makeCaseRow({ business_phase: "REJECTED" })]);
      return ok();
    });
    await svc(pool, makeTemplates()).transitionPhase(makeCtx(), CASE_ID, {
      toPhase: "CLOSED_FAILED",
      closeReason: "BMV-VISA-REJECTED",
    });
    const timelineCall = calls.find((c) =>
      c.sql.includes("insert into timeline_logs"),
    );
    assert.ok(timelineCall, "should write phase_transitioned timeline log");
    const payloadJson = (timelineCall.params ?? [])[5];
    const payload = JSON.parse(String(payloadJson));
    assert.equal(payload.from, "REJECTED");
    assert.equal(payload.to, "CLOSED_FAILED");
    assert.equal(payload.closeReason, "BMV-VISA-REJECTED");
    assert.equal(payload.resultOutcome, "failure");
  });
});
//# sourceMappingURL=cases.phase-transition-closed-failed.focused.test.js.map
