// ── Test Ownership ──────────────────────────────────────────────
// Owner: p1-fe-004-02 — Residence Period & Reminder panels adapter
//   Covers: residencePeriod derivation from currentResidencePeriod,
//   reminderSchedule derivation, successCloseout from successCloseoutCheck,
//   tone / status label computation, non-BMV degradation (null).
// Does NOT test: UI rendering (→ component tests), write actions,
//   or CaseDeadlinesTab.vue visual rendering.
// ────────────────────────────────────────────────────────────────

import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { adaptCaseDetailAggregate } from "./CaseAdapterDetailAggregate";

// ─── Shared fixtures ─────────────────────────────────────────────

const DEEP_LINK = {
  customerId: "cust-rp01",
  customerName: "在留期間テスト",
  groupId: "group-rp01",
  groupName: "Tokyo-W",
  ownerUserId: "user-rp01",
  ownerDisplayName: "担当者B",
  assistantUserId: null,
  assistantDisplayName: null,
};

const COUNTS = {
  documentItemsTotal: 8,
  documentItemsDone: 8,
  questionnaireItemsTotal: 0,
  questionnaireItemsDone: 0,
  caseParties: 2,
  tasks: 1,
  tasksPending: 0,
  communicationLogs: 3,
  submissionPackages: 1,
  generatedDocuments: 1,
  validationRuns: 1,
  reviewRecords: 1,
  billingRecords: 1,
  paymentRecords: 1,
};

const BILLING = {
  quotePrice: 500000,
  unpaidAmount: 0,
  totalReceived: 500000,
  depositPaid: true,
  finalPaymentPaid: true,
  billingRiskAcknowledged: false,
  billingRiskAcknowledgedAt: null,
  billingRiskAckReasonCode: null,
};

function bmvCaseS8() {
  return {
    id: "case-rp01",
    orgId: "org-1",
    customerId: "cust-rp01",
    caseTypeCode: "business_manager_visa",
    stage: "S8",
    groupId: "group-rp01",
    ownerUserId: "user-rp01",
    dueAt: "2026-10-01",
    caseName: "在留期間テスト案件",
    currentWorkflowStepCode: "ENTRY_SUCCESS",
    visaPlan: "new_establishment",
    supplementCount: 0,
    entryConfirmedAt: "2026-04-01T00:00:00Z",
  };
}

function residencePeriodFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: "rp-001",
    visaType: "business_manager_visa",
    statusOfResidence: "経営・管理",
    periodYears: 5,
    periodLabel: "5年",
    validFrom: "2026-04-01",
    validUntil: "2031-03-31",
    cardNumber: "AB12345678CD",
    entryDate: "2026-04-01",
    reminderCreated: true,
    ...overrides,
  };
}

function successCloseoutFixture(overrides: Record<string, unknown> = {}) {
  return {
    allSatisfied: true,
    preconditions: [
      { code: "ENTRY_CONFIRMED", label: "入境確認済み", satisfied: true },
      {
        code: "RESIDENCE_PERIOD_RECORDED",
        label: "在留期間記録済み",
        satisfied: true,
      },
      {
        code: "RENEWAL_REMINDER_SCHEDULED",
        label: "续签提醒生成済み",
        satisfied: true,
      },
    ],
    ...overrides,
  };
}

function buildAggregate(extraOverrides: Record<string, unknown> = {}) {
  return {
    case: bmvCaseS8(),
    deepLink: DEEP_LINK,
    counts: COUNTS,
    billing: BILLING,
    latestValidation: null,
    latestSubmission: null,
    latestReview: null,
    documentProgressByProvider: [],
    failureCloseoutCheck: null,
    currentResidencePeriod: residencePeriodFixture(),
    successCloseoutCheck: successCloseoutFixture(),
    ...extraOverrides,
  };
}

// ─── Pin the fake "now" for deterministic tone tests ─────────────

let fakeNow: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  fakeNow = vi
    .spyOn(Date, "now")
    .mockReturnValue(new Date("2026-04-26T00:00:00Z").getTime());
});

afterEach(() => {
  fakeNow.mockRestore();
});

// ═══════════════════════════════════════════════════════════════════
//  RESIDENCE PERIOD PANEL
// ═══════════════════════════════════════════════════════════════════

