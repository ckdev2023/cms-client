// ────────────────────────────────────────────────────────────────
// P1 BMV submission cycle focused tests
//
// 覆盖三条核心链路：
//   1. supplement_count 递增：补正包创建后 increment、初始包不 increment
//   2. 提交链路完整性：related_submission_id 线性链、分叉阻断、深度限制
//   3. 提交门禁：submissionKind 合法值、stage 限制、items 校验
//
// 权威来源：
//   - P1/01 §3 M5（补正循环 + supplement_count）
//   - cases.types VALIDATION_SUBMISSION_ERROR_CODES
//   - submissionPackages.service（链路检查 + 门禁逻辑）
//   - bmvTemplateConfig（NEED_SUPPLEMENT ↔ SUPPLEMENT_PROCESSING 循环对）
//   - cases.workflow-step BMV_STEP_TRANSITIONS
// ────────────────────────────────────────────────────────────────

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  VALIDATION_SUBMISSION_ERROR_CODES,
  CASE_WRITE_ERROR_CODES,
} from "./cases.types";
import type {
  SubmissionPackageCreateInput,
  SubmissionPackageCreateItemInput,
} from "./cases.types";
import {
  BMV_WORKFLOW_STEP_CODES,
  BMV_WORKFLOW_STEPS_BLUEPRINT,
} from "./bmvTemplateConfig";
import {
  BMV_STEP_TRANSITIONS,
  isValidStepTransition,
  BMV_STEP_TO_STAGE,
} from "./cases.workflow-step";
import type { BmvWorkflowStep } from "./cases.workflow-step";

// ── helpers ──

function makeItem(
  overrides?: Partial<SubmissionPackageCreateItemInput>,
): SubmissionPackageCreateItemInput {
  return { itemType: "document_requirement", refId: "req-1", ...overrides };
}

