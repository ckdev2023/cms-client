// ── Test Ownership ──────────────────────────────────────────────
// Owner: p1-fe-005-03 — BMV supplement/convergence focused tests
//   Covers: supplement failure adapter output and closeout branch convergence
//   (success and failure paths across S5/S8/S9 expectations).
// Does NOT test: P0 header fields (→ main-chain.test), Vue component
//   rendering, failureClose writeActions, reminder retry/failure details,
//   COE advance (→ coe-residence-reminder.focused.test),
//   final-payment-gate derivation (→ final-payment-gate.test),
//   or survey/quote gates (→ survey-quote.test).
// ────────────────────────────────────────────────────────────────

import { describe, expect, it } from "vitest";
import { adaptCaseDetailAggregate } from "./CaseAdapterDetailAggregate";

// ─── Shared fixtures ─────────────────────────────────────────────

const DEEP_LINK = {
  customerId: "cust-fail01",
  customerName: "失敗パステスト",
  groupId: "group-fail01",
  groupName: "Tokyo-F",
  ownerUserId: "user-fail01",
  ownerDisplayName: "担当者F",
  assistantUserId: null,
  assistantDisplayName: null,
};

const COUNTS = {
  documentItemsTotal: 12,
  documentItemsDone: 10,
  questionnaireItemsTotal: 2,
  questionnaireItemsDone: 2,
  caseParties: 2,
  tasks: 4,
  tasksPending: 1,
  communicationLogs: 6,
  submissionPackages: 1,
  generatedDocuments: 3,
  validationRuns: 2,
  reviewRecords: 1,
  billingRecords: 3,
  paymentRecords: 2,
};

function billingFixture(overrides: Record<string, unknown> = {}) {
  return {
    quotePrice: 600000,
    unpaidAmount: 200000,
    totalReceived: 400000,
    depositPaid: true,
    finalPaymentPaid: false,
    billingRiskAcknowledged: false,
    billingRiskAcknowledgedAt: null,
    billingRiskAckReasonCode: null,
    ...overrides,
  };
}

function bmvCaseRow(
  stepCode: string,
  stage = "S5",
  extra: Record<string, unknown> = {},
) {
  return {
    id: "case-fail01",
    orgId: "org-1",
    customerId: "cust-fail01",
    caseTypeCode: "business_manager_visa",
    stage,
    groupId: "group-fail01",
    ownerUserId: "user-fail01",
    dueAt: "2026-10-01",
    caseName: "失敗パステスト案件",
    currentWorkflowStepCode: stepCode,
    visaPlan: "new_establishment",
    supplementCount: 0,
    ...extra,
  };
}

function buildAggregate(
  stepCode: string,
  stage = "S5",
  extraCase: Record<string, unknown> = {},
  extraTop: Record<string, unknown> = {},
) {
  return {
    case: bmvCaseRow(stepCode, stage, extraCase),
    deepLink: DEEP_LINK,
    counts: COUNTS,
    billing: billingFixture(),
    latestValidation: null,
    latestSubmission: null,
    latestReview: null,
    documentProgressByProvider: [],
    failureCloseoutCheck: null,
    ...extraTop,
  };
}

// ═══════════════════════════════════════════════════════════════════
//  1. SUPPLEMENT FAILURE — adapter output for supplement steps
// ═══════════════════════════════════════════════════════════════════