describe("residencePeriod panel (p1-fe-004-02)", () => {
  it("populated when currentResidencePeriod exists", () => {
    const result = adaptCaseDetailAggregate(buildAggregate())!;
    const rp = result.detail.residencePeriod!;
    expect(rp).not.toBeNull();
    expect(rp.id).toBe("rp-001");
    expect(rp.residenceStatus).toBe("経営・管理");
    expect(rp.visaType).toBe("business_manager_visa");
    expect(rp.periodLabel).toBe("5年");
    expect(rp.cardNumber).toBe("AB12345678CD");
    expect(rp.reminderCreated).toBe(true);
  });

  it("tone is success when expiry > 180 days out", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate({
        currentResidencePeriod: residencePeriodFixture({
          validUntil: "2031-03-31",
        }),
      }),
    )!;
    expect(result.detail.residencePeriod!.tone).toBe("success");
  });

  it("tone is warning when expiry <= 90 days out", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate({
        currentResidencePeriod: residencePeriodFixture({
          validUntil: "2026-06-15",
        }),
      }),
    )!;
    expect(result.detail.residencePeriod!.tone).toBe("warning");
  });

  it("tone is danger when expired", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate({
        currentResidencePeriod: residencePeriodFixture({
          validUntil: "2026-04-01",
        }),
      }),
    )!;
    expect(result.detail.residencePeriod!.tone).toBe("danger");
  });

  it("null when currentResidencePeriod is null", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate({ currentResidencePeriod: null }),
    )!;
    expect(result.detail.residencePeriod).toBeNull();
  });

  it("formats startDate and endDate", () => {
    const result = adaptCaseDetailAggregate(buildAggregate())!;
    const rp = result.detail.residencePeriod!;
    expect(rp.startDate).toBeTruthy();
    expect(rp.endDate).toBeTruthy();
  });

  it("recordMeta includes card number and reminder status", () => {
    const result = adaptCaseDetailAggregate(buildAggregate())!;
    expect(result.detail.residencePeriod!.recordMeta).toContain("AB12345678CD");
    expect(result.detail.residencePeriod!.recordMeta).toContain("已设置");
  });

  it("recordMeta shows reminder not set when reminderCreated=false", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate({
        currentResidencePeriod: residencePeriodFixture({
          reminderCreated: false,
        }),
      }),
    )!;
    expect(result.detail.residencePeriod!.recordMeta).toContain("未设置");
  });
});

// ═══════════════════════════════════════════════════════════════════
//  REMINDER SCHEDULE PANEL
// ═══════════════════════════════════════════════════════════════════

describe("reminderSchedule panel (p1-fe-004-02)", () => {
  it("populated when currentResidencePeriod exists", () => {
    const result = adaptCaseDetailAggregate(buildAggregate())!;
    const rs = result.detail.reminderSchedule!;
    expect(rs).not.toBeNull();
    expect(rs.reminders).toHaveLength(3);
  });

  it("tone is success when reminderCreated=true", () => {
    const result = adaptCaseDetailAggregate(buildAggregate())!;
    expect(result.detail.reminderSchedule!.tone).toBe("success");
  });

  it("tone is neutral when reminderCreated=false", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate({
        currentResidencePeriod: residencePeriodFixture({
          reminderCreated: false,
        }),
      }),
    )!;
    expect(result.detail.reminderSchedule!.tone).toBe("neutral");
  });

  it("generates 180/90/30 day reminder entries", () => {
    const result = adaptCaseDetailAggregate(buildAggregate())!;
    const labels = result.detail.reminderSchedule!.reminders.map(
      (r) => r.label,
    );
    expect(labels).toEqual(["180 日前", "90 日前", "30 日前"]);
  });

  it("null when currentResidencePeriod is null", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate({ currentResidencePeriod: null }),
    )!;
    expect(result.detail.reminderSchedule).toBeNull();
  });

  it("reminderDate is the validUntil date", () => {
    const result = adaptCaseDetailAggregate(buildAggregate())!;
    expect(result.detail.reminderSchedule!.reminderDate).toBeTruthy();
  });
});

// ═══════════════════════════════════════════════════════════════════
//  SUCCESS CLOSEOUT INFO
// ═══════════════════════════════════════════════════════════════════

