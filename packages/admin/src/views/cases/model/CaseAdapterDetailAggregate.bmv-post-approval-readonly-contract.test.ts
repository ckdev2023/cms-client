// ── Test Ownership ──────────────────────────────────────────────
// Owner: p1-fe-001-03 — BMV post-approval/readonly contract tests
//   Covers: post-approval date mapping, non-BMV degradation, readonly
//   preservation in S9, supplement count, questionnaire counts, and
//   stage/workflow parallel display.
// Does NOT test: failure/button semantics, write actions, or P0 overview.
// ────────────────────────────────────────────────────────────────

import { describe, expect, it } from "vitest";
import { adaptCaseDetailAggregate } from "./CaseAdapterDetailAggregate";
import { BMV_DETAIL_TARGET_KEYS } from "./CaseAdapterDetailContracts";

const BMV_CASE_ROW = {
  id: "case-bmv01",
  orgId: "org-1",
  customerId: "cust-bmv01",
  caseTypeCode: "business_manager_visa",
  stage: "S5",
  groupId: "group-bmv01",
  ownerUserId: "user-bmv01",
  dueAt: "2026-10-01",
  caseName: "経営管理ビザ新規申請",
  caseNo: "CASE-BMV01",
  priority: "normal",
  riskLevel: "low",
  applicationType: "認定",
  acceptedAt: "2026-03-15T00:00:00.000Z",
  currentWorkflowStepCode: "UNDER_REVIEW",
  visaPlan: "new_establishment",
  supplementCount: 2,
  resultOutcome: null,
  postApprovalStage: null,
  coeIssuedAt: null,
  coeExpiryDate: null,
  coeSentAt: null,
  overseasVisaStartAt: null,
  entryConfirmedAt: null,
};

const BMV_DEEP_LINK = {
  customerId: "cust-bmv01",
  customerName: "張明",
  groupId: "group-bmv01",
  groupName: "Tokyo-C",
  ownerUserId: "user-bmv01",
  ownerDisplayName: "高橋太郎",
  assistantUserId: null,
  assistantDisplayName: null,
};

const BMV_COUNTS = {
  documentItemsTotal: 18,
  documentItemsDone: 10,
  questionnaireItemsTotal: 2,
  questionnaireItemsDone: 1,
  caseParties: 3,
  tasks: 5,
  tasksPending: 2,
  communicationLogs: 8,
  submissionPackages: 1,
  generatedDocuments: 4,
  validationRuns: 3,
  reviewRecords: 1,
  billingRecords: 4,
  paymentRecords: 2,
};

const BMV_BILLING = {
  quotePrice: 600000,
  unpaidAmount: 200000,
  totalReceived: 400000,
  depositPaid: true,
  finalPaymentPaid: false,
  billingRiskAcknowledged: false,
  billingRiskAcknowledgedAt: null,
  billingRiskAckReasonCode: null,
};

const BMV_VALIDATION = {
  id: "vr-bmv01",
  status: "passed",
  executedAt: "2026-04-20T00:00:00.000Z",
  blockingCount: 0,
  warningCount: 1,
};

function buildBmvAggregate(overrides: Record<string, unknown> = {}) {
  return {
    case: BMV_CASE_ROW,
    deepLink: BMV_DEEP_LINK,
    counts: BMV_COUNTS,
    billing: BMV_BILLING,
    latestValidation: BMV_VALIDATION,
    latestSubmission: null,
    latestReview: null,
    documentProgressByProvider: [
      { providerRole: "applicant", total: 10, done: 6 },
      { providerRole: "office", total: 8, done: 4 },
    ],
    failureCloseoutCheck: null,
    ...overrides,
  };
}

function buildNonBmvAggregate(overrides: Record<string, unknown> = {}) {
  return {
    case: {
      id: "case-nonbmv",
      stage: "S3",
      caseTypeCode: "general_visa",
      ownerUserId: "user-01",
    },
    deepLink: null,
    counts: null,
    billing: null,
    latestValidation: null,
    latestSubmission: null,
    latestReview: null,
    documentProgressByProvider: [],
    failureCloseoutCheck: null,
    ...overrides,
  };
}

function buildBmvCaseRow(overrides: Record<string, unknown> = {}) {
  return { ...BMV_CASE_ROW, ...overrides };
}

