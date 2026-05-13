import { describe, expect, it } from "vitest";
import { adaptCaseDetailAggregate } from "./CaseAdapterDetailAggregate";
import {
  INFO_TAB_CASE_ATTRIBUTES_FIELDS,
  INFO_TAB_READONLY_RULES,
  OVERVIEW_TAB_MAIN_CONSUMED_FIELDS,
  OVERVIEW_TAB_SIDEBAR_CONSUMED_FIELDS,
} from "./CaseAdapterDetailContracts";

const CASE_ROW_FULL = {
  id: "case-oif01",
  orgId: "org-1",
  customerId: "cust-oif01",
  caseTypeCode: "business_manager",
  stage: "S3",
  groupId: "group-oif01",
  ownerUserId: "user-oif01",
  dueAt: "2026-09-15",
  caseName: "経営管理ビザ新規ケース",
  caseNo: "CASE-OIF01",
  priority: "normal",
  riskLevel: "low",
  applicationType: "認定",
  acceptedAt: "2026-03-10T00:00:00.000Z",
  jurisdictionAuthority: "大阪入管局",
};

const DEEP_LINK_FULL = {
  customerId: "cust-oif01",
  customerName: "王小明",
  groupId: "group-oif01",
  groupName: "Osaka-B",
  ownerUserId: "user-oif01",
  ownerDisplayName: "山田次郎",
  assistantUserId: "asst-oif01",
  assistantDisplayName: "鈴木三郎",
};

const COUNTS_FULL = {
  documentItemsTotal: 12,
  documentItemsDone: 8,
  caseParties: 4,
  tasks: 7,
  tasksPending: 2,
  communicationLogs: 11,
  submissionPackages: 1,
  generatedDocuments: 5,
  validationRuns: 3,
  reviewRecords: 1,
  billingRecords: 4,
  paymentRecords: 2,
};

const BILLING_FULL = {
  quotePrice: 350000,
  unpaidAmount: 70000,
  totalReceived: 280000,
  depositPaid: true,
  finalPaymentPaid: false,
  billingRiskAcknowledged: false,
  billingRiskAcknowledgedAt: null,
  billingRiskAckReasonCode: null,
};

const VALIDATION_FULL = {
  id: "vr-oif01",
  status: "passed",
  executedAt: "2026-04-22T00:00:00.000Z",
  blockingCount: 0,
  warningCount: 3,
};

const REVIEW_FULL = {
  id: "rev-oif01",
  decision: "approved",
  reviewedAt: "2026-04-21T00:00:00.000Z",
  reviewerUserId: "reviewer-oif01",
  reviewerDisplayName: "高橋審査員",
};

const PROVIDER_PROGRESS_FULL = [
  { providerRole: "applicant", total: 6, done: 4 },
  { providerRole: "office", total: 6, done: 4 },
];

function buildFull(overrides: Record<string, unknown> = {}) {
  return {
    case: CASE_ROW_FULL,
    deepLink: DEEP_LINK_FULL,
    counts: COUNTS_FULL,
    billing: BILLING_FULL,
    latestValidation: VALIDATION_FULL,
    latestSubmission: null,
    latestReview: REVIEW_FULL,
    documentProgressByProvider: PROVIDER_PROGRESS_FULL,
    ...overrides,
  };
}

