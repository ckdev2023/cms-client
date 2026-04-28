// ── Test Ownership ──────────────────────────────────────────────
// Owner: p1-qa-001-02 — reminder failure adapter focused tests.
// Covers: buildReminderFailureInfo edge cases and reminderFailure adapter.
// Does NOT test: retryReminderCreation write action, failureClose, or supplement paths.
// ────────────────────────────────────────────────────────────────

import { describe, expect, it } from "vitest";

import { adaptCaseDetailAggregate } from "./CaseAdapterDetailAggregate";
import { buildReminderFailureInfo } from "./CaseAdapterSupplementReminder";

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

describe("buildReminderFailureInfo edge cases (p1-qa-001-02)", () => {
  it("null when residencePeriod is null", () => {
    const info = buildReminderFailureInfo(null, false);
    expect(info).toBeNull();
  });

  it("null when reminderCreated is true (no failure)", () => {
    const info = buildReminderFailureInfo(
      { reminderCreated: true, reminderError: "stale error" },
      false,
    );
    expect(info).toBeNull();
  });

  it("null when reminderCreated is false but no reminderError", () => {
    const info = buildReminderFailureInfo({ reminderCreated: false }, false);
    expect(info).toBeNull();
  });

  it("populated when reminderCreated=false and reminderError present", () => {
    const info = buildReminderFailureInfo(
      {
        reminderCreated: false,
        reminderError: "Reminder service unavailable",
        reminderLastAttemptAt: "2026-04-25T10:30:00Z",
        reminderAttemptCount: 3,
      },
      false,
    )!;
    expect(info).not.toBeNull();
    expect(info.reason).toBe("Reminder service unavailable");
    expect(info.attemptCount).toBe(3);
    expect(info.canRetry).toBe(true);
    expect(info.lastAttemptDate).not.toBe("");
  });

  it("canRetry is false when readonly (S9)", () => {
    const info = buildReminderFailureInfo(
      {
        reminderCreated: false,
        reminderError: "timeout",
        reminderAttemptCount: 1,
      },
      true,
    )!;
    expect(info.canRetry).toBe(false);
  });

  it("attemptCount defaults to 0 when missing", () => {
    const info = buildReminderFailureInfo(
      {
        reminderCreated: false,
        reminderError: "error",
      },
      false,
    )!;
    expect(info.attemptCount).toBe(0);
  });

  it("lastAttemptDate empty when not provided", () => {
    const info = buildReminderFailureInfo(
      {
        reminderCreated: false,
        reminderError: "error",
      },
      false,
    )!;
    expect(info.lastAttemptDate).toBe("");
  });
});

describe("reminderFailure via adaptCaseDetailAggregate (p1-qa-001-02)", () => {
  it("populated when currentResidencePeriod has reminderError", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate(
        "ENTRY_SUCCESS",
        { stage: "S8" },
        {
          currentResidencePeriod: {
            id: "rp-fail01",
            statusOfResidence: "経営管理",
            visaType: "business_manager",
            periodLabel: "5年",
            validFrom: "2026-01-15",
            validUntil: "2031-01-15",
            cardNumber: "AB12345678CD",
            entryDate: "2026-01-20",
            reminderCreated: false,
            reminderError: "Reminder service unavailable",
            reminderLastAttemptAt: "2026-04-25T10:30:00Z",
            reminderAttemptCount: 2,
          },
        },
      ),
    )!;
    expect(result.detail.reminderFailure).not.toBeNull();
    expect(result.detail.reminderFailure!.reason).toBe(
      "Reminder service unavailable",
    );
    expect(result.detail.reminderFailure!.attemptCount).toBe(2);
    expect(result.detail.reminderFailure!.canRetry).toBe(true);
  });

  it("null when reminderCreated is true", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate(
        "ENTRY_SUCCESS",
        { stage: "S8" },
        {
          currentResidencePeriod: {
            id: "rp-ok01",
            statusOfResidence: "経営管理",
            visaType: "business_manager",
            validFrom: "2026-01-15",
            validUntil: "2031-01-15",
            reminderCreated: true,
          },
        },
      ),
    )!;
    expect(result.detail.reminderFailure).toBeNull();
  });

  it("null when no currentResidencePeriod", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate("WAITING_PAYMENT", { stage: "S7" }),
    )!;
    expect(result.detail.reminderFailure).toBeNull();
  });

  it("canRetry false at S9 (readonly)", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate(
        "VISA_REJECTED",
        { stage: "S9" },
        {
          currentResidencePeriod: {
            id: "rp-fail-s9",
            statusOfResidence: "経営管理",
            visaType: "business_manager",
            validFrom: "2026-01-15",
            validUntil: "2031-01-15",
            reminderCreated: false,
            reminderError: "timeout",
            reminderAttemptCount: 1,
          },
        },
      ),
    )!;
    expect(result.detail.reminderFailure).not.toBeNull();
    expect(result.detail.reminderFailure!.canRetry).toBe(false);
  });
});
