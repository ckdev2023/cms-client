import { describe, it, expect } from "vitest";
import { useBillingFilters } from "./useBillingFilters";
import type { CaseBillingRow, SelectOption } from "../types";

const STATUS_OPTIONS: SelectOption[] = [
  { value: "paid", label: "已结清" },
  { value: "partial", label: "部分回款" },
  { value: "due", label: "未回款" },
  { value: "overdue", label: "逾期" },
];

const GROUP_OPTIONS: SelectOption[] = [
  { value: "tokyo-1", label: "東京一組" },
  { value: "tokyo-2", label: "東京二組" },
  { value: "osaka", label: "大阪組" },
];

const OWNER_OPTIONS: SelectOption[] = [
  { value: "admin", label: "Admin" },
  { value: "suzuki", label: "Suzuki" },
];

function row(
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
  row({
    id: "1",
    caseName: "技术人文国际 新规",
    caseNo: "CAS-001",
    client: { name: "Global Tech KK", type: "企业" },
    group: "tokyo-1",
    owner: "admin",
    status: "overdue",
  }),
  row({
    id: "2",
    caseName: "高度人才 申请",
    caseNo: "CAS-002",
    client: { name: "Michael T.", type: "个人" },
    group: "tokyo-2",
    owner: "suzuki",
    status: "partial",
  }),
  row({
    id: "3",
    caseName: "家族滞在签证 续签",
    caseNo: "CAS-003",
    client: { name: "Sarah W.", type: "个人" },
    group: "osaka",
    owner: "suzuki",
    status: "paid",
  }),
];

function create() {
  return useBillingFilters({
    statusOptions: STATUS_OPTIONS,
    groupOptions: GROUP_OPTIONS,
    ownerOptions: OWNER_OPTIONS,
  });
}

describe("useBillingFilters", () => {
  it("initializes with default values", () => {
    const f = create();
    expect(f.segment.value).toBe("billing-list");
    expect(f.statusFilter.value).toBe("");
    expect(f.groupFilter.value).toBe("");
    expect(f.ownerFilter.value).toBe("");
    expect(f.search.value).toBe("");
    expect(f.isFilterActive.value).toBe(false);
  });

  it("isFilterActive becomes true when statusFilter is set", () => {
    const f = create();
    f.statusFilter.value = "overdue";
    expect(f.isFilterActive.value).toBe(true);
  });

  it("isFilterActive becomes true when groupFilter is set", () => {
    const f = create();
    f.groupFilter.value = "tokyo-1";
    expect(f.isFilterActive.value).toBe(true);
  });

  it("isFilterActive becomes true when ownerFilter is set", () => {
    const f = create();
    f.ownerFilter.value = "admin";
    expect(f.isFilterActive.value).toBe(true);
  });

  it("isFilterActive becomes true when search is set", () => {
    const f = create();
    f.search.value = "test";
    expect(f.isFilterActive.value).toBe(true);
  });

  it("resetFilters clears all filter values but not segment", () => {
    const f = create();
    f.segment.value = "payment-log";
    f.statusFilter.value = "overdue";
    f.groupFilter.value = "tokyo-1";
    f.ownerFilter.value = "admin";
    f.search.value = "test";
    f.resetFilters();
    expect(f.statusFilter.value).toBe("");
    expect(f.groupFilter.value).toBe("");
    expect(f.ownerFilter.value).toBe("");
    expect(f.search.value).toBe("");
    expect(f.segment.value).toBe("payment-log");
  });

  it("switchSegment changes segment", () => {
    const f = create();
    expect(f.segment.value).toBe("billing-list");
    f.switchSegment("payment-log");
    expect(f.segment.value).toBe("payment-log");
    f.switchSegment("billing-list");
    expect(f.segment.value).toBe("billing-list");
  });

  it("applyFilters returns all rows when no filter is active", () => {
    const f = create();
    expect(f.applyFilters(ROWS)).toHaveLength(3);
  });

  it("filters by status", () => {
    const f = create();
    f.statusFilter.value = "overdue";
    const result = f.applyFilters(ROWS);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
  });

  it("filters by group", () => {
    const f = create();
    f.groupFilter.value = "osaka";
    const result = f.applyFilters(ROWS);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("3");
  });

  it("filters by owner", () => {
    const f = create();
    f.ownerFilter.value = "suzuki";
    const result = f.applyFilters(ROWS);
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.id)).toEqual(["2", "3"]);
  });

  it("filters by search matching caseName", () => {
    const f = create();
    f.search.value = "技术人文";
    const result = f.applyFilters(ROWS);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
  });

  it("filters by search matching client name", () => {
    const f = create();
    f.search.value = "michael";
    const result = f.applyFilters(ROWS);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("2");
  });

  it("filters by search matching caseNo", () => {
    const f = create();
    f.search.value = "CAS-003";
    const result = f.applyFilters(ROWS);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("3");
  });

  it("search is case-insensitive", () => {
    const f = create();
    f.search.value = "GLOBAL TECH";
    const result = f.applyFilters(ROWS);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
  });

  it("combines multiple filters (intersection)", () => {
    const f = create();
    f.statusFilter.value = "partial";
    f.ownerFilter.value = "admin";
    expect(f.applyFilters(ROWS)).toHaveLength(0);
  });

  it("combines status + group filters", () => {
    const f = create();
    f.statusFilter.value = "paid";
    f.groupFilter.value = "osaka";
    const result = f.applyFilters(ROWS);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("3");
  });

  it("returns empty when search matches nothing", () => {
    const f = create();
    f.search.value = "nonexistent";
    expect(f.applyFilters(ROWS)).toHaveLength(0);
  });

  it("passes through option deps for external use", () => {
    const f = create();
    expect(f.statusOptions).toBe(STATUS_OPTIONS);
    expect(f.groupOptions).toBe(GROUP_OPTIONS);
    expect(f.ownerOptions).toBe(OWNER_OPTIONS);
  });
});
