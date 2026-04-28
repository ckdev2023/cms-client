// ── Test Ownership ──────────────────────────────────────────────
// Owner: p1-fe-004-03 — COE guard + residence panel focused tests.
// Covers: gate error mapping, readonly/double-submit guards, and residencePeriod adapter.
// Does NOT test: core write lifecycles, reminder schedule, success closeout, or detail-model integration.
// ────────────────────────────────────────────────────────────────

import { describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";

import { adaptCaseDetailAggregate } from "./CaseAdapterDetailAggregate";
import {
  isGateBlockError,
  resolveWriteErrorI18nKey,
} from "./CaseWriteErrorMapping";
import type { CaseRepository } from "./CaseRepository";
import { createWriteActions } from "./useCaseDetailWriteActions";

function stubRepo(overrides: Partial<CaseRepository> = {}): CaseRepository {
  return {
    listCases: vi.fn(),
    getSummaryCards: vi.fn(() => []),
    getDetail: vi.fn(async () => null),
    getDetailAggregate: vi.fn(async () => null),
    createCase: vi.fn(async () => ({ id: "c1", success: true })),
    updateCase: vi.fn(async () => ({ id: "c1", success: true })),
    transitionCase: vi.fn(async () => ({ id: "c1", success: true })),
    acknowledgeBillingRisk: vi.fn(async () => ({ id: "c1", success: true })),
    updatePostApprovalStage: vi.fn(async () => ({ id: "c1", success: true })),
    transitionWorkflowStep: vi.fn(async () => ({ id: "c1", success: true })),
    deleteCase: vi.fn(async () => undefined),
    getMessages: vi.fn(async () => []),
    getLogEntries: vi.fn(async () => []),
    getDocumentItems: vi.fn(async () => []),
    getGeneratedDocuments: vi.fn(async () => ({
      templates: [],
      generated: [],
    })),
    getValidationData: vi.fn(async () => ({
      lastTime: "",
      blocking: [],
      warnings: [],
      info: [],
    })),
    getBillingData: vi.fn(async () => ({
      total: "—",
      received: "¥0",
      outstanding: "¥0",
      payments: [],
    })),
    getSubmissionPackages: vi.fn(async () => []),
    getDoubleReviewEntries: vi.fn(async () => []),
    getTasks: vi.fn(async () => []),
    getDeadlines: vi.fn(async () => []),
    createCaseParty: vi.fn(async () => ({ id: "cp1", success: true })),
    ...overrides,
  } as unknown as CaseRepository;
}

async function flushFetch(): Promise<void> {
  await nextTick();
  await new Promise<void>((r) => queueMicrotask(r));
  await nextTick();
}

const DEEP_LINK = {
  customerId: "cust-coe01",
  customerName: "COEテスト",
  groupId: "group-coe01",
  groupName: "Tokyo-E",
  ownerUserId: "user-coe01",
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

function bmvCaseRow(stepCode: string, stage = "S7") {
  return {
    id: "case-coe01",
    orgId: "org-1",
    customerId: "cust-coe01",
    caseTypeCode: "business_manager_visa",
    stage,
    groupId: "group-coe01",
    ownerUserId: "user-coe01",
    dueAt: "2026-10-01",
    caseName: "COEテスト案件",
    currentWorkflowStepCode: stepCode,
    visaPlan: "new_establishment",
    supplementCount: 0,
  };
}

function residencePeriodFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: "rp-001",
    statusOfResidence: "経営管理",
    visaType: "business_manager",
    periodLabel: "5年",
    validFrom: "2026-01-15",
    validUntil: "2031-01-15",
    cardNumber: "AB12345678CD",
    entryDate: "2026-01-20",
    reminderCreated: true,
    ...overrides,
  };
}

function buildAggregate(
  stepCode: string,
  billingOverrides: Record<string, unknown> = {},
  extraOverrides: Record<string, unknown> = {},
) {
  return {
    case: bmvCaseRow(stepCode),
    deepLink: DEEP_LINK,
    counts: COUNTS,
    billing: billingFixture(billingOverrides),
    latestValidation: null,
    latestSubmission: null,
    latestReview: null,
    documentProgressByProvider: [],
    failureCloseoutCheck: null,
    ...extraOverrides,
  };
}

