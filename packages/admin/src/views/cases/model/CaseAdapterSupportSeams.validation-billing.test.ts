// ── Test Ownership ──────────────────────────────────────────────
// Owner: support seams for validation/billing detail tabs.
// Covers: validation / billing / submissionPkgs / doubleReview.
// Does NOT test: registry boundary, tasks, deadlines, urls, or detail model.
// ────────────────────────────────────────────────────────────────

import { describe, expect, it } from "vitest";
import {
  adaptCaseBillingData,
  adaptCaseDoubleReviewEntries,
  adaptCaseSubmissionPackages,
  adaptCaseValidationData,
} from "./CaseAdapterSupportSeams";

describe("adaptCaseValidationData", () => {
  const vrItem = (
    overrides: Record<string, unknown> = {},
  ): Record<string, unknown> => ({
    id: "vr-001",
    caseId: "case-001",
    rulesetRef: null,
    resultStatus: "passed",
    blockingCount: 0,
    warningCount: 0,
    reportPayload: {},
    executedBy: "user-1",
    executedAt: "2026-04-20T10:00:00.000Z",
    createdAt: "2026-04-20T10:00:00.000Z",
    updatedAt: "2026-04-20T10:00:00.000Z",
    ...overrides,
  });

  it("returns null for non-object / non-array input", () => {
    expect(adaptCaseValidationData(null)).toBeNull();
    expect(adaptCaseValidationData(undefined)).toBeNull();
    expect(adaptCaseValidationData("string")).toBeNull();
  });

  it("returns empty validation for { items: [] }", () => {
    const result = adaptCaseValidationData({ items: [], total: 0 });
    expect(result).toEqual({
      lastTime: "",
      blocking: [],
      warnings: [],
      info: [],
    });
  });

  it("picks latest validation run by executedAt", () => {
    const result = adaptCaseValidationData({
      items: [
        vrItem({ executedAt: "2026-04-18T10:00:00.000Z" }),
        vrItem({ executedAt: "2026-04-20T10:00:00.000Z" }),
        vrItem({ executedAt: "2026-04-19T10:00:00.000Z" }),
      ],
    });
    expect(result!.lastTime).toBeTruthy();
  });

  it("parses blocking/warnings/info from reportPayload", () => {
    const result = adaptCaseValidationData({
      items: [
        vrItem({
          resultStatus: "failed",
          blockingCount: 2,
          warningCount: 1,
          reportPayload: {
            blocking: [
              { gate: "A", title: "必須資料不足" },
              { gate: "A", title: "パスポート期限切れ" },
            ],
            warnings: [{ gate: "B", title: "写真品質低い" }],
            info: [],
          },
        }),
      ],
    });
    expect(result!.blocking).toHaveLength(2);
    expect(result!.blocking[0].title).toBe("必須資料不足");
    expect(result!.blocking[0].gate).toBe("A");
    expect(result!.warnings).toHaveLength(1);
    expect(result!.warnings[0].title).toBe("写真品質低い");
    expect(result!.info).toHaveLength(0);
  });

  it("maps passed validation with warningCount only", () => {
    const result = adaptCaseValidationData({
      items: [
        vrItem({
          resultStatus: "passed",
          blockingCount: 0,
          warningCount: 2,
          reportPayload: {
            blocking: [],
            warnings: [
              { gate: "A", title: "フォーマット注意" },
              { gate: "B", title: "古い住所表記" },
            ],
            info: [{ title: "補足あり" }],
          },
        }),
      ],
    });
    expect(result!.blocking).toEqual([]);
    expect(result!.warnings).toHaveLength(2);
    expect(result!.info).toHaveLength(1);
  });

  it("safe-defaults when reportPayload is malformed", () => {
    const result = adaptCaseValidationData({
      items: [vrItem({ reportPayload: "invalid" })],
    });
    expect(result!.blocking).toEqual([]);
    expect(result!.warnings).toEqual([]);
    expect(result!.info).toEqual([]);
  });

  it("accepts raw array input", () => {
    const result = adaptCaseValidationData([vrItem()]);
    expect(result).not.toBeNull();
    expect(result!.blocking).toEqual([]);
  });
});

