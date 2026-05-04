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
// BUG-200: 中途撤案 — WAITING_MATERIAL → CLOSED_FAILED
//
// 业务规范：
//   - 任意非终态、非成功链路 phase 可走 → CLOSED_FAILED
//   - 需提供 closeReason，否则 400
//   - 流转后 stage=S9, business_phase=CLOSED_FAILED,
//     result_outcome='failure', close_reason 写入
//   - 写 timeline case.phase_transitioned
// ════════════════════════════════════════════════════════════════
void describe("transitionPhase: mid-cancel WAITING_MATERIAL → CLOSED_FAILED (BUG-200)", () => {
  void test("missing closeReason → 400 CLOSE_REASON_REQUIRED", async () => {
    const pool = makePool((sql, p) => {
      if (sql.includes("from cases") && p?.[0] === CASE_ID)
        return ok([
          makeCaseRow({
            business_phase: "WAITING_MATERIAL",
            stage: "S2",
            status: "S2",
          }),
        ]);
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
  void test("with closeReason='MID_CASE_WITHDRAWAL' → stage=S9, phase=CLOSED_FAILED, result_outcome='failure'", async () => {
    const calls = [];
    const pool = makePool((sql, p) => {
      calls.push({ sql: sql.trim(), params: p });
      if (sql.includes("update cases") && sql.includes("business_phase = $2"))
        return ok([
          makeCaseRow({
            business_phase: "CLOSED_FAILED",
            stage: "S9",
            status: "S9",
            close_reason: "MID_CASE_WITHDRAWAL",
            result_outcome: "failure",
          }),
        ]);
      if (sql.includes("from cases") && p?.[0] === CASE_ID)
        return ok([
          makeCaseRow({
            business_phase: "WAITING_MATERIAL",
            stage: "S2",
            status: "S2",
          }),
        ]);
      return ok();
    });
    const updated = await svc(pool, makeTemplates()).transitionPhase(
      makeCtx(),
      CASE_ID,
      {
        toPhase: "CLOSED_FAILED",
        closeReason: "MID_CASE_WITHDRAWAL",
      },
    );
    assert.equal(updated.businessPhase, "CLOSED_FAILED");
    assert.equal(updated.stage, "S9");
    assert.equal(updated.closeReason, "MID_CASE_WITHDRAWAL");
    assert.equal(updated.resultOutcome, "failure");
    const updateCall = calls.find(
      (c) => c.sql.includes("update cases") && c.sql.includes("business_phase"),
    );
    assert.ok(updateCall, "should issue update cases statement");
    assert.deepEqual(updateCall.params, [
      CASE_ID,
      "CLOSED_FAILED",
      "WAITING_MATERIAL",
      false,
      false,
      false,
      "MID_CASE_WITHDRAWAL",
      "failure",
    ]);
  });
  void test("timeline payload records from/to/closeReason/resultOutcome", async () => {
    const calls = [];
    const pool = makePool((sql, p) => {
      calls.push({ sql: sql.trim(), params: p });
      if (sql.includes("update cases") && sql.includes("business_phase = $2"))
        return ok([
          makeCaseRow({
            business_phase: "CLOSED_FAILED",
            stage: "S9",
            close_reason: "MID_CASE_WITHDRAWAL",
            result_outcome: "failure",
          }),
        ]);
      if (sql.includes("from cases") && p?.[0] === CASE_ID)
        return ok([
          makeCaseRow({
            business_phase: "WAITING_MATERIAL",
            stage: "S2",
            status: "S2",
          }),
        ]);
      return ok();
    });
    await svc(pool, makeTemplates()).transitionPhase(makeCtx(), CASE_ID, {
      toPhase: "CLOSED_FAILED",
      closeReason: "MID_CASE_WITHDRAWAL",
    });
    const timelineCall = calls.find((c) =>
      c.sql.includes("insert into timeline_logs"),
    );
    assert.ok(timelineCall, "should write phase_transitioned timeline log");
    const payloadJson = (timelineCall.params ?? [])[5];
    const payload = JSON.parse(String(payloadJson));
    assert.equal(payload.from, "WAITING_MATERIAL");
    assert.equal(payload.to, "CLOSED_FAILED");
    assert.equal(payload.closeReason, "MID_CASE_WITHDRAWAL");
    assert.equal(payload.resultOutcome, "failure");
  });
});
//# sourceMappingURL=cases.bug200-mid-cancel.focused.test.js.map
