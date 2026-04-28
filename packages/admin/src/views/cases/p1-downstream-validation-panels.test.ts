// ── Test Ownership ──────────────────────────────────────────────
// Owner: p1-qa-002-02 — P1 downstream validation panels/info set.
// Covers: §6-§11 residence/reminder/supplement/failure/success closeout.
// Does NOT test: blueprint stability, field sets, workflow summary, survey/quote,
//   COE gate, non-BMV degradation smoke, or full lifecycle smoke.
// ────────────────────────────────────────────────────────────────

import { describe, expect, it } from "vitest";

import { adaptCaseDetailAggregate } from "./model/CaseAdapterDetailAggregate";
import {
  buildResidencePeriodPanel,
  buildReminderSchedulePanel,
  buildSuccessCloseoutInfo,
} from "./model/CaseAdapterResidenceReminder";
import {
  buildSupplementRoundInfo,
  buildReminderFailureInfo,
} from "./model/CaseAdapterSupplementReminder";

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
    deepLink: { customerId: "cust-p1-001", customerName: "P1検証太郎" },
    counts: { questionnaireItemsTotal: 3, questionnaireItemsDone: 2 },
    billing: { quotePrice: 500000, finalPaymentPaid: false },
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

function canonicalResidencePeriod(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    id: "rp-001",
    visaType: "business-management",
    statusOfResidence: "経営・管理",
    periodYears: 1,
    periodLabel: "1年",
    validFrom: "2026-01-15",
    validUntil: "2027-01-15",
    cardNumber: "AB12345678CD",
    entryDate: "2026-01-15",
    reminderCreated: true,
    reminderError: null,
    reminderLastAttemptAt: null,
    reminderAttemptCount: 0,
    ...overrides,
  };
}

function canonicalSuccessCloseoutCheck(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    allSatisfied: true,
    preconditions: [
      { code: "ENTRY_CONFIRMED", label: "入境確認済み", satisfied: true },
      {
        code: "RESIDENCE_PERIOD_RECORDED",
        label: "在留期間登録済み",
        satisfied: true,
      },
      {
        code: "RENEWAL_REMINDER_SCHEDULED",
        label: "更新リマインダー設定済み",
        satisfied: true,
      },
    ],
    ...overrides,
  };
}

describe("§6 residence period panel (p1-qa-002-02)", () => {
  it("null input returns null", () => {
    expect(buildResidencePeriodPanel(null)).toBeNull();
  });

  it("missing id returns null", () => {
    expect(buildResidencePeriodPanel({ visaType: "test" })).toBeNull();
  });

  it("valid input produces residence period model", () => {
    const rp = buildResidencePeriodPanel(canonicalResidencePeriod());
    expect(rp).not.toBeNull();
    expect(rp!.id).toBe("rp-001");
    expect(rp!.visaType).toBe("business-management");
    expect(rp!.residenceStatus).toBe("経営・管理");
    expect(rp!.periodLabel).toBe("1年");
    expect(rp!.cardNumber).toBe("AB12345678CD");
    expect(rp!.reminderCreated).toBe(true);
  });

  it("startDate and endDate are formatted", () => {
    const rp = buildResidencePeriodPanel(canonicalResidencePeriod());
    expect(rp!.startDate).toBeTruthy();
    expect(rp!.endDate).toBeTruthy();
  });

  it("recordMeta includes card and entry date info", () => {
    const rp = buildResidencePeriodPanel(canonicalResidencePeriod());
    expect(rp!.recordMeta).toContain("AB12345678CD");
    expect(rp!.recordMeta).toContain("提醒: 已设置");
  });

  it("reminderCreated=false changes recordMeta", () => {
    const rp = buildResidencePeriodPanel(
      canonicalResidencePeriod({ reminderCreated: false }),
    );
    expect(rp!.reminderCreated).toBe(false);
    expect(rp!.recordMeta).toContain("提醒: 未设置");
  });

  it("aggregate adapter wires residence period from slice", () => {
    const result = adaptCaseDetailAggregate(
      canonicalBmvAggregateDto(
        { currentWorkflowStepCode: "ENTRY_SUCCESS", stage: "S8" },
        { currentResidencePeriod: canonicalResidencePeriod() },
      ),
    );
    expect(result!.detail.residencePeriod).not.toBeNull();
    expect(result!.detail.residencePeriod!.id).toBe("rp-001");
  });
});

