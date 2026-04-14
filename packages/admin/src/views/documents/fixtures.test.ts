import { describe, expect, it } from "vitest";
import type { DocumentListItem } from "./types";
import { DOCUMENT_STATUS_IDS, STATUS_SORT_PRIORITY } from "./constants";
import { isSelectableForBatch } from "./validation";
import {
  CASE_OPTIONS,
  SAMPLE_DOCUMENT_LIST,
  SAMPLE_DOCUMENT_SUMMARY_CARDS,
  SUMMARY_CARD_VARIANTS,
  compareDocumentItems,
  deriveCaseOptions,
  deriveDocumentSummaryCards,
  getSelectableItems,
  sortDocumentsByDefault,
} from "./fixtures";

// ─── SAMPLE_DOCUMENT_LIST ───────────────────────────────────────

describe("documents/fixtures — SAMPLE_DOCUMENT_LIST", () => {
  it("provides at least 10 sample documents", () => {
    expect(SAMPLE_DOCUMENT_LIST.length).toBeGreaterThanOrEqual(10);
  });

  it("each document has required fields", () => {
    for (const doc of SAMPLE_DOCUMENT_LIST) {
      expect(doc.id).toBeTruthy();
      expect(doc.name).toBeTruthy();
      expect(doc.caseId).toBeTruthy();
      expect(doc.caseName).toBeTruthy();
      expect(doc.provider).toBeTruthy();
      expect(doc.status).toBeTruthy();
      expect(typeof doc.sharedExpiryRisk).toBe("boolean");
      expect(typeof doc.referenceCount).toBe("number");
    }
  });

  it("covers all 6 statuses", () => {
    const statuses = new Set(SAMPLE_DOCUMENT_LIST.map((d) => d.status));
    for (const s of DOCUMENT_STATUS_IDS) {
      expect(statuses).toContain(s);
    }
  });

  it("covers all 4 provider types", () => {
    const providers = new Set(SAMPLE_DOCUMENT_LIST.map((d) => d.provider));
    expect(providers).toContain("main_applicant");
    expect(providers).toContain("dependent_guarantor");
    expect(providers).toContain("employer_org");
    expect(providers).toContain("office_internal");
  });

  it("has at least one item with sharedExpiryRisk=true", () => {
    expect(SAMPLE_DOCUMENT_LIST.some((d) => d.sharedExpiryRisk)).toBe(true);
  });

  it("has at least one item with referenceCount > 1", () => {
    expect(SAMPLE_DOCUMENT_LIST.some((d) => d.referenceCount > 1)).toBe(true);
  });

  it("has items with and without dueDate", () => {
    expect(SAMPLE_DOCUMENT_LIST.some((d) => d.dueDate !== null)).toBe(true);
    expect(SAMPLE_DOCUMENT_LIST.some((d) => d.dueDate === null)).toBe(true);
  });

  it("has items with and without relativePath", () => {
    expect(SAMPLE_DOCUMENT_LIST.some((d) => d.relativePath !== null)).toBe(
      true,
    );
    expect(SAMPLE_DOCUMENT_LIST.some((d) => d.relativePath === null)).toBe(
      true,
    );
  });

  it("has items with and without lastReminderAt", () => {
    expect(SAMPLE_DOCUMENT_LIST.some((d) => d.lastReminderAt !== null)).toBe(
      true,
    );
    expect(SAMPLE_DOCUMENT_LIST.some((d) => d.lastReminderAt === null)).toBe(
      true,
    );
  });

  it("spans at least 3 distinct cases", () => {
    const caseIds = new Set(SAMPLE_DOCUMENT_LIST.map((d) => d.caseId));
    expect(caseIds.size).toBeGreaterThanOrEqual(3);
  });
});

// ─── SAMPLE_DOCUMENT_SUMMARY_CARDS (pre-computed) ───────────────

