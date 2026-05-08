// ── Test Ownership ──────────────────────────────────────────────
// Owner: summary cards aggregation contract (p0-fe-002b-06).
//   Locks that active/failed/dueSoon/unpaid computations use
//   the same CaseListItem fields as the list model.
// Does NOT test: list DTO → CaseListItem mapping
//   (→ CaseAdapterMappers.base-fields/derived-status.test),
//   adaptCaseSummaryResult convenience (→ CaseListSummaryDownstream.test),
//   detail aggregate, mutation results, write builders, or
//   repository orchestration.
// ────────────────────────────────────────────────────────────────

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { adaptCaseSummaryCards } from "./CaseAdapterMappers";
import {
  CASE_SUMMARY_CARD_KEYS,
  CASE_SUMMARY_CARD_FIELD_USAGE,
  CASE_SUMMARY_CARD_VARIANTS,
} from "./CaseAdapterTypes";
import type { CaseListItem, CaseSummaryCardData } from "../types";

// ─── Helpers ────────────────────────────────────────────────────

const LIST_ITEM_BASE: Omit<
  CaseListItem,
  | "id"
  | "stageId"
  | "stageLabel"
  | "validationStatus"
  | "unpaidAmount"
  | "dueDate"
> = {
  name: "Test",
  type: "visa",
  applicant: "X",
  groupId: "g",
  groupLabel: "G",
  ownerId: "o",
  completionPercent: 0,
  completionLabel: "",
  validationLabel: "",
  blockerCount: 0,
  updatedAtLabel: "",
  dueDateLabel: "",
  riskStatus: "normal",
  riskLabel: "",
  businessPhase: "CONSULTING",
  visibleScopes: ["all"],
};

function listItem(overrides: Partial<CaseListItem> = {}): CaseListItem {
  return {
    ...LIST_ITEM_BASE,
    id: "c1",
    stageId: "S3",
    stageLabel: "S3",
    validationStatus: "passed",
    unpaidAmount: 0,
    dueDate: "",
    ...overrides,
  };
}

function findCard(
  cards: CaseSummaryCardData[],
  key: string,
): CaseSummaryCardData {
  const card = cards.find((c) => c.key === key);
  if (!card) throw new Error(`Card "${key}" not found`);
  return card;
}

// ─── Contract constants (p0-fe-002b-06) ─────────────────────────

describe("summary card contract constants (p0-fe-002b-06)", () => {
  it("CASE_SUMMARY_CARD_KEYS has exactly 4 keys", () => {
    expect(CASE_SUMMARY_CARD_KEYS).toHaveLength(4);
    expect([...CASE_SUMMARY_CARD_KEYS].sort()).toEqual([
      "activeCases",
      "dueSoon",
      "failedValidations",
      "unpaidTotal",
    ]);
  });

  it("CASE_SUMMARY_CARD_FIELD_USAGE covers all 4 card keys", () => {
    for (const key of CASE_SUMMARY_CARD_KEYS) {
      expect(CASE_SUMMARY_CARD_FIELD_USAGE).toHaveProperty(key);
      const usage =
        CASE_SUMMARY_CARD_FIELD_USAGE[
          key as keyof typeof CASE_SUMMARY_CARD_FIELD_USAGE
        ];
      expect(usage.field).toBeTruthy();
      expect(["all", "active"]).toContain(usage.scope);
      expect(["count", "sum"]).toContain(usage.aggregation);
    }
  });

  it("CASE_SUMMARY_CARD_VARIANTS covers all 4 card keys", () => {
    for (const key of CASE_SUMMARY_CARD_KEYS) {
      expect(CASE_SUMMARY_CARD_VARIANTS).toHaveProperty(key);
    }
  });

  it("CASE_SUMMARY_CARD_FIELD_USAGE field names are valid CaseListItem properties", () => {
    const sampleItem = listItem();
    for (const [, usage] of Object.entries(CASE_SUMMARY_CARD_FIELD_USAGE)) {
      expect(sampleItem).toHaveProperty(usage.field);
    }
  });
});

// ─── adaptCaseSummaryCards — structure ───────────────────────────

