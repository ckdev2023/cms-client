// ── Test Ownership ──────────────────────────────────────────────
// Owner: p1-qa-002-02 — P1 downstream validation core meta-test.
//
// Purpose: validate the core contract layer of P1 downstream impact:
//   BMV workflow step blueprint, field-set stability, workflow summary,
//   survey/quote/pre-sign gate, and COE/final payment gate.
//
// Run: npx vitest run src/views/cases/p1-downstream-validation-set.test.ts
//
// Trigger: any change to P1 adapter outputs, BMV step blueprint,
//   contract field sets, workflow summary, COE gate, or
//   survey/quote/pre-sign gate logic.
//
// This file does NOT duplicate individual adapter test coverage.
// Panel/info and lifecycle smoke coverage live in sibling tests.
// See P1-DOWNSTREAM-VALIDATION-SET.md for the full inventory.
// ────────────────────────────────────────────────────────────────

import { describe, expect, it } from "vitest";

import {
  BMV_WORKFLOW_STEPS,
  BMV_WORKFLOW_STEP_MAP,
  getBmvStageGroups,
} from "./constantsBmvSteps";
import {
  BMV_CASE_RECORD_CONSUMED_FIELDS,
  BMV_DETAIL_TARGET_KEYS,
  FAILURE_CLOSEOUT_CONSUMED_FIELDS,
  FAILURE_CLOSEOUT_ATTRIBUTION_CONSUMED_FIELDS,
  RESIDENCE_PERIOD_CONSUMED_FIELDS,
  SUCCESS_CLOSEOUT_CONSUMED_FIELDS,
  SUCCESS_CLOSEOUT_PRECONDITION_CONSUMED_FIELDS,
  AGGREGATE_SLICE_KEYS,
} from "./model/CaseAdapterDetailContracts";
import { adaptCaseDetailAggregate } from "./model/CaseAdapterDetailAggregate";
import { buildFinalPaymentGate } from "./model/CaseAdapterFinalPaymentGate";

// ─── Canonical DTO Factories ─────────────────────────────────────

function canonicalBmvCaseRecord(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    id: "case-p1-dv-001",
    stage: "S5",
    customerId: "cust-p1-001",
    caseName: "経営管理ビザ検証案件",
    caseNo: "P1-DV-001",
    caseTypeCode: "business-management",
    ownerUserId: "user-p1",
    groupId: "group-1",
    dueAt: "2026-08-01",
    currentWorkflowStepCode: "UNDER_REVIEW",
    visaPlan: "business-manager-1year",
    supplementCount: 0,
    resultOutcome: null,
    postApprovalStage: null,
    coeIssuedAt: null,
    coeExpiryDate: null,
    coeSentAt: null,
    overseasVisaStartAt: null,
    entryConfirmedAt: null,
    ...overrides,
  };
}

function canonicalBmvAggregateDto(
  caseOverrides: Record<string, unknown> = {},
  sliceOverrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    case: canonicalBmvCaseRecord(caseOverrides),
    deepLink: {
      customerId: "cust-p1-001",
      customerName: "P1検証太郎",
      groupId: "group-1",
      groupName: "Tokyo-A",
      ownerUserId: "user-p1",
      ownerDisplayName: "Suzuki",
      assistantUserId: null,
      assistantDisplayName: null,
    },
    counts: {
      documentItemsTotal: 10,
      documentItemsDone: 5,
      questionnaireItemsTotal: 3,
      questionnaireItemsDone: 2,
      caseParties: 2,
      tasks: 4,
      tasksPending: 2,
      communicationLogs: 5,
      submissionPackages: 0,
      generatedDocuments: 0,
      validationRuns: 1,
      reviewRecords: 0,
      billingRecords: 1,
      paymentRecords: 1,
    },
    billing: {
      quotePrice: 500000,
      unpaidAmount: 200000,
      depositPaid: true,
      finalPaymentPaid: false,
      finalPaymentMilestoneMatched: true,
      billingRiskAcknowledged: false,
      billingRiskAcknowledgedAt: null,
      billingRiskAckReasonCode: null,
      totalReceived: 300000,
    },
    latestValidation: {
      status: "passed",
      executedAt: "2026-04-20T00:00:00.000Z",
      blockingCount: 0,
      warningCount: 1,
    },
    latestSubmission: null,
    latestReview: null,
    documentProgressByProvider: [],
    failureCloseoutCheck: null,
    currentResidencePeriod: null,
    successCloseoutCheck: null,
    ...sliceOverrides,
  };
}

