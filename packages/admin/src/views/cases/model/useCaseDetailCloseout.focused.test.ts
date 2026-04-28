// ── Test Ownership ──────────────────────────────────────────────
// Owner: p1-qa-001-03 — aggregate closeout focused tests.
//   Covers: reminderFailure adapter, failure reason display, error mapping,
//   and success-closeout/reminder-failure coexistence narrative.
// Does NOT test: adapter mapping internals (→ CaseAdapterDetailAggregate.*),
//   write-action lifecycle, useCaseDetailModel end-to-end flows,
//   COE advance / workflow step transitions (→ coe-residence-reminder),
//   frozen key-set contracts (→ bmv-contract.test),
//   Vue component rendering (→ component tests).
// ────────────────────────────────────────────────────────────────

import { describe, expect, it } from "vitest";
import {
  resolveWriteErrorI18nKey,
  isGateBlockError,
} from "./CaseWriteErrorMapping";
import { adaptCaseDetailAggregate } from "./CaseAdapterDetailAggregate";

// ─── Aggregate fixtures ──────────────────────────────────────────

const DEEP_LINK = {
  customerId: "cust-co01",
  customerName: "結案テスト",
  groupId: "group-co01",
  groupName: "Tokyo-C",
  ownerUserId: "user-co01",
  ownerDisplayName: "結案担当",
  assistantUserId: null,
  assistantDisplayName: null,
};

const COUNTS = {
  documentItemsTotal: 10,
  documentItemsDone: 10,
  questionnaireItemsTotal: 3,
  questionnaireItemsDone: 3,
  caseParties: 2,
  tasks: 0,
  tasksPending: 0,
  communicationLogs: 3,
  submissionPackages: 1,
  generatedDocuments: 1,
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
  stage = "S8",
  extra: Record<string, unknown> = {},
) {
  return {
    id: "case-co01",
    orgId: "org-1",
    customerId: "cust-co01",
    caseTypeCode: "business_manager_visa",
    stage,
    groupId: "group-co01",
    ownerUserId: "user-co01",
    dueAt: "2026-10-01",
    caseName: "結案テスト案件",
    currentWorkflowStepCode: stepCode,
    visaPlan: "new_establishment",
    supplementCount: 0,
    resultOutcome: null,
    postApprovalStage: null,
    coeIssuedAt: null,
    coeExpiryDate: null,
    coeSentAt: null,
    overseasVisaStartAt: null,
    entryConfirmedAt: null,
    ...extra,
  };
}

function residencePeriodFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: "rp-co01",
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

function successCloseoutFixture(
  allSatisfied: boolean,
  preconditions: Array<{ code: string; label: string; satisfied: boolean }>,
) {
  return { allSatisfied, preconditions };
}

