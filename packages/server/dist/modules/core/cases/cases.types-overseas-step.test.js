// ────────────────────────────────────────────────────────────────
// P1 海外返签步骤契約 focused tests
//
// 覆盖五条契约线：
//   1. 步骤 → P0 阶段映射一致性
//   2. 步骤流转矩阵一致性
//   3. 自动打戳字段口径
//   4. 读模型快照与 WorkflowStepSummary 对齐
//   5. 时间线 action / payload 规格
// ────────────────────────────────────────────────────────────────
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  OVERSEAS_STEP_CODES,
  OVERSEAS_STEP_PARENT_STAGE,
  OVERSEAS_STEP_TRANSITIONS,
  OVERSEAS_TERMINAL_STEPS,
  OVERSEAS_STEP_AUTO_STAMP_FIELDS,
  OVERSEAS_STEP_READ_SNAPSHOTS,
  OVERSEAS_TIMELINE_ACTIONS,
  POST_APPROVAL_TO_STEP_CODE,
  VISA_REJECTED_CLOSURE,
  ENTRY_SUCCESS_FOLLOW_UP,
} from "./cases.types-overseas-step";
import {
  BMV_STEP_TO_STAGE,
  BMV_STEP_TRANSITIONS,
  BMV_WORKFLOW_STEP_ENUM,
  isTerminalStep,
  isValidStepTransition,
} from "./cases.workflow-step";
import { BMV_WORKFLOW_STEPS_BLUEPRINT } from "./cases.template-bmv";
import { FINAL_PAYMENT_GATE_TRIGGER_STEP } from "./cases.types-final-payment";
// ════════════════════════════════════════════════════════════════
// 1. 步骤 → P0 阶段映射一致性
// ════════════════════════════════════════════════════════════════
void describe("overseas step: parent stage mapping", () => {
  void test("COE_SENT maps to S7", () => {
    assert.equal(OVERSEAS_STEP_PARENT_STAGE.COE_SENT, "S7");
    assert.equal(BMV_STEP_TO_STAGE.COE_SENT, "S7");
  });
  void test("VISA_APPLYING maps to S7", () => {
    assert.equal(OVERSEAS_STEP_PARENT_STAGE.VISA_APPLYING, "S7");
    assert.equal(BMV_STEP_TO_STAGE.VISA_APPLYING, "S7");
  });
  void test("ENTRY_SUCCESS maps to S8", () => {
    assert.equal(OVERSEAS_STEP_PARENT_STAGE.ENTRY_SUCCESS, "S8");
    assert.equal(BMV_STEP_TO_STAGE.ENTRY_SUCCESS, "S8");
  });
  void test("VISA_REJECTED maps to S9", () => {
    assert.equal(OVERSEAS_STEP_PARENT_STAGE.VISA_REJECTED, "S9");
    assert.equal(BMV_STEP_TO_STAGE.VISA_REJECTED, "S9");
  });
  void test("overseas contract parent stages match BMV_STEP_TO_STAGE exactly", () => {
    for (const code of Object.values(OVERSEAS_STEP_CODES)) {
      assert.equal(
        OVERSEAS_STEP_PARENT_STAGE[code],
        BMV_STEP_TO_STAGE[code],
        `Mismatch for ${code}`,
      );
    }
  });
});
// ════════════════════════════════════════════════════════════════
// 2. 步骤流转矩阵一致性
// ════════════════════════════════════════════════════════════════
void describe("overseas step: transition matrix", () => {
  void test("COE_SENT → VISA_APPLYING only", () => {
    assert.deepEqual(OVERSEAS_STEP_TRANSITIONS.COE_SENT, ["VISA_APPLYING"]);
  });
  void test("VISA_APPLYING → ENTRY_SUCCESS or VISA_REJECTED", () => {
    assert.deepEqual(OVERSEAS_STEP_TRANSITIONS.VISA_APPLYING, [
      "ENTRY_SUCCESS",
      "VISA_REJECTED",
    ]);
  });
  void test("ENTRY_SUCCESS has no overseas followers (leads to RESIDENCE_PERIOD_RECORDED)", () => {
    assert.deepEqual(OVERSEAS_STEP_TRANSITIONS.ENTRY_SUCCESS, []);
    const fullTransitions = BMV_STEP_TRANSITIONS.ENTRY_SUCCESS;
    assert.ok(fullTransitions.includes("RESIDENCE_PERIOD_RECORDED"));
  });
  void test("VISA_REJECTED is terminal (no followers)", () => {
    assert.deepEqual(OVERSEAS_STEP_TRANSITIONS.VISA_REJECTED, []);
  });
  void test("overseas transitions are subset of BMV_STEP_TRANSITIONS", () => {
    for (const [from, toList] of Object.entries(OVERSEAS_STEP_TRANSITIONS)) {
      const bmvAllowed = BMV_STEP_TRANSITIONS[from];
      for (const to of toList) {
        assert.ok(
          bmvAllowed.includes(to),
          `BMV_STEP_TRANSITIONS[${from}] should include ${to}`,
        );
      }
    }
  });
  void test("COE_SENT → VISA_APPLYING is valid in BMV matrix", () => {
    assert.ok(isValidStepTransition("COE_SENT", "VISA_APPLYING"));
  });
  void test("VISA_APPLYING → ENTRY_SUCCESS is valid in BMV matrix", () => {
    assert.ok(isValidStepTransition("VISA_APPLYING", "ENTRY_SUCCESS"));
  });
  void test("VISA_APPLYING → VISA_REJECTED is valid in BMV matrix", () => {
    assert.ok(isValidStepTransition("VISA_APPLYING", "VISA_REJECTED"));
  });
  void test("ENTRY_SUCCESS → VISA_REJECTED is NOT valid (no backwards)", () => {
    assert.ok(!isValidStepTransition("ENTRY_SUCCESS", "VISA_REJECTED"));
  });
});
// ════════════════════════════════════════════════════════════════
// 3. 终态步骤一致性
// ════════════════════════════════════════════════════════════════
void describe("overseas step: terminal steps", () => {
  void test("VISA_REJECTED is terminal", () => {
    assert.ok(OVERSEAS_TERMINAL_STEPS.has("VISA_REJECTED"));
    assert.ok(isTerminalStep("VISA_REJECTED"));
  });
  void test("COE_SENT is not terminal", () => {
    assert.ok(!OVERSEAS_TERMINAL_STEPS.has("COE_SENT"));
  });
  void test("VISA_APPLYING is not terminal", () => {
    assert.ok(!OVERSEAS_TERMINAL_STEPS.has("VISA_APPLYING"));
  });
  void test("ENTRY_SUCCESS is not terminal (leads to RESIDENCE_PERIOD_RECORDED)", () => {
    assert.ok(!OVERSEAS_TERMINAL_STEPS.has("ENTRY_SUCCESS"));
    assert.ok(!isTerminalStep("ENTRY_SUCCESS"));
  });
});
// ════════════════════════════════════════════════════════════════
// 4. 自動打戳字段口径
// ════════════════════════════════════════════════════════════════
void describe("overseas step: auto-stamp fields", () => {
  void test("COE_SENT stamps coe_sent_at", () => {
    const stamp = OVERSEAS_STEP_AUTO_STAMP_FIELDS.COE_SENT;
    assert.equal(stamp.column, "coe_sent_at");
    assert.equal(stamp.tsField, "coeSentAt");
  });
  void test("VISA_APPLYING stamps overseas_visa_start_at", () => {
    const stamp = OVERSEAS_STEP_AUTO_STAMP_FIELDS.VISA_APPLYING;
    assert.equal(stamp.column, "overseas_visa_start_at");
    assert.equal(stamp.tsField, "overseasVisaStartAt");
  });
  void test("ENTRY_SUCCESS stamps entry_confirmed_at", () => {
    const stamp = OVERSEAS_STEP_AUTO_STAMP_FIELDS.ENTRY_SUCCESS;
    assert.equal(stamp.column, "entry_confirmed_at");
    assert.equal(stamp.tsField, "entryConfirmedAt");
  });
  void test("VISA_REJECTED has no auto-stamp", () => {
    assert.equal(OVERSEAS_STEP_AUTO_STAMP_FIELDS.VISA_REJECTED, null);
  });
});
// ════════════════════════════════════════════════════════════════
// 5. 読模型快照与 BMV 蓝图対齐
// ════════════════════════════════════════════════════════════════
void describe("overseas step: read model snapshots", () => {
  void test("all four overseas steps have read snapshots", () => {
    for (const code of Object.values(OVERSEAS_STEP_CODES)) {
      assert.ok(
        OVERSEAS_STEP_READ_SNAPSHOTS[code],
        `Missing read snapshot for ${code}`,
      );
    }
  });
  void test("COE_SENT read snapshot matches blueprint", () => {
    const snapshot = OVERSEAS_STEP_READ_SNAPSHOTS.COE_SENT;
    assert.equal(snapshot.parentStage, "S7");
    assert.equal(snapshot.sortOrder, 10);
    assert.equal(snapshot.isTerminal, false);
    assert.deepEqual(snapshot.allowedNextSteps, ["VISA_APPLYING"]);
    assert.deepEqual(snapshot.billingGate, {
      mode: "block",
      milestone: "final_payment",
    });
  });
  void test("VISA_APPLYING read snapshot matches blueprint", () => {
    const snapshot = OVERSEAS_STEP_READ_SNAPSHOTS.VISA_APPLYING;
    assert.equal(snapshot.parentStage, "S7");
    assert.equal(snapshot.sortOrder, 11);
    assert.equal(snapshot.isTerminal, false);
    assert.deepEqual(snapshot.allowedNextSteps, [
      "ENTRY_SUCCESS",
      "VISA_REJECTED",
    ]);
    assert.equal(snapshot.billingGate, null);
  });
  void test("ENTRY_SUCCESS read snapshot matches blueprint", () => {
    const snapshot = OVERSEAS_STEP_READ_SNAPSHOTS.ENTRY_SUCCESS;
    assert.equal(snapshot.parentStage, "S8");
    assert.equal(snapshot.sortOrder, 12);
    assert.equal(snapshot.isTerminal, false);
    assert.deepEqual(snapshot.allowedNextSteps, ["RESIDENCE_PERIOD_RECORDED"]);
    assert.equal(snapshot.billingGate, null);
  });
  void test("VISA_REJECTED read snapshot matches blueprint", () => {
    const snapshot = OVERSEAS_STEP_READ_SNAPSHOTS.VISA_REJECTED;
    assert.equal(snapshot.parentStage, "S9");
    assert.equal(snapshot.sortOrder, 13);
    assert.equal(snapshot.isTerminal, true);
    assert.deepEqual(snapshot.allowedNextSteps, []);
    assert.equal(snapshot.billingGate, null);
  });
  void test("sort orders match BMV_WORKFLOW_STEPS_BLUEPRINT", () => {
    for (const code of Object.values(OVERSEAS_STEP_CODES)) {
      const blueprintItem = BMV_WORKFLOW_STEPS_BLUEPRINT.find(
        (s) => s.stepCode === code,
      );
      assert.ok(blueprintItem, `Blueprint item not found for ${code}`);
      assert.equal(
        OVERSEAS_STEP_READ_SNAPSHOTS[code].sortOrder,
        blueprintItem.sortOrder,
        `Sort order mismatch for ${code}`,
      );
    }
  });
  void test("allowed next steps match BMV_STEP_TRANSITIONS", () => {
    const expected = {
      COE_SENT: BMV_STEP_TRANSITIONS.COE_SENT,
      VISA_APPLYING: BMV_STEP_TRANSITIONS.VISA_APPLYING,
      ENTRY_SUCCESS: BMV_STEP_TRANSITIONS.ENTRY_SUCCESS,
      VISA_REJECTED: BMV_STEP_TRANSITIONS.VISA_REJECTED,
    };
    for (const code of Object.values(OVERSEAS_STEP_CODES)) {
      assert.deepEqual(
        [...OVERSEAS_STEP_READ_SNAPSHOTS[code].allowedNextSteps],
        [...expected[code]],
        `Allowed next steps mismatch for ${code}`,
      );
    }
  });
});
// ════════════════════════════════════════════════════════════════
// 6. COE_SENT billing gate 口径
// ════════════════════════════════════════════════════════════════
void describe("overseas step: COE_SENT billing gate", () => {
  void test("COE_SENT is FINAL_PAYMENT_GATE_TRIGGER_STEP", () => {
    assert.equal(FINAL_PAYMENT_GATE_TRIGGER_STEP, "COE_SENT");
  });
  void test("COE_SENT billing gate mode is block", () => {
    const gate = OVERSEAS_STEP_READ_SNAPSHOTS.COE_SENT.billingGate;
    assert.ok(gate !== null);
    assert.equal(gate.mode, "block");
    assert.equal(gate.milestone, "final_payment");
  });
  void test("COE_SENT blueprint billingGate matches contract", () => {
    const blueprintItem = BMV_WORKFLOW_STEPS_BLUEPRINT.find(
      (s) => s.stepCode === "COE_SENT",
    );
    assert.ok(blueprintItem);
    assert.ok(blueprintItem.billingGate);
    assert.equal(blueprintItem.billingGate.mode, "block");
    assert.equal(blueprintItem.billingGate.milestone, "final_payment");
  });
  void test("other overseas steps have no billing gate", () => {
    for (const code of ["VISA_APPLYING", "ENTRY_SUCCESS", "VISA_REJECTED"]) {
      assert.equal(
        OVERSEAS_STEP_READ_SNAPSHOTS[code].billingGate,
        null,
        `${code} should have no billing gate`,
      );
    }
  });
});
// ════════════════════════════════════════════════════════════════
// 7. 时間線 action 規格
// ════════════════════════════════════════════════════════════════
void describe("overseas step: timeline actions", () => {
  void test("WORKFLOW_STEP_TRANSITIONED action matches service", () => {
    assert.equal(
      OVERSEAS_TIMELINE_ACTIONS.WORKFLOW_STEP_TRANSITIONED,
      "case.workflow_step_transitioned",
    );
  });
  void test("POST_APPROVAL_STAGE_CHANGED action matches service", () => {
    assert.equal(
      OVERSEAS_TIMELINE_ACTIONS.POST_APPROVAL_STAGE_CHANGED,
      "case.post_approval_stage_changed",
    );
  });
  void test("VISA_REJECTED_CLOSURE action is defined", () => {
    assert.equal(
      OVERSEAS_TIMELINE_ACTIONS.VISA_REJECTED_CLOSURE,
      "case.overseas_visa_rejected",
    );
  });
  void test("ENTRY_CONFIRMED action is defined", () => {
    assert.equal(
      OVERSEAS_TIMELINE_ACTIONS.ENTRY_CONFIRMED,
      "case.overseas_entry_confirmed",
    );
  });
  void test("timeline payload shape is { from, to }", () => {
    const payload = {
      from: "WAITING_PAYMENT",
      to: "COE_SENT",
    };
    assert.ok("from" in payload);
    assert.ok("to" in payload);
  });
});
// ════════════════════════════════════════════════════════════════
// 8. PostApprovalStage ↔ StepCode 映射
// ════════════════════════════════════════════════════════════════
void describe("overseas step: post-approval stage mapping", () => {
  void test("coe_sent → COE_SENT", () => {
    assert.equal(POST_APPROVAL_TO_STEP_CODE.coe_sent, "COE_SENT");
  });
  void test("overseas_visa_applying → VISA_APPLYING", () => {
    assert.equal(
      POST_APPROVAL_TO_STEP_CODE.overseas_visa_applying,
      "VISA_APPLYING",
    );
  });
  void test("entry_success → ENTRY_SUCCESS", () => {
    assert.equal(POST_APPROVAL_TO_STEP_CODE.entry_success, "ENTRY_SUCCESS");
  });
});
// ════════════════════════════════════════════════════════════════
// 9. VISA_REJECTED 失敗結案口径
// ════════════════════════════════════════════════════════════════
void describe("overseas step: VISA_REJECTED closure contract", () => {
  void test("terminal step code is VISA_REJECTED", () => {
    assert.equal(VISA_REJECTED_CLOSURE.terminalStepCode, "VISA_REJECTED");
  });
  void test("target parent stage is S9", () => {
    assert.equal(VISA_REJECTED_CLOSURE.targetParentStage, "S9");
  });
  void test("auto-transition to S9 is false (admin guidance)", () => {
    assert.equal(VISA_REJECTED_CLOSURE.autoTransitionToS9, false);
  });
  void test("suggested result outcomes include rejected and visa_rejected", () => {
    assert.ok(
      VISA_REJECTED_CLOSURE.suggestedResultOutcomes.includes("rejected"),
    );
    assert.ok(
      VISA_REJECTED_CLOSURE.suggestedResultOutcomes.includes("visa_rejected"),
    );
  });
});
// ════════════════════════════════════════════════════════════════
// 10. ENTRY_SUCCESS 後続リンク口径
// ════════════════════════════════════════════════════════════════
void describe("overseas step: ENTRY_SUCCESS follow-up contract", () => {
  void test("next step is RESIDENCE_PERIOD_RECORDED", () => {
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
});
// ════════════════════════════════════════════════════════════════
// 11. BMV 枚举包含全部海外步骤
// ════════════════════════════════════════════════════════════════
void describe("overseas step: BMV enum completeness", () => {
  void test("all overseas step codes exist in BMV_WORKFLOW_STEP_ENUM", () => {
    for (const code of Object.values(OVERSEAS_STEP_CODES)) {
      assert.ok(
        BMV_WORKFLOW_STEP_ENUM.includes(code),
        `BMV_WORKFLOW_STEP_ENUM should include ${code}`,
      );
    }
  });
  void test("all overseas step codes exist in BMV_WORKFLOW_STEPS_BLUEPRINT", () => {
    for (const code of Object.values(OVERSEAS_STEP_CODES)) {
      assert.ok(
        BMV_WORKFLOW_STEPS_BLUEPRINT.some((s) => s.stepCode === code),
        `BMV_WORKFLOW_STEPS_BLUEPRINT should include ${code}`,
      );
    }
  });
});
//# sourceMappingURL=cases.types-overseas-step.test.js.map
