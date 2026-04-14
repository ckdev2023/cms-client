import { describe, it, expect } from "vitest";
import { useBillingSelection } from "./useBillingSelection";
import type { CaseBillingRow } from "../types";

function makeRow(
  partial: Partial<CaseBillingRow> & { id: string },
): CaseBillingRow {
  return {
    caseName: "",
    caseNo: "",
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
  makeRow({ id: "1", status: "overdue" }),
  makeRow({ id: "2", status: "partial" }),
  makeRow({ id: "3", status: "due" }),
  makeRow({ id: "4", status: "paid" }),
  makeRow({ id: "5", status: "overdue" }),
];

describe("useBillingSelection", () => {
  it("selectableRows returns only overdue rows", () => {
    const sel = useBillingSelection();
    const result = sel.selectableRows(ROWS);
    expect(result.map((r) => r.id)).toEqual(["1", "5"]);
  });

  it("isRowSelectable returns true only for overdue", () => {
    const sel = useBillingSelection();
    expect(sel.isRowSelectable(ROWS[0])).toBe(true);
    expect(sel.isRowSelectable(ROWS[1])).toBe(false);
    expect(sel.isRowSelectable(ROWS[2])).toBe(false);
    expect(sel.isRowSelectable(ROWS[3])).toBe(false);
  });

  it("toggleAll selects all overdue rows", () => {
    const sel = useBillingSelection();
    sel.toggleAll(ROWS, true);
    expect([...sel.selectedIds.value]).toEqual(["1", "5"]);
  });

  it("toggleAll with false deselects all", () => {
    const sel = useBillingSelection();
    sel.toggleAll(ROWS, true);
    sel.toggleAll(ROWS, false);
    expect(sel.selectedIds.value.size).toBe(0);
  });

  it("toggleRow adds an id", () => {
    const sel = useBillingSelection();
    sel.toggleRow("1", true);
    expect(sel.selectedIds.value.has("1")).toBe(true);
    expect(sel.selectedCount.value).toBe(1);
  });

  it("toggleRow removes an id", () => {
    const sel = useBillingSelection();
    sel.toggleRow("1", true);
    sel.toggleRow("1", false);
    expect(sel.selectedIds.value.has("1")).toBe(false);
    expect(sel.selectedCount.value).toBe(0);
  });

  it("clearSelection empties selected set", () => {
    const sel = useBillingSelection();
    sel.toggleAll(ROWS, true);
    sel.clearSelection();
    expect(sel.selectedCount.value).toBe(0);
  });

  it("isAllSelected returns true when all selectable rows are checked", () => {
    const sel = useBillingSelection();
    sel.toggleAll(ROWS, true);
    expect(sel.isAllSelected(ROWS)).toBe(true);
  });

  it("isAllSelected returns false when not all selectable rows are checked", () => {
    const sel = useBillingSelection();
    sel.toggleRow("1", true);
    expect(sel.isAllSelected(ROWS)).toBe(false);
  });

  it("isAllSelected returns false when no rows are selected", () => {
    const sel = useBillingSelection();
    expect(sel.isAllSelected(ROWS)).toBe(false);
  });

  it("isIndeterminate returns true for partial selection", () => {
    const sel = useBillingSelection();
    sel.toggleRow("1", true);
    expect(sel.isIndeterminate(ROWS)).toBe(true);
  });

  it("isIndeterminate returns false when all selectable are selected", () => {
    const sel = useBillingSelection();
    sel.toggleAll(ROWS, true);
    expect(sel.isIndeterminate(ROWS)).toBe(false);
  });

  it("isIndeterminate returns false when none are selected", () => {
    const sel = useBillingSelection();
    expect(sel.isIndeterminate(ROWS)).toBe(false);
  });

  it("selectedCount reflects the number of selected items", () => {
    const sel = useBillingSelection();
    expect(sel.selectedCount.value).toBe(0);
    sel.toggleRow("1", true);
    sel.toggleRow("5", true);
    expect(sel.selectedCount.value).toBe(2);
  });

  it("paid rows are not selectable", () => {
    const sel = useBillingSelection();
    expect(
      sel.selectableRows([makeRow({ id: "x", status: "paid" })]),
    ).toHaveLength(0);
  });

  it("partial rows are not selectable", () => {
    const sel = useBillingSelection();
    expect(
      sel.selectableRows([makeRow({ id: "x", status: "partial" })]),
    ).toHaveLength(0);
  });

  it("due rows are not selectable", () => {
    const sel = useBillingSelection();
    expect(
      sel.selectableRows([makeRow({ id: "x", status: "due" })]),
    ).toHaveLength(0);
  });
});
