import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  SUCCESS_CLOSEOUT_PRECONDITION_CODES,
  toResidencePeriodSummary,
  requiresSuccessCloseoutCheck,
  checkSuccessCloseoutPreconditions,
} from "./cases.types-residence-closeout";
const BASE_CASE = {
  id: "case-001",
  orgId: "org-001",
  customerId: "cust-001",
  caseTypeCode: "business_manager_visa",
  status: "S8",
  stage: "S8",
  groupId: null,
  ownerUserId: "user-001",
  openedAt: "2026-01-01T00:00:00.000Z",
  dueAt: null,
  metadata: {},
  caseNo: null,
  caseName: null,
  caseSubtype: null,
  applicationType: null,
  applicationFlowType: null,
  visaPlan: null,
  postApprovalStage: null,
  coeIssuedAt: null,
  coeExpiryDate: null,
  coeSentAt: null,
  closeReason: null,
  supplementCount: 0,
  companyId: null,
  priority: "normal",
  riskLevel: "normal",
  assistantUserId: null,
  sourceChannel: null,
  signedAt: null,
  acceptedAt: null,
  submissionDate: null,
  resultDate: null,
  residenceExpiryDate: null,
  archivedAt: null,
  resultOutcome: null,
  quotePrice: null,
  depositPaidCached: false,
  finalPaymentPaidCached: false,
  billingUnpaidAmountCached: 0,
  billingRiskAcknowledgedBy: null,
  billingRiskAcknowledgedAt: null,
  billingRiskAckReasonCode: null,
  billingRiskAckReasonNote: null,
  billingRiskAckEvidenceUrl: null,
  overseasVisaStartAt: null,
  entryConfirmedAt: null,
  businessPhase: "CONSULTING",
  currentWorkflowStepCode: "ENTRY_SUCCESS",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};