describe("adaptCaseBillingData", () => {
  const billingPlan = (
    overrides: Record<string, unknown> = {},
  ): Record<string, unknown> => ({
    id: "bp-001",
    caseId: "case-001",
    milestoneName: "着手金",
    amountDue: 100000,
    dueDate: "2026-05-01",
    status: "due",
    gateEffectMode: "warn",
    remark: null,
    paidAmount: 0,
    unpaidAmount: 100000,
    createdAt: "2026-04-01T00:00:00.000Z",
    updatedAt: "2026-04-01T00:00:00.000Z",
    ...overrides,
  });

  it("returns null for non-object input", () => {
    expect(adaptCaseBillingData(null)).toBeNull();
    expect(adaptCaseBillingData(undefined)).toBeNull();
    expect(adaptCaseBillingData("string")).toBeNull();
  });

  it("adapts combined { plans } structure", () => {
    const result = adaptCaseBillingData({
      plans: [
        billingPlan(),
        billingPlan({
          id: "bp-002",
          milestoneName: "尾款",
          amountDue: 200000,
          paidAmount: 200000,
          status: "paid",
        }),
      ],
    });
    expect(result).not.toBeNull();
    expect(result!.payments).toHaveLength(2);
    expect(result!.total).toBe("¥300,000");
    expect(result!.received).toBe("¥200,000");
    expect(result!.outstanding).toBe("¥100,000");
  });

  it("maps billing plan to PaymentRow correctly", () => {
    const result = adaptCaseBillingData({
      plans: [billingPlan()],
    });
    const row = result!.payments[0];
    expect(row.type).toBe("着手金");
    expect(row.amount).toBe("¥100,000");
    expect(row.status).toBe("due");
    expect(row.statusLabel).toBe("応収");
  });

  it("handles empty plans", () => {
    const result = adaptCaseBillingData({ plans: [] });
    expect(result!.total).toBe("—");
    expect(result!.received).toBe("¥0");
    expect(result!.outstanding).toBe("¥0");
    expect(result!.payments).toEqual([]);
  });

  it("defaults milestone name when missing", () => {
    const result = adaptCaseBillingData({
      plans: [billingPlan({ milestoneName: "" })],
    });
    expect(result!.payments[0].type).toBe("収費ノード");
  });

  it("accepts { items } format as fallback", () => {
    const result = adaptCaseBillingData({
      items: [billingPlan()],
      total: 1,
    });
    expect(result).not.toBeNull();
    expect(result!.payments).toHaveLength(1);
  });

  it("maps status labels correctly", () => {
    const statuses = [
      { status: "due", label: "応収" },
      { status: "partial", label: "部分回款" },
      { status: "paid", label: "已結清" },
      { status: "overdue", label: "欠款" },
    ];
    for (const { status, label } of statuses) {
      const result = adaptCaseBillingData({
        plans: [billingPlan({ status })],
      });
      expect(result!.payments[0].statusLabel).toBe(label);
    }
  });
});

describe("adaptCaseSubmissionPackages", () => {
  const spItem = (
    overrides: Record<string, unknown> = {},
  ): Record<string, unknown> => ({
    id: "sp-001",
    orgId: "org-001",
    caseId: "case-001",
    submissionNo: 1,
    submissionKind: "initial",
    submittedAt: "2026-04-15T00:00:00.000Z",
    validationRunId: "vr-001",
    reviewRecordId: null,
    authorityName: "東京入管",
    acceptanceNo: "ACC-2026-001",
    receiptStorageType: null,
    receiptRelativePathOrKey: null,
    relatedSubmissionId: null,
    createdBy: "user-1",
    createdAt: "2026-04-15T00:00:00.000Z",
    ...overrides,
  });

  it("returns null for non-object / non-array input", () => {
    expect(adaptCaseSubmissionPackages(null)).toBeNull();
    expect(adaptCaseSubmissionPackages(undefined)).toBeNull();
    expect(adaptCaseSubmissionPackages("string")).toBeNull();
  });

  it("returns empty array for { items: [] }", () => {
    expect(adaptCaseSubmissionPackages({ items: [], total: 0 })).toEqual([]);
  });

  it("maps submission package with all fields", () => {
    const result = adaptCaseSubmissionPackages({ items: [spItem()] });
    expect(result).toHaveLength(1);
    const pkg = result![0];
    expect(pkg.id).toBe("sp-001");
    expect(pkg.locked).toBe(true);
    expect(pkg.status).toBe("受理済み");
    expect(pkg.summary).toContain("#1");
    expect(pkg.summary).toContain("初回提出");
    expect(pkg.summary).toContain("東京入管");
    expect(pkg.summary).toContain("受理番号: ACC-2026-001");
  });

  it("shows 提出済み when no acceptanceNo", () => {
    const result = adaptCaseSubmissionPackages({
      items: [spItem({ acceptanceNo: null })],
    });
    expect(result![0].status).toBe("提出済み");
  });

  it("maps supplement kind label", () => {
    const result = adaptCaseSubmissionPackages({
      items: [spItem({ submissionKind: "supplement" })],
    });
    expect(result![0].summary).toContain("補正提出");
  });

  it("skips items with empty id", () => {
    const result = adaptCaseSubmissionPackages({
      items: [spItem({ id: "" }), spItem({ id: "sp-002" })],
    });
    expect(result).toHaveLength(1);
    expect(result![0].id).toBe("sp-002");
  });

  it("accepts raw array", () => {
    const result = adaptCaseSubmissionPackages([spItem()]);
    expect(result).toHaveLength(1);
  });
});