describe("adaptCaseSummaryCards — structure (p0-fe-002b-06)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-20T12:00:00.000Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns exactly 4 cards", () => {
    expect(adaptCaseSummaryCards([])).toHaveLength(4);
  });

  it("card keys match CASE_SUMMARY_CARD_KEYS in order", () => {
    const cards = adaptCaseSummaryCards([]);
    expect(cards.map((c) => c.key)).toEqual([...CASE_SUMMARY_CARD_KEYS]);
  });

  it("card variants match CASE_SUMMARY_CARD_VARIANTS", () => {
    const cards = adaptCaseSummaryCards([]);
    for (const card of cards) {
      expect(card.variant).toBe(
        CASE_SUMMARY_CARD_VARIANTS[
          card.key as keyof typeof CASE_SUMMARY_CARD_VARIANTS
        ],
      );
    }
  });

  it("all card values are finite numbers", () => {
    const cards = adaptCaseSummaryCards([
      listItem({ unpaidAmount: 100000, dueDate: "2026-04-22" }),
    ]);
    for (const card of cards) {
      expect(typeof card.value).toBe("number");
      expect(Number.isFinite(card.value)).toBe(true);
    }
  });

  it("all card labels are non-empty strings", () => {
    const cards = adaptCaseSummaryCards([]);
    for (const card of cards) {
      expect(typeof card.label).toBe("string");
      expect(card.label.length).toBeGreaterThan(0);
    }
  });
});

// ─── activeCases — stageId consistency ──────────────────────────

describe("activeCases — stageId consistency (p0-fe-002b-06)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-20T12:00:00.000Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("counts items where stageId !== 'S9'", () => {
    const cards = adaptCaseSummaryCards([
      listItem({ id: "1", stageId: "S1" }),
      listItem({ id: "2", stageId: "S3" }),
      listItem({ id: "3", stageId: "S5" }),
      listItem({ id: "4", stageId: "S8" }),
      listItem({ id: "5", stageId: "S9" }),
    ]);
    expect(findCard(cards, "activeCases").value).toBe(4);
  });

  it("returns 0 when all items are S9", () => {
    const cards = adaptCaseSummaryCards([
      listItem({ id: "1", stageId: "S9" }),
      listItem({ id: "2", stageId: "S9" }),
    ]);
    expect(findCard(cards, "activeCases").value).toBe(0);
  });

  it("counts all items when none are S9", () => {
    const cards = adaptCaseSummaryCards([
      listItem({ id: "1", stageId: "S2" }),
      listItem({ id: "2", stageId: "S7" }),
    ]);
    expect(findCard(cards, "activeCases").value).toBe(2);
  });

  it("all 9 valid stages: S1-S8 counted, S9 excluded", () => {
    const items = (
      ["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8", "S9"] as const
    ).map((stageId, i) => listItem({ id: `c${i}`, stageId }));
    const cards = adaptCaseSummaryCards(items);
    expect(findCard(cards, "activeCases").value).toBe(8);
  });
});

// ─── failedValidations — validationStatus consistency ───────────

describe("failedValidations — validationStatus consistency (p0-fe-002b-06)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-20T12:00:00.000Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("counts items where validationStatus === 'failed' across all items including S9", () => {
    const cards = adaptCaseSummaryCards([
      listItem({ id: "1", validationStatus: "failed", stageId: "S3" }),
      listItem({ id: "2", validationStatus: "passed", stageId: "S3" }),
      listItem({ id: "3", validationStatus: "failed", stageId: "S9" }),
      listItem({ id: "4", validationStatus: "pending", stageId: "S5" }),
    ]);
    expect(findCard(cards, "failedValidations").value).toBe(2);
  });

  it("returns 0 when no items have failed validation", () => {
    const cards = adaptCaseSummaryCards([
      listItem({ id: "1", validationStatus: "passed" }),
      listItem({ id: "2", validationStatus: "pending" }),
    ]);
    expect(findCard(cards, "failedValidations").value).toBe(0);
  });

  it("counts only 'failed', not 'pending' or 'passed'", () => {
    const cards = adaptCaseSummaryCards([
      listItem({ id: "1", validationStatus: "passed" }),
      listItem({ id: "2", validationStatus: "pending" }),
      listItem({ id: "3", validationStatus: "failed" }),
    ]);
    expect(findCard(cards, "failedValidations").value).toBe(1);
  });

  it("also counts items with blockerCount > 0 even if validationStatus is not 'failed'", () => {
    const cards = adaptCaseSummaryCards([
      listItem({ id: "1", validationStatus: "passed", blockerCount: 0 }),
      listItem({ id: "2", validationStatus: "pending", blockerCount: 2 }),
      listItem({ id: "3", validationStatus: "failed", blockerCount: 0 }),
    ]);
    expect(findCard(cards, "failedValidations").value).toBe(2);
  });

  it("does not double-count items that are both failed and have blockerCount > 0", () => {
    const cards = adaptCaseSummaryCards([
      listItem({ id: "1", validationStatus: "failed", blockerCount: 3 }),
    ]);
    expect(findCard(cards, "failedValidations").value).toBe(1);
  });
});

