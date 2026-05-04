// ── Test Ownership ──────────────────────────────────────────────
// Owner: R30-N — close reason modal data backfill.
// Covers: closedAt fallback to updatedAt for S9 cases,
//   closeReason passthrough, closedBy from deepLink.
// Does NOT test: modal rendering, failure closeout derivation,
//   or phase transition logic.
// ────────────────────────────────────────────────────────────────

import { describe, expect, it } from "vitest";
import { adaptCaseDetailAggregate } from "./CaseAdapterDetailAggregate";

const DEEP_LINK = {
  customerId: "cust-n01",
  customerName: "テスト顧客",
  groupId: "group-n01",
  groupName: "Tokyo-N",
  ownerUserId: "user-n01",
  ownerDisplayName: "山田太郎",
  assistantUserId: null,
  assistantDisplayName: null,
};

const COUNTS = {
  documentItemsTotal: 10,
  documentItemsDone: 10,
  questionnaireItemsTotal: 0,
  questionnaireItemsDone: 0,
  caseParties: 1,
  tasks: 2,
  tasksPending: 0,
  communicationLogs: 3,
  submissionPackages: 1,
  generatedDocuments: 0,
  validationRuns: 0,
  reviewRecords: 0,
  billingRecords: 1,
  paymentRecords: 1,
};

function buildAggregate(caseOverrides: Record<string, unknown> = {}) {
  return {
    case: {
      id: "case-n01",
      orgId: "org-1",
      customerId: "cust-n01",
      caseTypeCode: "visa",
      stage: "S9",
      groupId: "group-n01",
      ownerUserId: "user-n01",
      dueAt: "2026-06-01",
      caseName: "結案テスト",
      businessPhase: "CLOSED_FAILED",
      updatedAt: "2026-04-20T10:30:00.000Z",
      ...caseOverrides,
    },
    deepLink: DEEP_LINK,
    counts: COUNTS,
    billing: {
      quotePrice: 300000,
      unpaidAmount: 0,
      totalReceived: 300000,
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
  };
}

describe("R30-N: close reason modal data backfill", () => {
  describe("closedAt fallback", () => {
    it("uses archivedAt when available", () => {
      const result = adaptCaseDetailAggregate(
        buildAggregate({
          archivedAt: "2026-04-18T09:00:00.000Z",
          updatedAt: "2026-04-20T10:30:00.000Z",
        }),
      )!;
      expect(result.detail.closedAt).toContain("2026");
      expect(result.detail.closedAt).not.toBe("");
      expect(result.detail.closedAt).not.toBe("—");
    });

    it("falls back to updatedAt when archivedAt is null at S9", () => {
      const result = adaptCaseDetailAggregate(
        buildAggregate({
          archivedAt: null,
          updatedAt: "2026-04-20T10:30:00.000Z",
        }),
      )!;
      expect(result.detail.closedAt).toContain("2026");
      expect(result.detail.closedAt).not.toBe("");
      expect(result.detail.closedAt).not.toBe("—");
    });

    it("does not use updatedAt fallback for non-S9 cases", () => {
      const result = adaptCaseDetailAggregate(
        buildAggregate({
          stage: "S5",
          archivedAt: null,
          updatedAt: "2026-04-20T10:30:00.000Z",
        }),
      )!;
      expect(result.detail.closedAt).toBe("");
    });
  });

  describe("closeReason passthrough", () => {
    it("reads closeReason from case record", () => {
      const result = adaptCaseDetailAggregate(
        buildAggregate({ closeReason: "顧客都合による中止" }),
      )!;
      expect(result.detail.closeReason).toBe("顧客都合による中止");
    });

    it("returns null when closeReason is absent", () => {
      const result = adaptCaseDetailAggregate(
        buildAggregate({ closeReason: null }),
      )!;
      expect(result.detail.closeReason).toBeNull();
    });
  });

  describe("closedBy from deepLink owner", () => {
    it("reads ownerDisplayName from deepLink", () => {
      const result = adaptCaseDetailAggregate(buildAggregate())!;
      expect(result.detail.closedBy).toBe("山田太郎");
    });
  });
});
