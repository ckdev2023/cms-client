import { describe, it, expect, vi } from "vitest";
import type { DocumentListItem } from "../types";
import type { BulkActionType } from "./useDocumentBulkActions";
import { useDocumentBulkActions } from "./useDocumentBulkActions";

function makeItem(
  overrides: Partial<Pick<DocumentListItem, "id" | "status">> = {},
): Pick<DocumentListItem, "id" | "status"> {
  return { id: "doc-1", status: "pending", ...overrides };
}

function createWithItems(items: Pick<DocumentListItem, "id" | "status">[]) {
  const clearSelection = vi.fn();
  const onToast = vi.fn<(action: BulkActionType, count: number) => void>();
  const bulk = useDocumentBulkActions({
    getSelectedItems: () => items,
    clearSelection,
    onToast,
  });
  return { bulk, clearSelection, onToast };
}

// ─── canRemind ───────────────────────────────────────────────────

describe("useDocumentBulkActions — canRemind", () => {
  it("true when pending items selected", () => {
    const { bulk } = createWithItems([makeItem({ status: "pending" })]);
    expect(bulk.canRemind.value).toBe(true);
  });

  it("true when rejected items selected", () => {
    const { bulk } = createWithItems([makeItem({ status: "rejected" })]);
    expect(bulk.canRemind.value).toBe(true);
  });

  it("false when only uploaded_reviewing selected", () => {
    const { bulk } = createWithItems([
      makeItem({ status: "uploaded_reviewing" }),
    ]);
    expect(bulk.canRemind.value).toBe(false);
  });

  it("false when no items selected", () => {
    const { bulk } = createWithItems([]);
    expect(bulk.canRemind.value).toBe(false);
  });
});

// ─── canApprove ──────────────────────────────────────────────────

describe("useDocumentBulkActions — canApprove", () => {
  it("true when uploaded_reviewing items selected", () => {
    const { bulk } = createWithItems([
      makeItem({ status: "uploaded_reviewing" }),
    ]);
    expect(bulk.canApprove.value).toBe(true);
  });

  it("false when only pending items selected", () => {
    const { bulk } = createWithItems([makeItem({ status: "pending" })]);
    expect(bulk.canApprove.value).toBe(false);
  });

  it("false when no items selected", () => {
    const { bulk } = createWithItems([]);
    expect(bulk.canApprove.value).toBe(false);
  });
});

// ─── canWaive ────────────────────────────────────────────────────

describe("useDocumentBulkActions — canWaive", () => {
  it("true when any items selected", () => {
    const { bulk } = createWithItems([makeItem({ status: "pending" })]);
    expect(bulk.canWaive.value).toBe(true);
  });

  it("false when no items selected", () => {
    const { bulk } = createWithItems([]);
    expect(bulk.canWaive.value).toBe(false);
  });
});

// ─── bulkRemind ──────────────────────────────────────────────────

describe("useDocumentBulkActions — bulkRemind", () => {
  it("calls onToast with remind and remindable count", () => {
    const { bulk, onToast, clearSelection } = createWithItems([
      makeItem({ id: "d1", status: "pending" }),
      makeItem({ id: "d2", status: "rejected" }),
      makeItem({ id: "d3", status: "uploaded_reviewing" }),
    ]);
    bulk.bulkRemind();
    expect(onToast).toHaveBeenCalledWith("remind", 2);
    expect(clearSelection).toHaveBeenCalled();
  });

  it("does nothing when no remindable items", () => {
    const { bulk, onToast, clearSelection } = createWithItems([
      makeItem({ status: "uploaded_reviewing" }),
    ]);
    bulk.bulkRemind();
    expect(onToast).not.toHaveBeenCalled();
    expect(clearSelection).not.toHaveBeenCalled();
  });
});

// ─── bulkApprove ─────────────────────────────────────────────────

describe("useDocumentBulkActions — bulkApprove", () => {
  it("calls onToast with approve and approvable count", () => {
    const { bulk, onToast, clearSelection } = createWithItems([
      makeItem({ id: "d1", status: "uploaded_reviewing" }),
      makeItem({ id: "d2", status: "uploaded_reviewing" }),
      makeItem({ id: "d3", status: "pending" }),
    ]);
    bulk.bulkApprove();
    expect(onToast).toHaveBeenCalledWith("approve", 2);
    expect(clearSelection).toHaveBeenCalled();
  });

  it("does nothing when no approvable items", () => {
    const { bulk, onToast, clearSelection } = createWithItems([
      makeItem({ status: "pending" }),
    ]);
    bulk.bulkApprove();
    expect(onToast).not.toHaveBeenCalled();
    expect(clearSelection).not.toHaveBeenCalled();
  });
});

// ─── bulkWaive ───────────────────────────────────────────────────

describe("useDocumentBulkActions — bulkWaive", () => {
  it("calls onToast with waive and total selected count", () => {
    const { bulk, onToast, clearSelection } = createWithItems([
      makeItem({ id: "d1", status: "pending" }),
      makeItem({ id: "d2", status: "rejected" }),
      makeItem({ id: "d3", status: "expired" }),
    ]);
    bulk.bulkWaive();
    expect(onToast).toHaveBeenCalledWith("waive", 3);
    expect(clearSelection).toHaveBeenCalled();
  });

  it("does nothing when no items selected", () => {
    const { bulk, onToast, clearSelection } = createWithItems([]);
    bulk.bulkWaive();
    expect(onToast).not.toHaveBeenCalled();
    expect(clearSelection).not.toHaveBeenCalled();
  });
});

// ─── Mixed scenario ──────────────────────────────────────────────

describe("useDocumentBulkActions — mixed items", () => {
  it("computes correct counts for mixed statuses", () => {
    const items = [
      makeItem({ id: "d1", status: "pending" }),
      makeItem({ id: "d2", status: "uploaded_reviewing" }),
      makeItem({ id: "d3", status: "rejected" }),
      makeItem({ id: "d4", status: "expired" }),
    ];
    const { bulk } = createWithItems(items);
    expect(bulk.canRemind.value).toBe(true);
    expect(bulk.canApprove.value).toBe(true);
    expect(bulk.canWaive.value).toBe(true);
  });
});
