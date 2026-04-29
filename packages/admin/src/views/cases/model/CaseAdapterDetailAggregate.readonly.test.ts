// ── Test Ownership ──────────────────────────────────────────────
// Owner: p0-fe-002c-04 — S9 read-only comprehensive state tests.
// Snapshot + empty state + structural integrity
//   → CaseAdapterDetailAggregate.focused.test.ts
// Contract freeze, header mapping, deep-link
//   → CaseAdapterDetailAggregate.test.ts
// Slice degradation per-slice
//   → CaseAdapterDetailAggregate.slices.test.ts
// Per-group main-chain mapping
//   → CaseAdapterDetailAggregate.main-chain.test.ts
// Does NOT test: list mappers, mutation results, write builders,
//   or repository orchestration.
// ────────────────────────────────────────────────────────────────

import { describe, expect, it } from "vitest";
import { adaptCaseDetailAggregate } from "./CaseAdapterDetailAggregate";
import {
  CASE_DETAIL_HEADER_FIELDS,
  CASE_DETAIL_TAB_COUNTS_KEYS,
} from "./CaseAdapterDetailContracts";

// ─── Shared fixtures ─────────────────────────────────────────────

const FULL_CASE_ROW = {
  id: "case-f01",
  orgId: "org-1",
  customerId: "cust-f01",
  caseTypeCode: "visa",
  stage: "S4",
  groupId: "group-f01",
  ownerUserId: "user-f01",
  dueAt: "2026-08-15",
  caseName: "経営管理ビザ新規",
  caseNo: "CASE-F01",
  priority: "normal",
  riskLevel: "low",
  applicationType: "変更",
  acceptedAt: "2026-02-10T00:00:00.000Z",
  createdAt: "2026-02-01T00:00:00.000Z",
  updatedAt: "2026-04-22T00:00:00.000Z",
};

const FULL_DEEP_LINK = {
  customerId: "cust-f01",
  customerName: "李明",
  groupId: "group-f01",
  groupName: "Osaka-A",
  ownerUserId: "user-f01",
  ownerDisplayName: "佐藤一郎",
  assistantUserId: "asst-f01",
  assistantDisplayName: "鈴木二郎",
};

const FULL_COUNTS = {
  documentItemsTotal: 20,
  documentItemsDone: 12,
  questionnaireItemsTotal: 0,
  questionnaireItemsDone: 0,
  caseParties: 5,
  tasks: 8,
  tasksPending: 3,
  communicationLogs: 15,
  submissionPackages: 2,
  generatedDocuments: 6,
  validationRuns: 4,
  reviewRecords: 2,
  billingRecords: 5,
  paymentRecords: 3,
};

const FULL_BILLING = {
  quotePrice: 500000,
  unpaidAmount: 100000,
  totalReceived: 400000,
  depositPaid: true,
  finalPaymentPaid: false,
  billingRiskAcknowledged: true,
  billingRiskAcknowledgedAt: "2026-04-05T00:00:00.000Z",
  billingRiskAckReasonCode: "advance_agreement",
};

const FULL_VALIDATION = {
  id: "vr-f01",
  status: "failed",
  executedAt: "2026-04-20T00:00:00.000Z",
  blockingCount: 2,
  warningCount: 3,
};

const FULL_REVIEW = {
  id: "rev-f01",
  decision: "rejected",
  reviewedAt: "2026-04-18T00:00:00.000Z",
  reviewerUserId: "reviewer-f01",
  reviewerDisplayName: "高橋審査官",
};

const FULL_PROVIDER_PROGRESS = [
  { providerRole: "applicant", total: 10, done: 6 },
  { providerRole: "office", total: 8, done: 5 },
  { providerRole: "employer", total: 2, done: 1 },
];

function buildFullAggregate(overrides: Record<string, unknown> = {}) {
  return {
    case: FULL_CASE_ROW,
    deepLink: FULL_DEEP_LINK,
    counts: FULL_COUNTS,
    billing: FULL_BILLING,
    latestValidation: FULL_VALIDATION,
    latestSubmission: null,
    latestReview: FULL_REVIEW,
    documentProgressByProvider: FULL_PROVIDER_PROGRESS,
    ...overrides,
  };
}

function buildS9Aggregate(overrides: Record<string, unknown> = {}) {
  return buildFullAggregate({
    case: { ...FULL_CASE_ROW, stage: "S9" },
    ...overrides,
  });
}

function buildMinimalAggregate(overrides: Record<string, unknown> = {}) {
  return {
    case: { id: "case-min", stage: "S1" },
    deepLink: null,
    counts: null,
    billing: null,
    latestValidation: null,
    latestSubmission: null,
    latestReview: null,
    documentProgressByProvider: [],
    ...overrides,
  };
}

// ─── S9 read-only comprehensive state (只読態) ──────────────────