// ═══════════════════════════════════════════════════════════════════
//  §1 — BMV Workflow Step Blueprint Stability
// ═══════════════════════════════════════════════════════════════════

describe("§1 BMV workflow step blueprint stability (p1-qa-002-02)", () => {
  it("BMV_WORKFLOW_STEPS has exactly 15 entries", () => {
    expect(BMV_WORKFLOW_STEPS).toHaveLength(15);
  });

  it("BMV_WORKFLOW_STEP_MAP has the same count", () => {
    expect(BMV_WORKFLOW_STEP_MAP.size).toBe(15);
  });

  it("step codes frozen set matches blueprint array", () => {
    const codesFromArray = BMV_WORKFLOW_STEPS.map((s) => s.code);
    const codesFromMap = [...BMV_WORKFLOW_STEP_MAP.keys()];
    expect(codesFromArray.sort()).toEqual(codesFromMap.sort());
  });

  it("stage groups cover 8 stages (S2-S9, no S1)", () => {
    const groups = getBmvStageGroups();
    expect(groups).toHaveLength(8);
    expect(groups.map((g) => g.stage)).toEqual([
      "S2",
      "S3",
      "S4",
      "S5",
      "S6",
      "S7",
      "S8",
      "S9",
    ]);
  });

  it("every step has non-empty label and i18nKey", () => {
    for (const step of BMV_WORKFLOW_STEPS) {
      expect(step.label.length, `${step.code} label`).toBeGreaterThan(0);
      expect(step.i18nKey.length, `${step.code} i18nKey`).toBeGreaterThan(0);
    }
  });

  it("only VISA_REJECTED is a failure step", () => {
    const failures = BMV_WORKFLOW_STEPS.filter((s) => s.isFailureStep);
    expect(failures).toHaveLength(1);
    expect(failures[0].code).toBe("VISA_REJECTED");
  });

  it("sortOrder is strictly ascending from 1 to 15", () => {
    const orders = BMV_WORKFLOW_STEPS.map((s) => s.sortOrder);
    expect(orders[0]).toBe(1);
    expect(orders[orders.length - 1]).toBe(15);
    for (let i = 1; i < orders.length; i++) {
      expect(orders[i]).toBeGreaterThan(orders[i - 1]);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════
//  §2 — BMV Detail Contract Field Sets
// ═══════════════════════════════════════════════════════════════════

describe("§2 BMV detail contract field sets (p1-qa-002-02)", () => {
  it("BMV_CASE_RECORD_CONSUMED_FIELDS count is stable at 11", () => {
    expect(BMV_CASE_RECORD_CONSUMED_FIELDS).toHaveLength(11);
  });

  it("BMV_DETAIL_TARGET_KEYS count is stable at 13", () => {
    expect(BMV_DETAIL_TARGET_KEYS).toHaveLength(13);
  });

  it("AGGREGATE_SLICE_KEYS includes P1 slices", () => {
    expect(AGGREGATE_SLICE_KEYS).toContain("failureCloseoutCheck");
    expect(AGGREGATE_SLICE_KEYS).toContain("currentResidencePeriod");
    expect(AGGREGATE_SLICE_KEYS).toContain("successCloseoutCheck");
  });

  it("FAILURE_CLOSEOUT_CONSUMED_FIELDS count is stable at 2", () => {
    expect(FAILURE_CLOSEOUT_CONSUMED_FIELDS).toHaveLength(2);
  });

  it("FAILURE_CLOSEOUT_ATTRIBUTION_CONSUMED_FIELDS count is stable at 4", () => {
    expect(FAILURE_CLOSEOUT_ATTRIBUTION_CONSUMED_FIELDS).toHaveLength(4);
  });

  it("RESIDENCE_PERIOD_CONSUMED_FIELDS count is stable at 10", () => {
    expect(RESIDENCE_PERIOD_CONSUMED_FIELDS).toHaveLength(10);
  });

  it("SUCCESS_CLOSEOUT_CONSUMED_FIELDS count is stable at 2", () => {
    expect(SUCCESS_CLOSEOUT_CONSUMED_FIELDS).toHaveLength(2);
  });

  it("SUCCESS_CLOSEOUT_PRECONDITION_CONSUMED_FIELDS count is stable at 3", () => {
    expect(SUCCESS_CLOSEOUT_PRECONDITION_CONSUMED_FIELDS).toHaveLength(3);
  });
});

// ═══════════════════════════════════════════════════════════════════
//  §3 — Aggregate Adapter: BMV Workflow Step Summary
// ═══════════════════════════════════════════════════════════════════

describe("§3 aggregate adapter — workflow step summary (p1-qa-002-02)", () => {
  it("BMV case produces non-null workflowStep", () => {
    const result = adaptCaseDetailAggregate(canonicalBmvAggregateDto());
    expect(result).not.toBeNull();
    expect(result!.detail.workflowStep).not.toBeNull();
    expect(result!.detail.workflowStep!.stepCode).toBe("UNDER_REVIEW");
    expect(result!.detail.workflowStep!.parentStage).toBe("S5");
    expect(result!.detail.workflowStep!.isFailureStep).toBe(false);
  });

  it("non-BMV case produces null workflowStep", () => {
    const result = adaptCaseDetailAggregate(
      canonicalBmvAggregateDto({
        currentWorkflowStepCode: null,
        visaPlan: null,
      }),
    );
    expect(result).not.toBeNull();
    expect(result!.detail.workflowStep).toBeNull();
  });

  it("VISA_REJECTED step has isFailureStep=true", () => {
    const result = adaptCaseDetailAggregate(
      canonicalBmvAggregateDto({
        currentWorkflowStepCode: "VISA_REJECTED",
        stage: "S9",
      }),
    );
    expect(result!.detail.workflowStep).not.toBeNull();
    expect(result!.detail.workflowStep!.isFailureStep).toBe(true);
    expect(result!.detail.workflowStep!.stepCode).toBe("VISA_REJECTED");
  });

  it("visaPlan is preserved on detail", () => {
    const result = adaptCaseDetailAggregate(canonicalBmvAggregateDto());
    expect(result!.detail.visaPlan).toBe("business-manager-1year");
  });

  it("supplementCount is preserved on detail", () => {
    const result = adaptCaseDetailAggregate(
      canonicalBmvAggregateDto({ supplementCount: 2 }),
    );
    expect(result!.detail.supplementCount).toBe(2);
  });
});

// ═══════════════════════════════════════════════════════════════════
//  §4 — Aggregate Adapter: Survey / Quote / Pre-Sign Gate
// ═══════════════════════════════════════════════════════════════════

describe("§4 aggregate adapter — survey / quote / pre-sign gate (p1-qa-002-02)", () => {
  it("BMV case with questionnaire produces surveyStatus", () => {
    const result = adaptCaseDetailAggregate(canonicalBmvAggregateDto());
    expect(result!.detail.surveyStatus).not.toBeNull();
    expect(result!.detail.surveyStatus!.statusKey).toBe("in_progress");
    expect(result!.detail.surveyStatus!.progressLabel).toBe("2/3");
  });

  it("BMV case with quotePrice produces completed quoteStatus", () => {
    const result = adaptCaseDetailAggregate(canonicalBmvAggregateDto());
    expect(result!.detail.quoteStatus).not.toBeNull();
    expect(result!.detail.quoteStatus!.statusKey).toBe("completed");
  });

  it("BMV case past S1 does not surface pre-sign gate on detail", () => {
    const result = adaptCaseDetailAggregate(canonicalBmvAggregateDto());
    expect(result!.detail.preSignGate).toBeNull();
  });

  it("BMV case with incomplete survey has blocked pre-sign gate", () => {
    const result = adaptCaseDetailAggregate(
      canonicalBmvAggregateDto({ stage: "S1" }),
    );
    expect(result!.detail.preSignGate).not.toBeNull();
    expect(result!.detail.preSignGate!.passed).toBe(false);
    expect(result!.detail.preSignGate!.blockers.length).toBeGreaterThan(0);
    expect(result!.detail.preSignGate!.blockers[0].code).toBe(
      "survey_incomplete",
    );
  });

  it("BMV case with all completed has passed pre-sign gate", () => {
    const result = adaptCaseDetailAggregate(
      canonicalBmvAggregateDto(
        { stage: "S1" },
        {
          counts: {
            documentItemsTotal: 10,
            documentItemsDone: 5,
            questionnaireItemsTotal: 3,
            questionnaireItemsDone: 3,
            caseParties: 2,
            tasks: 4,
            tasksPending: 2,
            communicationLogs: 5,
            submissionPackages: 0,
            generatedDocuments: 0,
            validationRuns: 1,
            reviewRecords: 0,
            billingRecords: 1,
            paymentRecords: 1,
          },
        },
      ),
    );
    expect(result!.detail.preSignGate).not.toBeNull();
    expect(result!.detail.preSignGate!.passed).toBe(true);
    expect(result!.detail.preSignGate!.blockers).toHaveLength(0);
  });

  it("non-BMV case produces null for all survey/quote/gate fields", () => {
    const result = adaptCaseDetailAggregate(
      canonicalBmvAggregateDto({
        currentWorkflowStepCode: null,
        visaPlan: null,
      }),
    );
    expect(result!.detail.surveyStatus).toBeNull();
    expect(result!.detail.quoteStatus).toBeNull();
    expect(result!.detail.preSignGate).toBeNull();
  });

  it("quotePriceRaw and quotePriceLabel are derived from billing", () => {
    const result = adaptCaseDetailAggregate(canonicalBmvAggregateDto());
    expect(result!.detail.quotePriceRaw).toBe(500000);
    expect(result!.detail.quotePriceLabel).toBe("¥500,000");
  });
});

// ═══════════════════════════════════════════════════════════════════
//  §5 — Final Payment / COE Gate
// ═══════════════════════════════════════════════════════════════════

describe("§5 final payment / COE gate (p1-qa-002-02)", () => {
  it("non-BMV returns null", () => {
    expect(
      buildFinalPaymentGate("APPROVED", false, {
        finalPaymentPaid: false,
        finalPaymentMilestoneMatched: true,
        unpaidAmount: 100000,
        billingRiskAck: false,
      }),
    ).toBeNull();
  });

  it("non-relevant step returns null", () => {
    expect(
      buildFinalPaymentGate("UNDER_REVIEW", true, {
        finalPaymentPaid: false,
        finalPaymentMilestoneMatched: true,
        unpaidAmount: 100000,
        billingRiskAck: false,
      }),
    ).toBeNull();
  });

  it("APPROVED step with unpaid final returns blockers", () => {
    const gate = buildFinalPaymentGate("APPROVED", true, {
      finalPaymentPaid: false,
      finalPaymentMilestoneMatched: true,
      unpaidAmount: 100000,
      billingRiskAck: false,
    });
    expect(gate).not.toBeNull();
    expect(gate!.paymentCleared).toBe(false);
    expect(gate!.canAdvanceToCoe).toBe(false);
    expect(gate!.blockers).toHaveLength(2);
    expect(gate!.blockers.map((b) => b.code).sort()).toEqual([
      "billing_risk_unacknowledged",
      "final_payment_outstanding",
    ]);
  });

  it("WAITING_PAYMENT step with paid final returns no blockers", () => {
    const gate = buildFinalPaymentGate("WAITING_PAYMENT", true, {
      finalPaymentPaid: true,
      finalPaymentMilestoneMatched: true,
      unpaidAmount: 0,
      billingRiskAck: false,
    });
    expect(gate).not.toBeNull();
    expect(gate!.paymentCleared).toBe(true);
    expect(gate!.canAdvanceToCoe).toBe(true);
    expect(gate!.blockers).toHaveLength(0);
  });

  it("outstandingLabel is formatted when unpaid > 0", () => {
    const gate = buildFinalPaymentGate("APPROVED", true, {
      finalPaymentPaid: false,
      finalPaymentMilestoneMatched: true,
      unpaidAmount: 50000,
      billingRiskAck: true,
    });
    expect(gate!.outstandingLabel).toBe("¥50,000");
  });

  it("outstandingLabel is empty when fully paid", () => {
    const gate = buildFinalPaymentGate("APPROVED", true, {
      finalPaymentPaid: true,
      finalPaymentMilestoneMatched: true,
      unpaidAmount: 0,
      billingRiskAck: false,
    });
    expect(gate!.outstandingLabel).toBe("");
  });

  it("aggregate adapter wires final payment gate for APPROVED step", () => {
    const result = adaptCaseDetailAggregate(
      canonicalBmvAggregateDto({
        currentWorkflowStepCode: "APPROVED",
        stage: "S6",
      }),
    );
    expect(result!.detail.finalPaymentGate).not.toBeNull();
    expect(result!.detail.finalPaymentGate!.canAdvanceToCoe).toBe(false);
  });

  it("aggregate adapter returns null gate for non-COE step", () => {
    const result = adaptCaseDetailAggregate(canonicalBmvAggregateDto());
    expect(result!.detail.finalPaymentGate).toBeNull();
  });
});
