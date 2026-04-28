// ── Test Ownership ──────────────────────────────────────────────
// Owner: p1-qa-001-02 — supplement failure focused tests.
// Covers: buildSupplementRoundInfo edge cases and supplementRound adapter.
// Does NOT test: failureClose, reminder retry/error paths, survey/quote gates,
//   final-payment-gate derivation, or Vue component rendering.
// ────────────────────────────────────────────────────────────────

import { describe, expect, it } from "vitest";
import { adaptCaseDetailAggregate } from "./CaseAdapterDetailAggregate";
import { buildSupplementRoundInfo } from "./CaseAdapterSupplementReminder";

// ─── Aggregate fixtures ──────────────────────────────────────────

const DEEP_LINK = {
  customerId: "cust-ex01",
  customerName: "例外テスト",
  groupId: "group-ex01",
  groupName: "Tokyo-E",
  ownerUserId: "user-ex01",
  ownerDisplayName: "担当者A",
  assistantUserId: null,
  assistantDisplayName: null,
};

const COUNTS = {
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
};

function billingFixture(overrides: Record<string, unknown> = {}) {
  return {
    quotePrice: 500000,
    unpaidAmount: 0,
    totalReceived: 500000,
    depositPaid: true,
    finalPaymentPaid: true,
    billingRiskAcknowledged: false,
    billingRiskAcknowledgedAt: null,
    billingRiskAckReasonCode: null,
    ...overrides,
  };
}

function bmvCaseRow(
  stepCode: string,
  stage = "S5",
  overrides: Record<string, unknown> = {},
) {
  return {
    id: "case-ex01",
    orgId: "org-1",
    customerId: "cust-ex01",
    caseTypeCode: "business_manager_visa",
    stage,
    groupId: "group-ex01",
    ownerUserId: "user-ex01",
    dueAt: "2026-10-01",
    caseName: "例外テスト案件",
    currentWorkflowStepCode: stepCode,
    visaPlan: "new_establishment",
    supplementCount: 0,
    ...overrides,
  };
}

function buildAggregate(
  stepCode: string,
  caseOverrides: Record<string, unknown> = {},
  extraOverrides: Record<string, unknown> = {},
) {
  return {
    case: bmvCaseRow(
      stepCode,
      (caseOverrides.stage as string) ?? "S5",
      caseOverrides,
    ),
    deepLink: DEEP_LINK,
    counts: COUNTS,
    billing: billingFixture(),
    latestValidation: null,
    latestSubmission: null,
    latestReview: null,
    documentProgressByProvider: [],
    failureCloseoutCheck: null,
    ...extraOverrides,
  };
}

// ═══════════════════════════════════════════════════════════════════
//  1. SUPPLEMENT ROUND ADAPTER — edge cases & failure paths
// ═══════════════════════════════════════════════════════════════════

