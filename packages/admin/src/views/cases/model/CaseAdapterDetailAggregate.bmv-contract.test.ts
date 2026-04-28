// ── Test Ownership ──────────────────────────────────────────────
// Owner: p1-fe-001-03 — BMV admin contract focused tests
//   Covers: BMV field mapping (case record → CaseDetail), workflow step
//   summary resolution, failure closeout info, billing gate feedback,
//   button availability semantics, and non-BMV degradation.
// Does NOT test: P0 header/overview/info (→ overview-contract/info-contract),
//   list mappers, write builders, repository orchestration,
//   or server-side template validation.
// ────────────────────────────────────────────────────────────────

import { describe, expect, it } from "vitest";
import { adaptCaseDetailAggregate } from "./CaseAdapterDetailAggregate";
import {
  BMV_CASE_RECORD_CONSUMED_FIELDS,
  BMV_DETAIL_TARGET_KEYS,
  FAILURE_CLOSEOUT_CONSUMED_FIELDS,
  FAILURE_CLOSEOUT_ATTRIBUTION_CONSUMED_FIELDS,
} from "./CaseAdapterDetailContracts";

// ─── Shared fixtures ─────────────────────────────────────────────

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

function buildBmvCaseRow(overrides: Record<string, unknown> = {}) {
  return { ...BMV_CASE_ROW, ...overrides };
}

// ═══════════════════════════════════════════════════════════════════
//  FROZEN KEY-SET — BMV contract constants
// ═══════════════════════════════════════════════════════════════════

describe("BMV frozen key-set contracts (p1-fe-001-03)", () => {
  it("BMV_CASE_RECORD_CONSUMED_FIELDS matches expected frozen set", () => {
    expect([...BMV_CASE_RECORD_CONSUMED_FIELDS]).toEqual([
      "currentWorkflowStepCode",
      "visaPlan",
      "supplementCount",
      "resultOutcome",
      "postApprovalStage",
      "coeIssuedAt",
      "coeExpiryDate",
      "coeSentAt",
      "overseasVisaStartAt",
      "entryConfirmedAt",
      "caseTypeCode",
    ]);
  });

  it("BMV_DETAIL_TARGET_KEYS matches expected frozen set", () => {
    expect([...BMV_DETAIL_TARGET_KEYS]).toEqual([
      "workflowStep",
      "failureCloseout",
      "visaPlan",
      "supplementCount",
      "resultOutcome",
      "postApprovalStage",
      "coeIssuedDate",
      "coeExpiryDate",
      "overseasVisaStartDate",
      "entryConfirmedDate",
      "residencePeriod",
      "reminderSchedule",
      "successCloseout",
    ]);
  });

  it("FAILURE_CLOSEOUT_CONSUMED_FIELDS matches expected frozen set", () => {
    expect([...FAILURE_CLOSEOUT_CONSUMED_FIELDS]).toEqual([
      "isFailurePath",
      "attribution",
    ]);
  });

  it("FAILURE_CLOSEOUT_ATTRIBUTION_CONSUMED_FIELDS matches expected frozen set", () => {
    expect([...FAILURE_CLOSEOUT_ATTRIBUTION_CONSUMED_FIELDS]).toEqual([
      "reasonCode",
      "reasonLabel",
      "canDirectClose",
      "closeReasonRequired",
    ]);
  });
});

// ═══════════════════════════════════════════════════════════════════
//  BMV FIELD MAPPING — case record → CaseDetail
// ═══════════════════════════════════════════════════════════════════

