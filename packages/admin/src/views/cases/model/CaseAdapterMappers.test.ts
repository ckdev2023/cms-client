// ── Test Ownership ──────────────────────────────────────────────
// Owner: list response → UI model mapping (adaptCaseListResult,
//   adaptCaseSummaryCards).
// Does NOT test: detail aggregate (→ CaseAdapterDetailAggregate.test),
//   mutation results, write builders, repository orchestration, or
//   customer downstream reuse (→ CaseListSummaryDownstream.test).
// ────────────────────────────────────────────────────────────────

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  adaptCaseListResult,
  adaptCaseSummaryCards,
} from "./CaseAdapterMappers";
import { CASE_SUMMARY_CARD_KEYS } from "./CaseAdapterTypes";
import type { CaseListItem } from "../types";

// ─── Helpers ────────────────────────────────────────────────────

function flatRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "case-001",
    customerId: "cust-001",
    caseTypeCode: "visa",
    stage: "S3",
    groupId: "group-1",
    ownerUserId: "user-1",
    caseName: "技人国更新",
    caseNo: "CASE-001",
    riskLevel: "low",
    billingUnpaidAmountCached: 50000,
    updatedAt: "2026-04-10T00:00:00.000Z",
    dueAt: "2026-06-01",
    customerName: "張伟",
    groupName: "Tokyo-1",
    ownerDisplayName: "担当太郎",
    assistantDisplayName: null,
    ...overrides,
  };
}

function wrappedRow(
  caseOverrides: Record<string, unknown> = {},
  wrapperOverrides: Record<string, unknown> = {},
) {
  const caseRecord = {
    id: "case-001",
    customerId: "cust-001",
    caseTypeCode: "visa",
    stage: "S3",
    groupId: "group-1",
    ownerUserId: "user-1",
    caseName: "技人国更新",
    caseNo: "CASE-001",
    riskLevel: "low",
    billingUnpaidAmountCached: 50000,
    updatedAt: "2026-04-10T00:00:00.000Z",
    dueAt: "2026-06-01",
    ...caseOverrides,
  };
  return {
    case: caseRecord,
    customerName: "張伟",
    groupName: "Tokyo-1",
    latestValidation: null,
    ...wrapperOverrides,
  };
}

const LIST_ITEM_BASE: Omit<
  CaseListItem,
  | "id"
  | "name"
  | "stageId"
  | "stageLabel"
  | "completionPercent"
  | "validationStatus"
  | "blockerCount"
  | "unpaidAmount"
> = {
  type: "visa",
  applicant: "X",
  groupId: "g",
  groupLabel: "G",
  ownerId: "o",
  completionLabel: "",
  validationLabel: "",
  updatedAtLabel: "",
  dueDate: "",
  dueDateLabel: "",
  riskStatus: "normal",
  riskLabel: "",
  visibleScopes: ["all"],
};

function listItem(overrides: Partial<CaseListItem> = {}): CaseListItem {
  return {
    ...LIST_ITEM_BASE,
    id: "c1",
    name: "A",
    stageId: "S3",
    stageLabel: "S3",
    completionPercent: 0,
    validationStatus: "passed",
    blockerCount: 0,
    unpaidAmount: 0,
    ...overrides,
  };
}

// ─── adaptCaseListResult ────────────────────────────────────────