describe("§7 reminder schedule panel (p1-qa-002-02)", () => {
  it("null input returns null", () => {
    expect(buildReminderSchedulePanel(null)).toBeNull();
  });

  it("missing validUntil returns null", () => {
    expect(buildReminderSchedulePanel({ id: "rp-001" })).toBeNull();
  });

  it("valid input produces 3 reminder entries (180/90/30)", () => {
    const rs = buildReminderSchedulePanel(canonicalResidencePeriod());
    expect(rs).not.toBeNull();
    expect(rs!.reminders).toHaveLength(3);
    expect(rs!.reminders.map((r) => r.label)).toEqual([
      "180 日前",
      "90 日前",
      "30 日前",
    ]);
  });

  it("reminderCreated=true sets tone=success and statusLabel=設定済み", () => {
    const rs = buildReminderSchedulePanel(canonicalResidencePeriod());
    expect(rs!.tone).toBe("success");
    expect(rs!.statusLabel).toBe("設定済み");
  });

  it("reminderCreated=false sets tone=neutral and statusLabel=未設定", () => {
    const rs = buildReminderSchedulePanel(
      canonicalResidencePeriod({ reminderCreated: false }),
    );
    expect(rs!.tone).toBe("neutral");
    expect(rs!.statusLabel).toBe("未設定");
  });

  it("aggregate adapter wires reminder schedule from slice", () => {
    const result = adaptCaseDetailAggregate(
      canonicalBmvAggregateDto(
        { currentWorkflowStepCode: "ENTRY_SUCCESS", stage: "S8" },
        { currentResidencePeriod: canonicalResidencePeriod() },
      ),
    );
    expect(result!.detail.reminderSchedule).not.toBeNull();
    expect(result!.detail.reminderSchedule!.reminders).toHaveLength(3);
  });
});

describe("§8 supplement round info (p1-qa-002-02)", () => {
  it("non-supplement step returns null", () => {
    expect(
      buildSupplementRoundInfo(
        { currentWorkflowStepCode: "UNDER_REVIEW", supplementCount: 0 },
        false,
      ),
    ).toBeNull();
  });

  it("NEED_SUPPLEMENT produces notice_received status", () => {
    const info = buildSupplementRoundInfo(
      {
        currentWorkflowStepCode: "NEED_SUPPLEMENT",
        supplementCount: 2,
        lastSupplementNoticeDate: "2026-04-15",
        lastSupplementReason: "追加資料が必要",
        supplementDeadline: "2026-04-30",
      },
      false,
    );
    expect(info).not.toBeNull();
    expect(info!.statusKey).toBe("notice_received");
    expect(info!.round).toBe(2);
    expect(info!.reason).toBe("追加資料が必要");
    expect(info!.canResubmit).toBe(true);
  });

  it("SUPPLEMENT_PROCESSING produces processing status", () => {
    const info = buildSupplementRoundInfo(
      {
        currentWorkflowStepCode: "SUPPLEMENT_PROCESSING",
        supplementCount: 1,
        lastSupplementNoticeDate: "2026-04-10",
        lastSupplementReason: "書類不備",
        supplementDeadline: null,
      },
      false,
    );
    expect(info).not.toBeNull();
    expect(info!.statusKey).toBe("processing");
    expect(info!.canResubmit).toBe(false);
  });

  it("readonly case cannot resubmit", () => {
    const info = buildSupplementRoundInfo(
      { currentWorkflowStepCode: "NEED_SUPPLEMENT", supplementCount: 1 },
      true,
    );
    expect(info!.canResubmit).toBe(false);
  });

  it("supplementCount=0 defaults round to 1", () => {
    const info = buildSupplementRoundInfo(
      { currentWorkflowStepCode: "NEED_SUPPLEMENT", supplementCount: 0 },
      false,
    );
    expect(info!.round).toBe(1);
  });

  it("aggregate adapter wires supplement round for BMV case", () => {
    const result = adaptCaseDetailAggregate(
      canonicalBmvAggregateDto({
        currentWorkflowStepCode: "NEED_SUPPLEMENT",
        supplementCount: 2,
        lastSupplementNoticeDate: "2026-04-15",
        lastSupplementReason: "追加資料",
        supplementDeadline: "2026-04-30",
      }),
    );
    expect(result!.detail.supplementRound).not.toBeNull();
    expect(result!.detail.supplementRound!.round).toBe(2);
  });
});

describe("§9 reminder failure info (p1-qa-002-02)", () => {
  it("null input returns null", () => {
    expect(buildReminderFailureInfo(null, false)).toBeNull();
  });

  it("reminderCreated=true returns null", () => {
    expect(
      buildReminderFailureInfo(canonicalResidencePeriod(), false),
    ).toBeNull();
  });

  it("reminderCreated=false with error returns failure info", () => {
    const info = buildReminderFailureInfo(
      canonicalResidencePeriod({
        reminderCreated: false,
        reminderError: "Scheduler timeout",
        reminderLastAttemptAt: "2026-04-20T10:00:00.000Z",
        reminderAttemptCount: 3,
      }),
      false,
    );
    expect(info).not.toBeNull();
    expect(info!.reason).toBe("Scheduler timeout");
    expect(info!.attemptCount).toBe(3);
    expect(info!.canRetry).toBe(true);
  });

  it("readonly case cannot retry", () => {
    const info = buildReminderFailureInfo(
      canonicalResidencePeriod({
        reminderCreated: false,
        reminderError: "error",
      }),
      true,
    );
    expect(info!.canRetry).toBe(false);
  });

  it("reminderCreated=false without error returns null", () => {
    expect(
      buildReminderFailureInfo(
        canonicalResidencePeriod({
          reminderCreated: false,
          reminderError: null,
        }),
        false,
      ),
    ).toBeNull();
  });

  it("aggregate adapter wires reminder failure for BMV case", () => {
    const result = adaptCaseDetailAggregate(
      canonicalBmvAggregateDto(
        { currentWorkflowStepCode: "ENTRY_SUCCESS", stage: "S8" },
        {
          currentResidencePeriod: canonicalResidencePeriod({
            reminderCreated: false,
            reminderError: "timeout",
          }),
        },
      ),
    );
    expect(result!.detail.reminderFailure).not.toBeNull();
    expect(result!.detail.reminderFailure!.reason).toBe("timeout");
  });
});