describe("COE / closeout error mapping (p1-fe-004-03)", () => {
  it("CASE_POST_APPROVAL_BILLING_BLOCKED → gate block + correct i18n", () => {
    const code = "CASE_POST_APPROVAL_BILLING_BLOCKED";
    expect(isGateBlockError(code)).toBe(true);
    expect(resolveWriteErrorI18nKey(code)).toBe(
      "cases.writeErrors.postApprovalBillingBlocked",
    );
  });

  it("CASE_POST_APPROVAL_BILLING_RISK_UNACKNOWLEDGED → gate block", () => {
    const code = "CASE_POST_APPROVAL_BILLING_RISK_UNACKNOWLEDGED";
    expect(isGateBlockError(code)).toBe(true);
    expect(resolveWriteErrorI18nKey(code)).toBe(
      "cases.writeErrors.postApprovalBillingRiskUnacknowledged",
    );
  });

  it("CASE_WF_STEP_BILLING_GATE_BLOCKED → gate block", () => {
    const code = "CASE_WF_STEP_BILLING_GATE_BLOCKED";
    expect(isGateBlockError(code)).toBe(true);
    expect(resolveWriteErrorI18nKey(code)).toBe(
      "cases.writeErrors.wfStepBillingGateBlocked",
    );
  });

  it("CASE_WF_STEP_NOT_ALLOWED → gate block", () => {
    const code = "CASE_WF_STEP_NOT_ALLOWED";
    expect(isGateBlockError(code)).toBe(true);
    expect(resolveWriteErrorI18nKey(code)).toBe(
      "cases.writeErrors.wfStepNotAllowed",
    );
  });

  it("CASE_SUCCESS_CLOSEOUT_BLOCKED → gate block", () => {
    const code = "CASE_SUCCESS_CLOSEOUT_BLOCKED";
    expect(isGateBlockError(code)).toBe(true);
    expect(resolveWriteErrorI18nKey(code)).toBe(
      "cases.writeErrors.successCloseoutBlocked",
    );
  });

  it("CASE_FAILURE_CLOSEOUT_ATTRIBUTION_REQUIRED → gate block", () => {
    const code = "CASE_FAILURE_CLOSEOUT_ATTRIBUTION_REQUIRED";
    expect(isGateBlockError(code)).toBe(true);
    expect(resolveWriteErrorI18nKey(code)).toBe(
      "cases.writeErrors.failureCloseoutAttributionRequired",
    );
  });

  it("CASE_POST_APPROVAL_STAGE_INVALID → NOT a gate block", () => {
    const code = "CASE_POST_APPROVAL_STAGE_INVALID";
    expect(isGateBlockError(code)).toBe(false);
    expect(resolveWriteErrorI18nKey(code)).toBe(
      "cases.writeErrors.postApprovalStageInvalid",
    );
  });
});

describe("readonly guard for COE actions (p1-fe-004-03)", () => {
  it("advancePostApprovalStage returns false when readonly", async () => {
    const updatePostApprovalStage = vi.fn(async () => ({
      id: "c1",
      success: true,
    }));
    const repo = stubRepo({ updatePostApprovalStage });
    const wa = createWriteActions({
      repo,
      getCaseId: () => "c1",
      getReadonly: () => true,
      onSuccess: async () => {},
      onRiskModalClose: () => {},
    });

    const ok = await wa.advancePostApprovalStage("coe_sent");
    expect(ok).toBe(false);
    expect(updatePostApprovalStage).not.toHaveBeenCalled();
  });

  it("transitionWorkflowStep returns false when readonly", async () => {
    const transitionWorkflowStep = vi.fn(async () => ({
      id: "c1",
      success: true,
    }));
    const repo = stubRepo({ transitionWorkflowStep });
    const wa = createWriteActions({
      repo,
      getCaseId: () => "c1",
      getReadonly: () => true,
      onSuccess: async () => {},
      onRiskModalClose: () => {},
    });

    const ok = await wa.transitionWorkflowStep("COE_SENT");
    expect(ok).toBe(false);
    expect(transitionWorkflowStep).not.toHaveBeenCalled();
  });

  it("no feedback state change when readonly blocks COE advance", async () => {
    const repo = stubRepo();
    const wa = createWriteActions({
      repo,
      getCaseId: () => "c1",
      getReadonly: () => true,
      onSuccess: async () => {},
      onRiskModalClose: () => {},
    });

    await wa.advancePostApprovalStage("coe_sent");
    expect(wa.writeFeedback.value.submitting).toBe(false);
    expect(wa.writeFeedback.value.errorMessage).toBeNull();
  });
});

describe("double-submit guard for COE actions (p1-fe-004-03)", () => {
  it("second advancePostApprovalStage returns false while first in-flight", async () => {
    let resolve!: () => void;
    const updatePostApprovalStage = vi.fn(
      () =>
        new Promise<{ id: string; success: boolean }>((r) => {
          resolve = () => r({ id: "c1", success: true });
        }),
    );
    const repo = stubRepo({ updatePostApprovalStage });
    const wa = createWriteActions({
      repo,
      getCaseId: () => "c1",
      getReadonly: () => false,
      onSuccess: async () => {},
      onRiskModalClose: () => {},
    });

    const p1 = wa.advancePostApprovalStage("coe_sent");
    expect(wa.writeFeedback.value.submitting).toBe(true);

    const ok2 = await wa.advancePostApprovalStage("coe_sent");
    expect(ok2).toBe(false);
    expect(updatePostApprovalStage).toHaveBeenCalledTimes(1);

    resolve();
    const ok1 = await p1;
    expect(ok1).toBe(true);
  });

  it("transitionWorkflowStep blocked while advancePostApprovalStage in-flight", async () => {
    let resolve!: () => void;
    const updatePostApprovalStage = vi.fn(
      () =>
        new Promise<{ id: string; success: boolean }>((r) => {
          resolve = () => r({ id: "c1", success: true });
        }),
    );
    const transitionWorkflowStep = vi.fn(async () => ({
      id: "c1",
      success: true,
    }));
    const repo = stubRepo({ updatePostApprovalStage, transitionWorkflowStep });
    const wa = createWriteActions({
      repo,
      getCaseId: () => "c1",
      getReadonly: () => false,
      onSuccess: async () => {},
      onRiskModalClose: () => {},
    });

    wa.advancePostApprovalStage("coe_sent");
    expect(wa.writeFeedback.value.submitting).toBe(true);

    const stepOk = await wa.transitionWorkflowStep("ENTRY_SUCCESS");
    expect(stepOk).toBe(false);
    expect(transitionWorkflowStep).not.toHaveBeenCalled();

    resolve();
    await flushFetch();
  });
});

