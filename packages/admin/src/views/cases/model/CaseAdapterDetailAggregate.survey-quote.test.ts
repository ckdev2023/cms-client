// ── Test Ownership ──────────────────────────────────────────────
// Owner: p1-fe-003-01 — Survey / Quote / Pre-Sign Gate adapter
//   Covers: surveyStatus derivation from questionnaire counts,
//   quoteStatus derivation from billing quotePrice,
//   preSignGate pass/block logic, non-BMV degradation,
//   quotePriceRaw and quotePriceLabel mapping.
// Does NOT test: BMV workflow steps (→ bmv-contract), P0 header
//   (→ main-chain), list mappers, or write builders.
// ────────────────────────────────────────────────────────────────

import { describe, expect, it } from "vitest";
import { adaptCaseDetailAggregate } from "./CaseAdapterDetailAggregate";

// ─── Shared fixtures ─────────────────────────────────────────────

const BMV_CASE_ROW = {
  id: "case-sq01",
  orgId: "org-1",
  customerId: "cust-sq01",
  caseTypeCode: "business_manager_visa",
  stage: "S1",
  groupId: "group-sq01",
  ownerUserId: "user-sq01",
  dueAt: "2026-08-01",
  caseName: "問卷報價テスト",
  currentWorkflowStepCode: "MATERIAL_PREPARING",
  visaPlan: "new_establishment",
  supplementCount: 0,
};

const DEEP_LINK = {
  customerId: "cust-sq01",
  customerName: "テスト太郎",
  groupId: "group-sq01",
  groupName: "Tokyo-D",
  ownerUserId: "user-sq01",
  ownerDisplayName: "担当花子",
  assistantUserId: null,
  assistantDisplayName: null,
};

const BILLING_WITH_QUOTE = {
  quotePrice: 500000,
  unpaidAmount: 200000,
  totalReceived: 300000,
  depositPaid: true,
  finalPaymentPaid: false,
  billingRiskAcknowledged: false,
  billingRiskAcknowledgedAt: null,
  billingRiskAckReasonCode: null,
};

const BILLING_NO_QUOTE = {
  ...BILLING_WITH_QUOTE,
  quotePrice: 0,
  totalReceived: 0,
  unpaidAmount: 0,
};

function buildAggregate(overrides: Record<string, unknown> = {}) {
  return {
    case: BMV_CASE_ROW,
    deepLink: DEEP_LINK,
    counts: {
      documentItemsTotal: 10,
      documentItemsDone: 5,
      questionnaireItemsTotal: 4,
      questionnaireItemsDone: 2,
      caseParties: 2,
      tasks: 3,
      tasksPending: 1,
      communicationLogs: 5,
      submissionPackages: 0,
      generatedDocuments: 2,
      validationRuns: 1,
      reviewRecords: 0,
      billingRecords: 2,
      paymentRecords: 1,
    },
    billing: BILLING_WITH_QUOTE,
    latestValidation: null,
    latestSubmission: null,
    latestReview: null,
    documentProgressByProvider: [],
    failureCloseoutCheck: null,
    ...overrides,
  };
}