describe("adaptCaseListResult", () => {
  it("adapts a valid flat CaseListItemDto response", () => {
    const result = adaptCaseListResult({
      items: [flatRow()],
      total: 1,
      page: 1,
      limit: 50,
    });
    expect(result).not.toBeNull();
    expect(result!.items).toHaveLength(1);
    expect(result!.total).toBe(1);
    expect(result!.page).toBe(1);
    expect(result!.limit).toBe(50);
    expect(result!.items[0].id).toBe("case-001");
    expect(result!.items[0].name).toBe("技人国更新");
    expect(result!.items[0].stageId).toBe("S3");
  });

  it("maps customerName from flat CaseListItemDto", () => {
    const result = adaptCaseListResult({
      items: [flatRow({ customerName: "田中太郎" })],
      total: 1,
    });
    expect(result!.items[0].applicant).toBe("田中太郎");
  });

  it("falls back to customerId when customerName is absent", () => {
    const result = adaptCaseListResult({
      items: [flatRow({ customerName: undefined })],
      total: 1,
    });
    expect(result!.items[0].applicant).toBe("cust-001");
  });

  it("maps groupName from flat CaseListItemDto", () => {
    const result = adaptCaseListResult({
      items: [flatRow({ groupName: "Osaka Branch" })],
      total: 1,
    });
    expect(result!.items[0].groupLabel).toBe("Osaka Branch");
  });

  it("maps groupId from Case field", () => {
    const result = adaptCaseListResult({
      items: [flatRow({ groupId: "grp-42" })],
      total: 1,
    });
    expect(result!.items[0].groupId).toBe("grp-42");
  });

  it("maps customerId for customer downstream linking", () => {
    const result = adaptCaseListResult({
      items: [flatRow({ customerId: "cust-downstream" })],
      total: 1,
    });
    expect(result!.items[0].customerId).toBe("cust-downstream");
  });

  it("maps latestValidation status when present", () => {
    const result = adaptCaseListResult({
      items: [
        flatRow({
          latestValidation: { status: "failed", executedAt: "2026-04-01" },
        }),
      ],
      total: 1,
    });
    expect(result!.items[0].validationStatus).toBe("failed");
  });

  it("defaults validationStatus to pending when latestValidation is absent", () => {
    const result = adaptCaseListResult({
      items: [flatRow()],
      total: 1,
    });
    expect(result!.items[0].validationStatus).toBe("pending");
  });

  it("returns null for non-object input", () => {
    expect(adaptCaseListResult(null)).toBeNull();
    expect(adaptCaseListResult("bad")).toBeNull();
    expect(adaptCaseListResult(42)).toBeNull();
  });

  it("returns null when items is not an array", () => {
    expect(adaptCaseListResult({ items: "bad", total: 1 })).toBeNull();
  });

  it("filters out invalid items", () => {
    const result = adaptCaseListResult({
      items: [flatRow(), { bad: true }],
      total: 2,
    });
    expect(result).not.toBeNull();
    expect(result!.items).toHaveLength(1);
  });

  it("falls back to items.length when total is 0", () => {
    const result = adaptCaseListResult({
      items: [flatRow()],
      total: 0,
    });
    expect(result!.total).toBe(1);
  });

  it("defaults page to 1 and limit to items.length when missing", () => {
    const result = adaptCaseListResult({
      items: [flatRow(), flatRow({ id: "case-002" })],
      total: 2,
    });
    expect(result!.page).toBe(1);
    expect(result!.limit).toBe(2);
  });

  it("reads nested case record when wrapped", () => {
    const result = adaptCaseListResult({
      items: [wrappedRow({}, { customerName: "張伟", groupName: "Tokyo" })],
      total: 1,
    });
    expect(result!.items[0].applicant).toBe("張伟");
    expect(result!.items[0].groupLabel).toBe("Tokyo");
  });

  it("reads latestValidation from wrapper when wrapped", () => {
    const result = adaptCaseListResult({
      items: [
        wrappedRow(
          {},
          { latestValidation: { status: "passed", executedAt: "2026-04-01" } },
        ),
      ],
      total: 1,
    });
    expect(result!.items[0].validationStatus).toBe("passed");
  });

  it("maps risk levels to risk status", () => {
    const high = adaptCaseListResult({
      items: [flatRow({ riskLevel: "high" })],
      total: 1,
    });
    expect(high!.items[0].riskStatus).toBe("critical");

    const medium = adaptCaseListResult({
      items: [flatRow({ riskLevel: "medium" })],
      total: 1,
    });
    expect(medium!.items[0].riskStatus).toBe("attention");

    const low = adaptCaseListResult({
      items: [flatRow({ riskLevel: "low" })],
      total: 1,
    });
    expect(low!.items[0].riskStatus).toBe("normal");
  });

  it("resolves unknown stage to S1", () => {
    const result = adaptCaseListResult({
      items: [flatRow({ stage: "UNKNOWN" })],
      total: 1,
    });
    expect(result!.items[0].stageId).toBe("S1");
  });

  it("maps all 9 valid stages", () => {
    for (const stage of [
      "S1",
      "S2",
      "S3",
      "S4",
      "S5",
      "S6",
      "S7",
      "S8",
      "S9",
    ]) {
      const result = adaptCaseListResult({
        items: [flatRow({ stage })],
        total: 1,
      });
      expect(result!.items[0].stageId).toBe(stage);
    }
  });

  it("prefers caseName over caseNo for name", () => {
    const result = adaptCaseListResult({
      items: [flatRow({ caseName: "案件名", caseNo: "NO-001" })],
      total: 1,
    });
    expect(result!.items[0].name).toBe("案件名");
  });

  it("falls back to caseNo when caseName is empty", () => {
    const result = adaptCaseListResult({
      items: [flatRow({ caseName: "", caseNo: "NO-001" })],
      total: 1,
    });
    expect(result!.items[0].name).toBe("NO-001");
  });

  it("falls back to id when both caseName and caseNo are empty", () => {
    const result = adaptCaseListResult({
      items: [flatRow({ caseName: "", caseNo: "" })],
      total: 1,
    });
    expect(result!.items[0].name).toBe("case-001");
  });

  it("formats updatedAt as ja-JP date", () => {
    const result = adaptCaseListResult({
      items: [flatRow({ updatedAt: "2026-04-10T00:00:00.000Z" })],
      total: 1,
    });
    expect(result!.items[0].updatedAtLabel).toBeTruthy();
  });

  it("formats dueAt as dueDateLabel", () => {
    const result = adaptCaseListResult({
      items: [flatRow({ dueAt: "2026-06-01" })],
      total: 1,
    });
    expect(result!.items[0].dueDate).toBe("2026-06-01");
    expect(result!.items[0].dueDateLabel).toBeTruthy();
  });

  it("handles null dueAt gracefully", () => {
    const result = adaptCaseListResult({
      items: [flatRow({ dueAt: null })],
      total: 1,
    });
    expect(result!.items[0].dueDate).toBe("");
    expect(result!.items[0].dueDateLabel).toBe("");
  });

  it("reads billingUnpaidAmountCached as unpaidAmount", () => {
    const result = adaptCaseListResult({
      items: [flatRow({ billingUnpaidAmountCached: 75000 })],
      total: 1,
    });
    expect(result!.items[0].unpaidAmount).toBe(75000);
  });

  it("defaults unpaidAmount to 0 when missing", () => {
    const result = adaptCaseListResult({
      items: [flatRow({ billingUnpaidAmountCached: undefined })],
      total: 1,
    });
    expect(result!.items[0].unpaidAmount).toBe(0);
  });

  it("sets customerId to undefined when empty", () => {
    const result = adaptCaseListResult({
      items: [flatRow({ customerId: "" })],
      total: 1,
    });
    expect(result!.items[0].customerId).toBeUndefined();
  });
});