// ─── dueSoon — dueDate + stageId consistency ────────────────────

describe("dueSoon — dueDate + stageId consistency (p0-fe-002b-06)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-20T12:00:00.000Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("counts active items with dueDate in [today, today+7]", () => {
    const cards = adaptCaseSummaryCards([
      listItem({ id: "1", stageId: "S3", dueDate: "2026-04-20" }),
      listItem({ id: "2", stageId: "S3", dueDate: "2026-04-27" }),
      listItem({ id: "3", stageId: "S3", dueDate: "2026-04-28" }),
    ]);
    expect(findCard(cards, "dueSoon").value).toBe(2);
  });

  it("includes today (day 0)", () => {
    const cards = adaptCaseSummaryCards([
      listItem({ id: "1", stageId: "S3", dueDate: "2026-04-20" }),
    ]);
    expect(findCard(cards, "dueSoon").value).toBe(1);
  });

  it("includes day 7 (boundary)", () => {
    const cards = adaptCaseSummaryCards([
      listItem({ id: "1", stageId: "S3", dueDate: "2026-04-27" }),
    ]);
    expect(findCard(cards, "dueSoon").value).toBe(1);
  });

  it("excludes day 8 (past boundary)", () => {
    const cards = adaptCaseSummaryCards([
      listItem({ id: "1", stageId: "S3", dueDate: "2026-04-28" }),
    ]);
    expect(findCard(cards, "dueSoon").value).toBe(0);
  });

  it("excludes past due dates", () => {
    const cards = adaptCaseSummaryCards([
      listItem({ id: "1", stageId: "S3", dueDate: "2026-04-19" }),
    ]);
    expect(findCard(cards, "dueSoon").value).toBe(0);
  });

  it("excludes S9 items even if dueDate is in range", () => {
    const cards = adaptCaseSummaryCards([
      listItem({ id: "1", stageId: "S9", dueDate: "2026-04-22" }),
    ]);
    expect(findCard(cards, "dueSoon").value).toBe(0);
  });

  it("excludes items with empty dueDate", () => {
    const cards = adaptCaseSummaryCards([
      listItem({ id: "1", stageId: "S3", dueDate: "" }),
    ]);
    expect(findCard(cards, "dueSoon").value).toBe(0);
  });
});

// ─── unpaidTotal — unpaidAmount + stageId consistency ────────────

describe("unpaidTotal — unpaidAmount + stageId consistency (p0-fe-002b-06)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-20T12:00:00.000Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("sums unpaidAmount only for active (non-S9) items", () => {
    const cards = adaptCaseSummaryCards([
      listItem({ id: "1", stageId: "S3", unpaidAmount: 50000 }),
      listItem({ id: "2", stageId: "S5", unpaidAmount: 30000 }),
      listItem({ id: "3", stageId: "S9", unpaidAmount: 20000 }),
    ]);
    expect(findCard(cards, "unpaidTotal").value).toBe(80000);
  });

  it("returns 0 when all items are S9", () => {
    const cards = adaptCaseSummaryCards([
      listItem({ id: "1", stageId: "S9", unpaidAmount: 100000 }),
    ]);
    expect(findCard(cards, "unpaidTotal").value).toBe(0);
  });

  it("returns 0 when all active items have zero unpaid", () => {
    const cards = adaptCaseSummaryCards([
      listItem({ id: "1", stageId: "S3", unpaidAmount: 0 }),
      listItem({ id: "2", stageId: "S5", unpaidAmount: 0 }),
    ]);
    expect(findCard(cards, "unpaidTotal").value).toBe(0);
  });

  it("handles decimal amounts", () => {
    const cards = adaptCaseSummaryCards([
      listItem({ id: "1", stageId: "S3", unpaidAmount: 12345.67 }),
      listItem({ id: "2", stageId: "S5", unpaidAmount: 0.33 }),
    ]);
    expect(findCard(cards, "unpaidTotal").value).toBeCloseTo(12346);
  });
});