function mc(overrides = {}) {
  return { ...BASE_CASE, ...overrides };
}
const BASE_PERIOD = {
  id: "rp-001",
  orgId: "org-001",
  caseId: "case-001",
  customerId: "cust-001",
  visaType: "business_manager",
  statusOfResidence: "経営・管理",
  periodYears: 1,
  periodLabel: "1年",
  validFrom: "2026-04-01",
  validUntil: "2027-04-01",
  cardNumber: "AB1234567CD",
  isCurrent: true,
  entryDate: "2026-03-15",
  reminderCreated: true,
  notes: null,
  createdBy: "user-001",
  createdAt: "2026-04-01T00:00:00.000Z",
  updatedAt: "2026-04-01T00:00:00.000Z",
};
const SUMMARY_FROM_PERIOD = {
  id: "rp-001",
  visaType: "business_manager",
  statusOfResidence: "経営・管理",
  periodYears: 1,
  periodLabel: "1年",
  validFrom: "2026-04-01",
  validUntil: "2027-04-01",
  cardNumber: "AB1234567CD",
  entryDate: "2026-03-15",
  reminderCreated: true,
};
// ════════════════════════════════════════════════════════════════
// toResidencePeriodSummary
// ════════════════════════════════════════════════════════════════
void describe("toResidencePeriodSummary", () => {
  void test("extracts summary fields from full entity", () => {
    const summary = toResidencePeriodSummary(BASE_PERIOD);
    assert.deepEqual(summary, SUMMARY_FROM_PERIOD);
  });
  void test("handles null optional fields", () => {
    const period = {
      ...BASE_PERIOD,
      periodYears: null,
      periodLabel: null,
      cardNumber: null,
      entryDate: null,
    };
    const summary = toResidencePeriodSummary(period);
    assert.equal(summary.periodYears, null);
    assert.equal(summary.periodLabel, null);
    assert.equal(summary.cardNumber, null);
    assert.equal(summary.entryDate, null);
  });
});
// ════════════════════════════════════════════════════════════════
// requiresSuccessCloseoutCheck
// ════════════════════════════════════════════════════════════════
void describe("requiresSuccessCloseoutCheck", () => {
  void test("returns true for BMV case at S8", () => {
    assert.equal(requiresSuccessCloseoutCheck(mc()), true);
  });
  void test("returns false for non-BMV case at S8", () => {
    const c = mc({ caseTypeCode: "family_stay" });
    assert.equal(requiresSuccessCloseoutCheck(c), false);
  });
  void test("returns false for BMV case at S7", () => {
    const c = mc({ stage: "S7", status: "S7" });
    assert.equal(requiresSuccessCloseoutCheck(c), false);
  });
  void test("returns false for BMV case at S9", () => {
    const c = mc({ stage: "S9", status: "S9" });
    assert.equal(requiresSuccessCloseoutCheck(c), false);
  });
  void test("returns false for BMV case at S1", () => {
    const c = mc({ stage: "S1", status: "S1" });
    assert.equal(requiresSuccessCloseoutCheck(c), false);
  });
  void test("falls back to status when stage is null", () => {
    const c = mc({ stage: null, status: "S8" });
    assert.equal(requiresSuccessCloseoutCheck(c), true);
  });
});
// ════════════════════════════════════════════════════════════════
// checkSuccessCloseoutPreconditions
// ════════════════════════════════════════════════════════════════
void describe("checkSuccessCloseoutPreconditions", () => {
  void test("all satisfied when entry confirmed + period recorded + reminder created", () => {
    const input = {
      caseEntity: mc({ entryConfirmedAt: "2026-03-15T00:00:00.000Z" }),
      currentResidencePeriod: SUMMARY_FROM_PERIOD,
    };
    const result = checkSuccessCloseoutPreconditions(input);
    assert.equal(result.allSatisfied, true);
    assert.equal(result.preconditions.length, 3);
    for (const p of result.preconditions) {
      assert.equal(p.satisfied, true, `${p.code} should be satisfied`);
    }
  });
  void test("not satisfied when entryConfirmedAt is null", () => {
    const input = {
      caseEntity: mc({ entryConfirmedAt: null }),
      currentResidencePeriod: SUMMARY_FROM_PERIOD,
    };
    const result = checkSuccessCloseoutPreconditions(input);
    assert.equal(result.allSatisfied, false);
    const entry = result.preconditions.find(
      (p) => p.code === SUCCESS_CLOSEOUT_PRECONDITION_CODES.ENTRY_CONFIRMED,
    );
    assert.ok(entry);
    assert.equal(entry.satisfied, false);
  });
  void test("not satisfied when no current residence period", () => {
    const input = {
      caseEntity: mc({ entryConfirmedAt: "2026-03-15T00:00:00.000Z" }),
      currentResidencePeriod: null,
    };
    const result = checkSuccessCloseoutPreconditions(input);
    assert.equal(result.allSatisfied, false);
    const rp = result.preconditions.find(
      (p) =>
        p.code ===
        SUCCESS_CLOSEOUT_PRECONDITION_CODES.RESIDENCE_PERIOD_RECORDED,
    );
    assert.ok(rp);
    assert.equal(rp.satisfied, false);
    const reminder = result.preconditions.find(
      (p) =>
        p.code ===
        SUCCESS_CLOSEOUT_PRECONDITION_CODES.RENEWAL_REMINDER_SCHEDULED,
    );
    assert.ok(reminder);
    assert.equal(reminder.satisfied, false);
  });
  void test("not satisfied when reminder not created", () => {
    const input = {
      caseEntity: mc({ entryConfirmedAt: "2026-03-15T00:00:00.000Z" }),
      currentResidencePeriod: {
        ...SUMMARY_FROM_PERIOD,
        reminderCreated: false,
      },
    };
    const result = checkSuccessCloseoutPreconditions(input);
    assert.equal(result.allSatisfied, false);
    const reminder = result.preconditions.find(
      (p) =>
        p.code ===
        SUCCESS_CLOSEOUT_PRECONDITION_CODES.RENEWAL_REMINDER_SCHEDULED,
    );
    assert.ok(reminder);
    assert.equal(reminder.satisfied, false);
    const rp = result.preconditions.find(
      (p) =>
        p.code ===
        SUCCESS_CLOSEOUT_PRECONDITION_CODES.RESIDENCE_PERIOD_RECORDED,
    );
    assert.ok(rp);
    assert.equal(rp.satisfied, true);
  });
  void test("all three unsatisfied when everything missing", () => {
    const input = {
      caseEntity: mc({ entryConfirmedAt: null }),
      currentResidencePeriod: null,
    };
    const result = checkSuccessCloseoutPreconditions(input);
    assert.equal(result.allSatisfied, false);
    for (const p of result.preconditions) {
      assert.equal(p.satisfied, false, `${p.code} should NOT be satisfied`);
    }
  });
  void test("preconditions are always in fixed order", () => {
    const input = {
      caseEntity: mc({ entryConfirmedAt: "2026-03-15T00:00:00.000Z" }),
      currentResidencePeriod: SUMMARY_FROM_PERIOD,
    };
    const result = checkSuccessCloseoutPreconditions(input);
    assert.equal(
      result.preconditions[0]?.code,
      SUCCESS_CLOSEOUT_PRECONDITION_CODES.ENTRY_CONFIRMED,
    );
    assert.equal(
      result.preconditions[1]?.code,
      SUCCESS_CLOSEOUT_PRECONDITION_CODES.RESIDENCE_PERIOD_RECORDED,
    );
    assert.equal(
      result.preconditions[2]?.code,
      SUCCESS_CLOSEOUT_PRECONDITION_CODES.RENEWAL_REMINDER_SCHEDULED,
    );
  });
  void test("precondition codes match constant values", () => {
    assert.equal(
      SUCCESS_CLOSEOUT_PRECONDITION_CODES.ENTRY_CONFIRMED,
      "ENTRY_CONFIRMED",
    );
    assert.equal(
      SUCCESS_CLOSEOUT_PRECONDITION_CODES.RESIDENCE_PERIOD_RECORDED,
      "RESIDENCE_PERIOD_RECORDED",
    );
    assert.equal(
      SUCCESS_CLOSEOUT_PRECONDITION_CODES.RENEWAL_REMINDER_SCHEDULED,
      "RENEWAL_REMINDER_SCHEDULED",
    );
  });
});
// ════════════════════════════════════════════════════════════════
// 契约对齐: ENTRY_SUCCESS_FOLLOW_UP
// ════════════════════════════════════════════════════════════════
void describe("alignment with ENTRY_SUCCESS_FOLLOW_UP contract", () => {
  void test("closeout preconditions cover residencePeriodRecorded and renewalReminderScheduled", () => {
    const input = {
      caseEntity: mc({ entryConfirmedAt: "2026-03-15T00:00:00.000Z" }),
      currentResidencePeriod: SUMMARY_FROM_PERIOD,
    };
    const result = checkSuccessCloseoutPreconditions(input);
    const codes = result.preconditions.map((p) => p.code);
    assert.ok(codes.includes("RESIDENCE_PERIOD_RECORDED"));
    assert.ok(codes.includes("RENEWAL_REMINDER_SCHEDULED"));
  });
});
//# sourceMappingURL=cases.types-residence-closeout.test.js.map
