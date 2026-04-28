// ── Test Ownership ──────────────────────────────────────────────
// Owner: p1-fe-004-01 — Final Payment & COE Gate adapter
//   Covers: finalPaymentGate derivation from billing + workflow step,
//   blocker logic (final_payment_outstanding, billing_risk_unacknowledged),
//   canAdvanceToCoe computation, non-BMV degradation,
//   step relevance filtering (only APPROVED/WAITING_PAYMENT).
// Does NOT test: UI rendering (→ component tests), write action flow,
//   or error mapping (→ CaseWriteErrorMapping tests).
// ────────────────────────────────────────────────────────────────

import { describe, expect, it } from "vitest";
import { adaptCaseDetailAggregate } from "./CaseAdapterDetailAggregate";

// ─── Shared fixtures ─────────────────────────────────────────────

const DEEP_LINK = {
  customerId: "cust-fp01",
  customerName: "尾款テスト",
  groupId: "group-fp01",
  groupName: "Tokyo-E",
  ownerUserId: "user-fp01",
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
    unpaidAmount: 200000,
    totalReceived: 300000,
    depositPaid: true,
    finalPaymentPaid: false,
    billingRiskAcknowledged: false,
    billingRiskAcknowledgedAt: null,
    billingRiskAckReasonCode: null,
    ...overrides,
  };
}

function bmvCaseRow(stepCode: string, stage = "S7") {
  return {
    id: "case-fp01",
    orgId: "org-1",
    customerId: "cust-fp01",
    caseTypeCode: "business_manager_visa",
    stage,
    groupId: "group-fp01",
    ownerUserId: "user-fp01",
    dueAt: "2026-10-01",
    caseName: "尾款テスト案件",
    currentWorkflowStepCode: stepCode,
    visaPlan: "new_establishment",
    supplementCount: 0,
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

// ═══════════════════════════════════════════════════════════════════
//  GATE ACTIVATION — only active on relevant workflow steps
// ═══════════════════════════════════════════════════════════════════

describe("finalPaymentGate activation (p1-fe-004-01)", () => {
  it("active when step is WAITING_PAYMENT", () => {
    const result = adaptCaseDetailAggregate(buildAggregate("WAITING_PAYMENT"))!;
    expect(result.detail.finalPaymentGate).not.toBeNull();
  });

  it("active when step is APPROVED", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate("APPROVED", {}, { case: bmvCaseRow("APPROVED", "S6") }),
    )!;
    expect(result.detail.finalPaymentGate).not.toBeNull();
  });

  it("null when step is COE_SENT (past the gate)", () => {
    const result = adaptCaseDetailAggregate(buildAggregate("COE_SENT"))!;
    expect(result.detail.finalPaymentGate).toBeNull();
  });

  it("null when step is REVIEWING (before the gate)", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate("REVIEWING", {}, { case: bmvCaseRow("REVIEWING", "S4") }),
    )!;
    expect(result.detail.finalPaymentGate).toBeNull();
  });

  it("null when step is ENTRY_SUCCESS (past the gate)", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate(
        "ENTRY_SUCCESS",
        {},
        { case: bmvCaseRow("ENTRY_SUCCESS", "S8") },
      ),
    )!;
    expect(result.detail.finalPaymentGate).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════
//  BLOCKER LOGIC — payment outstanding / billing risk
// ═══════════════════════════════════════════════════════════════════