describe("documents/fixtures — SAMPLE_DOCUMENT_SUMMARY_CARDS", () => {
  it("provides 4 cards", () => {
    expect(SAMPLE_DOCUMENT_SUMMARY_CARDS).toHaveLength(4);
  });

  it("each card has key, variant, value, label", () => {
    for (const card of SAMPLE_DOCUMENT_SUMMARY_CARDS) {
      expect(card.key).toBeTruthy();
      expect(card.variant).toBeTruthy();
      expect(typeof card.value).toBe("number");
      expect(card.label).toBeTruthy();
    }
  });

  it("has the 4 required card keys", () => {
    const keys = SAMPLE_DOCUMENT_SUMMARY_CARDS.map((c) => c.key);
    expect(keys).toEqual([
      "pendingReview",
      "missing",
      "expired",
      "sharedExpiryRisk",
    ]);
  });

  it("matches deriveDocumentSummaryCards output", () => {
    const derived = deriveDocumentSummaryCards(SAMPLE_DOCUMENT_LIST);
    expect(SAMPLE_DOCUMENT_SUMMARY_CARDS).toEqual(derived);
  });
});

// ─── CASE_OPTIONS ───────────────────────────────────────────────

describe("documents/fixtures — CASE_OPTIONS", () => {
  it("has at least 3 case options", () => {
    expect(CASE_OPTIONS.length).toBeGreaterThanOrEqual(3);
  });

  it("each option has value and label", () => {
    for (const opt of CASE_OPTIONS) {
      expect(opt.value).toBeTruthy();
      expect(opt.label).toBeTruthy();
    }
  });

  it("matches deriveCaseOptions output", () => {
    const derived = deriveCaseOptions(SAMPLE_DOCUMENT_LIST);
    expect(CASE_OPTIONS).toEqual(derived);
  });
});

// ─── SUMMARY_CARD_VARIANTS ──────────────────────────────────────

describe("documents/fixtures — SUMMARY_CARD_VARIANTS", () => {
  it("maps all 4 card keys", () => {
    expect(SUMMARY_CARD_VARIANTS.pendingReview).toBe("info");
    expect(SUMMARY_CARD_VARIANTS.missing).toBe("warning");
    expect(SUMMARY_CARD_VARIANTS.expired).toBe("danger");
    expect(SUMMARY_CARD_VARIANTS.sharedExpiryRisk).toBe("neutral");
  });
});

// ─── deriveDocumentSummaryCards ──────────────────────────────────

describe("documents/fixtures — deriveDocumentSummaryCards", () => {
  it("returns 4 cards in correct order", () => {
    const cards = deriveDocumentSummaryCards(SAMPLE_DOCUMENT_LIST);
    expect(cards).toHaveLength(4);
    expect(cards.map((c) => c.key)).toEqual([
      "pendingReview",
      "missing",
      "expired",
      "sharedExpiryRisk",
    ]);
  });

  it("counts pendingReview = uploaded_reviewing items", () => {
    const cards = deriveDocumentSummaryCards(SAMPLE_DOCUMENT_LIST);
    const expected = SAMPLE_DOCUMENT_LIST.filter(
      (d) => d.status === "uploaded_reviewing",
    ).length;
    expect(cards[0].value).toBe(expected);
  });

  it("counts missing = pending + rejected items", () => {
    const cards = deriveDocumentSummaryCards(SAMPLE_DOCUMENT_LIST);
    const expected = SAMPLE_DOCUMENT_LIST.filter(
      (d) => d.status === "pending" || d.status === "rejected",
    ).length;
    expect(cards[1].value).toBe(expected);
  });

  it("counts expired items", () => {
    const cards = deriveDocumentSummaryCards(SAMPLE_DOCUMENT_LIST);
    const expected = SAMPLE_DOCUMENT_LIST.filter(
      (d) => d.status === "expired",
    ).length;
    expect(cards[2].value).toBe(expected);
  });

  it("counts sharedExpiryRisk items", () => {
    const cards = deriveDocumentSummaryCards(SAMPLE_DOCUMENT_LIST);
    const expected = SAMPLE_DOCUMENT_LIST.filter(
      (d) => d.sharedExpiryRisk,
    ).length;
    expect(cards[3].value).toBe(expected);
  });

  it("returns all zeros for empty list", () => {
    const cards = deriveDocumentSummaryCards([]);
    for (const card of cards) {
      expect(card.value).toBe(0);
    }
  });

  it("handles list with only approved items", () => {
    const items = [
      { status: "approved" as const, sharedExpiryRisk: false },
      { status: "approved" as const, sharedExpiryRisk: false },
    ];
    const cards = deriveDocumentSummaryCards(items);
    expect(cards[0].value).toBe(0);
    expect(cards[1].value).toBe(0);
    expect(cards[2].value).toBe(0);
    expect(cards[3].value).toBe(0);
  });
});

