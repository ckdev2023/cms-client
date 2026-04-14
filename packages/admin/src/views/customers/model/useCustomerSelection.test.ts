import { describe, it, expect } from "vitest";
import { useCustomerSelection } from "./useCustomerSelection";
import type { CustomerSummary } from "../types";

function customer(id: string): CustomerSummary {
  return {
    id,
    displayName: id,
    legalName: id,
    furigana: "",
    customerNumber: "",
    phone: "",
    email: "",
    totalCases: 0,
    activeCases: 0,
    lastContactDate: null,
    lastContactChannel: null,
    owner: { initials: "", name: "" },
    referralSource: "",
    group: "",
  };
}

const CUSTOMERS = [customer("a"), customer("b"), customer("c")];

describe("useCustomerSelection", () => {
  it("starts with no selection", () => {
    const s = useCustomerSelection();
    expect(s.selectedIds.value.size).toBe(0);
    expect(s.selectedCount.value).toBe(0);
  });

  it("toggleRow(id, true) adds an id to selection", () => {
    const s = useCustomerSelection();
    s.toggleRow("a", true);
    expect(s.selectedIds.value.has("a")).toBe(true);
    expect(s.selectedCount.value).toBe(1);
  });

  it("toggleRow(id, false) removes an id from selection", () => {
    const s = useCustomerSelection();
    s.toggleRow("a", true);
    s.toggleRow("a", false);
    expect(s.selectedIds.value.has("a")).toBe(false);
    expect(s.selectedCount.value).toBe(0);
  });

  it("toggleAll(customers, true) selects all customer ids", () => {
    const s = useCustomerSelection();
    s.toggleAll(CUSTOMERS, true);
    expect(s.selectedIds.value.size).toBe(3);
    for (const c of CUSTOMERS) {
      expect(s.selectedIds.value.has(c.id)).toBe(true);
    }
  });

  it("toggleAll(customers, false) clears selection", () => {
    const s = useCustomerSelection();
    s.toggleAll(CUSTOMERS, true);
    s.toggleAll(CUSTOMERS, false);
    expect(s.selectedIds.value.size).toBe(0);
  });

  it("clearSelection empties the set", () => {
    const s = useCustomerSelection();
    s.toggleRow("a", true);
    s.toggleRow("b", true);
    s.clearSelection();
    expect(s.selectedIds.value.size).toBe(0);
    expect(s.selectedCount.value).toBe(0);
  });

  it("isAllSelected returns true when every customer is selected", () => {
    const s = useCustomerSelection();
    s.toggleAll(CUSTOMERS, true);
    expect(s.isAllSelected(CUSTOMERS)).toBe(true);
  });

  it("isAllSelected returns false when none are selected", () => {
    const s = useCustomerSelection();
    expect(s.isAllSelected(CUSTOMERS)).toBe(false);
  });

  it("isAllSelected returns false for an empty list", () => {
    const s = useCustomerSelection();
    expect(s.isAllSelected([])).toBe(false);
  });

  it("isAllSelected returns false when only some are selected", () => {
    const s = useCustomerSelection();
    s.toggleRow("a", true);
    expect(s.isAllSelected(CUSTOMERS)).toBe(false);
  });

  it("isIndeterminate returns true when partially selected", () => {
    const s = useCustomerSelection();
    s.toggleRow("a", true);
    expect(s.isIndeterminate(CUSTOMERS)).toBe(true);
  });

  it("isIndeterminate returns false when none are selected", () => {
    const s = useCustomerSelection();
    expect(s.isIndeterminate(CUSTOMERS)).toBe(false);
  });

  it("isIndeterminate returns false when all are selected", () => {
    const s = useCustomerSelection();
    s.toggleAll(CUSTOMERS, true);
    expect(s.isIndeterminate(CUSTOMERS)).toBe(false);
  });

  it("isIndeterminate returns false for an empty list", () => {
    const s = useCustomerSelection();
    expect(s.isIndeterminate([])).toBe(false);
  });

  it("handles rapid toggle of same id correctly", () => {
    const s = useCustomerSelection();
    s.toggleRow("a", true);
    s.toggleRow("a", true);
    expect(s.selectedCount.value).toBe(1);
    s.toggleRow("a", false);
    expect(s.selectedCount.value).toBe(0);
  });
});
