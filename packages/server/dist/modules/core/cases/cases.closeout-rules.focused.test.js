import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { CASE_WRITE_ERROR_CODES } from "./cases.types";
import {
  SUCCESS_CLOSEOUT_PRECONDITION_CODES,
  checkSuccessCloseoutPreconditions,
} from "./cases.types-residence-closeout";
import {
  CASE_ID,
  FULL_SUMMARY,
  RESIDENCE_PERIOD_ROW,
  bmvS8TransitionPool,
  makeCase,
  makeCtx,
  makeTemplates,
  svc,
} from "./cases.closeout-rules.focused.test-support";
void describe("checkSuccessCloseoutPreconditions: partial satisfaction", () => {
  void test("only ENTRY_CONFIRMED unsatisfied — other two satisfied", () => {
    const input = {
      caseEntity: makeCase({ entryConfirmedAt: null }),
      currentResidencePeriod: FULL_SUMMARY,
    };
    const result = checkSuccessCloseoutPreconditions(input);
    assert.equal(result.allSatisfied, false);
    const statuses = Object.fromEntries(
      result.preconditions.map((p) => [p.code, p.satisfied]),
    );
    assert.equal(
      statuses[SUCCESS_CLOSEOUT_PRECONDITION_CODES.ENTRY_CONFIRMED],
      false,
    );
    assert.equal(
      statuses[SUCCESS_CLOSEOUT_PRECONDITION_CODES.RESIDENCE_PERIOD_RECORDED],
      true,
    );
    assert.equal(
      statuses[SUCCESS_CLOSEOUT_PRECONDITION_CODES.RENEWAL_REMINDER_SCHEDULED],
      true,
    );
  });
  void test("only RESIDENCE_PERIOD_RECORDED unsatisfied — entry confirmed but no period", () => {
    const input = {
      caseEntity: makeCase({ entryConfirmedAt: "2026-03-15T00:00:00.000Z" }),
      currentResidencePeriod: null,
    };
    const result = checkSuccessCloseoutPreconditions(input);
    assert.equal(result.allSatisfied, false);
    const statuses = Object.fromEntries(
      result.preconditions.map((p) => [p.code, p.satisfied]),
    );
    assert.equal(
      statuses[SUCCESS_CLOSEOUT_PRECONDITION_CODES.ENTRY_CONFIRMED],
      true,
    );
    assert.equal(
      statuses[SUCCESS_CLOSEOUT_PRECONDITION_CODES.RESIDENCE_PERIOD_RECORDED],
      false,
    );
    assert.equal(
      statuses[SUCCESS_CLOSEOUT_PRECONDITION_CODES.RENEWAL_REMINDER_SCHEDULED],
      false,
    );
  });
  void test("only RENEWAL_REMINDER_SCHEDULED unsatisfied — period exists but reminder not created", () => {
    const input = {
      caseEntity: makeCase({ entryConfirmedAt: "2026-03-15T00:00:00.000Z" }),
      currentResidencePeriod: { ...FULL_SUMMARY, reminderCreated: false },
    };
    const result = checkSuccessCloseoutPreconditions(input);
    assert.equal(result.allSatisfied, false);
    const statuses = Object.fromEntries(
      result.preconditions.map((p) => [p.code, p.satisfied]),
    );
    assert.equal(
      statuses[SUCCESS_CLOSEOUT_PRECONDITION_CODES.ENTRY_CONFIRMED],
      true,
    );
    assert.equal(
      statuses[SUCCESS_CLOSEOUT_PRECONDITION_CODES.RESIDENCE_PERIOD_RECORDED],
      true,
    );
    assert.equal(
      statuses[SUCCESS_CLOSEOUT_PRECONDITION_CODES.RENEWAL_REMINDER_SCHEDULED],
      false,
    );
  });
  void test("entry not confirmed + reminder not created (period exists)", () => {
    const input = {
      caseEntity: makeCase({ entryConfirmedAt: null }),
      currentResidencePeriod: { ...FULL_SUMMARY, reminderCreated: false },
    };
    const result = checkSuccessCloseoutPreconditions(input);
    assert.equal(result.allSatisfied, false);
    const unsatisfied = result.preconditions
      .filter((p) => !p.satisfied)
      .map((p) => p.code);
    assert.deepEqual(unsatisfied, [
      SUCCESS_CLOSEOUT_PRECONDITION_CODES.ENTRY_CONFIRMED,
      SUCCESS_CLOSEOUT_PRECONDITION_CODES.RENEWAL_REMINDER_SCHEDULED,
    ]);
  });
});
void describe("closeout gate: error message reason format", () => {
  void test("single unsatisfied reason includes CODE(label) format", async () => {
    const pool = bmvS8TransitionPool(
      { entry_confirmed_at: "2026-03-15T00:00:00.000Z" },
      { ...RESIDENCE_PERIOD_ROW, reminder_created: false },
    );
    await assert.rejects(
      () =>
        svc(pool, makeTemplates()).transition(makeCtx(), CASE_ID, {
          toStage: "S9",
        }),
      (err) => {
        assert.ok(err instanceof Error);
        assert.ok(
          err.message.includes("RENEWAL_REMINDER_SCHEDULED(续签提醒生成済み)"),
          `Expected structured reason, got: ${err.message}`,
        );
        assert.ok(
          !err.message.includes("ENTRY_CONFIRMED("),
          "Satisfied preconditions should NOT appear in error",
        );
        assert.ok(
          !err.message.includes("RESIDENCE_PERIOD_RECORDED("),
          "Satisfied preconditions should NOT appear in error",
        );
        return true;
      },
    );
  });
  void test("multiple unsatisfied reasons are comma-separated", async () => {
    const pool = bmvS8TransitionPool({ entry_confirmed_at: null }, null);
    await assert.rejects(
      () =>
        svc(pool, makeTemplates()).transition(makeCtx(), CASE_ID, {
          toStage: "S9",
        }),
      (err) => {
        assert.ok(err instanceof Error);
        assert.ok(
          err.message.includes("ENTRY_CONFIRMED(入境確認済み)"),
          `Missing ENTRY_CONFIRMED reason, got: ${err.message}`,
        );
        assert.ok(
          err.message.includes("RESIDENCE_PERIOD_RECORDED(在留期間記録済み)"),
          `Missing RESIDENCE_PERIOD_RECORDED reason, got: ${err.message}`,
        );
        assert.ok(
          err.message.includes("RENEWAL_REMINDER_SCHEDULED(续签提醒生成済み)"),
          `Missing RENEWAL_REMINDER_SCHEDULED reason, got: ${err.message}`,
        );
        const reasonPart = err.message.split(
          ": S8→S9 success closeout blocked: ",
        )[1];
        assert.ok(reasonPart, "Expected reason part after prefix");
        const reasons = reasonPart.split(", ");
        assert.equal(
          reasons.length,
          3,
          `Expected 3 comma-separated reasons, got ${String(reasons.length)}`,
        );
        return true;
      },
    );
  });
  void test("error message starts with CASE_SUCCESS_CLOSEOUT_BLOCKED code", async () => {
    const pool = bmvS8TransitionPool(
      { entry_confirmed_at: null },
      RESIDENCE_PERIOD_ROW,
    );
    await assert.rejects(
      () =>
        svc(pool, makeTemplates()).transition(makeCtx(), CASE_ID, {
          toStage: "S9",
        }),
      (err) => {
        assert.ok(err instanceof Error);
        assert.ok(
          err.message.startsWith(
            CASE_WRITE_ERROR_CODES.SUCCESS_CLOSEOUT_BLOCKED,
          ),
          `Expected message to start with error code, got: ${err.message}`,
        );
        return true;
      },
    );
  });
});
void describe("closeout gate: non-failure resultOutcome still triggers gate", () => {
  void test("resultOutcome=approved blocks when preconditions unmet", async () => {
    const pool = bmvS8TransitionPool(
      { entry_confirmed_at: null, result_outcome: "approved" },
      null,
    );
    await assert.rejects(
      () =>
        svc(pool, makeTemplates()).transition(makeCtx(), CASE_ID, {
          toStage: "S9",
        }),
      (err) => {
        assert.ok(err instanceof Error);
        assert.ok(
          err.message.includes(CASE_WRITE_ERROR_CODES.SUCCESS_CLOSEOUT_BLOCKED),
        );
        return true;
      },
    );
  });
  void test("resultOutcome=null blocks when preconditions unmet", async () => {
    const pool = bmvS8TransitionPool(
      { entry_confirmed_at: null, result_outcome: null },
      null,
    );
    await assert.rejects(
      () =>
        svc(pool, makeTemplates()).transition(makeCtx(), CASE_ID, {
          toStage: "S9",
        }),
      (err) => {
        assert.ok(err instanceof Error);
        assert.ok(
          err.message.includes(CASE_WRITE_ERROR_CODES.SUCCESS_CLOSEOUT_BLOCKED),
        );
        return true;
      },
    );
  });
  void test("resultOutcome=approved allows when all preconditions met", async () => {
    const pool = bmvS8TransitionPool(
      {
        entry_confirmed_at: "2026-03-15T00:00:00.000Z",
        result_outcome: "approved",
      },
      RESIDENCE_PERIOD_ROW,
    );
    const result = await svc(pool, makeTemplates()).transition(
      makeCtx(),
      CASE_ID,
      { toStage: "S9" },
    );
    assert.equal(result.stage, "S9");
  });
});
void describe("closeout gate: closeReason triggers manual failure close", () => {
  void test("closeReason present allows S8→S9 via MANUAL_FAILURE_CLOSE path", async () => {
    const pool = bmvS8TransitionPool(
      {
        entry_confirmed_at: null,
        result_outcome: null,
        close_reason: "client_request",
      },
      null,
    );
    const result = await svc(pool, makeTemplates()).transition(
      makeCtx(),
      CASE_ID,
      { toStage: "S9", closeReason: "client_request" },
    );
    assert.equal(result.stage, "S9");
  });
});
void describe("closeout gate: failure outcome bypass exhaustive", () => {
  const failureOutcomes = ["rejected", "visa_rejected", "withdrawn"];
  for (const outcome of failureOutcomes) {
    void test(`${outcome} bypasses gate even with zero preconditions met`, async () => {
      const pool = bmvS8TransitionPool(
        { entry_confirmed_at: null, result_outcome: outcome },
        null,
      );
      const result = await svc(pool, makeTemplates()).transition(
        makeCtx(),
        CASE_ID,
        { toStage: "S9" },
      );
      assert.equal(result.stage, "S9");
    });
  }
  void test("non-failure outcome string does NOT bypass gate", async () => {
    const pool = bmvS8TransitionPool(
      { entry_confirmed_at: null, result_outcome: "success" },
      null,
    );
    await assert.rejects(
      () =>
        svc(pool, makeTemplates()).transition(makeCtx(), CASE_ID, {
          toStage: "S9",
        }),
      (err) => {
        assert.ok(err instanceof Error);
        assert.ok(
          err.message.includes(CASE_WRITE_ERROR_CODES.SUCCESS_CLOSEOUT_BLOCKED),
        );
        return true;
      },
    );
  });
});
//# sourceMappingURL=cases.closeout-rules.focused.test.js.map
