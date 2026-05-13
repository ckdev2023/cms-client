import { test, describe } from "node:test";
import assert from "node:assert/strict";

import type { Case } from "../model/coreEntities";
import {
  isBmvWorkflowStep,
  isValidStepTransition,
  checkParallelBoundary,
  BMV_STEP_TRANSITIONS,
  BMV_STEP_TO_STAGE,
  BMV_WORKFLOW_STEP_ENUM,
  blueprintToWorkflowSteps,
} from "./cases.workflow-step";
import { BMV_WORKFLOW_STEPS_BLUEPRINT } from "./cases.template-bmv";
import { resolveWorkflowStepSummary } from "./cases.workflow-step-readmodel";

function buildMockCase(overrides: Partial<Case> = {}): Case {
  return {
    id: "case-001",
    orgId: "org-001",
    customerId: "cust-001",
    caseTypeCode: "business_manager_visa",
    status: "S3",
    stage: "S3",
    groupId: null,
    ownerUserId: "user-001",
    openedAt: "2025-01-01T00:00:00Z",
    dueAt: null,
    metadata: {},
    caseNo: null,
    caseName: null,
    caseSubtype: null,
    applicationType: null,
    applicationFlowType: "standard",
    visaPlan: null,
    postApprovalStage: null,
    coeIssuedAt: null,
    coeExpiryDate: null,
    coeSentAt: null,
    closeReason: null,
    supplementCount: 0,
    companyId: null,
    priority: "normal",
    riskLevel: "low",
    assistantUserId: null,
    sourceChannel: null,
    signedAt: null,
    acceptedAt: null,
    submissionDate: null,
    resultDate: null,
    residenceExpiryDate: null,
    archivedAt: null,
    resultOutcome: null,
    quotePrice: null,
    depositPaidCached: false,
    finalPaymentPaidCached: false,
    billingUnpaidAmountCached: 0,
    billingRiskAcknowledgedBy: null,
    billingRiskAcknowledgedAt: null,
    billingRiskAckReasonCode: null,
    billingRiskAckReasonNote: null,
    billingRiskAckEvidenceUrl: null,
    overseasVisaStartAt: null,
    entryConfirmedAt: null,
    jurisdictionAuthority: null,
    businessPhase: "CONSULTING",
    currentWorkflowStepCode: null,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
    ...overrides,
  };
}

// ── resolveWorkflowStepSummary ──

void describe("resolveWorkflowStepSummary", () => {
  void test("returns null for P0 case (no workflow step)", () => {
    const c = buildMockCase({ currentWorkflowStepCode: null });
    assert.equal(resolveWorkflowStepSummary(c), null);
  });

  void test("returns null for unknown step code", () => {
    const c = buildMockCase({ currentWorkflowStepCode: "NONEXISTENT" });
    assert.equal(resolveWorkflowStepSummary(c), null);
  });

  void test("resolves WAITING_MATERIAL correctly", () => {
    const c = buildMockCase({
      currentWorkflowStepCode: "WAITING_MATERIAL",
      stage: "S2",
    });
    const result = resolveWorkflowStepSummary(c);
    assert.ok(result);
    assert.equal(result.currentStepCode, "WAITING_MATERIAL");
    assert.equal(result.parentStage, "S2");
    assert.equal(result.isTerminal, false);
    assert.deepEqual(result.allowedNextSteps, ["MATERIAL_PREPARING"]);
    assert.equal(result.billingGate, null);
  });

  void test("resolves UNDER_REVIEW with multiple next steps", () => {
    const c = buildMockCase({
      currentWorkflowStepCode: "UNDER_REVIEW",
      stage: "S5",
    });
    const result = resolveWorkflowStepSummary(c);
    assert.ok(result);
    assert.equal(result.currentStepCode, "UNDER_REVIEW");
    assert.equal(result.parentStage, "S5");
    assert.deepEqual(result.allowedNextSteps, [
      "NEED_SUPPLEMENT",
      "APPROVED",
      "VISA_REJECTED",
    ]);
  });

  void test("resolves COE_SENT with billing gate block", () => {
    const c = buildMockCase({
      currentWorkflowStepCode: "COE_SENT",
      stage: "S7",
    });
    const result = resolveWorkflowStepSummary(c);
    assert.ok(result);
    assert.equal(result.currentStepCode, "COE_SENT");
    assert.ok(result.billingGate);
    assert.equal(result.billingGate.mode, "block");
    assert.equal(result.billingGate.milestone, "final_payment");
  });

  void test("resolves terminal step VISA_REJECTED", () => {
    const c = buildMockCase({
      currentWorkflowStepCode: "VISA_REJECTED",
      stage: "S9",
    });
    const result = resolveWorkflowStepSummary(c);
    assert.ok(result);
    assert.equal(result.isTerminal, true);
    assert.deepEqual(result.allowedNextSteps, []);
  });

  void test("resolves terminal step RENEWAL_REMINDER_SCHEDULED", () => {
    const c = buildMockCase({
      currentWorkflowStepCode: "RENEWAL_REMINDER_SCHEDULED",
      stage: "S8",
    });
    const result = resolveWorkflowStepSummary(c);
    assert.ok(result);
    assert.equal(result.isTerminal, true);
    assert.deepEqual(result.allowedNextSteps, []);
  });

  void test("includes label from blueprint", () => {
    const c = buildMockCase({
      currentWorkflowStepCode: "APPROVED",
      stage: "S6",
    });
    const result = resolveWorkflowStepSummary(c);
    assert.ok(result);
    assert.equal(result.currentStepLabel, "許可");
  });

  void test("all BMV steps produce valid summaries", () => {
    for (const stepCode of BMV_WORKFLOW_STEP_ENUM) {
      const parentStage = BMV_STEP_TO_STAGE[stepCode];
      const c = buildMockCase({
        currentWorkflowStepCode: stepCode,
        stage: parentStage,
      });
      const result = resolveWorkflowStepSummary(c);
      assert.ok(result, `Expected summary for ${stepCode}`);
      assert.equal(result.currentStepCode, stepCode);
      assert.equal(result.parentStage, parentStage);
    }
  });
});