function buildNonBmvAggregate(overrides: Record<string, unknown> = {}) {
  return {
    case: {
      id: "case-nonbmv",
      stage: "S2",
      caseTypeCode: "general_visa",
      ownerUserId: "user-01",
    },
    deepLink: null,
    counts: {
      documentItemsTotal: 5,
      documentItemsDone: 3,
      questionnaireItemsTotal: 0,
      questionnaireItemsDone: 0,
      caseParties: 1,
      tasks: 2,
      tasksPending: 1,
      communicationLogs: 0,
      submissionPackages: 0,
      generatedDocuments: 0,
      validationRuns: 0,
      reviewRecords: 0,
      billingRecords: 0,
      paymentRecords: 0,
    },
    billing: null,
    latestValidation: null,
    latestSubmission: null,
    latestReview: null,
    documentProgressByProvider: [],
    failureCloseoutCheck: null,
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════
//  SURVEY STATUS — derived from questionnaire counts
// ═══════════════════════════════════════════════════════════════════

describe("surveyStatus derivation (p1-fe-003-01)", () => {
  it("in_progress when partial questionnaire completion", () => {
    const result = adaptCaseDetailAggregate(buildAggregate())!;
    expect(result.detail.surveyStatus).not.toBeNull();
    expect(result.detail.surveyStatus!.statusKey).toBe("in_progress");
    expect(result.detail.surveyStatus!.tone).toBe("warning");
    expect(result.detail.surveyStatus!.progressLabel).toBe("2/4");
  });

  it("completed when all questionnaires done", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate({
        counts: {
          documentItemsTotal: 10,
          documentItemsDone: 10,
          questionnaireItemsTotal: 4,
          questionnaireItemsDone: 4,
          caseParties: 2,
          tasks: 3,
          tasksPending: 0,
          communicationLogs: 5,
          submissionPackages: 0,
          generatedDocuments: 2,
          validationRuns: 1,
          reviewRecords: 0,
          billingRecords: 2,
          paymentRecords: 1,
        },
      }),
    )!;
    expect(result.detail.surveyStatus!.statusKey).toBe("completed");
    expect(result.detail.surveyStatus!.tone).toBe("success");
    expect(result.detail.surveyStatus!.progressLabel).toBe("4/4");
  });

  it("not_started when zero questionnaires done", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate({
        counts: {
          documentItemsTotal: 10,
          documentItemsDone: 5,
          questionnaireItemsTotal: 3,
          questionnaireItemsDone: 0,
          caseParties: 2,
          tasks: 3,
          tasksPending: 1,
          communicationLogs: 5,
          submissionPackages: 0,
          generatedDocuments: 2,
          validationRuns: 1,
          reviewRecords: 0,
          billingRecords: 2,
          paymentRecords: 1,
        },
      }),
    )!;
    expect(result.detail.surveyStatus!.statusKey).toBe("not_started");
    expect(result.detail.surveyStatus!.tone).toBe("muted");
  });

  it("null when questionnaireItemsTotal is 0 (no questionnaires)", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate({
        counts: {
          documentItemsTotal: 10,
          documentItemsDone: 5,
          questionnaireItemsTotal: 0,
          questionnaireItemsDone: 0,
          caseParties: 2,
          tasks: 3,
          tasksPending: 1,
          communicationLogs: 5,
          submissionPackages: 0,
          generatedDocuments: 2,
          validationRuns: 1,
          reviewRecords: 0,
          billingRecords: 2,
          paymentRecords: 1,
        },
      }),
    )!;
    expect(result.detail.surveyStatus).toBeNull();
  });

  it("null when counts slice is null", () => {
    const result = adaptCaseDetailAggregate(buildAggregate({ counts: null }))!;
    expect(result.detail.surveyStatus).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════
//  QUOTE STATUS — derived from billing quotePrice
// ═══════════════════════════════════════════════════════════════════

describe("quoteStatus derivation (p1-fe-003-01)", () => {
  it("completed when quotePrice > 0", () => {
    const result = adaptCaseDetailAggregate(buildAggregate())!;
    expect(result.detail.quoteStatus).not.toBeNull();
    expect(result.detail.quoteStatus!.statusKey).toBe("completed");
    expect(result.detail.quoteStatus!.tone).toBe("success");
    expect(result.detail.quoteStatus!.progressLabel).toContain("500,000");
  });

  it("not_started when quotePrice is 0", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate({ billing: BILLING_NO_QUOTE }),
    )!;
    expect(result.detail.quoteStatus!.statusKey).toBe("not_started");
    expect(result.detail.quoteStatus!.tone).toBe("muted");
    expect(result.detail.quoteStatus!.progressLabel).toBe("—");
  });

  it("null when billing is null on non-BMV case", () => {
    const result = adaptCaseDetailAggregate(buildNonBmvAggregate())!;
    expect(result.detail.quoteStatus).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════
//  QUOTE PRICE RAW / LABEL — billing derivation
// ═══════════════════════════════════════════════════════════════════

describe("quotePriceRaw and quotePriceLabel (p1-fe-003-01)", () => {
  it("quotePriceRaw reflects billing quotePrice", () => {
    const result = adaptCaseDetailAggregate(buildAggregate())!;
    expect(result.detail.quotePriceRaw).toBe(500000);
  });

  it("quotePriceLabel formatted with yen symbol", () => {
    const result = adaptCaseDetailAggregate(buildAggregate())!;
    expect(result.detail.quotePriceLabel).toBe("¥500,000");
  });

  it("quotePriceLabel empty when quotePrice is 0", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate({ billing: BILLING_NO_QUOTE }),
    )!;
    expect(result.detail.quotePriceRaw).toBe(0);
    expect(result.detail.quotePriceLabel).toBe("");
  });
});

// ═══════════════════════════════════════════════════════════════════
//  PRE-SIGN GATE — pass/block logic
// ═══════════════════════════════════════════════════════════════════

describe("preSignGate derivation (p1-fe-003-01)", () => {
  it("null when management stage is past S1", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate({
        case: { ...BMV_CASE_ROW, stage: "S7" },
      }),
    )!;
    expect(result.detail.preSignGate).toBeNull();
  });

  it("blocked when survey in_progress and quote completed", () => {
    const result = adaptCaseDetailAggregate(buildAggregate())!;
    expect(result.detail.preSignGate).not.toBeNull();
    expect(result.detail.preSignGate!.passed).toBe(false);
    expect(result.detail.preSignGate!.blockers.length).toBeGreaterThan(0);
    expect(
      result.detail.preSignGate!.blockers.some(
        (b) => b.code === "survey_incomplete",
      ),
    ).toBe(true);
  });

  it("blocked when survey complete but quote not started", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate({
        counts: {
          documentItemsTotal: 10,
          documentItemsDone: 10,
          questionnaireItemsTotal: 4,
          questionnaireItemsDone: 4,
          caseParties: 2,
          tasks: 3,
          tasksPending: 0,
          communicationLogs: 5,
          submissionPackages: 0,
          generatedDocuments: 2,
          validationRuns: 1,
          reviewRecords: 0,
          billingRecords: 2,
          paymentRecords: 1,
        },
        billing: BILLING_NO_QUOTE,
      }),
    )!;
    expect(result.detail.preSignGate!.passed).toBe(false);
    expect(
      result.detail.preSignGate!.blockers.some(
        (b) => b.code === "quote_unconfirmed",
      ),
    ).toBe(true);
  });

  it("passed when both survey complete and quote confirmed", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate({
        counts: {
          documentItemsTotal: 10,
          documentItemsDone: 10,
          questionnaireItemsTotal: 4,
          questionnaireItemsDone: 4,
          caseParties: 2,
          tasks: 3,
          tasksPending: 0,
          communicationLogs: 5,
          submissionPackages: 0,
          generatedDocuments: 2,
          validationRuns: 1,
          reviewRecords: 0,
          billingRecords: 2,
          paymentRecords: 1,
        },
      }),
    )!;
    expect(result.detail.preSignGate!.passed).toBe(true);
    expect(result.detail.preSignGate!.blockers).toHaveLength(0);
  });

  it("both blockers when survey and quote incomplete", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate({
        counts: {
          documentItemsTotal: 10,
          documentItemsDone: 5,
          questionnaireItemsTotal: 4,
          questionnaireItemsDone: 0,
          caseParties: 2,
          tasks: 3,
          tasksPending: 1,
          communicationLogs: 5,
          submissionPackages: 0,
          generatedDocuments: 2,
          validationRuns: 1,
          reviewRecords: 0,
          billingRecords: 2,
          paymentRecords: 1,
        },
        billing: BILLING_NO_QUOTE,
      }),
    )!;
    expect(result.detail.preSignGate!.passed).toBe(false);
    expect(result.detail.preSignGate!.blockers).toHaveLength(2);
    const codes = result.detail.preSignGate!.blockers.map((b) => b.code);
    expect(codes).toContain("survey_incomplete");
    expect(codes).toContain("quote_unconfirmed");
  });

  it("null on non-BMV case", () => {
    const result = adaptCaseDetailAggregate(buildNonBmvAggregate())!;
    expect(result.detail.preSignGate).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════
//  NON-BMV DEGRADATION — all P1 survey/quote fields null
// ═══════════════════════════════════════════════════════════════════

describe("non-BMV survey/quote degradation (p1-fe-003-01)", () => {
  const result = adaptCaseDetailAggregate(buildNonBmvAggregate())!;

  it("surveyStatus is null", () => {
    expect(result.detail.surveyStatus).toBeNull();
  });

  it("quoteStatus is null", () => {
    expect(result.detail.quoteStatus).toBeNull();
  });

  it("preSignGate is null", () => {
    expect(result.detail.preSignGate).toBeNull();
  });
});