describe("residencePeriod adapter from aggregate (p1-fe-004-03)", () => {
  it("populated when currentResidencePeriod present in aggregate", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate(
        "ENTRY_SUCCESS",
        {},
        {
          case: bmvCaseRow("ENTRY_SUCCESS", "S8"),
          currentResidencePeriod: residencePeriodFixture(),
        },
      ),
    )!;
    const rp = result.detail.residencePeriod!;
    expect(rp).not.toBeNull();
    expect(rp.id).toBe("rp-001");
    expect(rp.residenceStatus).toBe("経営管理");
    expect(rp.visaType).toBe("business_manager");
    expect(rp.periodLabel).toBe("5年");
    expect(rp.cardNumber).toBe("AB12345678CD");
    expect(rp.reminderCreated).toBe(true);
  });

  it("tone is success when expiry far in the future", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate(
        "ENTRY_SUCCESS",
        {},
        {
          case: bmvCaseRow("ENTRY_SUCCESS", "S8"),
          currentResidencePeriod: residencePeriodFixture({
            validUntil: "2031-01-15",
          }),
        },
      ),
    )!;
    expect(result.detail.residencePeriod!.tone).toBe("success");
    expect(result.detail.residencePeriod!.statusLabel).toBe("有効");
  });

  it("tone is warning when expiry within 90 days", () => {
    const soon = new Date();
    soon.setDate(soon.getDate() + 60);
    const result = adaptCaseDetailAggregate(
      buildAggregate(
        "ENTRY_SUCCESS",
        {},
        {
          case: bmvCaseRow("ENTRY_SUCCESS", "S8"),
          currentResidencePeriod: residencePeriodFixture({
            validUntil: soon.toISOString().slice(0, 10),
          }),
        },
      ),
    )!;
    expect(result.detail.residencePeriod!.tone).toBe("warning");
  });

  it("tone is danger when expiry has passed", () => {
    const past = new Date();
    past.setDate(past.getDate() - 10);
    const result = adaptCaseDetailAggregate(
      buildAggregate(
        "ENTRY_SUCCESS",
        {},
        {
          case: bmvCaseRow("ENTRY_SUCCESS", "S8"),
          currentResidencePeriod: residencePeriodFixture({
            validUntil: past.toISOString().slice(0, 10),
          }),
        },
      ),
    )!;
    expect(result.detail.residencePeriod!.tone).toBe("danger");
    expect(result.detail.residencePeriod!.statusLabel).toBe("期限切れ");
  });

  it("null when currentResidencePeriod is absent", () => {
    const result = adaptCaseDetailAggregate(buildAggregate("WAITING_PAYMENT"))!;
    expect(result.detail.residencePeriod).toBeNull();
  });

  it("null when currentResidencePeriod has no id", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate(
        "ENTRY_SUCCESS",
        {},
        {
          case: bmvCaseRow("ENTRY_SUCCESS", "S8"),
          currentResidencePeriod: { validUntil: "2031-01-15" },
        },
      ),
    )!;
    expect(result.detail.residencePeriod).toBeNull();
  });

  it("recordMeta includes card number and reminder status", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate(
        "ENTRY_SUCCESS",
        {},
        {
          case: bmvCaseRow("ENTRY_SUCCESS", "S8"),
          currentResidencePeriod: residencePeriodFixture(),
        },
      ),
    )!;
    const meta = result.detail.residencePeriod!.recordMeta;
    expect(meta).toContain("カード: AB12345678CD");
    expect(meta).toContain("提醒: 已设置");
  });

  it("recordMeta shows 未设置 when reminderCreated is false", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate(
        "ENTRY_SUCCESS",
        {},
        {
          case: bmvCaseRow("ENTRY_SUCCESS", "S8"),
          currentResidencePeriod: residencePeriodFixture({
            reminderCreated: false,
          }),
        },
      ),
    )!;
    expect(result.detail.residencePeriod!.recordMeta).toContain("提醒: 未设置");
  });

  it("entryDate is null when not provided", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate(
        "ENTRY_SUCCESS",
        {},
        {
          case: bmvCaseRow("ENTRY_SUCCESS", "S8"),
          currentResidencePeriod: residencePeriodFixture({ entryDate: null }),
        },
      ),
    )!;
    expect(result.detail.residencePeriod!.entryDate).toBeNull();
  });
});
