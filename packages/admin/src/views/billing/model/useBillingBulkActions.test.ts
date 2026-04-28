import { describe, it, expect, vi } from "vitest";
import {
  useBillingBulkActions,
  canCollect,
  type BulkCollectDataSource,
} from "./useBillingBulkActions";
import type { CaseBillingRow, CollectionResult } from "../types";

function makeRow(
  partial: Partial<CaseBillingRow> & {
    id: string;
    caseId: string;
    caseNo: string;
  },
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
    billingRiskAcknowledged: false,
    billingRiskAcknowledgedAt: null,
    billingRiskAcknowledgedByDisplayName: null,
    ...partial,
  };
}

function makeDataSource(
  response: CollectionResult | Error = {
    success: 1,
    skipped: 0,
    failed: 0,
    details: [{ caseNo: "CAS-001", result: "success", taskId: "TSK-001" }],
  },
): BulkCollectDataSource {
  return {
    bulkCollect: vi.fn<(caseIds: string[]) => Promise<CollectionResult>>(() =>
      response instanceof Error
        ? Promise.reject(response)
        : Promise.resolve(response),
    ),
  };
}

const ROWS: CaseBillingRow[] = [
  makeRow({ id: "1", caseId: "c1", caseNo: "CAS-001", status: "overdue" }),
  makeRow({ id: "2", caseId: "c2", caseNo: "CAS-002", status: "partial" }),
  makeRow({ id: "3", caseId: "c3", caseNo: "CAS-003", status: "due" }),
  makeRow({ id: "4", caseId: "c4", caseNo: "CAS-004", status: "paid" }),
];

describe("canCollect", () => {
  it("returns true only for overdue rows", () => {
    expect(canCollect(ROWS[0])).toBe(true);
    expect(canCollect(ROWS[1])).toBe(false);
    expect(canCollect(ROWS[2])).toBe(false);
    expect(canCollect(ROWS[3])).toBe(false);
  });
});

describe("useBillingBulkActions", () => {
  it("calls bulkCollect API with unique caseIds from selected rows", async () => {
    const ds = makeDataSource();
    const bulk = useBillingBulkActions({ dataSource: ds });
    await bulk.executeBulkCollection(new Set(["1", "2"]), ROWS);
    expect(ds.bulkCollect).toHaveBeenCalledWith(["c1", "c2"]);
  });

  it("deduplicates caseIds when multiple plans belong to same case", async () => {
    const rows = [
      makeRow({ id: "a", caseId: "c1", caseNo: "CAS-001" }),
      makeRow({ id: "b", caseId: "c1", caseNo: "CAS-001" }),
    ];
    const ds = makeDataSource();
    const bulk = useBillingBulkActions({ dataSource: ds });
    await bulk.executeBulkCollection(new Set(["a", "b"]), rows);
    expect(ds.bulkCollect).toHaveBeenCalledWith(["c1"]);
  });

  it("returns API result and stores it in lastResult", async () => {
    const apiResult: CollectionResult = {
      success: 1,
      skipped: 1,
      failed: 0,
      details: [
        { caseNo: "CAS-001", result: "success", taskId: "TSK-001" },
        { caseNo: "CAS-002", result: "skipped", reason: "not-overdue" },
      ],
    };
    const ds = makeDataSource(apiResult);
    const bulk = useBillingBulkActions({ dataSource: ds });
    const result = await bulk.executeBulkCollection(new Set(["1", "2"]), ROWS);
    expect(result).toEqual(apiResult);
    expect(bulk.lastResult.value).toEqual(apiResult);
  });

  it("returns empty result for empty selection without calling API", async () => {
    const ds = makeDataSource();
    const bulk = useBillingBulkActions({ dataSource: ds });
    const result = await bulk.executeBulkCollection(new Set(), ROWS);
    expect(result.success).toBe(0);
    expect(result.skipped).toBe(0);
    expect(result.failed).toBe(0);
    expect(result.details).toHaveLength(0);
    expect(ds.bulkCollect).not.toHaveBeenCalled();
  });

  it("sets lastResult to fallback on API error and re-throws", async () => {
    const ds = makeDataSource(new Error("Network error"));
    const bulk = useBillingBulkActions({ dataSource: ds });
    await expect(
      bulk.executeBulkCollection(new Set(["1"]), ROWS),
    ).rejects.toThrow("Network error");
    expect(bulk.lastResult.value).not.toBeNull();
    expect(bulk.lastResult.value!.failed).toBe(1);
    expect(bulk.lastResult.value!.details[0].reason).toBe("system-error");
  });

  it("loading is false after execution completes", async () => {
    const ds = makeDataSource();
    const bulk = useBillingBulkActions({ dataSource: ds });
    await bulk.executeBulkCollection(new Set(["1"]), ROWS);
    expect(bulk.loading.value).toBe(false);
  });

  it("loading is false after execution fails", async () => {
    const ds = makeDataSource(new Error("fail"));
    const bulk = useBillingBulkActions({ dataSource: ds });
    try {
      await bulk.executeBulkCollection(new Set(["1"]), ROWS);
    } catch {
      // expected
    }
    expect(bulk.loading.value).toBe(false);
  });

  it("clearResult resets lastResult and closes drawer", async () => {
    const ds = makeDataSource();
    const bulk = useBillingBulkActions({ dataSource: ds });
    await bulk.executeBulkCollection(new Set(["1"]), ROWS);
    bulk.openDrawer();
    expect(bulk.drawerOpen.value).toBe(true);
    bulk.clearResult();
    expect(bulk.lastResult.value).toBeNull();
    expect(bulk.drawerOpen.value).toBe(false);
  });

  it("openDrawer / closeDrawer toggle drawerOpen", () => {
    const ds = makeDataSource();
    const bulk = useBillingBulkActions({ dataSource: ds });
    expect(bulk.drawerOpen.value).toBe(false);
    bulk.openDrawer();
    expect(bulk.drawerOpen.value).toBe(true);
    bulk.closeDrawer();
    expect(bulk.drawerOpen.value).toBe(false);
  });

  it("handles all five skip reason codes from API", async () => {
    const apiResult: CollectionResult = {
      success: 0,
      skipped: 5,
      failed: 0,
      details: [
        { caseNo: "C1", result: "skipped", reason: "no-permission" },
        { caseNo: "C2", result: "skipped", reason: "duplicate-task" },
        { caseNo: "C3", result: "skipped", reason: "not-overdue" },
        { caseNo: "C4", result: "skipped", reason: "no-assignee" },
        { caseNo: "C5", result: "skipped", reason: "system-error" },
      ],
    };
    const rows = [
      makeRow({ id: "a1", caseId: "c1", caseNo: "C1", status: "overdue" }),
      makeRow({ id: "a2", caseId: "c2", caseNo: "C2", status: "overdue" }),
      makeRow({ id: "a3", caseId: "c3", caseNo: "C3", status: "overdue" }),
      makeRow({ id: "a4", caseId: "c4", caseNo: "C4", status: "overdue" }),
      makeRow({ id: "a5", caseId: "c5", caseNo: "C5", status: "overdue" }),
    ];
    const ds = makeDataSource(apiResult);
    const bulk = useBillingBulkActions({ dataSource: ds });
    const result = await bulk.executeBulkCollection(
      new Set(["a1", "a2", "a3", "a4", "a5"]),
      rows,
    );
    expect(result.skipped).toBe(5);
    const reasons = result.details.map((d) => d.reason);
    expect(reasons).toEqual([
      "no-permission",
      "duplicate-task",
      "not-overdue",
      "no-assignee",
      "system-error",
    ]);
  });
});
