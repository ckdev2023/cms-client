import { describe, it, expect } from "vitest";
import { useLeadBulkActions, canBulkOperate } from "./useLeadBulkActions";
import type { LeadSummary } from "../types";

function makeRow(partial: Partial<LeadSummary> & { id: string }): LeadSummary {
  return {
    name: "",
    phone: "",
    email: "",
    businessType: "",
    businessTypeLabel: "",
    source: "",
    sourceLabel: "",
    referrer: "",
    status: "new",
    ownerId: "",
    groupId: "",
    nextAction: "",
    nextFollowUp: "",
    nextFollowUpLabel: "",
    updatedAt: "",
    updatedAtLabel: "",
    convertedCustomerId: null,
    convertedCaseId: null,
    dedupHint: null,
    rowHighlight: null,
    ...partial,
  };
}

const ROWS: LeadSummary[] = [
  makeRow({ id: "1", status: "new" }),
  makeRow({ id: "2", status: "following" }),
  makeRow({ id: "3", status: "converted_case" }),
  makeRow({ id: "4", status: "lost" }),
  makeRow({ id: "5", status: "pending_sign" }),
];

describe("canBulkOperate", () => {
  it("returns true for non-terminal statuses", () => {
    expect(canBulkOperate(ROWS[0])).toBe(true);
    expect(canBulkOperate(ROWS[1])).toBe(true);
    expect(canBulkOperate(ROWS[4])).toBe(true);
  });

  it("returns false for terminal statuses (converted_case / lost)", () => {
    expect(canBulkOperate(ROWS[2])).toBe(false);
    expect(canBulkOperate(ROWS[3])).toBe(false);
  });
});

describe("useLeadBulkActions — assignOwner", () => {
  it("succeeds for operable rows", async () => {
    const bulk = useLeadBulkActions();
    const result = await bulk.assignOwner(new Set(["1", "2"]), ROWS, "tanaka");
    expect(result.kind).toBe("assign_owner");
    expect(result.success).toBe(2);
    expect(result.skipped).toBe(0);
    expect(result.details).toHaveLength(2);
  });

  it("skips terminal-status rows", async () => {
    const bulk = useLeadBulkActions();
    const result = await bulk.assignOwner(
      new Set(["1", "3", "4"]),
      ROWS,
      "tanaka",
    );
    expect(result.success).toBe(1);
    expect(result.skipped).toBe(2);
    expect(
      result.details.filter((d) => d.reason === "terminal-status"),
    ).toHaveLength(2);
  });

  it("returns empty result for empty selection", async () => {
    const bulk = useLeadBulkActions();
    const result = await bulk.assignOwner(new Set(), ROWS, "tanaka");
    expect(result.success).toBe(0);
    expect(result.skipped).toBe(0);
    expect(result.details).toHaveLength(0);
  });
});

describe("useLeadBulkActions — adjustFollowUp", () => {
  it("succeeds for operable rows", async () => {
    const bulk = useLeadBulkActions();
    const result = await bulk.adjustFollowUp(
      new Set(["1", "5"]),
      ROWS,
      "2026-05-01",
    );
    expect(result.kind).toBe("adjust_followup");
    expect(result.success).toBe(2);
    expect(result.skipped).toBe(0);
  });

  it("skips terminal-status rows", async () => {
    const bulk = useLeadBulkActions();
    const result = await bulk.adjustFollowUp(
      new Set(["2", "4"]),
      ROWS,
      "2026-05-01",
    );
    expect(result.success).toBe(1);
    expect(result.skipped).toBe(1);
  });
});

describe("useLeadBulkActions — markStatus", () => {
  it("succeeds for operable rows", async () => {
    const bulk = useLeadBulkActions();
    const result = await bulk.markStatus(
      new Set(["1", "2"]),
      ROWS,
      "following",
    );
    expect(result.kind).toBe("mark_status");
    expect(result.success).toBe(2);
    expect(result.skipped).toBe(0);
  });

  it("skips terminal-status rows", async () => {
    const bulk = useLeadBulkActions();
    const result = await bulk.markStatus(
      new Set(["3", "5"]),
      ROWS,
      "pending_sign",
    );
    expect(result.success).toBe(1);
    expect(result.skipped).toBe(1);
  });
});

describe("useLeadBulkActions — shared state", () => {
  it("sets lastResult after any operation", async () => {
    const bulk = useLeadBulkActions();
    expect(bulk.lastResult.value).toBeNull();

    await bulk.assignOwner(new Set(["1"]), ROWS, "suzuki");
    expect(bulk.lastResult.value).not.toBeNull();
    expect(bulk.lastResult.value!.kind).toBe("assign_owner");
  });

  it("lastResult updates with subsequent operations", async () => {
    const bulk = useLeadBulkActions();
    await bulk.assignOwner(new Set(["1"]), ROWS, "suzuki");
    expect(bulk.lastResult.value!.kind).toBe("assign_owner");

    await bulk.markStatus(new Set(["2"]), ROWS, "following");
    expect(bulk.lastResult.value!.kind).toBe("mark_status");
  });

  it("clearResult resets lastResult to null", async () => {
    const bulk = useLeadBulkActions();
    await bulk.assignOwner(new Set(["1"]), ROWS, "suzuki");
    bulk.clearResult();
    expect(bulk.lastResult.value).toBeNull();
  });

  it("loading is false after execution completes", async () => {
    const bulk = useLeadBulkActions();
    await bulk.assignOwner(new Set(["1"]), ROWS, "suzuki");
    expect(bulk.loading.value).toBe(false);
  });

  it("handles all rows being terminal", async () => {
    const bulk = useLeadBulkActions();
    const result = await bulk.assignOwner(new Set(["3", "4"]), ROWS, "tanaka");
    expect(result.success).toBe(0);
    expect(result.skipped).toBe(2);
  });
});