describe("S9 read-only comprehensive state (p0-fe-002c-04)", () => {
  const result = adaptCaseDetailAggregate(buildS9Aggregate())!;

  it("adapts successfully", () => {
    expect(result).not.toBeNull();
  });

  it("readonly flag is true", () => {
    expect(result.detail.readonly).toBe(true);
  });

  it("status badge is badge-gray for S9", () => {
    expect(result.detail.statusBadge).toBe("badge-gray");
  });

  it("stage fields reflect S9", () => {
    expect(result.detail.stage).toBe("已归档");
    expect(result.detail.stageCode).toBe("S9");
    expect(result.detail.stageMeta).toBe("S9");
  });

  it("identity fields still populated in S9", () => {
    expect(result.detail.id).toBe("case-f01");
    expect(result.detail.title).toBe("経営管理ビザ新規");
    expect(result.detail.caseType).toBe("visa");
    expect(result.detail.applicationType).toBe("変更");
  });

  it("deepLink-sourced fields still populated in S9", () => {
    expect(result.detail.client).toBe("李明");
    expect(result.detail.owner).toBe("佐藤一郎");
    expect(result.detail.customerId).toBe("cust-f01");
    expect(result.detail.groupId).toBe("group-f01");
    expect(result.detail.groupName).toBe("Osaka-A");
  });

  it("deadline fields still rendered in S9", () => {
    expect(result.detail.deadline).not.toBe("");
    expect(result.detail.targetDate).not.toBe("");
  });

  it("progress still computed in S9", () => {
    expect(result.detail.progressPercent).toBe(60);
    expect(result.detail.progressCount).toBe("12/20");
  });

  it("billing data still rendered in S9", () => {
    expect(result.detail.billingAmount).toBe("¥500,000");
    expect(result.detail.billing.total).toBe("¥500,000");
    expect(result.detail.billing.received).toBe("¥400,000");
    expect(result.detail.billing.outstanding).toBe("¥100,000");
  });

  it("risk block still populated in S9", () => {
    expect(result.detail.risk.blockingCount).toBe("2");
    expect(result.detail.risk.arrearsStatus).toBe("cases.detail.arrearsYes");
    expect(result.detail.risk.lastValidation).toBe("failed");
    expect(result.detail.risk.reviewStatus).toBe("rejected");
  });

  it("validation hint still shown in S9", () => {
    expect(result.detail.validationHint).toBe("2 blocking, 3 warning");
  });

  it("risk confirmation still rendered in S9", () => {
    expect(result.detail.riskConfirmationRecord).not.toBeNull();
  });

  it("provider progress still rendered in S9", () => {
    expect(result.detail.providerProgress).toHaveLength(3);
  });

  it("tab counts still populated in S9", () => {
    expect(result.tabCounts).toEqual(FULL_COUNTS);
  });

  it("deep-link fields including assistant still populated in S9", () => {
    expect(result.customerId).toBe("cust-f01");
    expect(result.assistantUserId).toBe("asst-f01");
    expect(result.assistantDisplayName).toBe("鈴木二郎");
  });

  it("every header field present in S9", () => {
    for (const f of CASE_DETAIL_HEADER_FIELDS) {
      expect(f in result.detail, `missing header field in S9: ${f}`).toBe(true);
    }
  });
});

// ─── S9 read-only + empty optional slices ────────────────────────

describe("S9 read-only + empty optional slices (p0-fe-002c-04)", () => {
  const result = adaptCaseDetailAggregate(
    buildMinimalAggregate({ case: { id: "case-s9-empty", stage: "S9" } }),
  )!;

  it("adapts successfully", () => {
    expect(result).not.toBeNull();
  });

  it("readonly is true even with no data", () => {
    expect(result.detail.readonly).toBe(true);
    expect(result.detail.statusBadge).toBe("badge-gray");
    expect(result.detail.stageCode).toBe("S9");
  });

  it("title falls back to id", () => {
    expect(result.detail.title).toBe("case-s9-empty");
  });

  it("all value fields are empty/zero/dash defaults", () => {
    expect(result.detail.client).toBe("");
    expect(result.detail.owner).toBe("");
    expect(result.detail.progressPercent).toBe(0);
    expect(result.detail.billingAmount).toBe("—");
    expect(result.detail.risk.blockingCount).toBe("0");
    expect(result.detail.validationHint).toBe("");
  });

  it("tab counts all zero", () => {
    for (const key of CASE_DETAIL_TAB_COUNTS_KEYS) {
      expect(result.tabCounts[key]).toBe(0);
    }
  });
});

// ─── All active stages (S1–S8) are not readonly ─────────────────

describe("S1-S8 all active / not readonly (p0-fe-002c-04)", () => {
  const stages = ["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8"] as const;

  for (const stage of stages) {
    it(`${stage} is not readonly`, () => {
      const result = adaptCaseDetailAggregate(
        buildFullAggregate({ case: { ...FULL_CASE_ROW, stage } }),
      )!;
      expect(result.detail.readonly).toBe(false);
      expect(result.detail.statusBadge).toMatch(/^badge-/);
      expect(result.detail.stageCode).toBe(stage);
    });
  }
});
