// ── Test Ownership ──────────────────────────────────────────────
// Owner: p1-fe-004-03 — COE reminder schedule + success closeout focused tests.
// Covers: reminderSchedule adapter and successCloseout adapter.
// Does NOT test: write lifecycles, error mapping/guards, residence panel, or detail-model integration.
// ────────────────────────────────────────────────────────────────

import { describe, expect, it } from "vitest";

import { adaptCaseDetailAggregate } from "./CaseAdapterDetailAggregate";

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

function successCloseoutFixture(
  allSatisfied: boolean,
  preconditions: Array<{ code: string; label: string; satisfied: boolean }>,
) {
  return { allSatisfied, preconditions };
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

describe("reminderSchedule adapter from aggregate (p1-fe-004-03)", () => {
  it("populated with 3 reminders (180/90/30) when validUntil present", () => {
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
    const rs = result.detail.reminderSchedule!;
    expect(rs).not.toBeNull();
    expect(rs.reminders).toHaveLength(3);
    expect(rs.reminders[0].label).toBe("180 日前");
    expect(rs.reminders[1].label).toBe("90 日前");
    expect(rs.reminders[2].label).toBe("30 日前");
  });

  it("tone is success when reminderCreated = true", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate(
        "ENTRY_SUCCESS",
        {},
        {
          case: bmvCaseRow("ENTRY_SUCCESS", "S8"),
          currentResidencePeriod: residencePeriodFixture({
            reminderCreated: true,
          }),
        },
      ),
    )!;
    expect(result.detail.reminderSchedule!.tone).toBe("success");
    expect(result.detail.reminderSchedule!.statusLabel).toBe("設定済み");
    expect(result.detail.reminderSchedule!.recordMeta).toBe(
      "180/90/30 日前リマインダー生成済み",
    );
  });

  it("tone is neutral when reminderCreated = false", () => {
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
    expect(result.detail.reminderSchedule!.tone).toBe("neutral");
    expect(result.detail.reminderSchedule!.statusLabel).toBe("未設定");
    expect(result.detail.reminderSchedule!.recordMeta).toBe(
      "リマインダー未生成",
    );
  });

  it("null when currentResidencePeriod is absent", () => {
    const result = adaptCaseDetailAggregate(buildAggregate("WAITING_PAYMENT"))!;
    expect(result.detail.reminderSchedule).toBeNull();
  });

  it("null when validUntil is empty", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate(
        "ENTRY_SUCCESS",
        {},
        {
          case: bmvCaseRow("ENTRY_SUCCESS", "S8"),
          currentResidencePeriod: residencePeriodFixture({ validUntil: "" }),
        },
      ),
    )!;
    expect(result.detail.reminderSchedule).toBeNull();
  });
});

describe("successCloseout adapter from aggregate (p1-fe-004-03)", () => {
  it("allSatisfied when all preconditions met", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate(
        "ENTRY_SUCCESS",
        {},
        {
          case: bmvCaseRow("ENTRY_SUCCESS", "S8"),
          successCloseoutCheck: successCloseoutFixture(true, [
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
          ]),
        },
      ),
    )!;
    const sc = result.detail.successCloseout!;
    expect(sc).not.toBeNull();
    expect(sc.allSatisfied).toBe(true);
    expect(sc.preconditions).toHaveLength(3);
    expect(sc.preconditions.every((p) => p.satisfied)).toBe(true);
  });

  it("not allSatisfied when reminder not scheduled (blocking)", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate(
        "ENTRY_SUCCESS",
        {},
        {
          case: bmvCaseRow("ENTRY_SUCCESS", "S8"),
          successCloseoutCheck: successCloseoutFixture(false, [
            { code: "ENTRY_CONFIRMED", label: "入境已确认", satisfied: true },
            {
              code: "RESIDENCE_PERIOD_RECORDED",
              label: "在留期间已录入",
              satisfied: true,
            },
            {
              code: "RENEWAL_REMINDER_SCHEDULED",
              label: "续签提醒已设置",
              satisfied: false,
            },
          ]),
        },
      ),
    )!;
    const sc = result.detail.successCloseout!;
    expect(sc.allSatisfied).toBe(false);
    const unsatisfied = sc.preconditions.filter((p) => !p.satisfied);
    expect(unsatisfied).toHaveLength(1);
    expect(unsatisfied[0].code).toBe("RENEWAL_REMINDER_SCHEDULED");
  });

  it("not allSatisfied when residence period not recorded", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate(
        "ENTRY_SUCCESS",
        {},
        {
          case: bmvCaseRow("ENTRY_SUCCESS", "S8"),
          successCloseoutCheck: successCloseoutFixture(false, [
            { code: "ENTRY_CONFIRMED", label: "入境已確認", satisfied: true },
            {
              code: "RESIDENCE_PERIOD_RECORDED",
              label: "在留期間已録入",
              satisfied: false,
            },
            {
              code: "RENEWAL_REMINDER_SCHEDULED",
              label: "续签提醒已設定",
              satisfied: false,
            },
          ]),
        },
      ),
    )!;
    const sc = result.detail.successCloseout!;
    expect(sc.allSatisfied).toBe(false);
    const unsatisfied = sc.preconditions.filter((p) => !p.satisfied);
    expect(unsatisfied).toHaveLength(2);
    expect(unsatisfied.map((p) => p.code)).toContain(
      "RESIDENCE_PERIOD_RECORDED",
    );
    expect(unsatisfied.map((p) => p.code)).toContain(
      "RENEWAL_REMINDER_SCHEDULED",
    );
  });

  it("null when successCloseoutCheck is absent", () => {
    const result = adaptCaseDetailAggregate(buildAggregate("WAITING_PAYMENT"))!;
    expect(result.detail.successCloseout).toBeNull();
  });

  it("null when successCloseoutCheck has no preconditions array", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate(
        "ENTRY_SUCCESS",
        {},
        {
          case: bmvCaseRow("ENTRY_SUCCESS", "S8"),
          successCloseoutCheck: { allSatisfied: false },
        },
      ),
    )!;
    expect(result.detail.successCloseout).toBeNull();
  });

  it("preconditions with empty code are filtered out", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate(
        "ENTRY_SUCCESS",
        {},
        {
          case: bmvCaseRow("ENTRY_SUCCESS", "S8"),
          successCloseoutCheck: successCloseoutFixture(false, [
            { code: "ENTRY_CONFIRMED", label: "入境已確認", satisfied: true },
            { code: "", label: "invalid", satisfied: false },
          ]),
        },
      ),
    )!;
    expect(result.detail.successCloseout!.preconditions).toHaveLength(1);
    expect(result.detail.successCloseout!.preconditions[0].code).toBe(
      "ENTRY_CONFIRMED",
    );
  });
});
