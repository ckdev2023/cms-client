// ── Test Ownership ──────────────────────────────────────────────
// Owner: detail header / overview / info 7 个主链字段组。
// Covers: p0-fe-002c-02 (customerId / customerName / owner / group /
//   deadline / progress / billing) 从 aggregate DTO 到 CaseDetail 的映射。
// Contract freeze, slices, deep-link
//   → CaseAdapterDetailAggregate.test.ts / slices.test.ts
// Does NOT test: list mappers, mutation results, write builders,
//   or repository orchestration.
// ────────────────────────────────────────────────────────────────

import { describe, expect, it } from "vitest";
import { adaptCaseDetailAggregate } from "./CaseAdapterDetailAggregate";
import { resolveLocalizedCustomerName } from "./CaseAdapterCustomerLocale";
import {
  CASE_DETAIL_HEADER_FIELDS,
  CASE_DETAIL_HEADER_MAIN_CHAIN_GROUP_KEYS,
  CASE_DETAIL_HEADER_MAIN_CHAIN_GROUPS,
} from "./CaseAdapterDetailContracts";

// ─── Shared fixtures ─────────────────────────────────────────────

const MOCK_CASE_ROW = {
  id: "case-001",
  orgId: "org-1",
  customerId: "cust-001",
  caseTypeCode: "visa",
  stage: "S3",
  groupId: "group-1",
  ownerUserId: "user-1",
  dueAt: "2026-06-01",
  caseName: "技人国更新",
  caseNo: "CASE-001",
  priority: "normal",
  riskLevel: "low",
  applicationType: "認定",
  acceptedAt: "2026-01-15T00:00:00.000Z",
  createdAt: "2026-01-10T00:00:00.000Z",
  updatedAt: "2026-04-20T00:00:00.000Z",
};

const MOCK_DEEP_LINK = {
  customerId: "cust-001",
  customerName: "张伟",
  groupId: "group-1",
  groupName: "Tokyo-1",
  ownerUserId: "user-1",
  ownerDisplayName: "担当太郎",
  assistantUserId: null,
  assistantDisplayName: null,
};

const MOCK_COUNTS = {
  documentItemsTotal: 10,
  documentItemsDone: 6,
  caseParties: 3,
  tasks: 5,
  tasksPending: 2,
  communicationLogs: 8,
  submissionPackages: 1,
  generatedDocuments: 4,
  validationRuns: 2,
  reviewRecords: 1,
  billingRecords: 3,
  paymentRecords: 2,
};

const MOCK_BILLING = {
  quotePrice: 300000,
  unpaidAmount: 50000,
  depositPaid: true,
  finalPaymentPaid: false,
  billingRiskAcknowledged: false,
  billingRiskAcknowledgedAt: null,
  billingRiskAckReasonCode: null,
};

const MOCK_VALIDATION = {
  id: "vr-1",
  status: "passed",
  executedAt: "2026-04-01T00:00:00.000Z",
  blockingCount: 0,
  warningCount: 1,
};

const MOCK_REVIEW = {
  id: "rev-1",
  decision: "approved",
  reviewedAt: "2026-03-20T00:00:00.000Z",
  reviewerUserId: "reviewer-1",
  reviewerDisplayName: "田中太郎",
};

function buildAggregate(overrides: Record<string, unknown> = {}) {
  return {
    case: MOCK_CASE_ROW,
    deepLink: MOCK_DEEP_LINK,
    counts: MOCK_COUNTS,
    billing: MOCK_BILLING,
    latestValidation: MOCK_VALIDATION,
    latestSubmission: null,
    latestReview: MOCK_REVIEW,
    documentProgressByProvider: [
      { providerRole: "applicant", total: 5, done: 3 },
      { providerRole: "office", total: 5, done: 3 },
    ],
    ...overrides,
  };
}

// ─── Main-chain contract (p0-fe-002c-02) ─────────────────────────

describe("main-chain 7 field groups contract", () => {
  it("group keys match frozen set", () => {
    expect(CASE_DETAIL_HEADER_MAIN_CHAIN_GROUP_KEYS).toEqual([
      "customerId",
      "customerName",
      "owner",
      "group",
      "deadline",
      "progress",
      "billing",
    ]);
  });

  it("every detailField is present in CASE_DETAIL_HEADER_FIELDS", () => {
    const headerSet = new Set<string>(CASE_DETAIL_HEADER_FIELDS);
    for (const key of CASE_DETAIL_HEADER_MAIN_CHAIN_GROUP_KEYS) {
      const group = CASE_DETAIL_HEADER_MAIN_CHAIN_GROUPS[key];
      for (const field of group.detailFields) {
        expect(headerSet.has(field)).toBe(true);
      }
    }
  });

  it("every detailField is present on adapted result.detail", () => {
    const result = adaptCaseDetailAggregate(buildAggregate())!;
    for (const key of CASE_DETAIL_HEADER_MAIN_CHAIN_GROUP_KEYS) {
      const group = CASE_DETAIL_HEADER_MAIN_CHAIN_GROUPS[key];
      for (const field of group.detailFields) {
        expect(
          field in result.detail,
          `detail should have field "${field}" (group: ${key})`,
        ).toBe(true);
      }
    }
  });
});

