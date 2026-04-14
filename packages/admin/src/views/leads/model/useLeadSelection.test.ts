import { describe, it, expect } from "vitest";
import { useLeadSelection } from "./useLeadSelection";
import type { LeadSummary } from "../types";

function lead(id: string): LeadSummary {
  return {
    id,
    name: id,
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
  };
}

const LEADS = [lead("a"), lead("b"), lead("c")];

describe("useLeadSelection", () => {
  it("starts with no selection", () => {
    const s = useLeadSelection();
    expect(s.selectedIds.value.size).toBe(0);
    expect(s.selectedCount.value).toBe(0);
  });

  it("toggleRow(id, true) adds an id to selection", () => {
    const s = useLeadSelection();
    s.toggleRow("a", true);
    expect(s.selectedIds.value.has("a")).toBe(true);
    expect(s.selectedCount.value).toBe(1);
  });

  it("toggleRow(id, false) removes an id from selection", () => {
    const s = useLeadSelection();
    s.toggleRow("a", true);
    s.toggleRow("a", false);
    expect(s.selectedIds.value.has("a")).toBe(false);
    expect(s.selectedCount.value).toBe(0);
  });

  it("toggleAll(leads, true) selects all lead ids", () => {
    const s = useLeadSelection();
    s.toggleAll(LEADS, true);
    expect(s.selectedIds.value.size).toBe(3);
    for (const l of LEADS) {
      expect(s.selectedIds.value.has(l.id)).toBe(true);
    }
  });

  it("toggleAll(leads, false) clears selection", () => {
    const s = useLeadSelection();
    s.toggleAll(LEADS, true);
    s.toggleAll(LEADS, false);
    expect(s.selectedIds.value.size).toBe(0);
  });

  it("clearSelection empties the set", () => {
    const s = useLeadSelection();
    s.toggleRow("a", true);
    s.toggleRow("b", true);
    s.clearSelection();
    expect(s.selectedIds.value.size).toBe(0);
    expect(s.selectedCount.value).toBe(0);
  });

  it("isAllSelected returns true when every lead is selected", () => {
    const s = useLeadSelection();
    s.toggleAll(LEADS, true);
    expect(s.isAllSelected(LEADS)).toBe(true);
  });

  it("isAllSelected returns false when none are selected", () => {
    const s = useLeadSelection();
    expect(s.isAllSelected(LEADS)).toBe(false);
  });

  it("isAllSelected returns false for an empty list", () => {
    const s = useLeadSelection();
    expect(s.isAllSelected([])).toBe(false);
  });

  it("isAllSelected returns false when only some are selected", () => {
    const s = useLeadSelection();
    s.toggleRow("a", true);
    expect(s.isAllSelected(LEADS)).toBe(false);
  });

  it("isIndeterminate returns true when partially selected", () => {
    const s = useLeadSelection();
    s.toggleRow("a", true);
    expect(s.isIndeterminate(LEADS)).toBe(true);
  });

  it("isIndeterminate returns false when none are selected", () => {
    const s = useLeadSelection();
    expect(s.isIndeterminate(LEADS)).toBe(false);
  });

  it("isIndeterminate returns false when all are selected", () => {
    const s = useLeadSelection();
    s.toggleAll(LEADS, true);
    expect(s.isIndeterminate(LEADS)).toBe(false);
  });

  it("isIndeterminate returns false for an empty list", () => {
    const s = useLeadSelection();
    expect(s.isIndeterminate([])).toBe(false);
  });

  it("handles rapid toggle of same id correctly", () => {
    const s = useLeadSelection();
    s.toggleRow("a", true);
    s.toggleRow("a", true);
    expect(s.selectedCount.value).toBe(1);
    s.toggleRow("a", false);
    expect(s.selectedCount.value).toBe(0);
  });
});