describe("BMV field mapping from case record (p1-fe-001-03)", () => {
  const result = adaptCaseDetailAggregate(buildBmvAggregate())!;

  it("adapts successfully", () => {
    expect(result).not.toBeNull();
  });

  it("every BMV_DETAIL_TARGET_KEYS key is present on detail", () => {
    for (const key of BMV_DETAIL_TARGET_KEYS) {
      expect(key in result.detail, `missing BMV field: ${key}`).toBe(true);
    }
  });

  it("visaPlan maps from caseRecord.visaPlan", () => {
    expect(result.detail.visaPlan).toBe("new_establishment");
  });

  it("supplementCount maps from caseRecord.supplementCount", () => {
    expect(result.detail.supplementCount).toBe(2);
  });

  it("resultOutcome is null when caseRecord.resultOutcome is null", () => {
    expect(result.detail.resultOutcome).toBeNull();
  });

  it("postApprovalStage is null when caseRecord.postApprovalStage is null", () => {
    expect(result.detail.postApprovalStage).toBeNull();
  });

  it("coeIssuedDate is empty string when coeIssuedAt is null", () => {
    expect(result.detail.coeIssuedDate).toBe("");
  });

  it("coeExpiryDate is empty string when coeExpiryDate is null", () => {
    expect(result.detail.coeExpiryDate).toBe("");
  });

  it("overseasVisaStartDate is empty string when overseasVisaStartAt is null", () => {
    expect(result.detail.overseasVisaStartDate).toBe("");
  });

  it("entryConfirmedDate is empty string when entryConfirmedAt is null", () => {
    expect(result.detail.entryConfirmedDate).toBe("");
  });

  it("failureCloseout is null when failureCloseoutCheck is null", () => {
    expect(result.detail.failureCloseout).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════
//  WORKFLOW STEP SUMMARY — per-step resolution
// ═══════════════════════════════════════════════════════════════════

describe("workflow step summary resolution (p1-fe-001-03)", () => {
  it("UNDER_REVIEW step maps correctly", () => {
    const result = adaptCaseDetailAggregate(buildBmvAggregate())!;
    const ws = result.detail.workflowStep!;
    expect(ws).not.toBeNull();
    expect(ws.stepCode).toBe("UNDER_REVIEW");
    expect(ws.stepLabel).toBe("审查中");
    expect(ws.parentStage).toBe("S5");
    expect(ws.parentStageLabel).toBe("提交前检查");
    expect(ws.sortOrder).toBe(5);
    expect(ws.isFailureStep).toBe(false);
  });

  it("WAITING_MATERIAL → S2 parent stage", () => {
    const result = adaptCaseDetailAggregate(
      buildBmvAggregate({
        case: buildBmvCaseRow({ currentWorkflowStepCode: "WAITING_MATERIAL" }),
      }),
    )!;
    const ws = result.detail.workflowStep!;
    expect(ws.stepCode).toBe("WAITING_MATERIAL");
    expect(ws.stepLabel).toBe("等待资料");
    expect(ws.parentStage).toBe("S2");
    expect(ws.sortOrder).toBe(1);
    expect(ws.isFailureStep).toBe(false);
  });

  it("MATERIAL_PREPARING → S3 parent stage", () => {
    const result = adaptCaseDetailAggregate(
      buildBmvAggregate({
        case: buildBmvCaseRow({
          currentWorkflowStepCode: "MATERIAL_PREPARING",
        }),
      }),
    )!;
    const ws = result.detail.workflowStep!;
    expect(ws.stepCode).toBe("MATERIAL_PREPARING");
    expect(ws.parentStage).toBe("S3");
    expect(ws.sortOrder).toBe(2);
  });

  it("REVIEWING → S4 parent stage", () => {
    const result = adaptCaseDetailAggregate(
      buildBmvAggregate({
        case: buildBmvCaseRow({ currentWorkflowStepCode: "REVIEWING" }),
      }),
    )!;
    const ws = result.detail.workflowStep!;
    expect(ws.stepCode).toBe("REVIEWING");
    expect(ws.parentStage).toBe("S4");
    expect(ws.sortOrder).toBe(3);
  });

  it("APPLYING → S5 parent stage, sortOrder 4", () => {
    const result = adaptCaseDetailAggregate(
      buildBmvAggregate({
        case: buildBmvCaseRow({ currentWorkflowStepCode: "APPLYING" }),
      }),
    )!;
    expect(result.detail.workflowStep!.stepCode).toBe("APPLYING");
    expect(result.detail.workflowStep!.parentStage).toBe("S5");
    expect(result.detail.workflowStep!.sortOrder).toBe(4);
  });

  it("NEED_SUPPLEMENT → S5 parent stage, sortOrder 6", () => {
    const result = adaptCaseDetailAggregate(
      buildBmvAggregate({
        case: buildBmvCaseRow({ currentWorkflowStepCode: "NEED_SUPPLEMENT" }),
      }),
    )!;
    expect(result.detail.workflowStep!.stepCode).toBe("NEED_SUPPLEMENT");
    expect(result.detail.workflowStep!.stepLabel).toBe("需要补正");
    expect(result.detail.workflowStep!.parentStage).toBe("S5");
    expect(result.detail.workflowStep!.sortOrder).toBe(6);
  });

  it("SUPPLEMENT_PROCESSING → S5 parent stage, sortOrder 7", () => {
    const result = adaptCaseDetailAggregate(
      buildBmvAggregate({
        case: buildBmvCaseRow({
          currentWorkflowStepCode: "SUPPLEMENT_PROCESSING",
        }),
      }),
    )!;
    expect(result.detail.workflowStep!.stepCode).toBe("SUPPLEMENT_PROCESSING");
    expect(result.detail.workflowStep!.stepLabel).toBe("补正处理中");
    expect(result.detail.workflowStep!.parentStage).toBe("S5");
    expect(result.detail.workflowStep!.sortOrder).toBe(7);
  });

  it("APPROVED → S6 parent stage", () => {
    const result = adaptCaseDetailAggregate(
      buildBmvAggregate({
        case: buildBmvCaseRow({ currentWorkflowStepCode: "APPROVED" }),
      }),
    )!;
    expect(result.detail.workflowStep!.stepCode).toBe("APPROVED");
    expect(result.detail.workflowStep!.stepLabel).toBe("已下签");
    expect(result.detail.workflowStep!.parentStage).toBe("S6");
    expect(result.detail.workflowStep!.sortOrder).toBe(8);
  });

  it("WAITING_PAYMENT → S7 parent stage", () => {
    const result = adaptCaseDetailAggregate(
      buildBmvAggregate({
        case: buildBmvCaseRow({ currentWorkflowStepCode: "WAITING_PAYMENT" }),
      }),
    )!;
    expect(result.detail.workflowStep!.stepCode).toBe("WAITING_PAYMENT");
    expect(result.detail.workflowStep!.stepLabel).toBe("等待尾款");
    expect(result.detail.workflowStep!.parentStage).toBe("S7");
  });

  it("COE_SENT → S7 parent stage", () => {
    const result = adaptCaseDetailAggregate(
      buildBmvAggregate({
        case: buildBmvCaseRow({ currentWorkflowStepCode: "COE_SENT" }),
      }),
    )!;
    expect(result.detail.workflowStep!.stepCode).toBe("COE_SENT");
    expect(result.detail.workflowStep!.stepLabel).toBe("COE已发送");
    expect(result.detail.workflowStep!.parentStage).toBe("S7");
    expect(result.detail.workflowStep!.sortOrder).toBe(10);
  });

  it("VISA_APPLYING → S7 parent stage", () => {
    const result = adaptCaseDetailAggregate(
      buildBmvAggregate({
        case: buildBmvCaseRow({ currentWorkflowStepCode: "VISA_APPLYING" }),
      }),
    )!;
    expect(result.detail.workflowStep!.stepCode).toBe("VISA_APPLYING");
    expect(result.detail.workflowStep!.stepLabel).toBe("海外返签申请中");
    expect(result.detail.workflowStep!.parentStage).toBe("S7");
  });

  it("ENTRY_SUCCESS → S8 parent stage", () => {
    const result = adaptCaseDetailAggregate(
      buildBmvAggregate({
        case: buildBmvCaseRow({ currentWorkflowStepCode: "ENTRY_SUCCESS" }),
      }),
    )!;
    expect(result.detail.workflowStep!.stepCode).toBe("ENTRY_SUCCESS");
    expect(result.detail.workflowStep!.stepLabel).toBe("入境成功");
    expect(result.detail.workflowStep!.parentStage).toBe("S8");
  });

  it("RESIDENCE_PERIOD_RECORDED → S8 parent stage", () => {
    const result = adaptCaseDetailAggregate(
      buildBmvAggregate({
        case: buildBmvCaseRow({
          currentWorkflowStepCode: "RESIDENCE_PERIOD_RECORDED",
        }),
      }),
    )!;
    expect(result.detail.workflowStep!.stepCode).toBe(
      "RESIDENCE_PERIOD_RECORDED",
    );
    expect(result.detail.workflowStep!.parentStage).toBe("S8");
  });

  it("RENEWAL_REMINDER_SCHEDULED → S8 parent stage", () => {
    const result = adaptCaseDetailAggregate(
      buildBmvAggregate({
        case: buildBmvCaseRow({
          currentWorkflowStepCode: "RENEWAL_REMINDER_SCHEDULED",
        }),
      }),
    )!;
    expect(result.detail.workflowStep!.stepCode).toBe(
      "RENEWAL_REMINDER_SCHEDULED",
    );
    expect(result.detail.workflowStep!.parentStage).toBe("S8");
    expect(result.detail.workflowStep!.sortOrder).toBe(15);
  });

  it("VISA_REJECTED is flagged as failure step", () => {
    const result = adaptCaseDetailAggregate(
      buildBmvAggregate({
        case: buildBmvCaseRow({ currentWorkflowStepCode: "VISA_REJECTED" }),
      }),
    )!;
    const ws = result.detail.workflowStep!;
    expect(ws.stepCode).toBe("VISA_REJECTED");
    expect(ws.stepLabel).toBe("签证拒否");
    expect(ws.parentStage).toBe("S9");
    expect(ws.isFailureStep).toBe(true);
  });

  it("null stepCode → workflowStep is null", () => {
    const result = adaptCaseDetailAggregate(
      buildBmvAggregate({
        case: buildBmvCaseRow({ currentWorkflowStepCode: null }),
      }),
    )!;
    expect(result.detail.workflowStep).toBeNull();
  });

  it("unknown stepCode → workflowStep is null (graceful fallback)", () => {
    const result = adaptCaseDetailAggregate(
      buildBmvAggregate({
        case: buildBmvCaseRow({
          currentWorkflowStepCode: "UNKNOWN_STEP_XYZ",
        }),
      }),
    )!;
    expect(result.detail.workflowStep).toBeNull();
  });
});