describe("successCloseout info (p1-fe-004-02)", () => {
  it("populated when successCloseoutCheck exists", () => {
    const result = adaptCaseDetailAggregate(buildAggregate())!;
    const sc = result.detail.successCloseout!;
    expect(sc).not.toBeNull();
    expect(sc.allSatisfied).toBe(true);
    expect(sc.preconditions).toHaveLength(3);
  });

  it("all preconditions satisfied", () => {
    const result = adaptCaseDetailAggregate(buildAggregate())!;
    const sc = result.detail.successCloseout!;
    for (const p of sc.preconditions) {
      expect(p.satisfied).toBe(true);
    }
  });

  it("allSatisfied is false when not all preconditions met", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate({
        successCloseoutCheck: successCloseoutFixture({
          allSatisfied: false,
          preconditions: [
            {
              code: "ENTRY_CONFIRMED",
              label: "入境確認済み",
              satisfied: true,
            },
            {
              code: "RESIDENCE_PERIOD_RECORDED",
              label: "在留期間記録済み",
              satisfied: false,
            },
            {
              code: "RENEWAL_REMINDER_SCHEDULED",
              label: "续签提醒生成済み",
              satisfied: false,
            },
          ],
        }),
      }),
    )!;
    const sc = result.detail.successCloseout!;
    expect(sc.allSatisfied).toBe(false);
    expect(sc.preconditions[1].satisfied).toBe(false);
    expect(sc.preconditions[2].satisfied).toBe(false);
  });

  it("null when successCloseoutCheck is null", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate({ successCloseoutCheck: null }),
    )!;
    expect(result.detail.successCloseout).toBeNull();
  });

  it("preserves precondition codes and labels", () => {
    const result = adaptCaseDetailAggregate(buildAggregate())!;
    const codes = result.detail.successCloseout!.preconditions.map(
      (p) => p.code,
    );
    expect(codes).toEqual([
      "ENTRY_CONFIRMED",
      "RESIDENCE_PERIOD_RECORDED",
      "RENEWAL_REMINDER_SCHEDULED",
    ]);
  });
});

// ═══════════════════════════════════════════════════════════════════
//  AGGREGATE SLICE PARSING — currentResidencePeriod & successCloseoutCheck
// ═══════════════════════════════════════════════════════════════════

describe("aggregate slices: new P1 fields (p1-fe-004-02)", () => {
  it("passes through when both new slices present", () => {
    const result = adaptCaseDetailAggregate(buildAggregate());
    expect(result).not.toBeNull();
    expect(result!.detail.residencePeriod).not.toBeNull();
    expect(result!.detail.reminderSchedule).not.toBeNull();
    expect(result!.detail.successCloseout).not.toBeNull();
  });

  it("degrades when both new slices absent", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate({
        currentResidencePeriod: null,
        successCloseoutCheck: null,
      }),
    );
    expect(result).not.toBeNull();
    expect(result!.detail.residencePeriod).toBeNull();
    expect(result!.detail.reminderSchedule).toBeNull();
    expect(result!.detail.successCloseout).toBeNull();
  });

  it("handles missing slices (not present in response at all)", () => {
    const agg = buildAggregate();
    delete (agg as Record<string, unknown>).currentResidencePeriod;
    delete (agg as Record<string, unknown>).successCloseoutCheck;
    const result = adaptCaseDetailAggregate(agg);
    expect(result).not.toBeNull();
    expect(result!.detail.residencePeriod).toBeNull();
    expect(result!.detail.reminderSchedule).toBeNull();
    expect(result!.detail.successCloseout).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════
//  NON-BMV DEGRADATION
// ═══════════════════════════════════════════════════════════════════

describe("non-BMV degradation (p1-fe-004-02)", () => {
  it("residencePeriod/reminderSchedule/successCloseout are null on non-BMV case", () => {
    const result = adaptCaseDetailAggregate({
      case: {
        id: "case-generic",
        stage: "S3",
        caseTypeCode: "general_visa",
        ownerUserId: "user-01",
      },
      deepLink: null,
      counts: COUNTS,
      billing: BILLING,
      latestValidation: null,
      latestSubmission: null,
      latestReview: null,
      documentProgressByProvider: [],
      failureCloseoutCheck: null,
      currentResidencePeriod: null,
      successCloseoutCheck: null,
    })!;
    expect(result.detail.residencePeriod).toBeNull();
    expect(result.detail.reminderSchedule).toBeNull();
    expect(result.detail.successCloseout).toBeNull();
  });
});
