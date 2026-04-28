// ── Test Ownership ──────────────────────────────────────────────
// Owner: p1-qa-001-01 — P1 admin focused tests batch 1 (button guard)
//   Covers: per-step action availability (button guard matrix) across
//   the full P1-B lifecycle, including payment gate transitions,
//   supplement/reminder states, failure/success closeout, and
//   non-BMV regression.
// Does NOT test: isolated adapter functions (→ p1-qa-step-mapping-adapter),
//   write actions / error mapping (→ p1-qa-write-actions-error-mapping),
//   step constants (→ constantsBmvSteps.focused.test),
//   or Vue component rendering.
// ────────────────────────────────────────────────────────────────

import { describe, expect, it } from "vitest";
import { adaptCaseDetailAggregate } from "./CaseAdapterDetailAggregate";

// ─── Aggregate fixtures ──────────────────────────────────────────

function bmvCaseRow(
  stepCode: string,
  stage = "S7",
  extra: Record<string, unknown> = {},
) {
  return {
    id: "case-qa01",
    orgId: "org-1",
    customerId: "cust-qa01",
    caseTypeCode: "business_manager_visa",
    stage,
    groupId: "group-qa01",
    ownerUserId: "user-qa01",
    dueAt: "2026-10-01",
    caseName: "QAテスト案件",
    currentWorkflowStepCode: stepCode,
    visaPlan: "new_establishment",
    supplementCount: 0,
    resultOutcome: null,
    postApprovalStage: null,
    ...extra,
  };
}

function buildAggregate(
  stepCode: string,
  stage = "S7",
  billingOverrides: Record<string, unknown> = {},
  extraOverrides: Record<string, unknown> = {},
) {
  return {
    case: bmvCaseRow(stepCode, stage),
    deepLink: {
      customerId: "cust-qa01",
      customerName: "QAテスト",
      groupId: "group-qa01",
      groupName: "Tokyo-QA",
      ownerUserId: "user-qa01",
      ownerDisplayName: "担当者QA",
      assistantUserId: null,
      assistantDisplayName: null,
    },
    counts: {
      documentItemsTotal: 10,
      documentItemsDone: 10,
      questionnaireItemsTotal: 3,
      questionnaireItemsDone: 3,
      caseParties: 2,
      tasks: 3,
      tasksPending: 0,
      communicationLogs: 5,
      submissionPackages: 1,
      generatedDocuments: 2,
      validationRuns: 1,
      reviewRecords: 1,
      billingRecords: 2,
      paymentRecords: 1,
    },
    billing: {
      quotePrice: 500000,
      unpaidAmount: 0,
      totalReceived: 500000,
      depositPaid: true,
      finalPaymentPaid: true,
      billingRiskAcknowledged: false,
      billingRiskAcknowledgedAt: null,
      billingRiskAckReasonCode: null,
      ...billingOverrides,
    },
    latestValidation: null,
    latestSubmission: null,
    latestReview: null,
    documentProgressByProvider: [],
    failureCloseoutCheck: null,
    ...extraOverrides,
  };
}

// ═══════════════════════════════════════════════════════════════════
//  BUTTON GUARD MATRIX — per-step action availability
// ═══════════════════════════════════════════════════════════════════

