import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { CASE_WRITE_ERROR_CODES } from "./cases.types";
import {
  OVERSEAS_STEP_CODES,
  OVERSEAS_STEP_PARENT_STAGE,
  ENTRY_SUCCESS_FOLLOW_UP,
} from "./cases.types-overseas-step";
import {
  SUCCESS_CLOSEOUT_PRECONDITION_CODES,
  checkSuccessCloseoutPreconditions,
  requiresSuccessCloseoutCheck,
} from "./cases.types-residence-closeout";
import type { SuccessCloseoutCheckInput } from "./cases.types-residence-closeout";
import {
  BMV_STEP_TO_STAGE,
  BMV_STEP_TRANSITIONS,
  isValidStepTransition,
  isTerminalStep,
  checkParallelBoundary,
} from "./cases.workflow-step";
import {
  CASE_ID,
  ORG_ID,
  USER_ID,
  ctx,
  makeCaseEntity,
  makeCaseRow,
  makeFullResidenceSummary,
  makePool,
  makeTemplates,
  ok,
  svc,
} from "./cases.regression-p1-coe-visa-residence.test-support";

void describe("§20 overseas step → P0 stage mapping consistency", () => {
  void test("COE_SENT and VISA_APPLYING map to S7", () => {
    assert.equal(BMV_STEP_TO_STAGE.COE_SENT, "S7");
    assert.equal(BMV_STEP_TO_STAGE.VISA_APPLYING, "S7");
    assert.equal(OVERSEAS_STEP_PARENT_STAGE.COE_SENT, "S7");
    assert.equal(OVERSEAS_STEP_PARENT_STAGE.VISA_APPLYING, "S7");
  });

  void test("ENTRY_SUCCESS maps to S8", () => {
    assert.equal(BMV_STEP_TO_STAGE.ENTRY_SUCCESS, "S8");
    assert.equal(OVERSEAS_STEP_PARENT_STAGE.ENTRY_SUCCESS, "S8");
  });

  void test("VISA_REJECTED maps to S9", () => {
    assert.equal(BMV_STEP_TO_STAGE.VISA_REJECTED, "S9");
    assert.equal(OVERSEAS_STEP_PARENT_STAGE.VISA_REJECTED, "S9");
  });

  void test("RESIDENCE_PERIOD_RECORDED and RENEWAL_REMINDER_SCHEDULED map to S8", () => {
    assert.equal(BMV_STEP_TO_STAGE.RESIDENCE_PERIOD_RECORDED, "S8");
    assert.equal(BMV_STEP_TO_STAGE.RENEWAL_REMINDER_SCHEDULED, "S8");
  });

  void test("OVERSEAS_STEP_PARENT_STAGE aligns with BMV_STEP_TO_STAGE for all overseas steps", () => {
    for (const code of Object.values(OVERSEAS_STEP_CODES)) {
      assert.equal(
        OVERSEAS_STEP_PARENT_STAGE[code],
        BMV_STEP_TO_STAGE[code],
        `stage mismatch for ${code}`,
      );
    }
  });
});

void describe("§20 step transition matrix: overseas → residence chain", () => {
  void test("ENTRY_SUCCESS → RESIDENCE_PERIOD_RECORDED is valid", () => {
    assert.ok(
      isValidStepTransition("ENTRY_SUCCESS", "RESIDENCE_PERIOD_RECORDED"),
    );
  });

  void test("RESIDENCE_PERIOD_RECORDED → RENEWAL_REMINDER_SCHEDULED is valid", () => {
    assert.ok(
      isValidStepTransition(
        "RESIDENCE_PERIOD_RECORDED",
        "RENEWAL_REMINDER_SCHEDULED",
      ),
    );
  });

  void test("ENTRY_SUCCESS cannot skip to RENEWAL_REMINDER_SCHEDULED", () => {
    assert.ok(
      !isValidStepTransition("ENTRY_SUCCESS", "RENEWAL_REMINDER_SCHEDULED"),
    );
  });

  void test("VISA_REJECTED has no valid transitions (terminal)", () => {
    assert.ok(isTerminalStep("VISA_REJECTED"));
    assert.equal(BMV_STEP_TRANSITIONS.VISA_REJECTED.length, 0);
  });

  void test("RENEWAL_REMINDER_SCHEDULED is terminal", () => {
    assert.ok(isTerminalStep("RENEWAL_REMINDER_SCHEDULED"));
    assert.equal(BMV_STEP_TRANSITIONS.RENEWAL_REMINDER_SCHEDULED.length, 0);
  });

  void test("RESIDENCE_PERIOD_RECORDED is NOT terminal", () => {
    assert.ok(!isTerminalStep("RESIDENCE_PERIOD_RECORDED"));
  });

  void test("ENTRY_SUCCESS is NOT terminal (follow-up required)", () => {
    assert.ok(!isTerminalStep("ENTRY_SUCCESS"));
  });
});