describe("buildSupplementRoundInfo edge cases (p1-qa-001-02)", () => {
  it("null when stepCode is not a supplement step", () => {
    const info = buildSupplementRoundInfo(
      { currentWorkflowStepCode: "REVIEWING", supplementCount: 2 },
      false,
    );
    expect(info).toBeNull();
  });

  it("null when stepCode is missing", () => {
    const info = buildSupplementRoundInfo({ supplementCount: 1 }, false);
    expect(info).toBeNull();
  });

  it("NEED_SUPPLEMENT produces notice_received status with danger tone", () => {
    const info = buildSupplementRoundInfo(
      {
        currentWorkflowStepCode: "NEED_SUPPLEMENT",
        supplementCount: 2,
        lastSupplementNoticeDate: "2026-04-20",
        lastSupplementReason: "書類不備",
        supplementDeadline: "2026-05-20",
      },
      false,
    )!;
    expect(info).not.toBeNull();
    expect(info.statusKey).toBe("notice_received");
    expect(info.tone).toBe("danger");
    expect(info.round).toBe(2);
    expect(info.reason).toBe("書類不備");
    expect(info.canResubmit).toBe(true);
  });

  it("SUPPLEMENT_PROCESSING produces processing status with warning tone", () => {
    const info = buildSupplementRoundInfo(
      {
        currentWorkflowStepCode: "SUPPLEMENT_PROCESSING",
        supplementCount: 1,
        lastSupplementNoticeDate: "2026-04-15",
        lastSupplementReason: "追加資料必要",
        supplementDeadline: "2026-05-15",
      },
      false,
    )!;
    expect(info).not.toBeNull();
    expect(info.statusKey).toBe("processing");
    expect(info.tone).toBe("warning");
    expect(info.canResubmit).toBe(false);
  });

  it("round defaults to 1 when supplementCount is 0", () => {
    const info = buildSupplementRoundInfo(
      {
        currentWorkflowStepCode: "NEED_SUPPLEMENT",
        supplementCount: 0,
      },
      false,
    )!;
    expect(info.round).toBe(1);
  });

  it("canResubmit is false when readonly (S9)", () => {
    const info = buildSupplementRoundInfo(
      {
        currentWorkflowStepCode: "NEED_SUPPLEMENT",
        supplementCount: 1,
      },
      true,
    )!;
    expect(info.canResubmit).toBe(false);
  });

  it("deadlineUrgent is true when deadline ≤ 7 days away", () => {
    const soon = new Date();
    soon.setDate(soon.getDate() + 5);
    const info = buildSupplementRoundInfo(
      {
        currentWorkflowStepCode: "NEED_SUPPLEMENT",
        supplementCount: 1,
        supplementDeadline: soon.toISOString().slice(0, 10),
      },
      false,
    )!;
    expect(info.deadlineUrgent).toBe(true);
  });

  it("deadlineUrgent is false when deadline > 7 days away", () => {
    const later = new Date();
    later.setDate(later.getDate() + 30);
    const info = buildSupplementRoundInfo(
      {
        currentWorkflowStepCode: "NEED_SUPPLEMENT",
        supplementCount: 1,
        supplementDeadline: later.toISOString().slice(0, 10),
      },
      false,
    )!;
    expect(info.deadlineUrgent).toBe(false);
  });

  it("deadlineUrgent is false when no deadline set", () => {
    const info = buildSupplementRoundInfo(
      {
        currentWorkflowStepCode: "NEED_SUPPLEMENT",
        supplementCount: 1,
      },
      false,
    )!;
    expect(info.deadlineUrgent).toBe(false);
    expect(info.deadline).toBe("");
  });

  it("missing reason defaults to empty string", () => {
    const info = buildSupplementRoundInfo(
      {
        currentWorkflowStepCode: "NEED_SUPPLEMENT",
        supplementCount: 1,
      },
      false,
    )!;
    expect(info.reason).toBe("");
  });

  it("missing noticeDate formats as empty", () => {
    const info = buildSupplementRoundInfo(
      {
        currentWorkflowStepCode: "NEED_SUPPLEMENT",
        supplementCount: 1,
      },
      false,
    )!;
    expect(info.noticeDate).toBe("");
  });
});

describe("supplementRound via adaptCaseDetailAggregate (p1-qa-001-02)", () => {
  it("populated when stepCode is NEED_SUPPLEMENT", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate("NEED_SUPPLEMENT", {
        supplementCount: 2,
        lastSupplementNoticeDate: "2026-04-20",
        lastSupplementReason: "書類不備",
        supplementDeadline: "2026-05-20",
      }),
    )!;
    expect(result.detail.supplementRound).not.toBeNull();
    expect(result.detail.supplementRound!.round).toBe(2);
    expect(result.detail.supplementRound!.statusKey).toBe("notice_received");
    expect(result.detail.supplementRound!.canResubmit).toBe(true);
  });

  it("populated when stepCode is SUPPLEMENT_PROCESSING", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate("SUPPLEMENT_PROCESSING", { supplementCount: 1 }),
    )!;
    expect(result.detail.supplementRound).not.toBeNull();
    expect(result.detail.supplementRound!.statusKey).toBe("processing");
    expect(result.detail.supplementRound!.canResubmit).toBe(false);
  });

  it("null when stepCode is APPROVED (not in supplement loop)", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate("APPROVED", { stage: "S6" }),
    )!;
    expect(result.detail.supplementRound).toBeNull();
  });

  it("canResubmit false at S9 (readonly)", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate("NEED_SUPPLEMENT", {
        stage: "S9",
        supplementCount: 1,
      }),
    )!;
    expect(result.detail.supplementRound!.canResubmit).toBe(false);
  });
});
