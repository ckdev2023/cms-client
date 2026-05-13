import { describe, it, expect } from "vitest";
import {
  adaptCaseDetailAggregate,
  buildTransitionGuards,
} from "./CaseAdapterDetailAggregate";

function tg(
  businessPhase: string,
  unpaidAmount: number,
  billingRiskAck: boolean,
  isBmv: boolean,
  workflowStepCode: string | null = null,
  finalPaymentPaid = true,
  finalPaymentMilestoneMatched = true,
) {
  return buildTransitionGuards(
    businessPhase,
    unpaidAmount,
    billingRiskAck,
    isBmv,
    workflowStepCode,
    finalPaymentPaid,
    finalPaymentMilestoneMatched,
  );
}

describe("buildTransitionGuards", () => {
  it("returns guard for RESIDENCE_PERIOD_RECORDED when BMV + SUCCESS + unpaid + no risk ack", () => {
    const guards = tg("SUCCESS", 50000, false, true);
    expect(guards).toEqual({
      RESIDENCE_PERIOD_RECORDED: {
        key: "cases.detail.phaseMenu.guards.successCloseoutBlocked",
        params: { amount: "¥50,000" },
      },
    });
  });

  it("returns empty when unpaidAmount is 0", () => {
    expect(tg("SUCCESS", 0, false, true)).toEqual({});
  });

  it("returns empty when billingRiskAck is true", () => {
    expect(tg("SUCCESS", 50000, true, true)).toEqual({});
  });

  it("returns empty when not BMV", () => {
    expect(tg("SUCCESS", 50000, false, false)).toEqual({});
  });

  it("returns empty when businessPhase is not SUCCESS (no residence-period guard)", () => {
    expect(tg("APPROVED", 50000, false, true)).toEqual({});
  });

  it("WAITING_PAYMENT + BMV + 尾款门禁未满足 → guard COE_SENT", () => {
    const guards = tg(
      "WAITING_PAYMENT",
      50000,
      false,
      true,
      "WAITING_PAYMENT",
      false,
      true,
    );
    expect(guards.COE_SENT).toEqual({
      key: "cases.detail.phaseMenu.guards.coeAdvanceBlocked",
      params: { amount: "¥50,000" },
    });
  });

  it("WAITING_PAYMENT + 尾款节点未配置 → guard COE_SENT", () => {
    const guards = tg(
      "WAITING_PAYMENT",
      0,
      false,
      true,
      "WAITING_PAYMENT",
      false,
      false,
    );
    expect(guards.COE_SENT?.key).toBe(
      "cases.detail.phaseMenu.guards.coeAdvanceBlocked",
    );
    expect(guards.COE_SENT?.params).toEqual({});
  });

  it("WAITING_PAYMENT + 尾款已清 → no COE_SENT guard", () => {
    expect(
      tg("WAITING_PAYMENT", 0, false, true, "WAITING_PAYMENT", true, true),
    ).toEqual({});
  });

  it("WAITING_PAYMENT + 非 BMV → no COE_SENT guard", () => {
    expect(
      tg(
        "WAITING_PAYMENT",
        50000,
        false,
        false,
        "WAITING_PAYMENT",
        false,
        true,
      ),
    ).toEqual({});
  });
});