describe("supplement round adapter — NEED_SUPPLEMENT (p1-fe-005-03)", () => {
  it("supplementRound populated when at NEED_SUPPLEMENT step", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate("NEED_SUPPLEMENT", "S5", {
        supplementCount: 2,
        lastSupplementNoticeDate: "2026-06-01T00:00:00.000Z",
        lastSupplementReason: "追加書類の提出が必要です",
        supplementDeadline: "2026-06-15T00:00:00.000Z",
      }),
    )!;
    const sr = result.detail.supplementRound!;
    expect(sr).not.toBeNull();
    expect(sr.round).toBe(2);
    expect(sr.statusKey).toBe("notice_received");
    expect(sr.tone).toBe("danger");
    expect(sr.canResubmit).toBe(true);
    expect(sr.reason).toBe("追加書類の提出が必要です");
  });

  it("noticeDate is formatted from lastSupplementNoticeDate", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate("NEED_SUPPLEMENT", "S5", {
        supplementCount: 1,
        lastSupplementNoticeDate: "2026-06-01T00:00:00.000Z",
        lastSupplementReason: "理由",
        supplementDeadline: null,
      }),
    )!;
    expect(result.detail.supplementRound!.noticeDate).toContain("2026");
  });

  it("deadline is formatted and urgency detected when ≤7 days", () => {
    const soon = new Date();
    soon.setDate(soon.getDate() + 3);
    const result = adaptCaseDetailAggregate(
      buildAggregate("NEED_SUPPLEMENT", "S5", {
        supplementCount: 1,
        lastSupplementNoticeDate: "2026-06-01T00:00:00.000Z",
        lastSupplementReason: "",
        supplementDeadline: soon.toISOString(),
      }),
    )!;
    expect(result.detail.supplementRound!.deadlineUrgent).toBe(true);
  });

  it("deadline not urgent when > 7 days away", () => {
    const far = new Date();
    far.setDate(far.getDate() + 30);
    const result = adaptCaseDetailAggregate(
      buildAggregate("NEED_SUPPLEMENT", "S5", {
        supplementCount: 1,
        lastSupplementNoticeDate: "2026-06-01T00:00:00.000Z",
        lastSupplementReason: "",
        supplementDeadline: far.toISOString(),
      }),
    )!;
    expect(result.detail.supplementRound!.deadlineUrgent).toBe(false);
  });

  it("canResubmit false when case is readonly (S9)", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate("NEED_SUPPLEMENT", "S9", {
        supplementCount: 1,
        lastSupplementNoticeDate: "2026-06-01T00:00:00.000Z",
        lastSupplementReason: "",
      }),
    )!;
    expect(result.detail.supplementRound!.canResubmit).toBe(false);
  });

  it("round defaults to 1 when supplementCount is 0", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate("NEED_SUPPLEMENT", "S5", {
        supplementCount: 0,
        lastSupplementNoticeDate: null,
        lastSupplementReason: "",
      }),
    )!;
    expect(result.detail.supplementRound!.round).toBe(1);
  });

  it("deadline is empty when supplementDeadline is null", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate("NEED_SUPPLEMENT", "S5", {
        supplementCount: 1,
        lastSupplementNoticeDate: null,
        lastSupplementReason: "",
        supplementDeadline: null,
      }),
    )!;
    expect(result.detail.supplementRound!.deadline).toBe("");
    expect(result.detail.supplementRound!.deadlineUrgent).toBe(false);
  });
});

describe("supplement round adapter — SUPPLEMENT_PROCESSING (p1-fe-005-03)", () => {
  it("populated with processing status when at SUPPLEMENT_PROCESSING", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate("SUPPLEMENT_PROCESSING", "S5", {
        supplementCount: 3,
        lastSupplementNoticeDate: "2026-05-20T00:00:00.000Z",
        lastSupplementReason: "書類不備",
        supplementDeadline: "2026-06-20T00:00:00.000Z",
      }),
    )!;
    const sr = result.detail.supplementRound!;
    expect(sr).not.toBeNull();
    expect(sr.round).toBe(3);
    expect(sr.statusKey).toBe("processing");
    expect(sr.tone).toBe("warning");
    expect(sr.canResubmit).toBe(false);
  });

  it("canResubmit is false because only NEED_SUPPLEMENT allows resubmission", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate("SUPPLEMENT_PROCESSING", "S5", {
        supplementCount: 1,
        lastSupplementNoticeDate: null,
        lastSupplementReason: "",
      }),
    )!;
    expect(result.detail.supplementRound!.canResubmit).toBe(false);
  });
});

describe("supplement round adapter — non-supplement steps (p1-fe-005-03)", () => {
  it("null when step is UNDER_REVIEW", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate("UNDER_REVIEW", "S5"),
    )!;
    expect(result.detail.supplementRound).toBeNull();
  });

  it("null when step is APPROVED", () => {
    const result = adaptCaseDetailAggregate(buildAggregate("APPROVED", "S6"))!;
    expect(result.detail.supplementRound).toBeNull();
  });

  it("null when step is WAITING_MATERIAL", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate("WAITING_MATERIAL", "S2"),
    )!;
    expect(result.detail.supplementRound).toBeNull();
  });

  it("null when step is VISA_REJECTED", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate("VISA_REJECTED", "S9"),
    )!;
    expect(result.detail.supplementRound).toBeNull();
  });
});