// ─── customerId group ────────────────────────────────────────────

describe("customerId group", () => {
  it("maps customerId from deepLink to detail", () => {
    const result = adaptCaseDetailAggregate(buildAggregate())!;
    expect(result.detail.customerId).toBe("cust-001");
  });

  it("maps customerId as empty when deepLink is null", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate({ deepLink: null }),
    )!;
    expect(result.detail.customerId).toBe("");
  });

  it("maps customerId as empty when deepLink.customerId is empty", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate({
        deepLink: { ...MOCK_DEEP_LINK, customerId: "" },
      }),
    )!;
    expect(result.detail.customerId).toBe("");
  });
});

// ─── customerName group ──────────────────────────────────────────

describe("customerName group", () => {
  it("maps client from deepLink.customerName", () => {
    const result = adaptCaseDetailAggregate(buildAggregate())!;
    expect(result.detail.client).toBe("张伟");
  });

  it("maps client as empty when deepLink is null", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate({ deepLink: null }),
    )!;
    expect(result.detail.client).toBe("");
  });
});

// ─── owner group ─────────────────────────────────────────────────

describe("owner group", () => {
  it("maps owner from deepLink.ownerDisplayName", () => {
    const result = adaptCaseDetailAggregate(buildAggregate())!;
    expect(result.detail.owner).toBe("担当太郎");
  });

  it("maps owner as empty when deepLink is null", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate({ deepLink: null }),
    )!;
    expect(result.detail.owner).toBe("");
  });
});

// ─── group group ─────────────────────────────────────────────────

describe("group group", () => {
  it("maps groupId and groupName from deepLink", () => {
    const result = adaptCaseDetailAggregate(buildAggregate())!;
    expect(result.detail.groupId).toBe("group-1");
    expect(result.detail.groupName).toBe("Tokyo-1");
  });

  it("maps groupId/groupName as empty when deepLink is null", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate({ deepLink: null }),
    )!;
    expect(result.detail.groupId).toBe("");
    expect(result.detail.groupName).toBe("");
  });

  it("maps groupId/groupName as empty when deepLink values are null", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate({
        deepLink: { ...MOCK_DEEP_LINK, groupId: null, groupName: null },
      }),
    )!;
    expect(result.detail.groupId).toBe("");
    expect(result.detail.groupName).toBe("");
  });
});

// ─── deadline group ──────────────────────────────────────────────

describe("deadline group", () => {
  it("maps deadline and targetDate from dueAt", () => {
    const result = adaptCaseDetailAggregate(buildAggregate())!;
    expect(result.detail.deadline).not.toBe("");
    expect(result.detail.targetDate).not.toBe("");
    expect(result.detail.deadlineMeta).toBe("");
    expect(result.detail.deadlineMetaLoc?.key).toBe(
      "cases.detail.overview.deadlineMeta",
    );
    expect(result.detail.deadlineMetaLoc?.params?.date).not.toBe("");
  });

  it("maps deadline fields as empty when dueAt is null", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate({ case: { ...MOCK_CASE_ROW, dueAt: null } }),
    )!;
    expect(result.detail.deadline).toBe("");
    expect(result.detail.deadlineMeta).toBe("");
    expect(result.detail.deadlineMetaLoc).toBeUndefined();
    expect(result.detail.targetDate).toBe("");
  });

  it("deadlineDanger is false for far-future due dates", () => {
    const result = adaptCaseDetailAggregate(buildAggregate())!;
    expect(result.detail.deadlineDanger).toBe(false);
  });

  it("deadlineDanger is true for past-due dates", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate({ case: { ...MOCK_CASE_ROW, dueAt: "2020-01-01" } }),
    )!;
    expect(result.detail.deadlineDanger).toBe(true);
  });
});

// ─── progress group ──────────────────────────────────────────────