// ─── compareDocumentItems ───────────────────────────────────────

describe("documents/fixtures — compareDocumentItems", () => {
  it("rejected < expired", () => {
    expect(
      compareDocumentItems(
        { status: "rejected", dueDate: null },
        { status: "expired", dueDate: null },
      ),
    ).toBeLessThan(0);
  });

  it("same status, earlier dueDate wins", () => {
    expect(
      compareDocumentItems(
        { status: "pending", dueDate: "2026-04-01" },
        { status: "pending", dueDate: "2026-05-01" },
      ),
    ).toBeLessThan(0);
  });

  it("same status, null dueDate sorted last", () => {
    expect(
      compareDocumentItems(
        { status: "pending", dueDate: "2026-04-01" },
        { status: "pending", dueDate: null },
      ),
    ).toBeLessThan(0);

    expect(
      compareDocumentItems(
        { status: "pending", dueDate: null },
        { status: "pending", dueDate: "2026-04-01" },
      ),
    ).toBeGreaterThan(0);
  });

  it("same status + same dueDate returns 0", () => {
    expect(
      compareDocumentItems(
        { status: "pending", dueDate: "2026-04-01" },
        { status: "pending", dueDate: "2026-04-01" },
      ),
    ).toBe(0);
  });

  it("both null dueDate, same status returns 0", () => {
    expect(
      compareDocumentItems(
        { status: "approved", dueDate: null },
        { status: "approved", dueDate: null },
      ),
    ).toBe(0);
  });
});

// ─── sortDocumentsByDefault ─────────────────────────────────────

describe("documents/fixtures — sortDocumentsByDefault", () => {
  it("does not mutate the original array", () => {
    const original = [...SAMPLE_DOCUMENT_LIST];
    sortDocumentsByDefault(original);
    expect(original).toEqual(SAMPLE_DOCUMENT_LIST);
  });

  it("sorts by status priority ascending", () => {
    const sorted = sortDocumentsByDefault(SAMPLE_DOCUMENT_LIST);
    let lastPriority = -1;
    for (const item of sorted) {
      const priority = STATUS_SORT_PRIORITY[item.status];
      expect(priority).toBeGreaterThanOrEqual(lastPriority);
      lastPriority = priority;
    }
  });

  it("within same status, sorts by dueDate ascending", () => {
    const items: DocumentListItem[] = [
      makeItem({ status: "pending", dueDate: "2026-05-01" }),
      makeItem({ status: "pending", dueDate: "2026-04-01" }),
      makeItem({ status: "pending", dueDate: "2026-04-15" }),
    ];
    const sorted = sortDocumentsByDefault(items);
    expect(sorted[0].dueDate).toBe("2026-04-01");
    expect(sorted[1].dueDate).toBe("2026-04-15");
    expect(sorted[2].dueDate).toBe("2026-05-01");
  });

  it("places items without dueDate after items with dueDate (same status)", () => {
    const items: DocumentListItem[] = [
      makeItem({ status: "pending", dueDate: null }),
      makeItem({ status: "pending", dueDate: "2026-04-15" }),
      makeItem({ status: "pending", dueDate: null }),
    ];
    const sorted = sortDocumentsByDefault(items);
    expect(sorted[0].dueDate).toBe("2026-04-15");
    expect(sorted[1].dueDate).toBeNull();
    expect(sorted[2].dueDate).toBeNull();
  });

  it("returns empty array for empty input", () => {
    expect(sortDocumentsByDefault([])).toEqual([]);
  });

  it("correctly orders all 6 statuses", () => {
    const items: DocumentListItem[] = [
      makeItem({ status: "waived", dueDate: "2026-01-01" }),
      makeItem({ status: "approved", dueDate: "2026-01-01" }),
      makeItem({ status: "pending", dueDate: "2026-01-01" }),
      makeItem({ status: "uploaded_reviewing", dueDate: "2026-01-01" }),
      makeItem({ status: "expired", dueDate: "2026-01-01" }),
      makeItem({ status: "rejected", dueDate: "2026-01-01" }),
    ];
    const sorted = sortDocumentsByDefault(items);
    expect(sorted.map((d) => d.status)).toEqual([
      "rejected",
      "expired",
      "pending",
      "uploaded_reviewing",
      "approved",
      "waived",
    ]);
  });
});