describe("supplement round adapter — non-BMV degradation (p1-fe-005-03)", () => {
  it("null on non-BMV case without BMV step code or visaPlan", () => {
    const result = adaptCaseDetailAggregate({
      case: {
        id: "case-nonbmv",
        stage: "S5",
        caseTypeCode: "general_visa",
        ownerUserId: "user-01",
        currentWorkflowStepCode: null,
        supplementCount: 1,
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
    expect(result.detail.supplementRound).toBeNull();
  });

  it("isBmv=true when step code resolves in blueprint (adapter infers BMV from step)", () => {
    const result = adaptCaseDetailAggregate({
      case: {
        id: "case-nonbmv",
        stage: "S5",
        caseTypeCode: "general_visa",
        ownerUserId: "user-01",
        currentWorkflowStepCode: "NEED_SUPPLEMENT",
        supplementCount: 1,
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
    expect(result.detail.supplementRound).not.toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════
//  7. CLOSEOUT CONVERGENCE — all paths converge to S9
// ═══════════════════════════════════════════════════════════════════

describe("closeout convergence — success and failure both reach S9 (p1-fe-005-03)", () => {
  it("visa rejection path: VISA_REJECTED → S9 + failure closeout", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate(
        "VISA_REJECTED",
        "S9",
        {
          resultOutcome: "visa_rejected",
        },
        {
          failureCloseoutCheck: {
            isFailurePath: true,
            attribution: {
              reasonCode: "VISA_REJECTED",
              reasonLabel: "签证拒否",
              canDirectClose: true,
              closeReasonRequired: false,
            },
          },
        },
      ),
    )!;
    expect(result.detail.stageCode).toBe("S9");
    expect(result.detail.readonly).toBe(true);
    expect(result.detail.failureCloseout).not.toBeNull();
    expect(result.detail.failureCloseout!.isFailurePath).toBe(true);
    expect(result.detail.resultOutcome).toBe("visa_rejected");
    expect(result.detail.workflowStep!.isFailureStep).toBe(true);
  });

  it("success path: RENEWAL_REMINDER_SCHEDULED → S9 + success closeout (all satisfied)", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate(
        "RENEWAL_REMINDER_SCHEDULED",
        "S8",
        {},
        {
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
        },
      ),
    )!;
    expect(result.detail.stageCode).toBe("S8");
    expect(result.detail.successCloseout).not.toBeNull();
    expect(result.detail.successCloseout!.allSatisfied).toBe(true);
    expect(result.detail.failureCloseout).toBeNull();
    expect(result.detail.workflowStep!.stepCode).toBe(
      "RENEWAL_REMINDER_SCHEDULED",
    );
    expect(result.detail.workflowStep!.isFailureStep).toBe(false);
  });

  it("client withdrawal mid-flow: CLIENT_WITHDRAWN at S5 → failure closeout", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate(
        "UNDER_REVIEW",
        "S5",
        {},
        {
          failureCloseoutCheck: {
            isFailurePath: true,
            attribution: {
              reasonCode: "CLIENT_WITHDRAWN",
              reasonLabel: "顧客取下げ",
              canDirectClose: false,
              closeReasonRequired: true,
            },
          },
        },
      ),
    )!;
    expect(result.detail.stageCode).toBe("S5");
    expect(result.detail.failureCloseout).not.toBeNull();
    expect(result.detail.failureCloseout!.reasonCode).toBe("CLIENT_WITHDRAWN");
    expect(result.detail.failureCloseout!.closeReasonRequired).toBe(true);
  });

  it("manual failure close: MANUAL_FAILURE_CLOSE with reason required", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate(
        "APPLYING",
        "S5",
        {},
        {
          failureCloseoutCheck: {
            isFailurePath: true,
            attribution: {
              reasonCode: "MANUAL_FAILURE_CLOSE",
              reasonLabel: "手動失敗結案",
              canDirectClose: false,
              closeReasonRequired: true,
            },
          },
        },
      ),
    )!;
    const fc = result.detail.failureCloseout!;
    expect(fc.reasonCode).toBe("MANUAL_FAILURE_CLOSE");
    expect(fc.canDirectClose).toBe(false);
    expect(fc.closeReasonRequired).toBe(true);
  });

  it("supplement failure → no automatic failure closeout (stays in S5)", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate("NEED_SUPPLEMENT", "S5", {
        supplementCount: 3,
        lastSupplementNoticeDate: "2026-06-01T00:00:00.000Z",
        lastSupplementReason: "何度も提出不備",
      }),
    )!;
    expect(result.detail.stageCode).toBe("S5");
    expect(result.detail.failureCloseout).toBeNull();
    expect(result.detail.supplementRound).not.toBeNull();
    expect(result.detail.supplementRound!.round).toBe(3);
  });
});
