import { describe, it, expect } from "vitest";
import { useBillingFilters } from "./useBillingFilters";
import type { SelectOption } from "../types";

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

  it("passes through option deps for external use", () => {
    const f = create();
    expect(f.statusOptions).toBe(STATUS_OPTIONS);
    expect(f.groupOptions).toBe(GROUP_OPTIONS);
    expect(f.ownerOptions).toBe(OWNER_OPTIONS);
  });
});