// ─── getSelectableItems ─────────────────────────────────────────

describe("documents/fixtures — getSelectableItems", () => {
  it("excludes approved and waived items", () => {
    const selectable = getSelectableItems(SAMPLE_DOCUMENT_LIST);
    for (const item of selectable) {
      expect(item.status).not.toBe("approved");
      expect(item.status).not.toBe("waived");
    }
  });

  it("includes pending, uploaded_reviewing, rejected, expired", () => {
    const selectable = getSelectableItems(SAMPLE_DOCUMENT_LIST);
    const statuses = new Set(selectable.map((d) => d.status));
    expect(statuses).toContain("pending");
    expect(statuses).toContain("uploaded_reviewing");
    expect(statuses).toContain("rejected");
    expect(statuses).toContain("expired");
  });

  it("returns correct count", () => {
    const expected = SAMPLE_DOCUMENT_LIST.filter((d) =>
      isSelectableForBatch(d.status),
    ).length;
    expect(getSelectableItems(SAMPLE_DOCUMENT_LIST)).toHaveLength(expected);
  });

  it("returns empty for all-approved list", () => {
    const items = [
      makeItem({ status: "approved" }),
      makeItem({ status: "waived" }),
    ];
    expect(getSelectableItems(items)).toHaveLength(0);
  });
});

// ─── deriveCaseOptions ──────────────────────────────────────────

describe("documents/fixtures — deriveCaseOptions", () => {
  it("returns unique case options", () => {
    const options = deriveCaseOptions(SAMPLE_DOCUMENT_LIST);
    const values = options.map((o) => o.value);
    expect(new Set(values).size).toBe(values.length);
  });

  it("covers all case IDs from the sample data", () => {
    const expected = new Set(SAMPLE_DOCUMENT_LIST.map((d) => d.caseId));
    const options = deriveCaseOptions(SAMPLE_DOCUMENT_LIST);
    expect(options).toHaveLength(expected.size);
    for (const opt of options) {
      expect(expected).toContain(opt.value);
    }
  });

  it("returns empty for empty input", () => {
    expect(deriveCaseOptions([])).toHaveLength(0);
  });
});

// ─── Test helper ────────────────────────────────────────────────

let counter = 0;

function makeItem(overrides: Partial<DocumentListItem>): DocumentListItem {
  counter++;
  return {
    id: `TEST-${counter}`,
    name: `テスト資料${counter}`,
    caseId: "CAS-TEST-001",
    caseName: "テスト案件",
    provider: "main_applicant",
    status: "pending",
    dueDate: null,
    dueDateLabel: "—",
    lastReminderAt: null,
    lastReminderAtLabel: "—",
    relativePath: null,
    sharedExpiryRisk: false,
    referenceCount: 0,
    ...overrides,
  };
}