describe("BMV field mapping with post-approval dates (p1-fe-001-03)", () => {
  const result = adaptCaseDetailAggregate(
    buildBmvAggregate({
      case: buildBmvCaseRow({
        stage: "S7",
        currentWorkflowStepCode: "COE_SENT",
        resultOutcome: "approved",
        postApprovalStage: "coe_sent",
        coeIssuedAt: "2026-06-01T00:00:00.000Z",
        coeExpiryDate: "2026-09-01T00:00:00.000Z",
        coeSentAt: "2026-06-05T00:00:00.000Z",
        overseasVisaStartAt: "2026-07-01T00:00:00.000Z",
        entryConfirmedAt: null,
      }),
    }),
  )!;

  it("resultOutcome maps to approved", () => {
    expect(result.detail.resultOutcome).toBe("approved");
  });

  it("postApprovalStage maps to coe_sent", () => {
    expect(result.detail.postApprovalStage).toBe("coe_sent");
  });

  it("coeIssuedDate is formatted from coeIssuedAt", () => {
    expect(result.detail.coeIssuedDate).not.toBe("");
    expect(result.detail.coeIssuedDate).toContain("2026");
  });

  it("coeExpiryDate is formatted from coeExpiryDate", () => {
    expect(result.detail.coeExpiryDate).not.toBe("");
    expect(result.detail.coeExpiryDate).toContain("2026");
  });

  it("overseasVisaStartDate is formatted from overseasVisaStartAt", () => {
    expect(result.detail.overseasVisaStartDate).not.toBe("");
    expect(result.detail.overseasVisaStartDate).toContain("2026");
  });

  it("entryConfirmedDate is empty string when still null", () => {
    expect(result.detail.entryConfirmedDate).toBe("");
  });
});

describe("non-BMV case degradation (p1-fe-001-03)", () => {
  const result = adaptCaseDetailAggregate(buildNonBmvAggregate())!;

  it("adapts successfully", () => {
    expect(result).not.toBeNull();
  });

  it("workflowStep is null (no currentWorkflowStepCode)", () => {
    expect(result.detail.workflowStep).toBeNull();
  });

  it("visaPlan is null (not a BMV field)", () => {
    expect(result.detail.visaPlan).toBeNull();
  });

  it("supplementCount is 0 (default number)", () => {
    expect(result.detail.supplementCount).toBe(0);
  });

  it("resultOutcome is null", () => {
    expect(result.detail.resultOutcome).toBeNull();
  });

  it("postApprovalStage is null", () => {
    expect(result.detail.postApprovalStage).toBeNull();
  });

  it("date fields default to empty string", () => {
    expect(result.detail.coeIssuedDate).toBe("");
    expect(result.detail.coeExpiryDate).toBe("");
    expect(result.detail.overseasVisaStartDate).toBe("");
    expect(result.detail.entryConfirmedDate).toBe("");
  });

  it("failureCloseout is null", () => {
    expect(result.detail.failureCloseout).toBeNull();
  });

  it("all BMV_DETAIL_TARGET_KEYS still structurally present", () => {
    for (const key of BMV_DETAIL_TARGET_KEYS) {
      expect(key in result.detail, `missing BMV field on non-BMV: ${key}`).toBe(
        true,
      );
    }
  });
});

describe("BMV case in S9 readonly (p1-fe-001-03)", () => {
  const result = adaptCaseDetailAggregate(
    buildBmvAggregate({
      case: buildBmvCaseRow({
        stage: "S9",
        currentWorkflowStepCode: "VISA_REJECTED",
        resultOutcome: "visa_rejected",
      }),
      failureCloseoutCheck: {
        isFailurePath: true,
        attribution: {
          reasonCode: "VISA_REJECTED",
          reasonLabel: "签证拒否",
          canDirectClose: true,
          closeReasonRequired: false,
        },
      },
    }),
  )!;

  it("readonly=true in S9", () => {
    expect(result.detail.readonly).toBe(true);
  });

  it("workflowStep still resolved even in S9", () => {
    const ws = result.detail.workflowStep!;
    expect(ws).not.toBeNull();
    expect(ws.stepCode).toBe("VISA_REJECTED");
    expect(ws.isFailureStep).toBe(true);
  });

  it("failureCloseout still populated in S9", () => {
    const fc = result.detail.failureCloseout!;
    expect(fc).not.toBeNull();
    expect(fc.isFailurePath).toBe(true);
    expect(fc.reasonCode).toBe("VISA_REJECTED");
  });

  it("resultOutcome preserved in S9", () => {
    expect(result.detail.resultOutcome).toBe("visa_rejected");
  });

  it("P0 header fields still intact alongside BMV fields", () => {
    expect(result.detail.id).toBe("case-bmv01");
    expect(result.detail.stage).toBe("已归档");
    expect(result.detail.stageCode).toBe("S9");
    expect(result.detail.statusBadge).toBe("badge-gray");
  });

  it("all BMV_DETAIL_TARGET_KEYS present on detail", () => {
    for (const key of BMV_DETAIL_TARGET_KEYS) {
      expect(key in result.detail, `missing in S9: ${key}`).toBe(true);
    }
  });
});