describe("progress group", () => {
  it("computes progressPercent from counts slice", () => {
    const result = adaptCaseDetailAggregate(buildAggregate())!;
    expect(result.detail.progressPercent).toBe(60);
    expect(result.detail.progressCount).toBe("6/10");
    expect(result.detail.docsCounter).toBe("6/10");
  });

  it("defaults progress to 0 when counts slice is null", () => {
    const result = adaptCaseDetailAggregate(buildAggregate({ counts: null }))!;
    expect(result.detail.progressPercent).toBe(0);
    expect(result.detail.progressCount).toBe("0/0");
    expect(result.detail.docsCounter).toBe("0/0");
  });

  it("handles zero total gracefully", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate({
        counts: {
          ...MOCK_COUNTS,
          documentItemsTotal: 0,
          documentItemsDone: 0,
        },
      }),
    )!;
    expect(result.detail.progressPercent).toBe(0);
    expect(result.detail.progressCount).toBe("0/0");
  });
});

// ─── billing group ───────────────────────────────────────────────

describe("billing group", () => {
  it("maps billingAmount from quotePrice", () => {
    const result = adaptCaseDetailAggregate(buildAggregate())!;
    expect(result.detail.billingAmount).toBe("¥300,000");
  });

  it("maps billingMeta from unpaidAmount", () => {
    const result = adaptCaseDetailAggregate(buildAggregate())!;
    expect(result.detail.billingMeta).toContain("50,000");
  });

  it("maps billingStatusKey based on unpaidAmount", () => {
    const result = adaptCaseDetailAggregate(buildAggregate())!;
    expect(result.detail.billingStatusKey).toBe("unpaid");
  });

  it("maps billing as dash/empty/paid when billing slice is null", () => {
    const result = adaptCaseDetailAggregate(buildAggregate({ billing: null }))!;
    expect(result.detail.billingAmount).toBe("—");
    expect(result.detail.billingMeta).toBe("");
    expect(result.detail.billingStatusKey).toBe("paid");
  });
});

// ─── customerLocalizedNames (R27-S) ──────────────────────────────

describe("customerLocalizedNames", () => {
  it("maps localized names from deepLink", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate({
        deepLink: {
          ...MOCK_DEEP_LINK,
          customerNameZh: "张伟",
          customerNameJa: "田中太郎",
          customerNameEn: "John Doe",
        },
      }),
    )!;
    expect(result.customerLocalizedNames).toEqual({
      zh: "张伟",
      ja: "田中太郎",
      en: "John Doe",
    });
    expect(result.detail.customerLocalizedNames).toEqual({
      zh: "张伟",
      ja: "田中太郎",
      en: "John Doe",
    });
  });

  it("defaults localized names to empty strings when deepLink is null", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate({ deepLink: null }),
    )!;
    expect(result.customerLocalizedNames).toEqual({
      zh: "",
      ja: "",
      en: "",
    });
  });

  it("defaults localized names to empty strings when fields are missing", () => {
    const result = adaptCaseDetailAggregate(buildAggregate())!;
    expect(result.customerLocalizedNames).toEqual({
      zh: "",
      ja: "",
      en: "",
    });
  });
});

// ─── resolveLocalizedCustomerName (R27-S) ────────────────────────

describe("resolveLocalizedCustomerName", () => {
  const names = { zh: "张伟", ja: "田中太郎", en: "John Doe" };

  it("picks zh for zh-CN locale", () => {
    expect(resolveLocalizedCustomerName(names, "fallback", "zh-CN")).toBe(
      "张伟",
    );
  });

  it("picks ja for ja-JP locale", () => {
    expect(resolveLocalizedCustomerName(names, "fallback", "ja-JP")).toBe(
      "田中太郎",
    );
  });

  it("picks en for en-US locale", () => {
    expect(resolveLocalizedCustomerName(names, "fallback", "en-US")).toBe(
      "John Doe",
    );
  });

  it("falls back when locale name is empty", () => {
    const partial = { zh: "张伟", ja: "", en: "" };
    expect(resolveLocalizedCustomerName(partial, "default", "ja-JP")).toBe(
      "default",
    );
  });

  it("falls back when names is null", () => {
    expect(resolveLocalizedCustomerName(null, "fallback", "zh-CN")).toBe(
      "fallback",
    );
  });

  it("falls back when names is undefined", () => {
    expect(resolveLocalizedCustomerName(undefined, "fallback", "ja-JP")).toBe(
      "fallback",
    );
  });

  it("falls back for unknown locale", () => {
    expect(resolveLocalizedCustomerName(names, "fallback", "ko-KR")).toBe(
      "fallback",
    );
  });
});
