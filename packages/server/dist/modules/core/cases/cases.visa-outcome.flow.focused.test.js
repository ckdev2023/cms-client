import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { CASE_WRITE_ERROR_CODES } from "./cases.types";
import { resolveWorkflowStepSummary } from "./cases.workflow-step-readmodel";
import {
  BMV_STEP_TO_STAGE,
  checkParallelBoundary,
  isValidStepTransition,
} from "./cases.workflow-step";
import {
  ENTRY_SUCCESS_FOLLOW_UP,
  OVERSEAS_STEP_CODES,
  OVERSEAS_STEP_PARENT_STAGE,
  OVERSEAS_STEP_READ_SNAPSHOTS,
} from "./cases.types-overseas-step";
import {
  CASE_ID,
  makeCaseEntity,
  makeCaseRow,
  makeCtx,
  makePool,
  makeTemplates,
  ok,
  svc,
} from "./cases.visa-outcome.focused.test-support";
void describe("visa outcome: step → P0 stage mapping (status chain-back)", () => {
  void test("VISA_APPLYING maps to S7 (overseas/COE phase)", () => {
    assert.equal(BMV_STEP_TO_STAGE.VISA_APPLYING, "S7");
    assert.equal(OVERSEAS_STEP_PARENT_STAGE.VISA_APPLYING, "S7");
  });
  void test("ENTRY_SUCCESS maps to S8 (post-entry phase)", () => {
    assert.equal(BMV_STEP_TO_STAGE.ENTRY_SUCCESS, "S8");
    assert.equal(OVERSEAS_STEP_PARENT_STAGE.ENTRY_SUCCESS, "S8");
  });
  void test("VISA_REJECTED maps to S9 (closure phase)", () => {
    assert.equal(BMV_STEP_TO_STAGE.VISA_REJECTED, "S9");
    assert.equal(OVERSEAS_STEP_PARENT_STAGE.VISA_REJECTED, "S9");
  });
  void test("COE_SENT maps to S7 (same phase as VISA_APPLYING)", () => {
    assert.equal(BMV_STEP_TO_STAGE.COE_SENT, "S7");
    assert.equal(OVERSEAS_STEP_PARENT_STAGE.COE_SENT, "S7");
  });
  void test("overseas contract parent stages are consistent with BMV_STEP_TO_STAGE", () => {
    for (const code of Object.values(OVERSEAS_STEP_CODES)) {
      assert.equal(
        OVERSEAS_STEP_PARENT_STAGE[code],
        BMV_STEP_TO_STAGE[code],
        `stage mismatch for ${code}`,
      );
    }
  });
});
void describe("visa outcome: parallel boundary enforcement", () => {
  void test("ENTRY_SUCCESS requires at least S8 — rejects when stage is S5", () => {
    const result = checkParallelBoundary("ENTRY_SUCCESS", "S5");
    assert.equal(result.compatible, false);
    assert.equal(result.stepParentStage, "S8");
  });
  void test("ENTRY_SUCCESS is compatible with S8", () => {
    const result = checkParallelBoundary("ENTRY_SUCCESS", "S8");
    assert.equal(result.compatible, true);
  });
  void test("ENTRY_SUCCESS is compatible with S9 (stage already ahead)", () => {
    const result = checkParallelBoundary("ENTRY_SUCCESS", "S9");
    assert.equal(result.compatible, true);
  });
  void test("VISA_REJECTED is terminal — boundary relaxed even when stage is S7", () => {
    const result = checkParallelBoundary("VISA_REJECTED", "S7");
    assert.equal(result.compatible, true);
    assert.equal(result.stepParentStage, "S9");
  });
  void test("VISA_REJECTED is compatible with S9", () => {
    const result = checkParallelBoundary("VISA_REJECTED", "S9");
    assert.equal(result.compatible, true);
  });
  void test("VISA_APPLYING rejects when stage is below S7", () => {
    const result = checkParallelBoundary("VISA_APPLYING", "S5");
    assert.equal(result.compatible, false);
  });
  void test("VISA_APPLYING is compatible with S7", () => {
    const result = checkParallelBoundary("VISA_APPLYING", "S7");
    assert.equal(result.compatible, true);
  });
  void test("service allows VISA_REJECTED at S7 (terminal step boundary relaxation)", async () => {
    const pool = makePool((sql, p) => {
      if (
        sql.includes("update cases") &&
        sql.includes("current_workflow_step_code")
      ) {
        return ok([
          makeCaseRow({
            stage: "S7",
            current_workflow_step_code: "VISA_REJECTED",
            result_outcome: "rejected",
          }),
        ]);
      }
      if (sql.includes("from cases") && p?.[0] === CASE_ID) {
        return ok([
          makeCaseRow({
            stage: "S7",
            current_workflow_step_code: "VISA_APPLYING",
          }),
        ]);
      }
      return ok();
    });
    const c = await svc(pool, makeTemplates()).transitionWorkflowStep(
      makeCtx(),
      CASE_ID,
      { toStepCode: "VISA_REJECTED" },
    );
    assert.equal(c.currentWorkflowStepCode, "VISA_REJECTED");
    assert.equal(c.resultOutcome, "rejected");
  });
  void test("service rejects VISA_REJECTED at S9 (S9 is read-only)", async () => {
    const pool = makePool((sql, p) => {
      if (sql.includes("from cases") && p?.[0] === CASE_ID) {
        return ok([
          makeCaseRow({
            stage: "S9",
            current_workflow_step_code: "VISA_APPLYING",
          }),
        ]);
      }
      return ok();
    });
    await assert.rejects(
      () =>
        svc(pool, makeTemplates()).transitionWorkflowStep(makeCtx(), CASE_ID, {
          toStepCode: "VISA_REJECTED",
        }),
      (err) => {
        assert.ok(
          err.message.includes(CASE_WRITE_ERROR_CODES.S9_READONLY),
          "S9 is globally read-only — VISA_REJECTED cannot be set after S9 transition",
        );
        return true;
      },
    );
  });
});
void describe("visa outcome: read model (resolveWorkflowStepSummary)", () => {
  void test("ENTRY_SUCCESS summary: parentStage=S8, not terminal, next=RESIDENCE_PERIOD_RECORDED", () => {
    const summary = resolveWorkflowStepSummary(
      makeCaseEntity({ currentWorkflowStepCode: "ENTRY_SUCCESS" }),
    );
    assert.ok(summary !== null);
    assert.equal(summary.currentStepCode, "ENTRY_SUCCESS");
    assert.equal(summary.parentStage, "S8");
    assert.equal(summary.isTerminal, false);
    assert.ok(summary.allowedNextSteps.includes("RESIDENCE_PERIOD_RECORDED"));
    assert.equal(summary.billingGate, null);
  });
  void test("VISA_REJECTED summary: parentStage=S9, terminal, no next steps", () => {
    const summary = resolveWorkflowStepSummary(
      makeCaseEntity({ currentWorkflowStepCode: "VISA_REJECTED" }),
    );
    assert.ok(summary !== null);
    assert.equal(summary.currentStepCode, "VISA_REJECTED");
    assert.equal(summary.parentStage, "S9");
    assert.equal(summary.isTerminal, true);
    assert.deepEqual(summary.allowedNextSteps, []);
    assert.equal(summary.billingGate, null);
  });
  void test("VISA_APPLYING summary: parentStage=S7, branches to success/reject", () => {
    const summary = resolveWorkflowStepSummary(
      makeCaseEntity({ currentWorkflowStepCode: "VISA_APPLYING" }),
    );
    assert.ok(summary !== null);
    assert.equal(summary.currentStepCode, "VISA_APPLYING");
    assert.equal(summary.parentStage, "S7");
    assert.equal(summary.isTerminal, false);
    assert.ok(summary.allowedNextSteps.includes("ENTRY_SUCCESS"));
    assert.ok(summary.allowedNextSteps.includes("VISA_REJECTED"));
    assert.equal(summary.billingGate, null);
  });
  void test("read model snapshots align with resolveWorkflowStepSummary for all overseas steps", () => {
    for (const code of Object.values(OVERSEAS_STEP_CODES)) {
      const summary = resolveWorkflowStepSummary(
        makeCaseEntity({ currentWorkflowStepCode: code }),
      );
      assert.ok(summary !== null, `summary should exist for ${code}`);
      const snapshot = OVERSEAS_STEP_READ_SNAPSHOTS[code];
      assert.equal(
        summary.parentStage,
        snapshot.parentStage,
        `parentStage mismatch for ${code}`,
      );
      assert.equal(
        summary.isTerminal,
        snapshot.isTerminal,
        `isTerminal mismatch for ${code}`,
      );
      assert.deepEqual(
        summary.allowedNextSteps,
        [...snapshot.allowedNextSteps],
        `allowedNextSteps mismatch for ${code}`,
      );
    }
  });
});
void describe("visa outcome: ENTRY_SUCCESS follow-up contract", () => {
  void test("next step after ENTRY_SUCCESS is RESIDENCE_PERIOD_RECORDED", () => {
    assert.equal(ENTRY_SUCCESS_FOLLOW_UP.nextStep, "RESIDENCE_PERIOD_RECORDED");
  });
  void test("success close requires residence period recorded", () => {
    assert.equal(
      ENTRY_SUCCESS_FOLLOW_UP.requiredBeforeSuccessClose
        .residencePeriodRecorded,
      true,
    );
  });
  void test("success close requires renewal reminder scheduled", () => {
    assert.equal(
      ENTRY_SUCCESS_FOLLOW_UP.requiredBeforeSuccessClose
        .renewalReminderScheduled,
      true,
    );
  });
  void test("ENTRY_SUCCESS → RESIDENCE_PERIOD_RECORDED is valid in matrix", () => {
    assert.ok(
      isValidStepTransition("ENTRY_SUCCESS", "RESIDENCE_PERIOD_RECORDED"),
    );
  });
  void test("ENTRY_SUCCESS cannot skip to RENEWAL_REMINDER_SCHEDULED", () => {
    assert.ok(
      !isValidStepTransition("ENTRY_SUCCESS", "RENEWAL_REMINDER_SCHEDULED"),
    );
  });
});
void describe("visa outcome: non-BMV case rejects step transition", () => {
  void test("rejects ENTRY_SUCCESS for non-BMV case type", async () => {
    const pool = makePool((sql, p) => {
      if (sql.includes("from cases") && p?.[0] === CASE_ID) {
        return ok([
          makeCaseRow({
            case_type_code: "general",
            current_workflow_step_code: null,
          }),
        ]);
      }
      return ok();
    });
    await assert.rejects(
      () =>
        svc(pool, makeTemplates()).transitionWorkflowStep(makeCtx(), CASE_ID, {
          toStepCode: "ENTRY_SUCCESS",
        }),
      (err) => {
        assert.ok(
          err.message.includes(
            CASE_WRITE_ERROR_CODES.WORKFLOW_STEP_NOT_APPLICABLE,
          ),
        );
        return true;
      },
    );
  });
});
//# sourceMappingURL=cases.visa-outcome.flow.focused.test.js.map