describe("supplement cycle tracking (p1-fe-001-03)", () => {
  it("supplementCount=0 for fresh case", () => {
    const result = adaptCaseDetailAggregate(
      buildBmvAggregate({
        case: buildBmvCaseRow({ supplementCount: 0 }),
      }),
    )!;
    expect(result.detail.supplementCount).toBe(0);
  });

  it("supplementCount reflects server value", () => {
    const result = adaptCaseDetailAggregate(
      buildBmvAggregate({
        case: buildBmvCaseRow({ supplementCount: 3 }),
      }),
    )!;
    expect(result.detail.supplementCount).toBe(3);
  });

  it("NEED_SUPPLEMENT step + supplementCount > 0 coexist", () => {
    const result = adaptCaseDetailAggregate(
      buildBmvAggregate({
        case: buildBmvCaseRow({
          currentWorkflowStepCode: "NEED_SUPPLEMENT",
          supplementCount: 1,
        }),
      }),
    )!;
    expect(result.detail.workflowStep!.stepCode).toBe("NEED_SUPPLEMENT");
    expect(result.detail.supplementCount).toBe(1);
  });
});

describe("questionnaire tab counts (p1-fe-001-03)", () => {
  it("questionnaireItemsTotal and questionnaireItemsDone mapped from counts", () => {
    const result = adaptCaseDetailAggregate(buildBmvAggregate())!;
    expect(result.tabCounts.questionnaireItemsTotal).toBe(2);
    expect(result.tabCounts.questionnaireItemsDone).toBe(1);
  });

  it("zero when counts slice is null", () => {
    const result = adaptCaseDetailAggregate(
      buildBmvAggregate({ counts: null }),
    )!;
    expect(result.tabCounts.questionnaireItemsTotal).toBe(0);
    expect(result.tabCounts.questionnaireItemsDone).toBe(0);
  });
});

describe("workflow step parallel display with S1-S9 (p1-fe-001-03)", () => {
  it("stage and workflowStep are independent — S5 + UNDER_REVIEW", () => {
    const result = adaptCaseDetailAggregate(buildBmvAggregate())!;
    expect(result.detail.stageCode).toBe("S5");
    expect(result.detail.stage).toBe("提交前检查");
    expect(result.detail.workflowStep!.stepCode).toBe("UNDER_REVIEW");
    expect(result.detail.workflowStep!.parentStage).toBe("S5");
  });

  it("stage S7 + COE_SENT — both layers display simultaneously", () => {
    const result = adaptCaseDetailAggregate(
      buildBmvAggregate({
        case: buildBmvCaseRow({
          stage: "S7",
          currentWorkflowStepCode: "COE_SENT",
        }),
      }),
    )!;
    expect(result.detail.stageCode).toBe("S7");
    expect(result.detail.workflowStep!.stepCode).toBe("COE_SENT");
    expect(result.detail.workflowStep!.parentStage).toBe("S7");
  });

  it("stage S8 + ENTRY_SUCCESS — post-approval parallel display", () => {
    const result = adaptCaseDetailAggregate(
      buildBmvAggregate({
        case: buildBmvCaseRow({
          stage: "S8",
          currentWorkflowStepCode: "ENTRY_SUCCESS",
        }),
      }),
    )!;
    expect(result.detail.stageCode).toBe("S8");
    expect(result.detail.workflowStep!.stepCode).toBe("ENTRY_SUCCESS");
    expect(result.detail.workflowStep!.parentStage).toBe("S8");
  });
});
