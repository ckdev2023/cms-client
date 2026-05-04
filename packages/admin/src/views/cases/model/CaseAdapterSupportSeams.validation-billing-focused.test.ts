// ── Test Ownership ──────────────────────────────────────────────
// Owner: p0-fe-006b-03 — validation/billing tabs focused tests
//   Locks empty-state degradation, summary display values, and key
//   gate semantics as consumed by tab Vue components.
// Does NOT test: adapter internal helpers (→ CaseAdapterSupportSeams.test),
//   URL builders (→ CaseAdapterSupportSeams.test), seam registry
//   (→ CaseAdapterSupportSeams.test), aggregate-level billing/validation
//   hints (→ overview-info-focused.test), list mappers, write builders,
//   or repository orchestration.
// ────────────────────────────────────────────────────────────────

import { describe, expect, it } from "vitest";
import {
  adaptCaseValidationData,
  adaptCaseBillingData,
} from "./CaseAdapterSupportSeams";

// ─── Shared fixtures ─────────────────────────────────────────────

type R = Record<string, unknown>;

const vrItem = (o: R = {}): R => ({
  id: "vr-f01",
  caseId: "case-f01",
  rulesetRef: null,
  resultStatus: "passed",
  blockingCount: 0,
  warningCount: 0,
  reportPayload: {},
  executedBy: "user-1",
  executedAt: "2026-04-20T10:00:00.000Z",
  createdAt: "2026-04-20T10:00:00.000Z",
  updatedAt: "2026-04-20T10:00:00.000Z",
  ...o,
});

const billingPlan = (o: R = {}): R => ({
  id: "bp-f01",
  caseId: "case-f01",
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
  ...o,
});

// ═══════════════════════════════════════════════════════════════════
//  VALIDATION TAB — empty state
// ═══════════════════════════════════════════════════════════════════

describe("validation tab empty state (p0-fe-006b-03)", () => {
  it("null/undefined input → tab shows placeholder (adapter returns null)", () => {
    expect(adaptCaseValidationData(null)).toBeNull();
    expect(adaptCaseValidationData(undefined)).toBeNull();
  });

  it("empty items → neutral validation: no blocking, no warnings, no info", () => {
    const result = adaptCaseValidationData({ items: [], total: 0 })!;
    expect(result.lastTime).toBe("");
    expect(result.blocking).toEqual([]);
    expect(result.warnings).toEqual([]);
    expect(result.info).toEqual([]);
    expect(result.retriggerNote).toBeUndefined();
  });

  it("single passed run with empty report → all gate lists empty", () => {
    const result = adaptCaseValidationData({
      items: [vrItem({ resultStatus: "passed", reportPayload: {} })],
    })!;
    expect(result.blocking).toEqual([]);
    expect(result.warnings).toEqual([]);
    expect(result.info).toEqual([]);
  });
});

// ─── Validation tab — summary display ───────────────────────────