function buildAggregate(overrides: Record<string, unknown> = {}) {
  return {
    case: bmvCaseRow("ENTRY_SUCCESS"),
    deepLink: DEEP_LINK,
    counts: COUNTS,
    billing: billingFixture(),
    latestValidation: null,
    latestSubmission: null,
    latestReview: null,
    documentProgressByProvider: [],
    failureCloseoutCheck: null,
    currentResidencePeriod: null,
    successCloseoutCheck: null,
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════
//  4. REMINDER FAILURE ADAPTER — blocking success closeout narrative
// ═══════════════════════════════════════════════════════════════════

describe("reminderFailure adapter from aggregate (p1-qa-001-03)", () => {
  it("populated when reminderCreated=false and reminderError exists", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate({
        case: bmvCaseRow("ENTRY_SUCCESS", "S8"),
        currentResidencePeriod: residencePeriodFixture({
          reminderCreated: false,
          reminderError: "SMTP connection timeout",
          reminderLastAttemptAt: "2026-04-20T10:00:00.000Z",
          reminderAttemptCount: 2,
        }),
      }),
    )!;
    const rf = result.detail.reminderFailure!;
    expect(rf).not.toBeNull();
    expect(rf.reason).toBe("SMTP connection timeout");
    expect(rf.attemptCount).toBe(2);
    expect(rf.canRetry).toBe(true);
  });

  it("canRetry is false when S9 readonly", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate({
        case: bmvCaseRow("ENTRY_SUCCESS", "S9"),
        currentResidencePeriod: residencePeriodFixture({
          reminderCreated: false,
          reminderError: "Service unavailable",
          reminderLastAttemptAt: "2026-04-20T10:00:00.000Z",
          reminderAttemptCount: 3,
        }),
      }),
    )!;
    const rf = result.detail.reminderFailure!;
    expect(rf).not.toBeNull();
    expect(rf.canRetry).toBe(false);
  });

  it("null when reminderCreated=true (no failure)", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate({
        case: bmvCaseRow("ENTRY_SUCCESS", "S8"),
        currentResidencePeriod: residencePeriodFixture({
          reminderCreated: true,
        }),
      }),
    )!;
    expect(result.detail.reminderFailure).toBeNull();
  });

  it("null when no reminderError even if reminderCreated=false", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate({
        case: bmvCaseRow("ENTRY_SUCCESS", "S8"),
        currentResidencePeriod: residencePeriodFixture({
          reminderCreated: false,
        }),
      }),
    )!;
    expect(result.detail.reminderFailure).toBeNull();
  });

  it("null when currentResidencePeriod absent", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate({
        case: bmvCaseRow("ENTRY_SUCCESS", "S8"),
      }),
    )!;
    expect(result.detail.reminderFailure).toBeNull();
  });

  it("null for non-BMV case even with residence period", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate({
        case: {
          id: "case-nonbmv",
          stage: "S8",
          caseTypeCode: "general_visa",
          ownerUserId: "user-01",
        },
        currentResidencePeriod: residencePeriodFixture({
          reminderCreated: false,
          reminderError: "Some error",
        }),
      }),
    )!;
    expect(result.detail.reminderFailure).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════
//  5. FAILURE REASON CODES — all 4 reason codes display correctly
// ═══════════════════════════════════════════════════════════════════

describe("failure closeout reason code display (p1-qa-001-03)", () => {
  const REASON_CODES = [
    {
      code: "VISA_REJECTED",
      label: "签证拒否",
      canDirectClose: true,
      closeReasonRequired: false,
    },
    {
      code: "APPLICATION_REJECTED",
      label: "申請却下",
      canDirectClose: true,
      closeReasonRequired: false,
    },
    {
      code: "CLIENT_WITHDRAWN",
      label: "顧客取下げ",
      canDirectClose: false,
      closeReasonRequired: true,
    },
    {
      code: "MANUAL_FAILURE_CLOSE",
      label: "手動失敗結案",
      canDirectClose: false,
      closeReasonRequired: true,
    },
  ];

  for (const rc of REASON_CODES) {
    describe(`reasonCode=${rc.code}`, () => {
      const result = adaptCaseDetailAggregate(
        buildAggregate({
          case: bmvCaseRow("VISA_REJECTED", "S9"),
          failureCloseoutCheck: {
            isFailurePath: true,
            attribution: {
              reasonCode: rc.code,
              reasonLabel: rc.label,
              canDirectClose: rc.canDirectClose,
              closeReasonRequired: rc.closeReasonRequired,
            },
          },
        }),
      )!;

      it("failureCloseout is populated", () => {
        expect(result.detail.failureCloseout).not.toBeNull();
      });

      it(`reasonCode is ${rc.code}`, () => {
        expect(result.detail.failureCloseout!.reasonCode).toBe(rc.code);
      });

      it(`reasonLabel is ${rc.label}`, () => {
        expect(result.detail.failureCloseout!.reasonLabel).toBe(rc.label);
      });

      it(`canDirectClose is ${rc.canDirectClose}`, () => {
        expect(result.detail.failureCloseout!.canDirectClose).toBe(
          rc.canDirectClose,
        );
      });

      it(`closeReasonRequired is ${rc.closeReasonRequired}`, () => {
        expect(result.detail.failureCloseout!.closeReasonRequired).toBe(
          rc.closeReasonRequired,
        );
      });
    });
  }
});

