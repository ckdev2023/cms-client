import { describe, it, expect } from "vitest";
import type { DocumentListItem } from "../types";
import { useDocumentSelection } from "./useDocumentSelection";

let counter = 0;

function makeItem(
  overrides: Partial<DocumentListItem> = {},
): Pick<DocumentListItem, "id" | "status"> {
  counter++;
  return {
    id: `DOC-${counter}`,
    status: "pending",
    ...overrides,
  };
}

const ITEMS: Pick<DocumentListItem, "id" | "status">[] = [
  makeItem({ id: "d-pending", status: "pending" }),
  makeItem({ id: "d-reviewing", status: "uploaded_reviewing" }),
  makeItem({ id: "d-approved", status: "approved" }),
  makeItem({ id: "d-rejected", status: "rejected" }),
  makeItem({ id: "d-expired", status: "expired" }),
  makeItem({ id: "d-waived", status: "waived" }),
];

function create() {
  return useDocumentSelection();
}

// ─── isRowSelectable ─────────────────────────────────────────────

describe("useDocumentSelection — isRowSelectable", () => {
  it("pending is selectable", () => {
    const s = create();
    expect(s.isRowSelectable({ status: "pending" })).toBe(true);
  });

  it("uploaded_reviewing is selectable", () => {
    const s = create();
    expect(s.isRowSelectable({ status: "uploaded_reviewing" })).toBe(true);
  });

  it("rejected is selectable", () => {
    const s = create();
    expect(s.isRowSelectable({ status: "rejected" })).toBe(true);
  });

  it("expired is selectable", () => {
    const s = create();
    expect(s.isRowSelectable({ status: "expired" })).toBe(true);
  });

  it("approved is NOT selectable", () => {
    const s = create();
    expect(s.isRowSelectable({ status: "approved" })).toBe(false);
  });

  it("waived is NOT selectable", () => {
    const s = create();
    expect(s.isRowSelectable({ status: "waived" })).toBe(false);
  });
});

// ─── Initial state ───────────────────────────────────────────────

describe("useDocumentSelection — initial state", () => {
  it("starts with empty selection", () => {
    const s = create();
    expect(s.selectedCount.value).toBe(0);
    expect(s.selectedIds.value.size).toBe(0);
  });

  it("isAllSelected is false for any items", () => {
    const s = create();
    expect(s.isAllSelected(ITEMS)).toBe(false);
  });

  it("isIndeterminate is false initially", () => {
    const s = create();
    expect(s.isIndeterminate(ITEMS)).toBe(false);
  });
});

// ─── toggleRow ───────────────────────────────────────────────────

describe("useDocumentSelection — toggleRow", () => {
  it("adds an id when checked=true", () => {
    const s = create();
    s.toggleRow("d-pending", true);
    expect(s.selectedIds.value.has("d-pending")).toBe(true);
    expect(s.selectedCount.value).toBe(1);
  });

  it("removes an id when checked=false", () => {
    const s = create();
    s.toggleRow("d-pending", true);
    s.toggleRow("d-pending", false);
    expect(s.selectedIds.value.has("d-pending")).toBe(false);
    expect(s.selectedCount.value).toBe(0);
  });

  it("can select multiple rows", () => {
    const s = create();
    s.toggleRow("d-pending", true);
    s.toggleRow("d-rejected", true);
    expect(s.selectedCount.value).toBe(2);
  });
});

// ─── toggleAll ───────────────────────────────────────────────────