// ─── adaptCaseSummaryCards ──────────────────────────────────────

describe("adaptCaseSummaryCards", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-20T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns four cards with correct keys, variants, and labels", () => {
    const cards = adaptCaseSummaryCards([]);
    expect(cards).toHaveLength(4);
    expect(cards.map((c) => c.key)).toEqual([...CASE_SUMMARY_CARD_KEYS]);
    expect(cards.map((c) => c.variant)).toEqual([
      "primary",
      "info",
      "warning",
      "neutral",
    ]);
    expect(cards.map((c) => c.label)).toEqual([
      "进行中案件",
      "检查未通过",
      "即将到期",
      "待收金额",
    ]);
  });

  it("counts active cases (non-S9)", () => {
    const cards = adaptCaseSummaryCards([
      listItem({ id: "1", stageId: "S3" }),
      listItem({ id: "2", stageId: "S5" }),
      listItem({ id: "3", stageId: "S9" }),
    ]);
    expect(cards.find((c) => c.key === "activeCases")?.value).toBe(2);
  });

  it("counts failed validations across all items", () => {
    const cards = adaptCaseSummaryCards([
      listItem({ id: "1", validationStatus: "failed" }),
      listItem({ id: "2", validationStatus: "passed" }),
      listItem({ id: "3", validationStatus: "failed", stageId: "S9" }),
    ]);
    expect(cards.find((c) => c.key === "failedValidations")?.value).toBe(2);
  });

  it("counts dueSoon only for active (non-S9) items within 7 days", () => {
    const cards = adaptCaseSummaryCards([
      listItem({ id: "1", stageId: "S3", dueDate: "2026-04-22" }),
      listItem({ id: "2", stageId: "S3", dueDate: "2026-04-27" }),
      listItem({ id: "3", stageId: "S3", dueDate: "2026-04-28" }),
      listItem({ id: "4", stageId: "S9", dueDate: "2026-04-22" }),
      listItem({ id: "5", stageId: "S3", dueDate: "" }),
    ]);
    expect(cards.find((c) => c.key === "dueSoon")?.value).toBe(2);
  });

  it("excludes already-past due dates from dueSoon", () => {
    const cards = adaptCaseSummaryCards([
      listItem({ id: "1", stageId: "S3", dueDate: "2026-04-19" }),
    ]);
    expect(cards.find((c) => c.key === "dueSoon")?.value).toBe(0);
  });

  it("includes today as dueSoon", () => {
    const cards = adaptCaseSummaryCards([
      listItem({ id: "1", stageId: "S3", dueDate: "2026-04-20" }),
    ]);
    expect(cards.find((c) => c.key === "dueSoon")?.value).toBe(1);
  });

  it("sums unpaid amounts from active (non-S9) items only", () => {
    const cards = adaptCaseSummaryCards([
      listItem({ id: "1", stageId: "S3", unpaidAmount: 50000 }),
      listItem({ id: "2", stageId: "S4", unpaidAmount: 30000 }),
      listItem({ id: "3", stageId: "S9", unpaidAmount: 20000 }),
    ]);
    expect(cards.find((c) => c.key === "unpaidTotal")?.value).toBe(80000);
  });

  it("returns zeroes for empty list", () => {
    const cards = adaptCaseSummaryCards([]);
    expect(cards.find((c) => c.key === "activeCases")!.value).toBe(0);
    expect(cards.find((c) => c.key === "failedValidations")!.value).toBe(0);
    expect(cards.find((c) => c.key === "dueSoon")!.value).toBe(0);
    expect(cards.find((c) => c.key === "unpaidTotal")!.value).toBe(0);
  });
});