function buildEmpty(overrides: Record<string, unknown> = {}) {
  return {
    case: { id: "case-oif-empty", stage: "S1" },
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

function buildS9(overrides: Record<string, unknown> = {}) {
  return buildFull({ case: { ...CASE_ROW_FULL, stage: "S9" }, ...overrides });
}

describe("partial data: deepLink present but billing/counts null (p0-fe-006a-03)", () => {
  const result = adaptCaseDetailAggregate(
    buildFull({ billing: null, counts: null, latestValidation: null }),
  )!;

  it("customer back-link still visible from deepLink", () => {
    expect(result.detail.customerId).toBe("cust-oif01");
    expect(result.detail.client).toBe("王小明");
    expect(result.detail.groupName).toBe("Osaka-B");
  });

  it("billing degrades to dash and paid status", () => {
    expect(result.detail.billingAmount).toBe("—");
    expect(result.detail.billingMeta).toBe("");
    expect(result.detail.billingStatusKey).toBe("paid");
  });

  it("progress degrades to zero", () => {
    expect(result.detail.progressPercent).toBe(0);
    expect(result.detail.progressCount).toBe("0/0");
  });

  it("risk block degrades to neutral", () => {
    expect(result.detail.risk.blockingCount).toBe("0");
    expect(result.detail.risk.arrearsStatus).toBe("cases.detail.arrearsNo");
    expect(result.detail.risk.lastValidation).toBe("");
  });

  it("validationHint empty", () => {
    expect(result.detail.validationHint).toBe("");
  });

  it("info tab fields still populated from caseRecord", () => {
    expect(result.detail.caseType).toBe("business_manager");
    expect(result.detail.applicationType).toBe("認定");
    expect(result.detail.acceptedDate).toContain("2026");
  });
});

describe("partial data: counts present but deepLink null (p0-fe-006a-03)", () => {
  const result = adaptCaseDetailAggregate(buildFull({ deepLink: null }))!;

  it("customer back-link row hidden", () => {
    expect(result.detail.customerId).toBe("");
    expect(!!result.detail.customerId).toBe(false);
  });

  it("client and group fallback to empty strings", () => {
    expect(result.detail.client).toBe("");
    expect(result.detail.groupName).toBe("");
    expect(result.detail.owner).toBe("");
  });

  it("progress still computed from counts", () => {
    expect(result.detail.progressPercent).toBe(67);
    expect(result.detail.progressCount).toBe("8/12");
  });

  it("billing still computed from billing slice", () => {
    expect(result.detail.billingAmount).toBe("¥350,000");
  });
});

describe("S9 readonly — overview tab (p0-fe-006a-03)", () => {
  const result = adaptCaseDetailAggregate(buildS9())!;

  it("readonly flag is true", () => {
    expect(result.detail.readonly).toBe(true);
  });

  it("stage card shows 已归档 with badge-gray", () => {
    expect(result.detail.stage).toBe("已归档");
    expect(result.detail.statusBadge).toBe("badge-gray");
    expect(result.detail.stageCode).toBe("S9");
  });

  it("all 4 summary card fields still populated", () => {
    expect(result.detail.deadline).not.toBe("");
    expect(result.detail.progressPercent).toBe(67);
    expect(result.detail.progressCount).toBe("8/12");
    expect(result.detail.billingAmount).toBe("¥350,000");
  });

  it("customer back-link still visible in S9", () => {
    expect(result.detail.customerId).toBe("cust-oif01");
    expect(result.detail.client).toBe("王小明");
  });

  it("risk block still populated in S9", () => {
    expect(result.detail.risk.arrearsStatus).toBe("cases.detail.arrearsYes");
    expect(result.detail.risk.lastValidation).toBe("");
    expect(result.detail.risk.lastValidationLoc?.key).toBe(
      "cases.detail.overview.risk.lastValidation.passed",
    );
    expect(result.detail.risk.reviewStatus).toBe("approved");
  });

  it("validationHint still shown in S9", () => {
    expect(result.detail.validationHint).toBe("");
    expect(result.detail.validationHintLoc?.key).toBe(
      "cases.detail.overview.validationHint.warningOnly",
    );
    expect(result.detail.validationHintLoc?.params).toEqual({ w: 3 });
  });

  it("provider progress still rendered in S9", () => {
    expect(result.detail.providerProgress).toHaveLength(2);
  });

  it("overview consumed fields all defined in S9", () => {
    for (const f of OVERVIEW_TAB_MAIN_CONSUMED_FIELDS) {
      const val = (result.detail as unknown as Record<string, unknown>)[f];
      expect(val !== undefined, `${f} should be defined in S9`).toBe(true);
    }
    for (const f of OVERVIEW_TAB_SIDEBAR_CONSUMED_FIELDS) {
      const val = (result.detail as unknown as Record<string, unknown>)[f];
      expect(val !== undefined, `${f} should be defined in S9`).toBe(true);
    }
  });
});

describe("S9 readonly — info tab (p0-fe-006a-03)", () => {
  const result = adaptCaseDetailAggregate(buildS9())!;

  it("readonly flag is true", () => {
    expect(result.detail.readonly).toBe(true);
  });

  it("info case attributes still populated in S9", () => {
    expect(result.detail.id).toBe("case-oif01");
    expect(result.detail.caseType).toBe("business_manager");
    expect(result.detail.applicationType).toBe("認定");
    expect(result.detail.acceptedDate).not.toBe("");
    expect(result.detail.targetDate).not.toBe("");
    expect(result.detail.agency).toBe("大阪入管局");
  });

  it("info consumed fields all defined in S9", () => {
    for (const f of INFO_TAB_CASE_ATTRIBUTES_FIELDS) {
      const val = (result.detail as unknown as Record<string, unknown>)[f];
      expect(val !== undefined, `info ${f} should be defined in S9`).toBe(true);
    }
  });

  it("relatedParties still an array in S9", () => {
    expect(Array.isArray(result.detail.relatedParties)).toBe(true);
  });
});

describe("S9 readonly + empty slices (p0-fe-006a-03)", () => {
  const result = adaptCaseDetailAggregate(
    buildEmpty({ case: { id: "case-s9-empty", stage: "S9" } }),
  )!;

  it("readonly true even with no data", () => {
    expect(result.detail.readonly).toBe(true);
    expect(result.detail.stageCode).toBe("S9");
  });

  it("overview summary cards degrade gracefully", () => {
    expect(result.detail.stage).toBe("已归档");
    expect(result.detail.deadline).toBe("");
    expect(result.detail.progressPercent).toBe(0);
    expect(result.detail.billingAmount).toBe("—");
  });

  it("customer row hidden in S9 empty", () => {
    expect(result.detail.customerId).toBe("");
    expect(!!result.detail.customerId).toBe(false);
  });

  it("risk block neutral in S9 empty", () => {
    expect(result.detail.risk.blockingCount).toBe("0");
    expect(result.detail.risk.arrearsStatus).toBe("cases.detail.arrearsNo");
    expect(result.detail.risk.lastValidation).toBe("");
  });

  it("info tab fields default in S9 empty", () => {
    expect(result.detail.id).toBe("case-s9-empty");
    expect(result.detail.caseType).toBe("");
    expect(result.detail.caseType || "—").toBe("—");
    expect(result.detail.applicationType).toBe("");
    expect(result.detail.acceptedDate).toBe("");
    expect(result.detail.targetDate).toBe("");
  });
});

describe("info tab isFieldDisabled semantics (p0-fe-006a-03)", () => {
  const alwaysReadonly = new Set<string>(
    INFO_TAB_READONLY_RULES.alwaysReadonly,
  );

  it("all INFO_TAB_CASE_ATTRIBUTES_FIELDS are in alwaysReadonly", () => {
    for (const f of INFO_TAB_CASE_ATTRIBUTES_FIELDS) {
      expect(alwaysReadonly.has(f), `${f} should be always-readonly`).toBe(
        true,
      );
    }
  });

  it("alwaysReadonly fields are disabled regardless of stage", () => {
    const activeResult = adaptCaseDetailAggregate(buildFull())!;
    expect(activeResult.detail.readonly).toBe(false);

    for (const f of INFO_TAB_READONLY_RULES.alwaysReadonly) {
      expect(
        alwaysReadonly.has(f),
        `${f} is disabled even when case is active (non-S9)`,
      ).toBe(true);
    }
  });

  it("S9 sets readonly=true which disables all remaining fields", () => {
    const s9Result = adaptCaseDetailAggregate(buildS9())!;
    expect(s9Result.detail.readonly).toBe(true);
  });
});

describe("overview deadline danger display (p0-fe-006a-03)", () => {
  it("past-due date triggers deadlineDanger: true", () => {
    const result = adaptCaseDetailAggregate(
      buildFull({ case: { ...CASE_ROW_FULL, dueAt: "2020-01-01" } }),
    )!;
    expect(result.detail.deadlineDanger).toBe(true);
  });

  it("far-future date keeps deadlineDanger: false", () => {
    const result = adaptCaseDetailAggregate(
      buildFull({ case: { ...CASE_ROW_FULL, dueAt: "2030-12-31" } }),
    )!;
    expect(result.detail.deadlineDanger).toBe(false);
  });

  it("null dueAt keeps deadlineDanger: false and empty display", () => {
    const result = adaptCaseDetailAggregate(
      buildFull({ case: { ...CASE_ROW_FULL, dueAt: null } }),
    )!;
    expect(result.detail.deadlineDanger).toBe(false);
    expect(result.detail.deadline).toBe("");
    expect(result.detail.deadlineMeta).toBe("");
  });
});

describe("overview billing display edge cases (p0-fe-006a-03)", () => {
  it("zero quotePrice shows dash", () => {
    const result = adaptCaseDetailAggregate(
      buildFull({ billing: { ...BILLING_FULL, quotePrice: 0 } }),
    )!;
    expect(result.detail.billingAmount).toBe("—");
    expect(result.detail.billing.total).toBe("—");
  });

  it("zero unpaid shows billingStatusKey=paid and empty meta", () => {
    const result = adaptCaseDetailAggregate(
      buildFull({ billing: { ...BILLING_FULL, unpaidAmount: 0 } }),
    )!;
    expect(result.detail.billingStatusKey).toBe("paid");
    expect(result.detail.billingMeta).toBe("");
  });

  it("billing block received amount formatted from totalReceived", () => {
    const result = adaptCaseDetailAggregate(buildFull())!;
    expect(result.detail.billing.received).toBe("¥280,000");
    expect(result.detail.billing.outstanding).toContain("70,000");
  });
});

describe("overview risk confirmation display (p0-fe-006a-03)", () => {
  it("null when not acknowledged", () => {
    const result = adaptCaseDetailAggregate(buildFull())!;
    expect(result.detail.riskConfirmationRecord).toBeNull();
  });

  it("populated when acknowledged", () => {
    const result = adaptCaseDetailAggregate(
      buildFull({
        billing: {
          ...BILLING_FULL,
          billingRiskAcknowledged: true,
          billingRiskAckReasonCode: "client_waiver",
          billingRiskAcknowledgedAt: "2026-04-20T00:00:00.000Z",
        },
      }),
    )!;
    expect(result.detail.riskConfirmationRecord).not.toBeNull();
    expect(result.detail.riskConfirmationRecord!.reason).toBe("client_waiver");
    expect(result.detail.riskConfirmationRecord!.time).not.toBe("");
    expect(result.detail.riskConfirmationRecord!.amount).toContain("70,000");
  });

  it("null when acknowledged but billing slice is null", () => {
    const result = adaptCaseDetailAggregate(buildFull({ billing: null }))!;
    expect(result.detail.riskConfirmationRecord).toBeNull();
  });
});

describe("title fallback chain (p0-fe-006a-03)", () => {
  it("uses caseName when present", () => {
    const result = adaptCaseDetailAggregate(buildFull())!;
    expect(result.detail.title).toBe("経営管理ビザ新規ケース");
  });

  it("falls back to caseNo when caseName is empty", () => {
    const result = adaptCaseDetailAggregate(
      buildFull({
        case: { ...CASE_ROW_FULL, caseName: "", caseNo: "CASE-FALLBACK" },
      }),
    )!;
    expect(result.detail.title).toBe("CASE-FALLBACK");
  });

  it("falls back to id when both caseName and caseNo are empty", () => {
    const result = adaptCaseDetailAggregate(
      buildFull({ case: { ...CASE_ROW_FULL, caseName: "", caseNo: "" } }),
    )!;
    expect(result.detail.title).toBe("case-oif01");
  });
});
