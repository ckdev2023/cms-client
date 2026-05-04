import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { CASE_WRITE_ERROR_CODES } from "./cases.types";
import {
  SUCCESS_CLOSEOUT_PRECONDITION_CODES,
  requiresSuccessCloseoutCheck,
  checkSuccessCloseoutPreconditions,
} from "./cases.types-residence-closeout";
import {
  CASE_ID,
  FULL_SUMMARY,
  RESIDENCE_PERIOD_ROW,
  bmvS8TransitionPool,
  makeCase,
  makeCaseRow,
  makeCtx,
  makePool,
  makeTemplates,
  svc,
} from "./cases.closeout-rules.focused.test-support";
const ok = (rows = [], rowCount = rows.length) =>
  Promise.resolve({ rows, rowCount });
// ════════════════════════════════════════════════════════════════
// 1. Pure function: requiresSuccessCloseoutCheck
// ════════════════════════════════════════════════════════════════
void describe("requiresSuccessCloseoutCheck: scoping", () => {
  void test("returns true for BMV S8 case", () => {
    assert.equal(requiresSuccessCloseoutCheck(makeCase()), true);
  });
  void test("returns false for non-BMV S8 case", () => {
    assert.equal(
      requiresSuccessCloseoutCheck(makeCase({ caseTypeCode: "family_stay" })),
      false,
    );
  });
  void test("returns false for BMV S7 case", () => {
    assert.equal(
      requiresSuccessCloseoutCheck(makeCase({ stage: "S7", status: "S7" })),
      false,
    );
  });
  void test("returns false for BMV S9 case", () => {
    assert.equal(
      requiresSuccessCloseoutCheck(makeCase({ stage: "S9", status: "S9" })),
      false,
    );
  });
});
// ════════════════════════════════════════════════════════════════
// 2. Pure function: checkSuccessCloseoutPreconditions
// ════════════════════════════════════════════════════════════════
void describe("checkSuccessCloseoutPreconditions: pure function", () => {
  void test("all satisfied when entry confirmed + period recorded + reminder created", () => {
    const input = {
      caseEntity: makeCase({ entryConfirmedAt: "2026-03-15T00:00:00.000Z" }),
      currentResidencePeriod: FULL_SUMMARY,
    };
    const result = checkSuccessCloseoutPreconditions(input);
    assert.equal(result.allSatisfied, true);
    assert.equal(result.preconditions.length, 3);
  });
  void test("ENTRY_CONFIRMED unsatisfied when entryConfirmedAt is null", () => {
    const input = {
      caseEntity: makeCase({ entryConfirmedAt: null }),
      currentResidencePeriod: FULL_SUMMARY,
    };
    const result = checkSuccessCloseoutPreconditions(input);
    assert.equal(result.allSatisfied, false);
    const entry = result.preconditions.find(
      (p) => p.code === SUCCESS_CLOSEOUT_PRECONDITION_CODES.ENTRY_CONFIRMED,
    );
    assert.ok(entry);
    assert.equal(entry.satisfied, false);
  });
  void test("RESIDENCE_PERIOD_RECORDED unsatisfied when no period", () => {
    const input = {
      caseEntity: makeCase({ entryConfirmedAt: "2026-03-15T00:00:00.000Z" }),
      currentResidencePeriod: null,
    };
    const result = checkSuccessCloseoutPreconditions(input);
    assert.equal(result.allSatisfied, false);
    const rp = result.preconditions.find(
      (p) =>
        p.code ===
        SUCCESS_CLOSEOUT_PRECONDITION_CODES.RESIDENCE_PERIOD_RECORDED,
    );
    assert.ok(rp);
    assert.equal(rp.satisfied, false);
  });
  void test("RENEWAL_REMINDER_SCHEDULED unsatisfied when reminderCreated is false", () => {
    const input = {
      caseEntity: makeCase({ entryConfirmedAt: "2026-03-15T00:00:00.000Z" }),
      currentResidencePeriod: { ...FULL_SUMMARY, reminderCreated: false },
    };
    const result = checkSuccessCloseoutPreconditions(input);
    assert.equal(result.allSatisfied, false);
    const reminder = result.preconditions.find(
      (p) =>
        p.code ===
        SUCCESS_CLOSEOUT_PRECONDITION_CODES.RENEWAL_REMINDER_SCHEDULED,
    );
    assert.ok(reminder);
    assert.equal(reminder.satisfied, false);
  });
  void test("all three unsatisfied when everything is missing", () => {
    const input = {
      caseEntity: makeCase({ entryConfirmedAt: null }),
      currentResidencePeriod: null,
    };
    const result = checkSuccessCloseoutPreconditions(input);
    assert.equal(result.allSatisfied, false);
    for (const p of result.preconditions) {
      assert.equal(p.satisfied, false, `${p.code} should NOT be satisfied`);
    }
  });
});
// ════════════════════════════════════════════════════════════════
// 3. Service integration: S8→S9 blocked for BMV when preconditions unmet
// ════════════════════════════════════════════════════════════════
void describe("transition S8→S9: BMV success closeout gate", () => {
  void test("blocks when entryConfirmedAt is null", async () => {
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
          err.message.includes(CASE_WRITE_ERROR_CODES.SUCCESS_CLOSEOUT_BLOCKED),
          `Expected message to include ${CASE_WRITE_ERROR_CODES.SUCCESS_CLOSEOUT_BLOCKED}, got: ${err.message}`,
        );
        assert.ok(
          err.message.includes("ENTRY_CONFIRMED"),
          `Expected message to include ENTRY_CONFIRMED, got: ${err.message}`,
        );
        return true;
      },
    );
  });
  void test("blocks when no current residence period exists", async () => {
    const pool = bmvS8TransitionPool(
      { entry_confirmed_at: "2026-03-15T00:00:00.000Z" },
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
        assert.ok(err.message.includes("RESIDENCE_PERIOD_RECORDED"));
        assert.ok(err.message.includes("RENEWAL_REMINDER_SCHEDULED"));
        return true;
      },
    );
  });
  void test("blocks when reminder not created", async () => {
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
          err.message.includes(CASE_WRITE_ERROR_CODES.SUCCESS_CLOSEOUT_BLOCKED),
        );
        assert.ok(err.message.includes("RENEWAL_REMINDER_SCHEDULED"));
        return true;
      },
    );
  });
  void test("blocks when all three preconditions are unmet", async () => {
    const pool = bmvS8TransitionPool({ entry_confirmed_at: null }, null);
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
        assert.ok(err.message.includes("ENTRY_CONFIRMED"));
        assert.ok(err.message.includes("RESIDENCE_PERIOD_RECORDED"));
        assert.ok(err.message.includes("RENEWAL_REMINDER_SCHEDULED"));
        return true;
      },
    );
  });
  void test("allows S8→S9 when all three preconditions are satisfied", async () => {
    const pool = bmvS8TransitionPool(
      { entry_confirmed_at: "2026-03-15T00:00:00.000Z" },
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
// ════════════════════════════════════════════════════════════════
// 4. Service integration: failure closeout bypasses the gate
// ════════════════════════════════════════════════════════════════
void describe("transition S8→S9: failure outcomes bypass closeout gate", () => {
  for (const outcome of ["rejected", "visa_rejected", "withdrawn"]) {
    void test(`allows S8→S9 with resultOutcome=${outcome} even without preconditions`, async () => {
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
});
// ════════════════════════════════════════════════════════════════
// 5. Service integration: non-BMV cases bypass the gate
// ════════════════════════════════════════════════════════════════
void describe("transition S8→S9: non-BMV cases bypass closeout gate", () => {
  void test("non-BMV case can transition S8→S9 without preconditions", async () => {
    const pool = makePool((sql, p) => {
      if (sql.includes("update cases") && sql.includes("stage = $2"))
        return ok([
          makeCaseRow({
            case_type_code: "family_stay",
            status: "S9",
            stage: "S9",
          }),
        ]);
      if (sql.includes("from cases") && p?.[0] === CASE_ID)
        return ok([
          makeCaseRow({
            case_type_code: "family_stay",
            entry_confirmed_at: null,
          }),
        ]);
      return ok();
    });
    const result = await svc(pool, makeTemplates()).transition(
      makeCtx(),
      CASE_ID,
      { toStage: "S9" },
    );
    assert.equal(result.stage, "S9");
  });
});
// ════════════════════════════════════════════════════════════════
// 6. BUG-063: S1-S6→S9 blocked; S7→S9 requires closeReason
// ════════════════════════════════════════════════════════════════
void describe("transition: S1-S6→S9 blocked after BUG-063 tightening", () => {
  for (const stage of ["S1", "S2", "S3", "S4", "S5", "S6"]) {
    void test(`${stage}→S9 blocked for BMV case`, async () => {
      const pool = makePool((sql, p) => {
        if (sql.includes("from cases") && p?.[0] === CASE_ID)
          return ok([
            makeCaseRow({ stage, status: stage, entry_confirmed_at: null }),
          ]);
        return ok();
      });
      await assert.rejects(
        () =>
          svc(pool, makeTemplates()).transition(makeCtx(), CASE_ID, {
            toStage: "S9",
          }),
        (e) => e instanceof Error,
        `${stage}→S9 should be blocked`,
      );
    });
  }
});
void describe("transition: S7→S9 with closeReason bypasses closeout gate", () => {
  void test("S7→S9 with closeReason succeeds for BMV case", async () => {
    const pool = makePool((sql, p) => {
      if (sql.includes("update cases") && sql.includes("stage = $2"))
        return ok([makeCaseRow({ status: "S9", stage: "S9" })]);
      if (sql.includes("from cases") && p?.[0] === CASE_ID)
        return ok([
          makeCaseRow({ stage: "S7", status: "S7", entry_confirmed_at: null }),
        ]);
      return ok();
    });
    const result = await svc(pool, makeTemplates()).transition(
      makeCtx(),
      CASE_ID,
      { toStage: "S9", closeReason: "rejected_by_immigration" },
    );
    assert.equal(result.stage, "S9");
  });
});
// ════════════════════════════════════════════════════════════════
// 7. Error code alignment
// ════════════════════════════════════════════════════════════════
void describe("success closeout gate: error code alignment", () => {
  void test("CASE_WRITE_ERROR_CODES includes SUCCESS_CLOSEOUT_BLOCKED", () => {
    assert.equal(
      CASE_WRITE_ERROR_CODES.SUCCESS_CLOSEOUT_BLOCKED,
      "CASE_SUCCESS_CLOSEOUT_BLOCKED",
    );
  });
  void test("precondition codes are stable strings", () => {
    assert.equal(
      SUCCESS_CLOSEOUT_PRECONDITION_CODES.ENTRY_CONFIRMED,
      "ENTRY_CONFIRMED",
    );
    assert.equal(
      SUCCESS_CLOSEOUT_PRECONDITION_CODES.RESIDENCE_PERIOD_RECORDED,
      "RESIDENCE_PERIOD_RECORDED",
    );
    assert.equal(
      SUCCESS_CLOSEOUT_PRECONDITION_CODES.RENEWAL_REMINDER_SCHEDULED,
      "RENEWAL_REMINDER_SCHEDULED",
    );
  });
});
//# sourceMappingURL=cases.success-closeout-gate.focused.test.js.map