void describe("§20 parallel boundary: overseas + residence steps", () => {
  void test("ENTRY_SUCCESS requires S8 — rejects S7", () => {
    const result = checkParallelBoundary("ENTRY_SUCCESS", "S7");
    assert.equal(result.compatible, false);
  });

  void test("ENTRY_SUCCESS compatible with S8 and S9", () => {
    assert.equal(checkParallelBoundary("ENTRY_SUCCESS", "S8").compatible, true);
    assert.equal(checkParallelBoundary("ENTRY_SUCCESS", "S9").compatible, true);
  });

  void test("VISA_REJECTED terminal relaxation: compatible even with S5", () => {
    assert.equal(checkParallelBoundary("VISA_REJECTED", "S5").compatible, true);
    assert.equal(checkParallelBoundary("VISA_REJECTED", "S7").compatible, true);
  });

  void test("RESIDENCE_PERIOD_RECORDED requires S8", () => {
    assert.equal(
      checkParallelBoundary("RESIDENCE_PERIOD_RECORDED", "S7").compatible,
      false,
    );
    assert.equal(
      checkParallelBoundary("RESIDENCE_PERIOD_RECORDED", "S8").compatible,
      true,
    );
  });

  void test("RENEWAL_REMINDER_SCHEDULED terminal relaxation", () => {
    assert.equal(
      checkParallelBoundary("RENEWAL_REMINDER_SCHEDULED", "S5").compatible,
      true,
    );
  });
});

void describe("§21 ENTRY_SUCCESS_FOLLOW_UP contract", () => {
  void test("next step is RESIDENCE_PERIOD_RECORDED", () => {
    assert.equal(ENTRY_SUCCESS_FOLLOW_UP.nextStep, "RESIDENCE_PERIOD_RECORDED");
  });

  void test("success close requires both residence period and renewal reminder", () => {
    assert.equal(
      ENTRY_SUCCESS_FOLLOW_UP.requiredBeforeSuccessClose
        .residencePeriodRecorded,
      true,
    );
    assert.equal(
      ENTRY_SUCCESS_FOLLOW_UP.requiredBeforeSuccessClose
        .renewalReminderScheduled,
      true,
    );
  });
});