describe("adaptCaseDetailAggregate — transitionGuards integration", () => {
  const BASE_CASE = {
    id: "case-tg01",
    orgId: "org-1",
    customerId: "cust-01",
    caseTypeCode: "business_manager_visa",
    stage: "S8",
    groupId: "group-01",
    ownerUserId: "user-01",
    dueAt: "2026-12-01",
    caseName: "TG Test",
    caseNo: "CASE-TG01",
    priority: "normal",
    riskLevel: "low",
    applicationType: "認定",
    acceptedAt: "2026-01-01T00:00:00.000Z",
    currentWorkflowStepCode: "ENTRY_SUCCESS",
    visaPlan: "new_establishment",
    supplementCount: 0,
    resultOutcome: "approved",
    postApprovalStage: "entry_success",
    businessPhase: "SUCCESS",
    coeIssuedAt: null,
    coeExpiryDate: null,
    coeSentAt: null,
    overseasVisaStartAt: null,
    entryConfirmedAt: null,
  };

  const DEEP_LINK = {
    customerId: "cust-01",
    customerName: "Test",
    groupId: "group-01",
    groupName: "Group",
    ownerUserId: "user-01",
    ownerDisplayName: "Owner",
    assistantUserId: null,
    assistantDisplayName: null,
  };

  it("BMV SUCCESS + unpaid + no ack → guard on RESIDENCE_PERIOD_RECORDED", () => {
    const result = adaptCaseDetailAggregate({
      case: BASE_CASE,
      deepLink: DEEP_LINK,
      counts: null,
      billing: {
        quotePrice: 600000,
        unpaidAmount: 200000,
        totalReceived: 400000,
        depositPaid: true,
        finalPaymentPaid: false,
        billingRiskAcknowledged: false,
      },
      latestValidation: null,
      latestSubmission: null,
      latestReview: null,
      documentProgressByProvider: [],
      failureCloseoutCheck: null,
      currentResidencePeriod: null,
      successCloseoutCheck: null,
    });

    expect(result).not.toBeNull();
    expect(result!.detail.businessPhase).toBe("SUCCESS");
    expect(result!.detail.workflowStep).not.toBeNull();
    expect(result!.detail.transitionGuards).toBeDefined();

    const guards = result!.detail.transitionGuards ?? {};
    expect(guards["RESIDENCE_PERIOD_RECORDED"]).toBeDefined();
    expect(guards["RESIDENCE_PERIOD_RECORDED"].key).toBe(
      "cases.detail.phaseMenu.guards.successCloseoutBlocked",
    );
    expect(guards["RESIDENCE_PERIOD_RECORDED"].params).toEqual({
      amount: "¥200,000",
    });
  });

  it("BMV SUCCESS + unpaid=0 → no guard", () => {
    const result = adaptCaseDetailAggregate({
      case: BASE_CASE,
      deepLink: DEEP_LINK,
      counts: null,
      billing: {
        quotePrice: 600000,
        unpaidAmount: 0,
        totalReceived: 600000,
        depositPaid: true,
        finalPaymentPaid: true,
        billingRiskAcknowledged: false,
      },
      latestValidation: null,
      latestSubmission: null,
      latestReview: null,
      documentProgressByProvider: [],
      failureCloseoutCheck: null,
      currentResidencePeriod: null,
      successCloseoutCheck: null,
    });

    expect(result).not.toBeNull();
    const guards = result!.detail.transitionGuards ?? {};
    expect(guards["RESIDENCE_PERIOD_RECORDED"]).toBeUndefined();
  });

  it("BMV SUCCESS + unpaid + billingRiskAck=true → no guard", () => {
    const result = adaptCaseDetailAggregate({
      case: BASE_CASE,
      deepLink: DEEP_LINK,
      counts: null,
      billing: {
        quotePrice: 600000,
        unpaidAmount: 200000,
        totalReceived: 400000,
        depositPaid: true,
        finalPaymentPaid: false,
        billingRiskAcknowledged: true,
        billingRiskAcknowledgedAt: "2026-04-01T00:00:00Z",
        billingRiskAckReasonCode: "CLIENT_CONFIRMED",
      },
      latestValidation: null,
      latestSubmission: null,
      latestReview: null,
      documentProgressByProvider: [],
      failureCloseoutCheck: null,
      currentResidencePeriod: null,
      successCloseoutCheck: null,
    });

    expect(result).not.toBeNull();
    const guards = result!.detail.transitionGuards ?? {};
    expect(guards["RESIDENCE_PERIOD_RECORDED"]).toBeUndefined();
  });
});