// ═══════════════════════════════════════════════════════════════════
//  6. CLOSEOUT ERROR CODE CLASSIFICATION — regression
// ═══════════════════════════════════════════════════════════════════

describe("closeout error code classification (p1-qa-001-03)", () => {
  it("CASE_SUCCESS_CLOSEOUT_BLOCKED is a gate block", () => {
    expect(isGateBlockError("CASE_SUCCESS_CLOSEOUT_BLOCKED")).toBe(true);
  });

  it("CASE_FAILURE_CLOSEOUT_ATTRIBUTION_REQUIRED is a gate block", () => {
    expect(isGateBlockError("CASE_FAILURE_CLOSEOUT_ATTRIBUTION_REQUIRED")).toBe(
      true,
    );
  });

  it("CASE_REMINDER_CREATION_FAILED resolves to correct i18n", () => {
    expect(resolveWriteErrorI18nKey("CASE_REMINDER_CREATION_FAILED")).toBe(
      "cases.writeErrors.reminderCreationFailed",
    );
  });

  it("success closeout blocked resolves to correct i18n", () => {
    expect(resolveWriteErrorI18nKey("CASE_SUCCESS_CLOSEOUT_BLOCKED")).toBe(
      "cases.writeErrors.successCloseoutBlocked",
    );
  });

  it("failure closeout attribution resolves to correct i18n", () => {
    expect(
      resolveWriteErrorI18nKey("CASE_FAILURE_CLOSEOUT_ATTRIBUTION_REQUIRED"),
    ).toBe("cases.writeErrors.failureCloseoutAttributionRequired");
  });

  it("unknown closeout error falls back to unknown", () => {
    expect(resolveWriteErrorI18nKey("CASE_CLOSEOUT_SOMETHING_ELSE")).toBe(
      "cases.writeErrors.unknown",
    );
  });
});

// ═══════════════════════════════════════════════════════════════════
//  7. SUCCESS CLOSEOUT + REMINDER FAILURE COEXISTENCE
// ═══════════════════════════════════════════════════════════════════

describe("success closeout with reminder failure (p1-qa-001-03)", () => {
  it("successCloseout.allSatisfied=false AND reminderFailure populated together", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate({
        case: bmvCaseRow("ENTRY_SUCCESS", "S8"),
        currentResidencePeriod: residencePeriodFixture({
          reminderCreated: false,
          reminderError: "Reminder service down",
          reminderLastAttemptAt: "2026-04-25T09:00:00.000Z",
          reminderAttemptCount: 1,
        }),
        successCloseoutCheck: successCloseoutFixture(false, [
          { code: "ENTRY_CONFIRMED", label: "入境已確認", satisfied: true },
          {
            code: "RESIDENCE_PERIOD_RECORDED",
            label: "在留期間已録入",
            satisfied: true,
          },
          {
            code: "RENEWAL_REMINDER_SCHEDULED",
            label: "续签提醒已設定",
            satisfied: false,
          },
        ]),
      }),
    )!;

    expect(result.detail.successCloseout).not.toBeNull();
    expect(result.detail.successCloseout!.allSatisfied).toBe(false);
    const unsatisfied = result.detail.successCloseout!.preconditions.filter(
      (p) => !p.satisfied,
    );
    expect(unsatisfied).toHaveLength(1);
    expect(unsatisfied[0].code).toBe("RENEWAL_REMINDER_SCHEDULED");

    expect(result.detail.reminderFailure).not.toBeNull();
    expect(result.detail.reminderFailure!.reason).toBe("Reminder service down");
    expect(result.detail.reminderFailure!.canRetry).toBe(true);
  });

  it("successCloseout.allSatisfied=true when reminder succeeded (no failure)", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate({
        case: bmvCaseRow("ENTRY_SUCCESS", "S8"),
        currentResidencePeriod: residencePeriodFixture({
          reminderCreated: true,
        }),
        successCloseoutCheck: successCloseoutFixture(true, [
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
        ]),
      }),
    )!;

    expect(result.detail.successCloseout!.allSatisfied).toBe(true);
    expect(result.detail.reminderFailure).toBeNull();
  });
});