describe("validation tab summary display (p0-fe-006b-03)", () => {
  it("lastTime shows formatted date from latest run", () => {
    const result = adaptCaseValidationData({
      items: [vrItem({ executedAt: "2026-04-20T10:00:00.000Z" })],
    })!;
    expect(result.lastTime).not.toBe("");
    expect(result.lastTime).toContain("2026");
  });

  it("picks latest run when multiple runs present", () => {
    const result = adaptCaseValidationData({
      items: [
        vrItem({ id: "vr-old", executedAt: "2026-04-18T10:00:00.000Z" }),
        vrItem({ id: "vr-latest", executedAt: "2026-04-22T10:00:00.000Z" }),
        vrItem({ id: "vr-mid", executedAt: "2026-04-20T10:00:00.000Z" }),
      ],
    })!;
    expect(result.lastTime).toContain("2026");
  });

  it("blocking items parsed from reportPayload.blocking", () => {
    const result = adaptCaseValidationData({
      items: [
        vrItem({
          resultStatus: "failed",
          blockingCount: 2,
          reportPayload: {
            blocking: [
              { gate: "A", title: "必須資料不足" },
              { gate: "A", title: "パスポート期限切れ" },
            ],
          },
        }),
      ],
    })!;
    expect(result.blocking).toHaveLength(2);
    expect(result.blocking[0].gate).toBe("A");
    expect(result.blocking[0].title).toBe("必須資料不足");
    expect(result.blocking[1].title).toBe("パスポート期限切れ");
  });

  it("warnings parsed from reportPayload.warnings", () => {
    const result = adaptCaseValidationData({
      items: [
        vrItem({
          warningCount: 1,
          reportPayload: {
            warnings: [{ gate: "B", title: "写真品質低い" }],
          },
        }),
      ],
    })!;
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0].gate).toBe("B");
    expect(result.warnings[0].title).toBe("写真品質低い");
  });

  it("synthesizes summary when reportPayload has no details", () => {
    const result = adaptCaseValidationData({
      items: [
        vrItem({
          resultStatus: "failed",
          blockingCount: 5,
          warningCount: 3,
          reportPayload: {},
        }),
      ],
    })!;
    expect(result.blocking).toHaveLength(1);
    expect(result.blocking[0].titleKey).toBe(
      "cases.validation.blockingSummary",
    );
    expect(result.blocking[0].titleParams).toEqual({ count: 5 });
    expect(result.blocking[0].noteKey).toBe("cases.validation.refReport");
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0].titleKey).toBe("cases.validation.warningSummary");
    expect(result.warnings[0].titleParams).toEqual({ count: 3 });
    expect(result.warnings[0].noteKey).toBe("cases.validation.refReport");
  });

  it("retriggerNote present only for failed status", () => {
    const failed = adaptCaseValidationData({
      items: [vrItem({ resultStatus: "failed", blockingCount: 1 })],
    })!;
    expect(failed.retriggerNote).toBeTruthy();
    expect(failed.retriggerNote).toBe("cases.validation.lastFailed");

    const passed = adaptCaseValidationData({
      items: [vrItem({ resultStatus: "passed" })],
    })!;
    expect(passed.retriggerNote).toBeUndefined();
  });
});

// ─── Validation tab — gate item deep links ──────────────────────

