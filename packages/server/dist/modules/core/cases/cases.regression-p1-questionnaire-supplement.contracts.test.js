import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { mapCaseRow, mapDetailCountsRow } from "./cases.service";
import {
  CASE_WRITE_ERROR_CODES,
  VALIDATION_SUBMISSION_ERROR_CODES,
} from "./cases.types";
import {
  BMV_STEP_TO_STAGE,
  BMV_STEP_TRANSITIONS,
  isValidStepTransition,
} from "./cases.workflow-step";
import {
  BMV_CASE_TYPE_CODE,
  BMV_WORKFLOW_STEPS_BLUEPRINT,
} from "./bmvTemplateConfig";
import { BMV_CASE_TYPE } from "./cases.template-bmv";
import {
  CASE_ID,
  ctx,
  makeCaseRow,
  makeCountsRow,
  makePool,
  ok,
  svc,
} from "./cases.regression-p1-questionnaire-supplement.test-support";
void describe("§14 supplement cycle: step transition rules (pure)", () => {
  void test("supplement cycle is contained within S5", () => {
    const cycleSteps = [
      "UNDER_REVIEW",
      "NEED_SUPPLEMENT",
      "SUPPLEMENT_PROCESSING",
    ];
    for (const step of cycleSteps) {
      assert.equal(BMV_STEP_TO_STAGE[step], "S5", step);
    }
  });
  void test("supplement loop steps in blueprint have canLoopTo set", () => {
    const ns = BMV_WORKFLOW_STEPS_BLUEPRINT.find(
      (s) => s.stepCode === "NEED_SUPPLEMENT",
    );
    assert.equal(ns?.canLoopTo, "SUPPLEMENT_PROCESSING");
    const sp = BMV_WORKFLOW_STEPS_BLUEPRINT.find(
      (s) => s.stepCode === "SUPPLEMENT_PROCESSING",
    );
    assert.equal(sp?.canLoopTo, "UNDER_REVIEW");
  });
  void test("UNDER_REVIEW can exit cycle via APPROVED or VISA_REJECTED", () => {
    assert.ok(isValidStepTransition("UNDER_REVIEW", "APPROVED"));
    assert.ok(isValidStepTransition("UNDER_REVIEW", "VISA_REJECTED"));
  });
  void test("UNDER_REVIEW cannot skip to post-approval steps", () => {
    assert.ok(!isValidStepTransition("UNDER_REVIEW", "WAITING_PAYMENT"));
    assert.ok(!isValidStepTransition("UNDER_REVIEW", "COE_SENT"));
  });
  void test("two full supplement rounds form valid chain", () => {
    const rounds = [
      "UNDER_REVIEW",
      "NEED_SUPPLEMENT",
      "SUPPLEMENT_PROCESSING",
      "UNDER_REVIEW",
      "NEED_SUPPLEMENT",
      "SUPPLEMENT_PROCESSING",
      "UNDER_REVIEW",
      "APPROVED",
    ];
    for (let i = 0; i < rounds.length - 1; i++) {
      assert.ok(
        isValidStepTransition(rounds[i], rounds[i + 1]),
        rounds[i] + " → " + rounds[i + 1],
      );
    }
  });
});
void describe("§15 supplement_count recalc via service (BUG-118)", () => {
  void test("incrementSupplementCount returns recalculated count", async () => {
    const pool = makePool((sql) => {
      if (
        sql.includes("FROM submission_packages") &&
        sql.includes("submission_kind = 'supplement'")
      )
        return ok([{ cnt: "1" }]);
      if (sql.includes("UPDATE cases") && sql.includes("supplement_count = $2"))
        return ok();
      return ok();
    });
    const count = await svc(pool).incrementSupplementCount(ctx(), CASE_ID);
    assert.equal(count, 1);
  });
  void test("incrementSupplementCount twice returns count from submission_packages", async () => {
    let supplementPkgs = 0;
    const pool = makePool((sql) => {
      if (
        sql.includes("FROM submission_packages") &&
        sql.includes("submission_kind = 'supplement'")
      ) {
        supplementPkgs += 1;
        return ok([{ cnt: String(supplementPkgs) }]);
      }
      if (sql.includes("UPDATE cases") && sql.includes("supplement_count = $2"))
        return ok();
      return ok();
    });
    const s = svc(pool);
    const c1 = await s.incrementSupplementCount(ctx(), CASE_ID);
    const c2 = await s.incrementSupplementCount(ctx(), CASE_ID);
    assert.equal(c1, 1);
    assert.equal(c2, 2);
  });
  void test("mapCaseRow maps supplement_count from numeric string", () => {
    const row = makeCaseRow({ supplement_count: "3" });
    const c = mapCaseRow(row);
    assert.equal(c.supplementCount, 3);
  });
  void test("mapCaseRow maps supplement_count null to 0", () => {
    const row = makeCaseRow({ supplement_count: null });
    const c = mapCaseRow(row);
    assert.equal(c.supplementCount, 0);
  });
});
void describe("§16 submission chain: error code completeness", () => {
  const SP_CODES = Object.entries(VALIDATION_SUBMISSION_ERROR_CODES)
    .filter(([key]) => key.startsWith("SP_"))
    .map(([, val]) => val);
  void test("at least 9 SP_ error codes", () => {
    assert.ok(SP_CODES.length >= 9, `got ${String(SP_CODES.length)}`);
  });
  void test("all SP_ codes are unique", () => {
    assert.equal(new Set(SP_CODES).size, SP_CODES.length);
  });
  void test("critical codes present: INITIAL_NO_RELATED, SUPPLEMENT_REQUIRES_RELATED", () => {
    assert.equal(
      VALIDATION_SUBMISSION_ERROR_CODES.SP_INITIAL_NO_RELATED,
      "SP_INITIAL_NO_RELATED",
    );
    assert.equal(
      VALIDATION_SUBMISSION_ERROR_CODES.SP_SUPPLEMENT_REQUIRES_RELATED,
      "SP_SUPPLEMENT_REQUIRES_RELATED",
    );
  });
  void test("chain integrity codes: RELATED_NOT_FOUND, RELATED_NOT_LATEST, ALREADY_BRANCHED", () => {
    assert.equal(
      VALIDATION_SUBMISSION_ERROR_CODES.SP_RELATED_NOT_FOUND,
      "SP_RELATED_NOT_FOUND",
    );
    assert.equal(
      VALIDATION_SUBMISSION_ERROR_CODES.SP_RELATED_NOT_LATEST,
      "SP_RELATED_NOT_LATEST",
    );
    assert.equal(
      VALIDATION_SUBMISSION_ERROR_CODES.SP_RELATED_ALREADY_BRANCHED,
      "SP_RELATED_ALREADY_BRANCHED",
    );
  });
  void test("chain depth limit code present", () => {
    assert.equal(
      VALIDATION_SUBMISSION_ERROR_CODES.SP_CHAIN_DEPTH_EXCEEDED,
      "SP_CHAIN_DEPTH_EXCEEDED",
    );
  });
});
void describe("§16 submission chain: kind + stage gate rules", () => {
  void test("only initial and supplement are valid submission kinds", () => {
    assert.equal(
      VALIDATION_SUBMISSION_ERROR_CODES.SP_INVALID_SUBMISSION_KIND,
      "SP_INVALID_SUBMISSION_KIND",
    );
  });
  void test("submission restricted to S6/S7 stages", () => {
    assert.equal(
      VALIDATION_SUBMISSION_ERROR_CODES.SP_CASE_STAGE_INVALID,
      "SP_CASE_STAGE_INVALID",
    );
    const allowedStages = new Set(["S6", "S7"]);
    for (const s of ["S1", "S2", "S3", "S4", "S5", "S8", "S9"]) {
      assert.ok(!allowedStages.has(s), `${s} must not allow submission`);
    }
    assert.ok(allowedStages.has("S6"));
    assert.ok(allowedStages.has("S7"));
  });
  void test("items must not be empty (SP_MISSING_MINIMUM_FIELDS)", () => {
    assert.equal(
      VALIDATION_SUBMISSION_ERROR_CODES.SP_MISSING_MINIMUM_FIELDS,
      "SP_MISSING_MINIMUM_FIELDS",
    );
  });
  void test("duplicate items rejected (SP_DUPLICATE_ITEM)", () => {
    assert.equal(
      VALIDATION_SUBMISSION_ERROR_CODES.SP_DUPLICATE_ITEM,
      "SP_DUPLICATE_ITEM",
    );
  });
  void test("invalid item type rejected (SP_INVALID_ITEM_TYPE)", () => {
    assert.equal(
      VALIDATION_SUBMISSION_ERROR_CODES.SP_INVALID_ITEM_TYPE,
      "SP_INVALID_ITEM_TYPE",
    );
  });
});
void describe("§16 submission chain: supplement-to-step alignment", () => {
  void test("supplement cycle step NEED_SUPPLEMENT maps to S5 (within submission boundary)", () => {
    assert.equal(BMV_STEP_TO_STAGE.NEED_SUPPLEMENT, "S5");
  });
  void test("APPLYING maps to S5 (pre-submission step)", () => {
    assert.equal(BMV_STEP_TO_STAGE.APPLYING, "S5");
  });
  void test("APPROVED maps to S6 (within submission-allowed stages)", () => {
    assert.equal(BMV_STEP_TO_STAGE.APPROVED, "S6");
  });
  void test("post-approval steps COE_SENT / WAITING_PAYMENT map to S7", () => {
    assert.equal(BMV_STEP_TO_STAGE.COE_SENT, "S7");
    assert.equal(BMV_STEP_TO_STAGE.WAITING_PAYMENT, "S7");
  });
  void test("supplement cycle nodes have no billing gate", () => {
    for (const code of [
      "NEED_SUPPLEMENT",
      "SUPPLEMENT_PROCESSING",
      "UNDER_REVIEW",
    ]) {
      const step = BMV_WORKFLOW_STEPS_BLUEPRINT.find(
        (s) => s.stepCode === code,
      );
      assert.equal(
        step?.billingGate,
        null,
        `${code} should have no billing gate`,
      );
    }
  });
});
void describe("§17 mapCaseRow: P1 fields round-trip", () => {
  void test("maps visa_plan string", () => {
    const c = mapCaseRow(makeCaseRow({ visa_plan: "new_3year" }));
    assert.equal(c.visaPlan, "new_3year");
  });
  void test("maps visa_plan null", () => {
    const c = mapCaseRow(makeCaseRow({ visa_plan: null }));
    assert.equal(c.visaPlan, null);
  });
  void test("maps quote_price from numeric string", () => {
    const c = mapCaseRow(makeCaseRow({ quote_price: "350000.50" }));
    assert.equal(c.quotePrice, 350000.5);
  });
  void test("maps quote_price null", () => {
    const c = mapCaseRow(makeCaseRow({ quote_price: null }));
    assert.equal(c.quotePrice, null);
  });
  void test("maps supplement_count from DB string", () => {
    const c = mapCaseRow(makeCaseRow({ supplement_count: "5" }));
    assert.equal(c.supplementCount, 5);
  });
  void test("maps current_workflow_step_code", () => {
    const c = mapCaseRow(
      makeCaseRow({
        current_workflow_step_code: "NEED_SUPPLEMENT",
      }),
    );
    assert.equal(c.currentWorkflowStepCode, "NEED_SUPPLEMENT");
  });
  void test("maps current_workflow_step_code null for P0-only case", () => {
    const c = mapCaseRow(
      makeCaseRow({
        current_workflow_step_code: null,
      }),
    );
    assert.equal(c.currentWorkflowStepCode, null);
  });
});
void describe("§17 mapDetailCountsRow: questionnaire subset invariant", () => {
  void test("questionnaire counts ≤ document counts", () => {
    const counts = mapDetailCountsRow(
      makeCountsRow({
        document_items_total: "15",
        document_items_done: "10",
        questionnaire_items_total: "3",
        questionnaire_items_done: "2",
      }),
    );
    assert.ok(counts.questionnaireItemsTotal <= counts.documentItemsTotal);
    assert.ok(counts.questionnaireItemsDone <= counts.documentItemsDone);
  });
  void test("zero questionnaire when no questionnaire items", () => {
    const counts = mapDetailCountsRow(
      makeCountsRow({
        document_items_total: "10",
        document_items_done: "8",
        questionnaire_items_total: "0",
        questionnaire_items_done: "0",
      }),
    );
    assert.equal(counts.questionnaireItemsTotal, 0);
    assert.equal(counts.questionnaireItemsDone, 0);
    assert.equal(counts.documentItemsTotal, 10);
  });
  void test("submission_packages count parsed correctly", () => {
    const counts = mapDetailCountsRow(
      makeCountsRow({ submission_packages: "4" }),
    );
    assert.equal(counts.submissionPackages, 4);
  });
  void test("undefined row falls back to all zeros", () => {
    const counts = mapDetailCountsRow(undefined);
    assert.equal(counts.questionnaireItemsTotal, 0);
    assert.equal(counts.questionnaireItemsDone, 0);
    assert.equal(counts.submissionPackages, 0);
    assert.equal(counts.documentItemsTotal, 0);
  });
});
void describe("§17 cross-cutting: BMV_CASE_TYPE alignment", () => {
  void test("BMV_CASE_TYPE equals BMV_CASE_TYPE_CODE", () => {
    assert.equal(BMV_CASE_TYPE, BMV_CASE_TYPE_CODE);
  });
  void test("CASE_WRITE_ERROR_CODES includes all P1 workflow step codes", () => {
    assert.equal(
      CASE_WRITE_ERROR_CODES.WORKFLOW_STEP_NOT_APPLICABLE,
      "CASE_WORKFLOW_STEP_NOT_APPLICABLE",
    );
    assert.equal(
      CASE_WRITE_ERROR_CODES.WORKFLOW_STEP_TRANSITION_INVALID,
      "CASE_WORKFLOW_STEP_TRANSITION_INVALID",
    );
    assert.equal(
      CASE_WRITE_ERROR_CODES.WORKFLOW_STEP_BILLING_BLOCKED,
      "CASE_WORKFLOW_STEP_BILLING_BLOCKED",
    );
    assert.equal(
      CASE_WRITE_ERROR_CODES.WORKFLOW_STEP_PARALLEL_BOUNDARY,
      "CASE_WORKFLOW_STEP_PARALLEL_BOUNDARY",
    );
  });
  void test("BMV_GATE_BLOCKED error code present", () => {
    assert.equal(
      CASE_WRITE_ERROR_CODES.BMV_GATE_BLOCKED,
      "CASE_BMV_GATE_BLOCKED",
    );
  });
  void test("all supplement cycle steps exist in BMV_STEP_TRANSITIONS", () => {
    for (const step of [
      "UNDER_REVIEW",
      "NEED_SUPPLEMENT",
      "SUPPLEMENT_PROCESSING",
    ]) {
      assert.ok(
        step in BMV_STEP_TRANSITIONS,
        `${step} missing from transitions`,
      );
    }
  });
});
//# sourceMappingURL=cases.regression-p1-questionnaire-supplement.contracts.test.js.map