describe("adaptCaseDoubleReviewEntries", () => {
  const rrItem = (
    overrides: Record<string, unknown> = {},
  ): Record<string, unknown> => ({
    id: "rr-001",
    orgId: "org-001",
    caseId: "case-001",
    validationRunId: "vr-001",
    decision: "approved",
    comment: "問題ありません",
    reviewerUserId: "user-2",
    reviewerDisplayName: "鈴木 花子",
    reviewedAt: "2026-04-20T14:00:00.000Z",
    createdAt: "2026-04-20T14:00:00.000Z",
    updatedAt: "2026-04-20T14:00:00.000Z",
    ...overrides,
  });

  it("returns null for non-object / non-array input", () => {
    expect(adaptCaseDoubleReviewEntries(null)).toBeNull();
    expect(adaptCaseDoubleReviewEntries(undefined)).toBeNull();
    expect(adaptCaseDoubleReviewEntries("string")).toBeNull();
  });

  it("returns empty array for { items: [] }", () => {
    expect(adaptCaseDoubleReviewEntries({ items: [], total: 0 })).toEqual([]);
  });

  it("maps approved review record correctly", () => {
    const result = adaptCaseDoubleReviewEntries({ items: [rrItem()] });
    expect(result).toHaveLength(1);
    const entry = result![0];
    expect(entry.initials).toBe("鈴花");
    expect(entry.name).toBe("鈴木 花子");
    expect(entry.verdict).toBe("承認");
    expect(entry.verdictBadge).toBe("badge-green");
    expect(entry.comment).toBe("問題ありません");
    expect(entry.rejectReason).toBeNull();
  });

  it("maps rejected review record correctly", () => {
    const result = adaptCaseDoubleReviewEntries({
      items: [rrItem({ decision: "rejected", comment: "不備があります" })],
    });
    const entry = result![0];
    expect(entry.verdict).toBe("却下");
    expect(entry.verdictBadge).toBe("badge-red");
    expect(entry.comment).toBeNull();
    expect(entry.rejectReason).toBe("不備があります");
  });

  it("derives initials from display name", () => {
    const result = adaptCaseDoubleReviewEntries({
      items: [rrItem({ reviewerDisplayName: "田中 太郎" })],
    });
    expect(result![0].initials).toBe("田太");
  });

  it("falls back to userId when displayName missing", () => {
    const result = adaptCaseDoubleReviewEntries({
      items: [rrItem({ reviewerDisplayName: null })],
    });
    expect(result![0].name).toBe("user-2");
  });

  it("skips items with empty id", () => {
    const result = adaptCaseDoubleReviewEntries({
      items: [rrItem({ id: "" }), rrItem({ id: "rr-002" })],
    });
    expect(result).toHaveLength(1);
    expect(result![0].name).toBe("鈴木 花子");
  });

  it("accepts raw array", () => {
    const result = adaptCaseDoubleReviewEntries([rrItem()]);
    expect(result).toHaveLength(1);
  });
});