describe("validation tab gate item deep links (p0-fe-006b-03)", () => {
  it("gate item with actionTab points to correct detail tab", () => {
    const result = adaptCaseValidationData({
      items: [
        vrItem({
          blockingCount: 1,
          reportPayload: {
            blocking: [
              {
                gate: "A",
                title: "資料不足",
                actionLabel: "資料管理へ",
                actionTab: "documents",
              },
            ],
          },
        }),
      ],
    })!;
    expect(result.blocking[0].actionTab).toBe("documents");
    expect(result.blocking[0].actionLabel).toBe("資料管理へ");
  });

  it("gate item optional fields: fix, assignee, deadline", () => {
    const result = adaptCaseValidationData({
      items: [
        vrItem({
          blockingCount: 1,
          reportPayload: {
            blocking: [
              {
                gate: "A",
                title: "不足",
                fix: "住民票を追加してください",
                assignee: "田中太郎",
                deadline: "2026-05-15",
              },
            ],
          },
        }),
      ],
    })!;
    const item = result.blocking[0];
    expect(item.fix).toBe("住民票を追加してください");
    expect(item.assignee).toBe("田中太郎");
    expect(item.deadline).toBe("2026-05-15");
  });

  it("gate item without optional fields omits them", () => {
    const result = adaptCaseValidationData({
      items: [
        vrItem({
          blockingCount: 1,
          reportPayload: {
            blocking: [{ gate: "A", title: "最低限のみ" }],
          },
        }),
      ],
    })!;
    const item = result.blocking[0];
    expect(item.fix).toBeUndefined();
    expect(item.assignee).toBeUndefined();
    expect(item.actionLabel).toBeUndefined();
    expect(item.actionTab).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════════════
//  BILLING TAB — empty state
// ═══════════════════════════════════════════════════════════════════

describe("billing tab empty state (p0-fe-006b-03)", () => {
  it("null/undefined input → tab shows placeholder (adapter returns null)", () => {
    expect(adaptCaseBillingData(null)).toBeNull();
    expect(adaptCaseBillingData(undefined)).toBeNull();
  });

  it("empty plans → summary all neutral", () => {
    const result = adaptCaseBillingData({ plans: [] })!;
    expect(result.total).toBe("—");
    expect(result.received).toBe("¥0");
    expect(result.outstanding).toBe("¥0");
    expect(result.payments).toEqual([]);
  });

  it("non-object value → adapter returns null", () => {
    expect(adaptCaseBillingData("string")).toBeNull();
    expect(adaptCaseBillingData(42)).toBeNull();
    expect(adaptCaseBillingData([])).toBeNull();
  });
});

// ─── Billing tab — summary display ──────────────────────────────

describe("billing tab summary display (p0-fe-006b-03)", () => {
  it("total shows yen-formatted sum of amountDue", () => {
    const result = adaptCaseBillingData({
      plans: [
        billingPlan({ amountDue: 100000 }),
        billingPlan({ id: "bp-f02", amountDue: 200000 }),
      ],
    })!;
    expect(result.total).toBe("¥300,000");
  });

  it("received shows yen-formatted sum of paidAmount", () => {
    const result = adaptCaseBillingData({
      plans: [
        billingPlan({ paidAmount: 50000 }),
        billingPlan({ id: "bp-f02", paidAmount: 150000 }),
      ],
    })!;
    expect(result.received).toBe("¥200,000");
  });

  it("outstanding = max(0, totalDue − totalPaid)", () => {
    const result = adaptCaseBillingData({
      plans: [billingPlan({ amountDue: 300000, paidAmount: 100000 })],
    })!;
    expect(result.outstanding).toBe("¥200,000");
  });

  it("outstanding never goes negative (overpayment)", () => {
    const result = adaptCaseBillingData({
      plans: [billingPlan({ amountDue: 100000, paidAmount: 200000 })],
    })!;
    expect(result.outstanding).toBe("¥0");
  });

  it("zero amountDue → total shows dash", () => {
    const result = adaptCaseBillingData({
      plans: [billingPlan({ amountDue: 0, paidAmount: 0 })],
    })!;
    expect(result.total).toBe("—");
  });

  it("payment row maps milestone, amount, status and label", () => {
    const result = adaptCaseBillingData({
      plans: [billingPlan({ milestoneName: "着手金", amountDue: 150000 })],
    })!;
    const row = result.payments[0];
    expect(row.type).toBe("着手金");
    expect(row.amount).toBe("¥150,000");
    expect(row.status).toBe("due");
    expect(row.statusLabel).toBe("応収");
  });

  it("missing milestoneName defaults to 収費ノード", () => {
    const result = adaptCaseBillingData({
      plans: [billingPlan({ milestoneName: "" })],
    })!;
    expect(result.payments[0].type).toBe("収費ノード");
  });
});

// ─── Billing tab — status label gates ───────────────────────────

describe("billing tab status label gates (p0-fe-006b-03)", () => {
  const statusLabels: [string, string][] = [
    ["due", "応収"],
    ["partial", "部分回款"],
    ["paid", "已結清"],
    ["overdue", "欠款"],
  ];

  for (const [status, label] of statusLabels) {
    it(`status "${status}" → label "${label}"`, () => {
      const result = adaptCaseBillingData({
        plans: [billingPlan({ status })],
      })!;
      expect(result.payments[0].statusLabel).toBe(label);
    });
  }

  it("unknown status falls back to raw string", () => {
    const result = adaptCaseBillingData({
      plans: [billingPlan({ status: "refunded" })],
    })!;
    expect(result.payments[0].statusLabel).toBe("refunded");
  });
});