void describe("§21 checkSuccessCloseoutPreconditions: full matrix", () => {
  void test("all satisfied → allSatisfied=true", () => {
    const input: SuccessCloseoutCheckInput = {
      caseEntity: makeCaseEntity({
        entryConfirmedAt: "2026-04-01T00:00:00.000Z",
      }),
      currentResidencePeriod: makeFullResidenceSummary(),
    };
    const result = checkSuccessCloseoutPreconditions(input);
    assert.equal(result.allSatisfied, true);
    assert.equal(result.preconditions.length, 3);
    for (const p of result.preconditions) {
      assert.equal(p.satisfied, true, `${p.code} should be satisfied`);
    }
  });

  void test("entry not confirmed → blocks closeout", () => {
    const input: SuccessCloseoutCheckInput = {
      caseEntity: makeCaseEntity({ entryConfirmedAt: null }),
      currentResidencePeriod: makeFullResidenceSummary(),
    };
    const result = checkSuccessCloseoutPreconditions(input);
    assert.equal(result.allSatisfied, false);
    const entryStatus = result.preconditions.find(
      (p) => p.code === SUCCESS_CLOSEOUT_PRECONDITION_CODES.ENTRY_CONFIRMED,
    );
    assert.equal(entryStatus?.satisfied, false);
  });

  void test("no residence period → blocks closeout (both period + reminder)", () => {
    const input: SuccessCloseoutCheckInput = {
      caseEntity: makeCaseEntity({
        entryConfirmedAt: "2026-04-01T00:00:00.000Z",
      }),
      currentResidencePeriod: null,
    };
    const result = checkSuccessCloseoutPreconditions(input);
    assert.equal(result.allSatisfied, false);

    const unsatisfied = result.preconditions
      .filter((p) => !p.satisfied)
      .map((p) => p.code);
    assert.ok(
      unsatisfied.includes(
        SUCCESS_CLOSEOUT_PRECONDITION_CODES.RESIDENCE_PERIOD_RECORDED,
      ),
    );
    assert.ok(
      unsatisfied.includes(
        SUCCESS_CLOSEOUT_PRECONDITION_CODES.RENEWAL_REMINDER_SCHEDULED,
      ),
    );
  });

  void test("reminder not created → blocks closeout even with period recorded", () => {
    const input: SuccessCloseoutCheckInput = {
      caseEntity: makeCaseEntity({
        entryConfirmedAt: "2026-04-01T00:00:00.000Z",
      }),
      currentResidencePeriod: makeFullResidenceSummary({
        reminderCreated: false,
      }),
    };
    const result = checkSuccessCloseoutPreconditions(input);
    assert.equal(result.allSatisfied, false);

    const reminderStatus = result.preconditions.find(
      (p) =>
        p.code ===
        SUCCESS_CLOSEOUT_PRECONDITION_CODES.RENEWAL_REMINDER_SCHEDULED,
    );
    assert.equal(reminderStatus?.satisfied, false);

    const periodStatus = result.preconditions.find(
      (p) =>
        p.code ===
        SUCCESS_CLOSEOUT_PRECONDITION_CODES.RESIDENCE_PERIOD_RECORDED,
    );
    assert.equal(periodStatus?.satisfied, true);
  });

  void test("all three unsatisfied → 3 unsatisfied preconditions", () => {
    const input: SuccessCloseoutCheckInput = {
      caseEntity: makeCaseEntity({ entryConfirmedAt: null }),
      currentResidencePeriod: null,
    };
    const result = checkSuccessCloseoutPreconditions(input);
    assert.equal(result.allSatisfied, false);
    const unsatisfied = result.preconditions.filter((p) => !p.satisfied);
    assert.equal(unsatisfied.length, 3);
  });
});

void describe("§21 requiresSuccessCloseoutCheck boundary", () => {
  void test("BMV at S8 requires closeout check", () => {
    assert.ok(requiresSuccessCloseoutCheck(makeCaseEntity({ stage: "S8" })));
  });

  void test("BMV at S7 does NOT require closeout check", () => {
    assert.ok(!requiresSuccessCloseoutCheck(makeCaseEntity({ stage: "S7" })));
  });

  void test("BMV at S9 does NOT require closeout check", () => {
    assert.ok(!requiresSuccessCloseoutCheck(makeCaseEntity({ stage: "S9" })));
  });

  void test("non-BMV at S8 does NOT require closeout check", () => {
    assert.ok(
      !requiresSuccessCloseoutCheck(
        makeCaseEntity({ caseTypeCode: "family_stay", stage: "S8" }),
      ),
    );
  });
});