describe("finalPaymentGate blockers (p1-fe-004-01)", () => {
  it("blocked with final_payment_outstanding when finalPaymentPaid=false", () => {
    const result = adaptCaseDetailAggregate(buildAggregate("WAITING_PAYMENT"))!;
    const gate = result.detail.finalPaymentGate!;
    expect(gate.paymentCleared).toBe(false);
    expect(gate.canAdvanceToCoe).toBe(false);
    expect(
      gate.blockers.some((b) => b.code === "final_payment_outstanding"),
    ).toBe(true);
  });

  it("blocked with billing_risk_unacknowledged when unpaid + not acknowledged", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate("WAITING_PAYMENT", {
        finalPaymentPaid: false,
        unpaidAmount: 100000,
        billingRiskAcknowledged: false,
      }),
    )!;
    const gate = result.detail.finalPaymentGate!;
    expect(
      gate.blockers.some((b) => b.code === "billing_risk_unacknowledged"),
    ).toBe(true);
  });

  it("both blockers present when payment outstanding and risk unacknowledged", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate("WAITING_PAYMENT", {
        finalPaymentPaid: false,
        unpaidAmount: 200000,
        billingRiskAcknowledged: false,
      }),
    )!;
    const gate = result.detail.finalPaymentGate!;
    expect(gate.blockers).toHaveLength(2);
    const codes = gate.blockers.map((b) => b.code);
    expect(codes).toContain("final_payment_outstanding");
    expect(codes).toContain("billing_risk_unacknowledged");
  });

  it("only payment blocker when risk is acknowledged but payment not cleared", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate("WAITING_PAYMENT", {
        finalPaymentPaid: false,
        unpaidAmount: 50000,
        billingRiskAcknowledged: true,
      }),
    )!;
    const gate = result.detail.finalPaymentGate!;
    expect(gate.blockers).toHaveLength(1);
    expect(gate.blockers[0].code).toBe("final_payment_outstanding");
  });
});

// ═══════════════════════════════════════════════════════════════════
//  GATE PASSED — canAdvanceToCoe = true
// ═══════════════════════════════════════════════════════════════════

describe("finalPaymentGate passed (p1-fe-004-01)", () => {
  it("canAdvanceToCoe when payment cleared", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate("WAITING_PAYMENT", {
        finalPaymentPaid: true,
        unpaidAmount: 0,
        billingRiskAcknowledged: false,
      }),
    )!;
    const gate = result.detail.finalPaymentGate!;
    expect(gate.paymentCleared).toBe(true);
    expect(gate.canAdvanceToCoe).toBe(true);
    expect(gate.blockers).toHaveLength(0);
    expect(gate.outstandingLabel).toBe("");
  });

  it("canAdvanceToCoe when payment cleared despite risk not acknowledged (no unpaid)", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate("WAITING_PAYMENT", {
        finalPaymentPaid: true,
        unpaidAmount: 0,
        billingRiskAcknowledged: false,
      }),
    )!;
    expect(result.detail.finalPaymentGate!.canAdvanceToCoe).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════
//  OUTSTANDING LABEL — formatted display
// ═══════════════════════════════════════════════════════════════════

describe("finalPaymentGate outstandingLabel (p1-fe-004-01)", () => {
  it("shows formatted amount when outstanding > 0", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate("WAITING_PAYMENT", { unpaidAmount: 150000 }),
    )!;
    expect(result.detail.finalPaymentGate!.outstandingLabel).toBe("¥150,000");
  });

  it("empty when outstanding is 0", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate("WAITING_PAYMENT", {
        unpaidAmount: 0,
        finalPaymentPaid: true,
      }),
    )!;
    expect(result.detail.finalPaymentGate!.outstandingLabel).toBe("");
  });
});

// ═══════════════════════════════════════════════════════════════════
//  NON-BMV DEGRADATION — gate is null
// ═══════════════════════════════════════════════════════════════════

describe("finalPaymentGate non-BMV degradation (p1-fe-004-01)", () => {
  it("null on non-BMV case", () => {
    const result = adaptCaseDetailAggregate({
      case: {
        id: "case-nonbmv",
        stage: "S7",
        caseTypeCode: "general_visa",
        ownerUserId: "user-01",
      },
      deepLink: null,
      counts: COUNTS,
      billing: billingFixture(),
      latestValidation: null,
      latestSubmission: null,
      latestReview: null,
      documentProgressByProvider: [],
      failureCloseoutCheck: null,
    })!;
    expect(result.detail.finalPaymentGate).toBeNull();
  });
});