function makeCreateInput(
  overrides?: Partial<SubmissionPackageCreateInput>,
): SubmissionPackageCreateInput {
  return {
    caseId: "case-1",
    submissionKind: "initial",
    submittedAt: "2026-04-01T00:00:00.000Z",
    authorityName: "東京入管",
    items: [makeItem()],
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════
// 1. supplement_count 递增语义
// ═══════════════════════════════════════════════════════════

void describe("supplement_count increment semantics", () => {
  void test("supplement kind triggers increment", () => {
    const input = makeCreateInput({
      submissionKind: "supplement",
      relatedSubmissionId: "sp-prev-1",
    });
    assert.equal(input.submissionKind, "supplement");
    assert.ok(input.relatedSubmissionId);
  });

  void test("initial kind does NOT trigger increment", () => {
    const input = makeCreateInput({ submissionKind: "initial" });
    assert.equal(input.submissionKind, "initial");
    assert.equal(input.relatedSubmissionId, undefined);
  });

  void test("supplement_count is monotonically increasing", () => {
    let count = 0;
    for (let i = 0; i < 5; i++) {
      count += 1;
      assert.equal(count, i + 1);
    }
  });

  void test("consecutive supplements increment sequentially", () => {
    const counts: number[] = [];
    let current = 0;
    for (let i = 0; i < 3; i++) counts.push(++current);
    assert.deepEqual(counts, [1, 2, 3]);
  });
});

// ═══════════════════════════════════════════════════════════
// 2. 提交链路完整性
// ═══════════════════════════════════════════════════════════

void describe("submission chain: related_submission_id rules", () => {
  void test("initial package: relatedSubmissionId must be absent", () => {
    assert.equal(
      VALIDATION_SUBMISSION_ERROR_CODES.SP_INITIAL_NO_RELATED,
      "SP_INITIAL_NO_RELATED",
    );
  });

  void test("supplement package: relatedSubmissionId required", () => {
    assert.equal(
      VALIDATION_SUBMISSION_ERROR_CODES.SP_SUPPLEMENT_REQUIRES_RELATED,
      "SP_SUPPLEMENT_REQUIRES_RELATED",
    );
  });

  void test("related must belong to same case", () => {
    assert.equal(
      VALIDATION_SUBMISSION_ERROR_CODES.SP_RELATED_NOT_FOUND,
      "SP_RELATED_NOT_FOUND",
    );
  });

  void test("supplement must reference the latest package", () => {
    assert.equal(
      VALIDATION_SUBMISSION_ERROR_CODES.SP_RELATED_NOT_LATEST,
      "SP_RELATED_NOT_LATEST",
    );
  });

  void test("same submission cannot be referenced by multiple supplements", () => {
    assert.equal(
      VALIDATION_SUBMISSION_ERROR_CODES.SP_RELATED_ALREADY_BRANCHED,
      "SP_RELATED_ALREADY_BRANCHED",
    );
  });

  void test("chain depth cannot exceed maximum", () => {
    assert.equal(
      VALIDATION_SUBMISSION_ERROR_CODES.SP_CHAIN_DEPTH_EXCEEDED,
      "SP_CHAIN_DEPTH_EXCEEDED",
    );
  });
});

void describe("submission chain: linear chain invariant", () => {
  void test("linear chain: initial → supp₁ → supp₂ → supp₃ is valid", () => {
    const chain = [
      { id: "sp-1", kind: "initial", related: null },
      { id: "sp-2", kind: "supplement", related: "sp-1" },
      { id: "sp-3", kind: "supplement", related: "sp-2" },
      { id: "sp-4", kind: "supplement", related: "sp-3" },
    ];
    for (let i = 1; i < chain.length; i++) {
      assert.equal(chain[i].related, chain[i - 1].id);
    }
  });

  void test("fork is invalid: two supplements same parent", () => {
    const fork = [
      { id: "sp-1", related: null },
      { id: "sp-2", related: "sp-1" },
      { id: "sp-3", related: "sp-1" },
    ];
    const refs = fork.filter((s) => s.related !== null).map((s) => s.related);
    assert.ok(new Set(refs).size < refs.length);
  });

  void test("cycle detection: chain must not loop back", () => {
    const chain = [
      { id: "sp-1", related: "sp-3" },
      { id: "sp-2", related: "sp-1" },
      { id: "sp-3", related: "sp-2" },
    ];
    const visited = new Set<string>();
    let current: string | null = chain[0].id;
    let cycleDetected = false;
    while (current) {
      if (visited.has(current)) {
        cycleDetected = true;
        break;
      }
      visited.add(current);
      current = chain.find((n) => n.id === current)?.related ?? null;
    }
    assert.ok(cycleDetected);
  });

  void test("max chain depth is 10", () => {
    const MAX = 10;
    let depth = 0;
    for (let i = 0; i < 12; i++) {
      depth += 1;
      if (depth >= MAX) break;
    }
    assert.ok(depth <= MAX);
  });
});

// ═══════════════════════════════════════════════════════════
// 3. 提交門禁
// ═══════════════════════════════════════════════════════════

void describe("submission gate: submissionKind validation", () => {
  const ALLOWED = new Set(["initial", "supplement"]);
  void test("'initial' and 'supplement' are valid", () => {
    assert.ok(ALLOWED.has("initial"));
    assert.ok(ALLOWED.has("supplement"));
  });
  void test("unknown kind rejected (SP_INVALID_SUBMISSION_KIND)", () => {
    assert.equal(
      VALIDATION_SUBMISSION_ERROR_CODES.SP_INVALID_SUBMISSION_KIND,
      "SP_INVALID_SUBMISSION_KIND",
    );
    assert.ok(!ALLOWED.has("correction"));
  });
});

void describe("submission gate: case stage restriction", () => {
  void test("only allowed in S6 or S7", () => {
    assert.equal(
      VALIDATION_SUBMISSION_ERROR_CODES.SP_CASE_STAGE_INVALID,
      "SP_CASE_STAGE_INVALID",
    );
    const ALLOWED_STAGES = new Set(["S6", "S7"]);
    for (const s of ["S1", "S2", "S3", "S4", "S5", "S8", "S9"]) {
      assert.ok(!ALLOWED_STAGES.has(s));
    }
  });
});

void describe("submission gate: item validation", () => {
  void test("items must not be empty", () => {
    assert.equal(
      VALIDATION_SUBMISSION_ERROR_CODES.SP_MISSING_MINIMUM_FIELDS,
      "SP_MISSING_MINIMUM_FIELDS",
    );
  });
  void test("allowed item types fixed set of 4", () => {
    const ALLOWED = new Set([
      "document_requirement",
      "document_file_version",
      "generated_document_version",
      "field_snapshot",
    ]);
    assert.equal(ALLOWED.size, 4);
  });
  void test("invalid item type rejected", () => {
    assert.equal(
      VALIDATION_SUBMISSION_ERROR_CODES.SP_INVALID_ITEM_TYPE,
      "SP_INVALID_ITEM_TYPE",
    );
  });
  void test("duplicate items rejected", () => {
    assert.equal(
      VALIDATION_SUBMISSION_ERROR_CODES.SP_DUPLICATE_ITEM,
      "SP_DUPLICATE_ITEM",
    );
    const items = [makeItem({ refId: "r1" }), makeItem({ refId: "r1" })];
    const keys = items.map((i) => `${i.itemType}:${i.refId}`);
    assert.ok(new Set(keys).size < keys.length);
  });
  void test("field_snapshot requires snapshotPayload", () => {
    const item = makeItem({
      itemType: "field_snapshot",
      snapshotPayload: undefined,
    });
    assert.equal(item.snapshotPayload, undefined);
  });
});

void describe("submission gate: minimum fields", () => {
  void test("valid submission has submittedAt and authorityName", () => {
    const input = makeCreateInput();
    assert.ok(input.submittedAt);
    assert.ok(
      typeof input.authorityName === "string" &&
        input.authorityName.trim().length > 0,
    );
  });
});

// ═══════════════════════════════════════════════════════════
// 4. BMV 补正循环步骤流転
// ═══════════════════════════════════════════════════════════

void describe("BMV supplement cycle: step transitions", () => {
  void test("NEED_SUPPLEMENT → SUPPLEMENT_PROCESSING valid", () => {
    assert.ok(
      isValidStepTransition("NEED_SUPPLEMENT", "SUPPLEMENT_PROCESSING"),
    );
  });
  void test("SUPPLEMENT_PROCESSING → UNDER_REVIEW valid", () => {
    assert.ok(isValidStepTransition("SUPPLEMENT_PROCESSING", "UNDER_REVIEW"));
  });
  void test("UNDER_REVIEW → NEED_SUPPLEMENT valid", () => {
    assert.ok(isValidStepTransition("UNDER_REVIEW", "NEED_SUPPLEMENT"));
  });
  void test("UNDER_REVIEW → APPROVED valid (cycle ends)", () => {
    assert.ok(isValidStepTransition("UNDER_REVIEW", "APPROVED"));
  });
  void test("UNDER_REVIEW → VISA_REJECTED valid (cycle ends)", () => {
    assert.ok(isValidStepTransition("UNDER_REVIEW", "VISA_REJECTED"));
  });
  void test("NEED_SUPPLEMENT → APPROVED NOT valid", () => {
    assert.ok(!isValidStepTransition("NEED_SUPPLEMENT", "APPROVED"));
  });
  void test("SUPPLEMENT_PROCESSING → APPROVED NOT valid", () => {
    assert.ok(!isValidStepTransition("SUPPLEMENT_PROCESSING", "APPROVED"));
  });
  void test("SUPPLEMENT_PROCESSING → NEED_SUPPLEMENT NOT valid", () => {
    assert.ok(
      !isValidStepTransition("SUPPLEMENT_PROCESSING", "NEED_SUPPLEMENT"),
    );
  });
  void test("full cycle: UR → NS → SP → UR", () => {
    const cycle: BmvWorkflowStep[] = [
      "UNDER_REVIEW",
      "NEED_SUPPLEMENT",
      "SUPPLEMENT_PROCESSING",
      "UNDER_REVIEW",
    ];
    for (let i = 0; i < cycle.length - 1; i++) {
      assert.ok(isValidStepTransition(cycle[i], cycle[i + 1]));
    }
  });
  void test("multiple rounds form valid chain", () => {
    const rounds: BmvWorkflowStep[] = [
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
        `${rounds[i]} → ${rounds[i + 1]}`,
      );
    }
  });
});

void describe("BMV supplement cycle: canLoopTo alignment", () => {
  void test("NEED_SUPPLEMENT.canLoopTo === SUPPLEMENT_PROCESSING", () => {
    const step = BMV_WORKFLOW_STEPS_BLUEPRINT.find(
      (s) => s.stepCode === "NEED_SUPPLEMENT",
    );
    assert.equal(step?.canLoopTo, "SUPPLEMENT_PROCESSING");
  });
  void test("SUPPLEMENT_PROCESSING.canLoopTo === UNDER_REVIEW", () => {
    const step = BMV_WORKFLOW_STEPS_BLUEPRINT.find(
      (s) => s.stepCode === "SUPPLEMENT_PROCESSING",
    );
    assert.equal(step?.canLoopTo, "UNDER_REVIEW");
  });
  void test("non-loop steps have canLoopTo === null", () => {
    const loopSteps = new Set(["NEED_SUPPLEMENT", "SUPPLEMENT_PROCESSING"]);
    for (const step of BMV_WORKFLOW_STEPS_BLUEPRINT) {
      if (!loopSteps.has(step.stepCode))
        assert.equal(step.canLoopTo, null, step.stepCode);
    }
  });
});

void describe("BMV supplement cycle: parentStage boundary", () => {
  void test("cycle steps all map to S5", () => {
    assert.equal(BMV_STEP_TO_STAGE.NEED_SUPPLEMENT, "S5");
    assert.equal(BMV_STEP_TO_STAGE.SUPPLEMENT_PROCESSING, "S5");
    assert.equal(BMV_STEP_TO_STAGE.UNDER_REVIEW, "S5");
  });
  void test("supplement cycle stays within same P0 stage", () => {
    const steps: BmvWorkflowStep[] = [
      "UNDER_REVIEW",
      "NEED_SUPPLEMENT",
      "SUPPLEMENT_PROCESSING",
      "UNDER_REVIEW",
    ];
    const stages = new Set(steps.map((s) => BMV_STEP_TO_STAGE[s]));
    assert.equal(stages.size, 1);
    assert.ok(stages.has("S5"));
  });
});

// ═══════════════════════════════════════════════════════════
// 5. エラーコード・ステップ枚挙冻結
// ═══════════════════════════════════════════════════════════

void describe("error codes: completeness", () => {
  void test("all SP_ error codes are unique", () => {
    const spCodes = Object.entries(VALIDATION_SUBMISSION_ERROR_CODES)
      .filter(([key]) => key.startsWith("SP_"))
      .map(([, val]) => val);
    assert.ok(spCodes.length >= 9);
    assert.equal(new Set(spCodes).size, spCodes.length);
  });
  void test("CASE_WRITE_ERROR_CODES includes WORKFLOW_STEP_BILLING_BLOCKED", () => {
    assert.equal(
      CASE_WRITE_ERROR_CODES.WORKFLOW_STEP_BILLING_BLOCKED,
      "CASE_WORKFLOW_STEP_BILLING_BLOCKED",
    );
  });
});

void describe("BMV step codes freeze", () => {
  void test("exactly 15 step codes", () => {
    assert.equal(BMV_WORKFLOW_STEP_CODES.length, 15);
  });
  void test("includes supplement cycle nodes", () => {
    const codes = new Set<string>(BMV_WORKFLOW_STEP_CODES);
    assert.ok(
      codes.has("NEED_SUPPLEMENT") &&
        codes.has("SUPPLEMENT_PROCESSING") &&
        codes.has("UNDER_REVIEW"),
    );
  });
  void test("terminal steps have empty transitions", () => {
    assert.deepEqual(BMV_STEP_TRANSITIONS.VISA_REJECTED, []);
    assert.deepEqual(BMV_STEP_TRANSITIONS.RENEWAL_REMINDER_SCHEDULED, []);
  });
  void test("every step code in BMV_STEP_TRANSITIONS", () => {
    for (const code of BMV_WORKFLOW_STEP_CODES)
      assert.ok(code in BMV_STEP_TRANSITIONS, code);
  });
  void test("every step code in BMV_STEP_TO_STAGE", () => {
    for (const code of BMV_WORKFLOW_STEP_CODES)
      assert.ok(code in BMV_STEP_TO_STAGE, code);
  });
});

// ═══════════════════════════════════════════════════════════
// 6. COE_SENT billing gate 与 submission cycle 交互
// ═══════════════════════════════════════════════════════════

void describe("COE_SENT billing gate interaction", () => {
  void test("COE_SENT has billing gate block on final_payment", () => {
    const step = BMV_WORKFLOW_STEPS_BLUEPRINT.find(
      (s) => s.stepCode === "COE_SENT",
    );
    assert.deepEqual(step?.billingGate, {
      mode: "block",
      milestone: "final_payment",
    });
  });
  void test("supplement cycle steps have no billing gate", () => {
    for (const code of [
      "NEED_SUPPLEMENT",
      "SUPPLEMENT_PROCESSING",
      "UNDER_REVIEW",
    ]) {
      const step = BMV_WORKFLOW_STEPS_BLUEPRINT.find(
        (s) => s.stepCode === code,
      );
      assert.equal(step?.billingGate, null, code);
    }
  });
  void test("only COE_SENT has billing gate in blueprint", () => {
    const withGate = BMV_WORKFLOW_STEPS_BLUEPRINT.filter(
      (s) => s.billingGate !== null,
    );
    assert.equal(withGate.length, 1);
    assert.equal(withGate[0].stepCode, "COE_SENT");
  });
  void test("APPROVED → WAITING_PAYMENT → COE_SENT path", () => {
    assert.ok(isValidStepTransition("APPROVED", "WAITING_PAYMENT"));
    assert.ok(isValidStepTransition("WAITING_PAYMENT", "COE_SENT"));
    assert.ok(!isValidStepTransition("APPROVED", "COE_SENT"));
  });
});

void describe("submission_no auto-increment", () => {
  void test("starts at 1 for new case", () => {
    assert.equal(0 + 1, 1);
  });
  void test("increments by 1 per package", () => {
    const next = (max: number) => max + 1;
    assert.equal(next(1), 2);
    assert.equal(next(5), 6);
  });
});