// ─── Cross-card consistency with list model ─────────────────────

describe("cross-card consistency with list model (p0-fe-002b-06)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-20T12:00:00.000Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("active + S9 = total items count", () => {
    const items = [
      listItem({ id: "1", stageId: "S3" }),
      listItem({ id: "2", stageId: "S5" }),
      listItem({ id: "3", stageId: "S9" }),
      listItem({ id: "4", stageId: "S9" }),
    ];
    const cards = adaptCaseSummaryCards(items);
    const activeCount = findCard(cards, "activeCases").value;
    const archivedCount = items.filter((c) => c.stageId === "S9").length;
    expect(activeCount + archivedCount).toBe(items.length);
  });

  it("unpaidTotal only counts from the same set as activeCases", () => {
    const items = [
      listItem({ id: "1", stageId: "S3", unpaidAmount: 50000 }),
      listItem({ id: "2", stageId: "S9", unpaidAmount: 20000 }),
    ];
    const cards = adaptCaseSummaryCards(items);
    const manualActive = items.filter((c) => c.stageId !== "S9");
    const manualUnpaid = manualActive.reduce(
      (sum, c) => sum + c.unpaidAmount,
      0,
    );
    expect(findCard(cards, "unpaidTotal").value).toBe(manualUnpaid);
    expect(findCard(cards, "activeCases").value).toBe(manualActive.length);
  });

  it("dueSoon is always <= activeCases", () => {
    const items = [
      listItem({ id: "1", stageId: "S3", dueDate: "2026-04-22" }),
      listItem({ id: "2", stageId: "S5", dueDate: "2026-05-01" }),
      listItem({ id: "3", stageId: "S7", dueDate: "" }),
    ];
    const cards = adaptCaseSummaryCards(items);
    expect(findCard(cards, "dueSoon").value).toBeLessThanOrEqual(
      findCard(cards, "activeCases").value,
    );
  });

  it("failedValidations can include S9 items (scope=all)", () => {
    const items = [
      listItem({ id: "1", stageId: "S9", validationStatus: "failed" }),
    ];
    const cards = adaptCaseSummaryCards(items);
    expect(findCard(cards, "failedValidations").value).toBe(1);
    expect(findCard(cards, "activeCases").value).toBe(0);
  });

  it("empty list yields all-zero cards", () => {
    const cards = adaptCaseSummaryCards([]);
    for (const card of cards) {
      expect(card.value).toBe(0);
    }
  });

  it("cards computed from adapted items match manual computation on same data", () => {
    const items = [
      listItem({
        id: "1",
        stageId: "S2",
        validationStatus: "failed",
        dueDate: "2026-04-22",
        unpaidAmount: 120000,
      }),
      listItem({
        id: "2",
        stageId: "S5",
        validationStatus: "passed",
        dueDate: "2026-04-30",
        unpaidAmount: 90000,
      }),
      listItem({
        id: "3",
        stageId: "S9",
        validationStatus: "failed",
        dueDate: "2026-04-21",
        unpaidAmount: 50000,
      }),
      listItem({
        id: "4",
        stageId: "S3",
        validationStatus: "pending",
        dueDate: "",
        unpaidAmount: 0,
      }),
    ];

    const cards = adaptCaseSummaryCards(items);
    const active = items.filter((c) => c.stageId !== "S9");

    expect(findCard(cards, "activeCases").value).toBe(active.length);
    expect(findCard(cards, "failedValidations").value).toBe(
      items.filter((c) => c.validationStatus === "failed" || c.blockerCount > 0)
        .length,
    );
    expect(findCard(cards, "unpaidTotal").value).toBe(
      active.reduce((sum, c) => sum + c.unpaidAmount, 0),
    );
  });
});
