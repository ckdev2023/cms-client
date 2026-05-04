import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { CASE_WRITE_ERROR_CODES } from "./cases.types";
import {
  checkParallelBoundary,
  isTerminalStep,
  isValidStepTransition,
} from "./cases.workflow-step";
import {
  OVERSEAS_STEP_CODES,
  OVERSEAS_TERMINAL_STEPS,
  ENTRY_SUCCESS_FOLLOW_UP,
  VISA_REJECTED_CLOSURE,
} from "./cases.types-overseas-step";
import {
  CASE_ID,
  makeCaseRow,
  makeCtx,
  makePool,
  makeTemplates,
  ok,
  svc,
} from "./cases.visa-outcome.focused.test-support";
// ═══════════════════════════════════════════════════════════════
// A. 返签成功 — transitionWorkflowStep: VISA_APPLYING → ENTRY_SUCCESS
// ═══════════════════════════════════════════════════════════════
void describe("visa outcome: ENTRY_SUCCESS via workflow step transition", () => {
  void test("allows VISA_APPLYING → ENTRY_SUCCESS when case stage is S8", async () => {
    const pool = makePool((sql, p) => {
      if (
        sql.includes("update cases") &&
        sql.includes("current_workflow_step_code")
      )
        return ok([
          makeCaseRow({
            stage: "S8",
            current_workflow_step_code: "ENTRY_SUCCESS",
          }),
        ]);
      if (sql.includes("from cases") && p?.[0] === CASE_ID)
        return ok([makeCaseRow({ stage: "S8" })]);
      return ok();
    });
    const c = await svc(pool, makeTemplates()).transitionWorkflowStep(
      makeCtx(),
      CASE_ID,
      { toStepCode: "ENTRY_SUCCESS" },
    );
    assert.equal(c.currentWorkflowStepCode, "ENTRY_SUCCESS");
  });
  void test("ENTRY_SUCCESS transition bypasses billing guard (no gate on this step)", async () => {
    const pool = makePool((sql, p) => {
      if (
        sql.includes("update cases") &&
        sql.includes("current_workflow_step_code")
      )
        return ok([
          makeCaseRow({
            stage: "S8",
            current_workflow_step_code: "ENTRY_SUCCESS",
          }),
        ]);
      if (sql.includes("from cases") && p?.[0] === CASE_ID)
        return ok([
          makeCaseRow({
            stage: "S8",
            final_payment_paid_cached: false,
          }),
        ]);
      return ok();
    });
    const c = await svc(pool, makeTemplates()).transitionWorkflowStep(
      makeCtx(),
      CASE_ID,
      { toStepCode: "ENTRY_SUCCESS" },
    );
    assert.equal(c.currentWorkflowStepCode, "ENTRY_SUCCESS");
  });
  void test("ENTRY_SUCCESS requires case stage >= S8 (parallel boundary)", async () => {
    const pool = makePool((sql, p) => {
      if (sql.includes("from cases") && p?.[0] === CASE_ID)
        return ok([makeCaseRow({ stage: "S7" })]);
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
            CASE_WRITE_ERROR_CODES.WORKFLOW_STEP_PARALLEL_BOUNDARY,
          ),
        );
        assert.ok(err.message.includes("S8"));
        return true;
      },
    );
  });
  void test("ENTRY_SUCCESS is not terminal — follow-up to RESIDENCE_PERIOD_RECORDED", () => {
    assert.ok(!isTerminalStep("ENTRY_SUCCESS"));
    assert.ok(
      isValidStepTransition("ENTRY_SUCCESS", "RESIDENCE_PERIOD_RECORDED"),
    );
    assert.equal(ENTRY_SUCCESS_FOLLOW_UP.nextStep, "RESIDENCE_PERIOD_RECORDED");
  });
});
// ═══════════════════════════════════════════════════════════════
// B. 拒签失败 — transitionWorkflowStep: VISA_APPLYING → VISA_REJECTED
// ═══════════════════════════════════════════════════════════════
void describe("visa outcome: VISA_REJECTED via workflow step transition", () => {
  void test("VISA_REJECTED allowed at S7 (terminal step boundary relaxation)", async () => {
    const pool = makePool((sql, p) => {
      if (
        sql.includes("update cases") &&
        sql.includes("current_workflow_step_code")
      )
        return ok([
          makeCaseRow({
            stage: "S7",
            current_workflow_step_code: "VISA_REJECTED",
            result_outcome: "rejected",
          }),
        ]);
      if (sql.includes("from cases") && p?.[0] === CASE_ID)
        return ok([makeCaseRow({ stage: "S7" })]);
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
  void test("VISA_REJECTED at S9 is blocked by S9_READONLY", async () => {
    const pool = makePool((sql, p) => {
      if (sql.includes("from cases") && p?.[0] === CASE_ID)
        return ok([
          makeCaseRow({
            stage: "S9",
            current_workflow_step_code: "VISA_APPLYING",
          }),
        ]);
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
          "S9 cases are read-only — VISA_REJECTED must be set before S9 transition",
        );
        return true;
      },
    );
  });
  void test("VISA_REJECTED is terminal — no further transitions in matrix", () => {
    assert.ok(isTerminalStep("VISA_REJECTED"));
    assert.ok(OVERSEAS_TERMINAL_STEPS.has("VISA_REJECTED"));
    assert.deepEqual(
      [...Object.values(OVERSEAS_STEP_CODES)].filter((code) =>
        isValidStepTransition("VISA_REJECTED", code),
      ),
      [],
    );
  });
  void test("VISA_REJECTED closure targets S9 without auto-transition", () => {
    assert.equal(VISA_REJECTED_CLOSURE.terminalStepCode, "VISA_REJECTED");
    assert.equal(VISA_REJECTED_CLOSURE.targetParentStage, "S9");
    assert.equal(VISA_REJECTED_CLOSURE.autoTransitionToS9, false);
  });
  void test("VISA_REJECTED suggested outcomes are rejection variants", () => {
    const outcomes = VISA_REJECTED_CLOSURE.suggestedResultOutcomes;
    assert.ok(outcomes.includes("rejected"));
    assert.ok(outcomes.includes("visa_rejected"));
  });
});
// ═══════════════════════════════════════════════════════════════
// C. 返签成功 — updatePostApprovalStage: entry_success auto-stamp
// ═══════════════════════════════════════════════════════════════
void describe("visa outcome: post-approval entry_success auto-stamp", () => {
  void test("entry_success stamps entry_confirmed_at on first write", async () => {
    let stampedEntry = false;
    const pool = makePool((sql, p) => {
      if (sql.includes("update cases") && sql.includes("metadata")) {
        if (sql.includes("entry_confirmed_at")) stampedEntry = true;
        return ok([
          makeCaseRow({
            post_approval_stage: "entry_success",
            metadata: { post_approval_stage: "entry_success" },
            entry_confirmed_at: "2026-04-20T00:00:00.000Z",
          }),
        ]);
      }
      if (sql.includes("from cases") && p?.[0] === CASE_ID)
        return ok([makeCaseRow({ entry_confirmed_at: null })]);
      return ok();
    });
    const c = await svc(pool, makeTemplates()).updatePostApprovalStage(
      makeCtx(),
      CASE_ID,
      { stage: "entry_success" },
    );
    assert.equal(c.postApprovalStage, "entry_success");
    assert.ok(stampedEntry, "should have stamped entry_confirmed_at");
  });
  void test("entry_success skips stamp when entry_confirmed_at already set", async () => {
    const pool = makePool((sql, p) => {
      if (sql.includes("update cases") && sql.includes("metadata"))
        return ok([
          makeCaseRow({
            post_approval_stage: "entry_success",
            metadata: { post_approval_stage: "entry_success" },
            entry_confirmed_at: "2026-04-10T00:00:00.000Z",
          }),
        ]);
      if (sql.includes("from cases") && p?.[0] === CASE_ID)
        return ok([
          makeCaseRow({
            entry_confirmed_at: "2026-04-10T00:00:00.000Z",
          }),
        ]);
      return ok();
    });
    const c = await svc(pool, makeTemplates()).updatePostApprovalStage(
      makeCtx(),
      CASE_ID,
      { stage: "entry_success" },
    );
    assert.equal(c.postApprovalStage, "entry_success");
  });
  void test("overseas_visa_applying stamps overseas_visa_start_at on first write", async () => {
    let stampedVisa = false;
    const pool = makePool((sql, p) => {
      if (sql.includes("update cases") && sql.includes("metadata")) {
        if (sql.includes("overseas_visa_start_at")) stampedVisa = true;
        return ok([
          makeCaseRow({
            post_approval_stage: "overseas_visa_applying",
            metadata: { post_approval_stage: "overseas_visa_applying" },
            overseas_visa_start_at: "2026-03-20T00:00:00.000Z",
          }),
        ]);
      }
      if (sql.includes("from cases") && p?.[0] === CASE_ID)
        return ok([makeCaseRow({ overseas_visa_start_at: null })]);
      return ok();
    });
    const c = await svc(pool, makeTemplates()).updatePostApprovalStage(
      makeCtx(),
      CASE_ID,
      { stage: "overseas_visa_applying" },
    );
    assert.equal(c.postApprovalStage, "overseas_visa_applying");
    assert.ok(stampedVisa, "should have stamped overseas_visa_start_at");
  });
});
// ═══════════════════════════════════════════════════════════════
// D. 不可从终态步骤流转
// ═══════════════════════════════════════════════════════════════
void describe("visa outcome: VISA_REJECTED blocks further transitions", () => {
  void test("VISA_REJECTED at S9 blocks all writes (S9_READONLY)", async () => {
    const pool = makePool((sql, p) => {
      if (sql.includes("from cases") && p?.[0] === CASE_ID)
        return ok([
          makeCaseRow({
            stage: "S9",
            current_workflow_step_code: "VISA_REJECTED",
          }),
        ]);
      return ok();
    });
    await assert.rejects(
      () =>
        svc(pool, makeTemplates()).transitionWorkflowStep(makeCtx(), CASE_ID, {
          toStepCode: "ENTRY_SUCCESS",
        }),
      (err) => {
        assert.ok(
          err.message.includes(CASE_WRITE_ERROR_CODES.S9_READONLY),
          "S9 is read-only — no further transitions from VISA_REJECTED closure",
        );
        return true;
      },
    );
  });
  void test("VISA_REJECTED transition matrix has zero targets (pure function)", () => {
    assert.ok(!isValidStepTransition("VISA_REJECTED", "ENTRY_SUCCESS"));
    assert.ok(
      !isValidStepTransition("VISA_REJECTED", "RESIDENCE_PERIOD_RECORDED"),
    );
    assert.ok(!isValidStepTransition("VISA_REJECTED", "COE_SENT"));
    assert.ok(!isValidStepTransition("VISA_REJECTED", "VISA_APPLYING"));
  });
  void test("ENTRY_SUCCESS → VISA_REJECTED is not valid (no backward in matrix)", () => {
    assert.ok(!isValidStepTransition("ENTRY_SUCCESS", "VISA_REJECTED"));
  });
  void test("ENTRY_SUCCESS → VISA_REJECTED is rejected by service (parallel boundary)", async () => {
    const pool = makePool((sql, p) => {
      if (sql.includes("from cases") && p?.[0] === CASE_ID)
        return ok([
          makeCaseRow({
            current_workflow_step_code: "ENTRY_SUCCESS",
            stage: "S8",
          }),
        ]);
      return ok();
    });
    await assert.rejects(
      () =>
        svc(pool, makeTemplates()).transitionWorkflowStep(makeCtx(), CASE_ID, {
          toStepCode: "VISA_REJECTED",
        }),
      (err) => {
        const hasTransitionError = err.message.includes(
          CASE_WRITE_ERROR_CODES.WORKFLOW_STEP_TRANSITION_INVALID,
        );
        const hasBoundaryError = err.message.includes(
          CASE_WRITE_ERROR_CODES.WORKFLOW_STEP_PARALLEL_BOUNDARY,
        );
        assert.ok(
          hasTransitionError || hasBoundaryError,
          "should reject via transition matrix or parallel boundary",
        );
        return true;
      },
    );
  });
});
// ═══════════════════════════════════════════════════════════════
// E. UNDER_REVIEW → VISA_REJECTED 直接拒否路径
// ═══════════════════════════════════════════════════════════════
void describe("visa outcome: direct rejection from UNDER_REVIEW", () => {
  void test("UNDER_REVIEW → VISA_REJECTED is valid in transition matrix", () => {
    assert.ok(isValidStepTransition("UNDER_REVIEW", "VISA_REJECTED"));
  });
  void test("UNDER_REVIEW → VISA_REJECTED allowed (terminal step boundary relaxation)", async () => {
    const pool = makePool((sql, p) => {
      if (
        sql.includes("update cases") &&
        sql.includes("current_workflow_step_code")
      )
        return ok([
          makeCaseRow({
            stage: "S5",
            current_workflow_step_code: "VISA_REJECTED",
            result_outcome: "rejected",
          }),
        ]);
      if (sql.includes("from cases") && p?.[0] === CASE_ID)
        return ok([
          makeCaseRow({
            stage: "S5",
            current_workflow_step_code: "UNDER_REVIEW",
          }),
        ]);
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
  void test("parallel boundary is relaxed for terminal steps: VISA_REJECTED at S5", () => {
    const result = checkParallelBoundary("VISA_REJECTED", "S5");
    assert.equal(result.compatible, true);
    assert.equal(result.stepParentStage, "S9");
  });
});
//# sourceMappingURL=cases.visa-outcome.focused.test.js.map
