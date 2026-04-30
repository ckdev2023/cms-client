import { describe, it, expect, vi } from "vitest";
import type { DocumentListItem } from "../types";
import { useDocumentBulkActions } from "./useDocumentBulkActions";
import type { BulkActionResult } from "./useDocumentBulkActions";
import type { DocumentRepository } from "./DocumentRepositoryTypes";

function makeItem(
  overrides: Partial<Pick<DocumentListItem, "id" | "status">> = {},
): Pick<DocumentListItem, "id" | "status"> {
  return { id: "doc-1", status: "pending", ...overrides };
}

function stubRepository(): Pick<
  DocumentRepository,
  "transition" | "followUp" | "waive"
> {
  return {
    transition: vi.fn().mockResolvedValue({ id: "x", status: "approved" }),
    followUp: vi.fn().mockResolvedValue({ id: "x" }),
    waive: vi.fn().mockResolvedValue({ id: "x", status: "waived" }),
  };
}

function createWithItems(items: Pick<DocumentListItem, "id" | "status">[]) {
  const clearSelection = vi.fn();
  const onSuccess = vi.fn<(result: BulkActionResult) => void>();
  const onError = vi.fn();
  const repository = stubRepository();
  const bulk = useDocumentBulkActions({
    getSelectedItems: () => items,
    clearSelection,
    repository,
    onSuccess,
    onError,
  });
  return { bulk, clearSelection, onSuccess, onError, repository };
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
  it("calls repository.followUp for each remindable item and reports success", async () => {
    const { bulk, onSuccess, clearSelection, repository } = createWithItems([
      makeItem({ id: "d1", status: "pending" }),
      makeItem({ id: "d2", status: "rejected" }),
      makeItem({ id: "d3", status: "uploaded_reviewing" }),
    ]);
    await bulk.bulkRemind();
    expect(repository.followUp).toHaveBeenCalledTimes(2);
    expect(repository.followUp).toHaveBeenCalledWith("d1");
    expect(repository.followUp).toHaveBeenCalledWith("d2");
    expect(onSuccess).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "remind",
        successCount: 2,
        failedCount: 0,
      }),
    );
    expect(clearSelection).toHaveBeenCalled();
  });

  it("does nothing when no remindable items", async () => {
    const { bulk, onSuccess, clearSelection, repository } = createWithItems([
      makeItem({ status: "uploaded_reviewing" }),
    ]);
    await bulk.bulkRemind();
    expect(repository.followUp).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
    expect(clearSelection).not.toHaveBeenCalled();
  });

  it("collects failed ids when some calls fail", async () => {
    const repo = stubRepository();
    (repo.followUp as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error("fail"));
    const clearSelection = vi.fn();
    const onSuccess = vi.fn();
    const items = [
      makeItem({ id: "d1", status: "pending" }),
      makeItem({ id: "d2", status: "rejected" }),
    ];
    const bulk = useDocumentBulkActions({
      getSelectedItems: () => items,
      clearSelection,
      repository: repo,
      onSuccess,
    });
    await bulk.bulkRemind();
    expect(onSuccess).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "remind",
        successCount: 1,
        failedCount: 1,
      }),
    );
    expect(bulk.failedIds.value).toContain("d2");
    expect(clearSelection).not.toHaveBeenCalled();
  });
});

// ─── bulkApprove ─────────────────────────────────────────────────

describe("useDocumentBulkActions — bulkApprove", () => {
  it("calls repository.transition for each approvable item", async () => {
    const { bulk, onSuccess, clearSelection, repository } = createWithItems([
      makeItem({ id: "d1", status: "uploaded_reviewing" }),
      makeItem({ id: "d2", status: "uploaded_reviewing" }),
      makeItem({ id: "d3", status: "pending" }),
    ]);
    await bulk.bulkApprove();
    expect(repository.transition).toHaveBeenCalledTimes(2);
    expect(repository.transition).toHaveBeenCalledWith("d1", {
      toStatus: "approved",
    });
    expect(repository.transition).toHaveBeenCalledWith("d2", {
      toStatus: "approved",
    });
    expect(onSuccess).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "approve",
        successCount: 2,
        failedCount: 0,
      }),
    );
    expect(clearSelection).toHaveBeenCalled();
  });

  it("does nothing when no approvable items", async () => {
    const { bulk, onSuccess, clearSelection, repository } = createWithItems([
      makeItem({ status: "pending" }),
    ]);
    await bulk.bulkApprove();
    expect(repository.transition).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
    expect(clearSelection).not.toHaveBeenCalled();
  });

  it("collects failed ids on partial failure", async () => {
    const repo = stubRepository();
    (repo.transition as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error("fail"));
    const clearSelection = vi.fn();
    const onSuccess = vi.fn();
    const items = [
      makeItem({ id: "d1", status: "uploaded_reviewing" }),
      makeItem({ id: "d2", status: "uploaded_reviewing" }),
    ];
    const bulk = useDocumentBulkActions({
      getSelectedItems: () => items,
      clearSelection,
      repository: repo,
      onSuccess,
    });
    await bulk.bulkApprove();
    expect(bulk.failedIds.value).toContain("d2");
    expect(onSuccess).toHaveBeenCalledWith(
      expect.objectContaining({ successCount: 1, failedCount: 1 }),
    );
    expect(clearSelection).not.toHaveBeenCalled();
  });
});