describe("useDocumentSelection — toggleAll", () => {
  it("selects all selectable items when checked=true", () => {
    const s = create();
    s.toggleAll(ITEMS, true);
    expect(s.selectedIds.value.has("d-pending")).toBe(true);
    expect(s.selectedIds.value.has("d-reviewing")).toBe(true);
    expect(s.selectedIds.value.has("d-rejected")).toBe(true);
    expect(s.selectedIds.value.has("d-expired")).toBe(true);
    expect(s.selectedCount.value).toBe(4);
  });

  it("does NOT select approved or waived items", () => {
    const s = create();
    s.toggleAll(ITEMS, true);
    expect(s.selectedIds.value.has("d-approved")).toBe(false);
    expect(s.selectedIds.value.has("d-waived")).toBe(false);
  });

  it("clears selection when checked=false", () => {
    const s = create();
    s.toggleAll(ITEMS, true);
    s.toggleAll(ITEMS, false);
    expect(s.selectedCount.value).toBe(0);
  });

  it("handles empty items array", () => {
    const s = create();
    s.toggleAll([], true);
    expect(s.selectedCount.value).toBe(0);
  });

  it("handles items where all are non-selectable", () => {
    const s = create();
    const nonSelectable = [
      makeItem({ id: "a1", status: "approved" }),
      makeItem({ id: "w1", status: "waived" }),
    ];
    s.toggleAll(nonSelectable, true);
    expect(s.selectedCount.value).toBe(0);
  });
});

// ─── clearSelection ──────────────────────────────────────────────

describe("useDocumentSelection — clearSelection", () => {
  it("removes all selected ids", () => {
    const s = create();
    s.toggleRow("d-pending", true);
    s.toggleRow("d-rejected", true);
    s.clearSelection();
    expect(s.selectedCount.value).toBe(0);
    expect(s.selectedIds.value.size).toBe(0);
  });
});

// ─── isAllSelected ───────────────────────────────────────────────

describe("useDocumentSelection — isAllSelected", () => {
  it("returns true when all selectable items are selected", () => {
    const s = create();
    s.toggleAll(ITEMS, true);
    expect(s.isAllSelected(ITEMS)).toBe(true);
  });

  it("returns false when not all selectable are selected", () => {
    const s = create();
    s.toggleRow("d-pending", true);
    expect(s.isAllSelected(ITEMS)).toBe(false);
  });

  it("returns false for empty list", () => {
    const s = create();
    expect(s.isAllSelected([])).toBe(false);
  });

  it("returns false when only non-selectable items exist", () => {
    const s = create();
    const nonSelectable = [
      makeItem({ id: "a1", status: "approved" }),
      makeItem({ id: "w1", status: "waived" }),
    ];
    expect(s.isAllSelected(nonSelectable)).toBe(false);
  });
});

// ─── isIndeterminate ─────────────────────────────────────────────

describe("useDocumentSelection — isIndeterminate", () => {
  it("returns true when some but not all selectable are selected", () => {
    const s = create();
    s.toggleRow("d-pending", true);
    expect(s.isIndeterminate(ITEMS)).toBe(true);
  });

  it("returns false when none are selected", () => {
    const s = create();
    expect(s.isIndeterminate(ITEMS)).toBe(false);
  });

  it("returns false when all selectable are selected", () => {
    const s = create();
    s.toggleAll(ITEMS, true);
    expect(s.isIndeterminate(ITEMS)).toBe(false);
  });

  it("returns false for empty list", () => {
    const s = create();
    expect(s.isIndeterminate([])).toBe(false);
  });
});

// ─── getSelectableFromList ───────────────────────────────────────

describe("useDocumentSelection — getSelectableFromList", () => {
  it("returns only selectable items", () => {
    const s = create();
    const result = s.getSelectableFromList(ITEMS);
    expect(result).toHaveLength(4);
    for (const item of result) {
      expect([
        "pending",
        "uploaded_reviewing",
        "rejected",
        "expired",
      ]).toContain(item.status);
    }
  });

  it("excludes approved and waived", () => {
    const s = create();
    const result = s.getSelectableFromList(ITEMS);
    const statuses = result.map((r) => r.status);
    expect(statuses).not.toContain("approved");
    expect(statuses).not.toContain("waived");
  });

  it("returns empty for all non-selectable", () => {
    const s = create();
    const result = s.getSelectableFromList([
      makeItem({ status: "approved" }),
      makeItem({ status: "waived" }),
    ]);
    expect(result).toHaveLength(0);
  });
});