// ── Step transition matrix completeness ──

void describe("BMV step transition matrix", () => {
  void test("every step in enum has a transition entry", () => {
    for (const step of BMV_WORKFLOW_STEP_ENUM) {
      assert.ok(
        step in BMV_STEP_TRANSITIONS,
        `Missing transition entry for ${step}`,
      );
    }
  });

  void test("all target steps in transition matrix are valid BMV steps", () => {
    for (const [from, targets] of Object.entries(BMV_STEP_TRANSITIONS)) {
      for (const to of targets) {
        assert.ok(
          isBmvWorkflowStep(to),
          `Invalid target ${to} in transition from ${from}`,
        );
      }
    }
  });

  void test("terminal steps have empty allowed transitions", () => {
    assert.deepEqual([...BMV_STEP_TRANSITIONS.VISA_REJECTED], []);
    assert.deepEqual([...BMV_STEP_TRANSITIONS.RENEWAL_REMINDER_SCHEDULED], []);
  });

  void test("supplement loop: NEED_SUPPLEMENT → SUPPLEMENT_PROCESSING → UNDER_REVIEW", () => {
    assert.ok(
      isValidStepTransition("NEED_SUPPLEMENT", "SUPPLEMENT_PROCESSING"),
    );
    assert.ok(isValidStepTransition("SUPPLEMENT_PROCESSING", "UNDER_REVIEW"));
    assert.ok(isValidStepTransition("UNDER_REVIEW", "NEED_SUPPLEMENT"));
  });

  void test("rejects invalid transitions", () => {
    assert.ok(!isValidStepTransition("WAITING_MATERIAL", "REVIEWING"));
    assert.ok(!isValidStepTransition("APPROVED", "REVIEWING"));
    assert.ok(!isValidStepTransition("VISA_REJECTED", "APPROVED"));
  });
});

// ── Parallel boundary checks ──

void describe("checkParallelBoundary", () => {
  void test("compatible when step parentStage equals currentStage", () => {
    const result = checkParallelBoundary("WAITING_MATERIAL", "S2");
    assert.ok(result.compatible);
  });

  void test("compatible when currentStage is ahead of parentStage", () => {
    const result = checkParallelBoundary("WAITING_MATERIAL", "S5");
    assert.ok(result.compatible);
  });

  void test("incompatible when parentStage is ahead of currentStage", () => {
    const result = checkParallelBoundary("APPROVED", "S2");
    assert.ok(!result.compatible);
    assert.ok(result.reason?.includes("requires stage"));
  });

  void test("incompatible for invalid P0 stage", () => {
    const result = checkParallelBoundary("WAITING_MATERIAL", "INVALID");
    assert.ok(!result.compatible);
    assert.ok(result.reason?.includes("Invalid P0 stage"));
  });
});

// ── Blueprint → WorkflowStep conversion ──

void describe("blueprintToWorkflowSteps", () => {
  void test("converts BMV blueprint without filtering", () => {
    const steps = blueprintToWorkflowSteps(BMV_WORKFLOW_STEPS_BLUEPRINT);
    assert.equal(steps.length, BMV_WORKFLOW_STEPS_BLUEPRINT.length);
  });

  void test("filters items with null parentStage", () => {
    const input = [
      {
        stepCode: "TEST",
        label: "Test",
        parentStage: null,
        sortOrder: 1,
        canLoopTo: null,
        billingGate: null,
      },
    ];
    const steps = blueprintToWorkflowSteps(input);
    assert.equal(steps.length, 0);
  });

  void test("filters items with invalid parentStage", () => {
    const input = [
      {
        stepCode: "TEST",
        label: "Test",
        parentStage: "INVALID",
        sortOrder: 1,
        canLoopTo: null,
        billingGate: null,
      },
    ];
    const steps = blueprintToWorkflowSteps(input);
    assert.equal(steps.length, 0);
  });
});

// ── Invariant: workflow step NEVER writes to Case.stage ──

void describe("workflow step does not touch Case.stage", () => {
  void test("resolveWorkflowStepSummary is pure — does not mutate case entity", () => {
    const c = buildMockCase({
      currentWorkflowStepCode: "APPROVED",
      stage: "S6",
    });
    const stageBefore = c.stage;
    resolveWorkflowStepSummary(c);
    assert.equal(c.stage, stageBefore);
  });

  void test("WorkflowStepSummary reports parentStage as read-only reference, not as Case.stage", () => {
    const c = buildMockCase({
      currentWorkflowStepCode: "UNDER_REVIEW",
      stage: "S5",
    });
    const result = resolveWorkflowStepSummary(c);
    assert.ok(result);
    assert.equal(result.parentStage, "S5");
    assert.equal(c.stage, "S5");
  });
});
