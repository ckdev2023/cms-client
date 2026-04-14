import { describe, it, expect } from "vitest";
import { useBillingBulkActions } from "./useBillingBulkActions";
import type { CaseBillingRow } from "../types";

function makeRow(
  partial: Partial<CaseBillingRow> & { id: string; caseNo: string },
): CaseBillingRow {
  return {
    caseName: "",
    client: { name: "", type: "" },
    group: "tokyo-1",
    owner: "admin",
    amountDue: 0,
    amountReceived: 0,
    amountOutstanding: 0,
    status: "due",
    nextNode: null,
    ...partial,
  };
}

const ROWS: CaseBillingRow[] = [
  makeRow({ id: "1", caseNo: "CAS-001", status: "overdue" }),
  makeRow({ id: "2", caseNo: "CAS-002", status: "partial" }),
  makeRow({ id: "3", caseNo: "CAS-003", status: "due" }),
  makeRow({ id: "4", caseNo: "CAS-004", status: "paid" }),
];

describe("useBillingBulkActions", () => {
  it("canCollect returns true only for overdue rows", () => {
    const bulk = useBillingBulkActions();
    expect(bulk.canCollect(ROWS[0])).toBe(true);
    expect(bulk.canCollect(ROWS[1])).toBe(false);
    expect(bulk.canCollect(ROWS[2])).toBe(false);
    expect(bulk.canCollect(ROWS[3])).toBe(false);
  });

  it("executeBulkCollection succeeds for overdue rows", async () => {
    const bulk = useBillingBulkActions();
    const result = await bulk.executeBulkCollection(new Set(["1"]), ROWS);
    expect(result.success).toBe(1);
    expect(result.skipped).toBe(0);
    expect(result.failed).toBe(0);
    expect(result.details).toHaveLength(1);
    expect(result.details[0].result).toBe("success");
    expect(result.details[0].taskId).toBeTruthy();
  });

  it("executeBulkCollection skips non-overdue rows", async () => {
    const bulk = useBillingBulkActions();
    const result = await bulk.executeBulkCollection(new Set(["1", "2"]), ROWS);
    expect(result.success).toBe(1);
    expect(result.skipped).toBe(1);
    expect(result.details).toHaveLength(2);
    expect(result.details[1].reason).toBe("not-overdue");
  });

  it("sets lastResult after execution", async () => {
    const bulk = useBillingBulkActions();
    expect(bulk.lastResult.value).toBeNull();
    await bulk.executeBulkCollection(new Set(["1"]), ROWS);
    expect(bulk.lastResult.value).not.toBeNull();
    expect(bulk.lastResult.value!.success).toBe(1);
  });

  it("clearResult resets lastResult to null", async () => {
    const bulk = useBillingBulkActions();
    await bulk.executeBulkCollection(new Set(["1"]), ROWS);
    bulk.clearResult();
    expect(bulk.lastResult.value).toBeNull();
  });

  it("loading is false after execution completes", async () => {
    const bulk = useBillingBulkActions();
    await bulk.executeBulkCollection(new Set(["1"]), ROWS);
    expect(bulk.loading.value).toBe(false);
  });

  it("returns empty result for empty selection", async () => {
    const bulk = useBillingBulkActions();
    const result = await bulk.executeBulkCollection(new Set(), ROWS);
    expect(result.success).toBe(0);
    expect(result.skipped).toBe(0);
    expect(result.failed).toBe(0);
    expect(result.details).toHaveLength(0);
  });

  it("handles multiple overdue rows in selection", async () => {
    const rows = [
      makeRow({ id: "a", caseNo: "CAS-A", status: "overdue" }),
      makeRow({ id: "b", caseNo: "CAS-B", status: "overdue" }),
    ];
    const bulk = useBillingBulkActions();
    const result = await bulk.executeBulkCollection(new Set(["a", "b"]), rows);
    expect(result.success).toBe(2);
    expect(result.skipped).toBe(0);
  });
});