describe("P1-B per-step button guard matrix (p1-qa-001-01)", () => {
  const unpaid = {
    unpaidAmount: 200000,
    finalPaymentPaid: false,
    billingRiskAcknowledged: false,
  };
  const paid = { unpaidAmount: 0, finalPaymentPaid: true };

  it("APPROVED: finalPaymentGate active + blocked, no supplement/reminder", () => {
    const r = adaptCaseDetailAggregate(
      buildAggregate("APPROVED", "S6", unpaid),
    )!;
    expect(r.detail.finalPaymentGate).not.toBeNull();
    expect(r.detail.finalPaymentGate!.canAdvanceToCoe).toBe(false);
    expect(r.detail.supplementRound).toBeNull();
    expect(r.detail.reminderFailure).toBeNull();
    expect(r.detail.successCloseout).toBeNull();
  });

  it("WAITING_PAYMENT + unpaid: gate blocked", () => {
    const r = adaptCaseDetailAggregate(
      buildAggregate("WAITING_PAYMENT", "S7", unpaid),
    )!;
    expect(r.detail.finalPaymentGate!.canAdvanceToCoe).toBe(false);
    expect(r.detail.finalPaymentGate!.blockers.length).toBeGreaterThan(0);
  });

  it("WAITING_PAYMENT + paid: gate passes", () => {
    const r = adaptCaseDetailAggregate(
      buildAggregate("WAITING_PAYMENT", "S7", paid),
    )!;
    expect(r.detail.finalPaymentGate!.canAdvanceToCoe).toBe(true);
    expect(r.detail.finalPaymentGate!.blockers).toHaveLength(0);
  });

  it("COE_SENT: past payment gate", () => {
    const r = adaptCaseDetailAggregate(buildAggregate("COE_SENT", "S7", paid))!;
    expect(r.detail.finalPaymentGate).toBeNull();
    expect(r.detail.workflowStep!.stepCode).toBe("COE_SENT");
  });

  it("VISA_APPLYING: past all gates", () => {
    const r = adaptCaseDetailAggregate(
      buildAggregate("VISA_APPLYING", "S7", paid),
    )!;
    expect(r.detail.finalPaymentGate).toBeNull();
    expect(r.detail.workflowStep!.parentStage).toBe("S7");
  });

  it("ENTRY_SUCCESS: S8, no gate", () => {
    const r = adaptCaseDetailAggregate(
      buildAggregate("ENTRY_SUCCESS", "S8", paid),
    )!;
    expect(r.detail.finalPaymentGate).toBeNull();
    expect(r.detail.workflowStep!.stepCode).toBe("ENTRY_SUCCESS");
    expect(r.detail.readonly).toBe(false);
  });

  it("VISA_REJECTED: S9 readonly + failure path", () => {
    const r = adaptCaseDetailAggregate(
      buildAggregate("VISA_REJECTED", "S9", paid, {
        case: bmvCaseRow("VISA_REJECTED", "S9"),
        failureCloseoutCheck: {
          isFailurePath: true,
          attribution: {
            reasonCode: "VISA_REJECTED",
            reasonLabel: "签証拒否",
            canDirectClose: true,
            closeReasonRequired: false,
          },
        },
      }),
    )!;
    expect(r.detail.readonly).toBe(true);
    expect(r.detail.workflowStep!.isFailureStep).toBe(true);
    expect(r.detail.failureCloseout!.isFailurePath).toBe(true);
    expect(r.detail.failureCloseout!.canDirectClose).toBe(true);
  });

  it("NEED_SUPPLEMENT: supplementRound active, canResubmit=true", () => {
    const r = adaptCaseDetailAggregate(
      buildAggregate("NEED_SUPPLEMENT", "S5", paid, {
        case: bmvCaseRow("NEED_SUPPLEMENT", "S5", {
          supplementCount: 2,
          lastSupplementNoticeDate: "2026-04-20",
          lastSupplementReason: "追加書類",
        }),
      }),
    )!;
    expect(r.detail.supplementRound!.round).toBe(2);
    expect(r.detail.supplementRound!.canResubmit).toBe(true);
  });

  it("SUPPLEMENT_PROCESSING: supplementRound active, canResubmit=false", () => {
    const r = adaptCaseDetailAggregate(
      buildAggregate("SUPPLEMENT_PROCESSING", "S5", paid, {
        case: bmvCaseRow("SUPPLEMENT_PROCESSING", "S5", {
          supplementCount: 1,
          lastSupplementNoticeDate: "2026-04-18",
          lastSupplementReason: "不足",
        }),
      }),
    )!;
    expect(r.detail.supplementRound!.canResubmit).toBe(false);
    expect(r.detail.supplementRound!.statusKey).toBe("processing");
  });

  it("ENTRY_SUCCESS + reminder failure: reminderFailure populated", () => {
    const r = adaptCaseDetailAggregate(
      buildAggregate("ENTRY_SUCCESS", "S8", paid, {
        case: bmvCaseRow("ENTRY_SUCCESS", "S8"),
        currentResidencePeriod: {
          id: "rp-001",
          validUntil: "2031-01-15",
          validFrom: "2026-01-15",
          reminderCreated: false,
          reminderError: "SMTP failed",
          reminderAttemptCount: 2,
        },
      }),
    )!;
    expect(r.detail.reminderFailure!.reason).toBe("SMTP failed");
    expect(r.detail.reminderFailure!.canRetry).toBe(true);
  });

  it("ENTRY_SUCCESS + reminder success: reminderFailure null", () => {
    const r = adaptCaseDetailAggregate(
      buildAggregate("ENTRY_SUCCESS", "S8", paid, {
        case: bmvCaseRow("ENTRY_SUCCESS", "S8"),
        currentResidencePeriod: {
          id: "rp-001",
          validUntil: "2031-01-15",
          reminderCreated: true,
        },
      }),
    )!;
    expect(r.detail.reminderFailure).toBeNull();
  });

  it("RESIDENCE_PERIOD_RECORDED + closeout all satisfied", () => {
    const r = adaptCaseDetailAggregate(
      buildAggregate("RESIDENCE_PERIOD_RECORDED", "S8", paid, {
        case: bmvCaseRow("RESIDENCE_PERIOD_RECORDED", "S8"),
        successCloseoutCheck: {
          allSatisfied: true,
          preconditions: [
            { code: "ENTRY_CONFIRMED", label: "入境已确认", satisfied: true },
            {
              code: "RESIDENCE_PERIOD_RECORDED",
              label: "在留期间已录入",
              satisfied: true,
            },
            {
              code: "RENEWAL_REMINDER_SCHEDULED",
              label: "续签提醒已设置",
              satisfied: true,
            },
          ],
        },
      }),
    )!;
    expect(r.detail.successCloseout!.allSatisfied).toBe(true);
  });

  it("RENEWAL_REMINDER_SCHEDULED: final step + closeout met", () => {
    const r = adaptCaseDetailAggregate(
      buildAggregate("RENEWAL_REMINDER_SCHEDULED", "S8", paid, {
        case: bmvCaseRow("RENEWAL_REMINDER_SCHEDULED", "S8"),
        successCloseoutCheck: {
          allSatisfied: true,
          preconditions: [
            { code: "ENTRY_CONFIRMED", label: "入境已確認", satisfied: true },
            {
              code: "RESIDENCE_PERIOD_RECORDED",
              label: "在留期間已録入",
              satisfied: true,
            },
            {
              code: "RENEWAL_REMINDER_SCHEDULED",
              label: "续签提醒已設定",
              satisfied: true,
            },
          ],
        },
      }),
    )!;
    expect(r.detail.workflowStep!.sortOrder).toBe(15);
    expect(r.detail.successCloseout!.allSatisfied).toBe(true);
    expect(r.detail.readonly).toBe(false);
  });

  it("non-BMV: all P1 gate/supplement/reminder fields null", () => {
    const r = adaptCaseDetailAggregate({
      case: {
        id: "case-gen",
        stage: "S5",
        caseTypeCode: "general_visa",
        ownerUserId: "u1",
      },
      deepLink: null,
      counts: null,
      billing: null,
      latestValidation: null,
      latestSubmission: null,
      latestReview: null,
      documentProgressByProvider: [],
      failureCloseoutCheck: null,
    })!;
    expect(r.detail.finalPaymentGate).toBeNull();
    expect(r.detail.supplementRound).toBeNull();
    expect(r.detail.reminderFailure).toBeNull();
    expect(r.detail.successCloseout).toBeNull();
    expect(r.detail.failureCloseout).toBeNull();
    expect(r.detail.workflowStep).toBeNull();
  });
});