void describe("§21 service: S8→S9 closeout blocked when preconditions unmet", () => {
  void test("S8→S9 blocked when entry not confirmed", async () => {
    const pool = makePool((sql, p) => {
      if (sql.includes("update cases") && sql.includes("stage = $2")) {
        return ok([makeCaseRow({ status: "S9", stage: "S9" })]);
      }
      if (sql.includes("from cases") && p?.[0] === CASE_ID) {
        return ok([
          makeCaseRow({
            stage: "S8",
            entry_confirmed_at: null,
            current_workflow_step_code: "ENTRY_SUCCESS",
          }),
        ]);
      }
      if (
        sql.includes("from residence_periods") &&
        sql.includes("is_current")
      ) {
        return ok([
          {
            id: "rp-001",
            org_id: ORG_ID,
            case_id: CASE_ID,
            customer_id: "cust-1",
            visa_type: "business_manager",
            status_of_residence: "経営・管理",
            period_years: 1,
            period_label: "1年",
            valid_from: "2026-04-01",
            valid_until: "2027-04-01",
            card_number: "AB1234567CD",
            is_current: true,
            entry_date: "2026-03-15",
            reminder_created: true,
            notes: null,
            created_by: USER_ID,
            created_at: "2026-04-01T00:00:00.000Z",
            updated_at: "2026-04-01T00:00:00.000Z",
          },
        ]);
      }
      return ok();
    });

    await assert.rejects(
      () =>
        svc(pool, makeTemplates()).transition(ctx(), CASE_ID, {
          toStage: "S9",
        }),
      (err: Error) => {
        assert.ok(
          err.message.includes(CASE_WRITE_ERROR_CODES.SUCCESS_CLOSEOUT_BLOCKED),
        );
        assert.ok(err.message.includes("ENTRY_CONFIRMED"));
        return true;
      },
    );
  });

  void test("S8→S9 allowed when all preconditions met", async () => {
    const pool = makePool((sql, p) => {
      if (sql.includes("update cases") && sql.includes("stage = $2")) {
        return ok([makeCaseRow({ status: "S9", stage: "S9" })]);
      }
      if (sql.includes("from cases") && p?.[0] === CASE_ID) {
        return ok([
          makeCaseRow({
            stage: "S8",
            entry_confirmed_at: "2026-04-01T00:00:00.000Z",
            current_workflow_step_code: "ENTRY_SUCCESS",
          }),
        ]);
      }
      if (
        sql.includes("from residence_periods") &&
        sql.includes("is_current")
      ) {
        return ok([
          {
            id: "rp-001",
            org_id: ORG_ID,
            case_id: CASE_ID,
            customer_id: "cust-1",
            visa_type: "business_manager",
            status_of_residence: "経営・管理",
            period_years: 1,
            period_label: "1年",
            valid_from: "2026-04-01",
            valid_until: "2027-04-01",
            card_number: "AB1234567CD",
            is_current: true,
            entry_date: "2026-03-15",
            reminder_created: true,
            notes: null,
            created_by: USER_ID,
            created_at: "2026-04-01T00:00:00.000Z",
            updated_at: "2026-04-01T00:00:00.000Z",
          },
        ]);
      }
      return ok();
    });

    const result = await svc(pool, makeTemplates()).transition(ctx(), CASE_ID, {
      toStage: "S9",
    });
    assert.equal(result.stage, "S9");
  });

  void test("S8→S9 failure outcome bypasses closeout gate", async () => {
    const pool = makePool((sql, p) => {
      if (sql.includes("update cases") && sql.includes("stage = $2")) {
        return ok([makeCaseRow({ status: "S9", stage: "S9" })]);
      }
      if (sql.includes("from cases") && p?.[0] === CASE_ID) {
        return ok([
          makeCaseRow({
            stage: "S8",
            entry_confirmed_at: null,
            result_outcome: "rejected",
            current_workflow_step_code: "ENTRY_SUCCESS",
          }),
        ]);
      }
      if (
        sql.includes("from residence_periods") &&
        sql.includes("is_current")
      ) {
        return ok([]);
      }
      return ok();
    });

    const result = await svc(pool, makeTemplates()).transition(ctx(), CASE_ID, {
      toStage: "S9",
    });
    assert.equal(result.stage, "S9");
  });
});