describe("§10 failure closeout info (p1-qa-002-02)", () => {
  it("null failureCloseoutCheck produces null", () => {
    const result = adaptCaseDetailAggregate(canonicalBmvAggregateDto());
    expect(result!.detail.failureCloseout).toBeNull();
  });

  it("non-failure-path check produces null", () => {
    const result = adaptCaseDetailAggregate(
      canonicalBmvAggregateDto(
        {},
        { failureCloseoutCheck: { isFailurePath: false } },
      ),
    );
    expect(result!.detail.failureCloseout).toBeNull();
  });

  it("failure path with attribution produces closeout info", () => {
    const result = adaptCaseDetailAggregate(
      canonicalBmvAggregateDto(
        { currentWorkflowStepCode: "VISA_REJECTED", stage: "S9" },
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
    );
    expect(result!.detail.failureCloseout).not.toBeNull();
    expect(result!.detail.failureCloseout!.isFailurePath).toBe(true);
    expect(result!.detail.failureCloseout!.reasonCode).toBe("VISA_REJECTED");
    expect(result!.detail.failureCloseout!.canDirectClose).toBe(true);
    expect(result!.detail.failureCloseout!.closeReasonRequired).toBe(false);
  });

  it("failure path without attribution has null reason", () => {
    const result = adaptCaseDetailAggregate(
      canonicalBmvAggregateDto(
        {},
        { failureCloseoutCheck: { isFailurePath: true } },
      ),
    );
    expect(result!.detail.failureCloseout).not.toBeNull();
    expect(result!.detail.failureCloseout!.reasonCode).toBeNull();
    expect(result!.detail.failureCloseout!.canDirectClose).toBe(false);
  });
});

describe("§11 success closeout info (p1-qa-002-02)", () => {
  it("null input returns null", () => {
    expect(buildSuccessCloseoutInfo(null)).toBeNull();
  });

  it("missing preconditions array returns null", () => {
    expect(buildSuccessCloseoutInfo({ allSatisfied: true })).toBeNull();
  });

  it("valid input with all satisfied produces info", () => {
    const info = buildSuccessCloseoutInfo(canonicalSuccessCloseoutCheck());
    expect(info).not.toBeNull();
    expect(info!.allSatisfied).toBe(true);
    expect(info!.preconditions).toHaveLength(3);
    expect(info!.preconditions.every((p) => p.satisfied)).toBe(true);
  });

  it("partially satisfied sets allSatisfied=false", () => {
    const info = buildSuccessCloseoutInfo(
      canonicalSuccessCloseoutCheck({
        allSatisfied: false,
        preconditions: [
          { code: "ENTRY_CONFIRMED", label: "入境確認済み", satisfied: true },
          {
            code: "RESIDENCE_PERIOD_RECORDED",
            label: "在留期間登録済み",
            satisfied: false,
          },
          {
            code: "RENEWAL_REMINDER_SCHEDULED",
            label: "更新リマインダー設定済み",
            satisfied: false,
          },
        ],
      }),
    );
    expect(info!.allSatisfied).toBe(false);
    expect(info!.preconditions.filter((p) => p.satisfied)).toHaveLength(1);
  });

  it("precondition codes match expected closeout gates", () => {
    const info = buildSuccessCloseoutInfo(canonicalSuccessCloseoutCheck());
    const codes = info!.preconditions.map((p) => p.code);
    expect(codes).toContain("ENTRY_CONFIRMED");
    expect(codes).toContain("RESIDENCE_PERIOD_RECORDED");
    expect(codes).toContain("RENEWAL_REMINDER_SCHEDULED");
  });

  it("aggregate adapter wires success closeout from slice", () => {
    const result = adaptCaseDetailAggregate(
      canonicalBmvAggregateDto(
        { currentWorkflowStepCode: "ENTRY_SUCCESS", stage: "S8" },
        { successCloseoutCheck: canonicalSuccessCloseoutCheck() },
      ),
    );
    expect(result!.detail.successCloseout).not.toBeNull();
    expect(result!.detail.successCloseout!.allSatisfied).toBe(true);
    expect(result!.detail.successCloseout!.preconditions).toHaveLength(3);
  });
});