// ─── bulkWaive ───────────────────────────────────────────────────

describe("useDocumentBulkActions — bulkWaive", () => {
  it("calls repository.waive for each selected item with params", async () => {
    const { bulk, onSuccess, clearSelection, repository } = createWithItems([
      makeItem({ id: "d1", status: "pending" }),
      makeItem({ id: "d2", status: "rejected" }),
      makeItem({ id: "d3", status: "expired" }),
    ]);
    const waiveParams = {
      reasonCode: "visa_type_exempt" as const,
      note: undefined,
    };
    await bulk.bulkWaive(waiveParams);
    expect(repository.waive).toHaveBeenCalledTimes(3);
    expect(repository.waive).toHaveBeenCalledWith("d1", waiveParams);
    expect(repository.waive).toHaveBeenCalledWith("d2", waiveParams);
    expect(repository.waive).toHaveBeenCalledWith("d3", waiveParams);
    expect(onSuccess).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "waive",
        successCount: 3,
        failedCount: 0,
      }),
    );
    expect(clearSelection).toHaveBeenCalled();
  });

  it("does nothing when no items selected", async () => {
    const { bulk, onSuccess, clearSelection, repository } = createWithItems([]);
    await bulk.bulkWaive({ reasonCode: "other", note: "test" });
    expect(repository.waive).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
    expect(clearSelection).not.toHaveBeenCalled();
  });

  it("collects failed ids on partial failure", async () => {
    const repo = stubRepository();
    (repo.waive as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error("fail"))
      .mockResolvedValueOnce({});
    const clearSelection = vi.fn();
    const onSuccess = vi.fn();
    const items = [
      makeItem({ id: "d1", status: "pending" }),
      makeItem({ id: "d2", status: "rejected" }),
      makeItem({ id: "d3", status: "expired" }),
    ];
    const bulk = useDocumentBulkActions({
      getSelectedItems: () => items,
      clearSelection,
      repository: repo,
      onSuccess,
    });
    await bulk.bulkWaive({ reasonCode: "other", note: "reason" });
    expect(bulk.failedIds.value).toContain("d2");
    expect(bulk.failedIds.value.size).toBe(1);
    expect(onSuccess).toHaveBeenCalledWith(
      expect.objectContaining({ successCount: 2, failedCount: 1 }),
    );
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

// ─── loading state ───────────────────────────────────────────────

describe("useDocumentBulkActions — loading", () => {
  it("sets loading during async operation", async () => {
    const { bulk } = createWithItems([
      makeItem({ id: "d1", status: "uploaded_reviewing" }),
    ]);
    expect(bulk.loading.value).toBe(false);
    const p = bulk.bulkApprove();
    expect(bulk.loading.value).toBe(true);
    await p;
    expect(bulk.loading.value).toBe(false);
  });
});

// ─── clearFailedIds ──────────────────────────────────────────────

describe("useDocumentBulkActions — clearFailedIds", () => {
  it("resets failedIds to empty set", async () => {
    const repo = stubRepository();
    (repo.followUp as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("fail"),
    );
    const items = [makeItem({ id: "d1", status: "pending" })];
    const bulk = useDocumentBulkActions({
      getSelectedItems: () => items,
      clearSelection: vi.fn(),
      repository: repo,
      onSuccess: vi.fn(),
    });
    await bulk.bulkRemind();
    expect(bulk.failedIds.value.size).toBe(1);
    bulk.clearFailedIds();
    expect(bulk.failedIds.value.size).toBe(0);
  });
});
