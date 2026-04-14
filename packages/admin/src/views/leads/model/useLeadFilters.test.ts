import { describe, it, expect } from "vitest";
import { useLeadFilters } from "./useLeadFilters";
import type { LeadSummary, SelectOption } from "../types";

const GROUP_OPTIONS: SelectOption[] = [
  { value: "tokyo-1", label: "东京一组" },
  { value: "tokyo-2", label: "东京二组" },
  { value: "osaka", label: "大阪组" },
];

const OWNER_OPTIONS: SelectOption[] = [
  { value: "suzuki", label: "铃木" },
  { value: "tanaka", label: "田中" },
];

const BIZ_TYPE_OPTIONS: SelectOption[] = [
  { value: "work-visa", label: "技人国" },
  { value: "family-stay", label: "家族滞在" },
];

function lead(partial: Partial<LeadSummary> & { id: string }): LeadSummary {
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

const LEADS: LeadSummary[] = [
  lead({
    id: "1",
    name: "Michael Thompson",
    phone: "090-8765-4321",
    email: "michael.t@email.com",
    businessType: "work-visa",
    businessTypeLabel: "技人国",
    sourceLabel: "网站表单",
    status: "new",
    ownerId: "suzuki",
    groupId: "tokyo-1",
    updatedAt: "2026-04-08",
  }),
  lead({
    id: "2",
    name: "李华",
    phone: "080-2222-3333",
    email: "li.hua@email.com",
    businessType: "family-stay",
    businessTypeLabel: "家族滞在",
    sourceLabel: "介绍",
    status: "following",
    ownerId: "tanaka",
    groupId: "tokyo-1",
    updatedAt: "2026-04-07",
  }),
  lead({
    id: "3",
    name: "田中 太郎",
    phone: "070-5555-6666",
    email: "tanaka.t@email.com",
    businessType: "work-visa",
    businessTypeLabel: "技人国",
    sourceLabel: "来访",
    status: "lost",
    ownerId: "suzuki",
    groupId: "osaka",
    updatedAt: "2026-03-28",
  }),
];

function create() {
  return useLeadFilters({
    groupOptions: GROUP_OPTIONS,
    ownerOptions: OWNER_OPTIONS,
    businessTypeOptions: BIZ_TYPE_OPTIONS,
  });
}

describe("useLeadFilters", () => {
  it("initializes with default values", () => {
    const f = create();
    expect(f.scope.value).toBe("mine");
    expect(f.search.value).toBe("");
    expect(f.statusFilter.value).toBe("");
    expect(f.ownerFilter.value).toBe("");
    expect(f.groupFilter.value).toBe("");
    expect(f.businessTypeFilter.value).toBe("");
    expect(f.dateFrom.value).toBe("");
    expect(f.dateTo.value).toBe("");
    expect(f.isFilterActive.value).toBe(false);
  });

  it("isFilterActive becomes true when search is set", () => {
    const f = create();
    f.search.value = "test";
    expect(f.isFilterActive.value).toBe(true);
  });

  it("isFilterActive becomes true when statusFilter is set", () => {
    const f = create();
    f.statusFilter.value = "new";
    expect(f.isFilterActive.value).toBe(true);
  });

  it("isFilterActive becomes true when dateFrom is set", () => {
    const f = create();
    f.dateFrom.value = "2026-04-01";
    expect(f.isFilterActive.value).toBe(true);
  });

  it("resetFilters clears all filter values but not scope", () => {
    const f = create();
    f.scope.value = "group";
    f.search.value = "test";
    f.statusFilter.value = "new";
    f.ownerFilter.value = "suzuki";
    f.groupFilter.value = "tokyo-1";
    f.businessTypeFilter.value = "work-visa";
    f.dateFrom.value = "2026-04-01";
    f.dateTo.value = "2026-04-30";
    f.resetFilters();
    expect(f.search.value).toBe("");
    expect(f.statusFilter.value).toBe("");
    expect(f.ownerFilter.value).toBe("");
    expect(f.groupFilter.value).toBe("");
    expect(f.businessTypeFilter.value).toBe("");
    expect(f.dateFrom.value).toBe("");
    expect(f.dateTo.value).toBe("");
    expect(f.scope.value).toBe("group");
  });

  it("applyFilters returns all leads when no filter is active", () => {
    const f = create();
    expect(f.applyFilters(LEADS)).toHaveLength(3);
  });

  it("filters by search text matching name", () => {
    const f = create();
    f.search.value = "Michael";
    const result = f.applyFilters(LEADS);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
  });

  it("filters by search text matching phone", () => {
    const f = create();
    f.search.value = "090";
    const result = f.applyFilters(LEADS);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
  });

  it("filters by search text matching email", () => {
    const f = create();
    f.search.value = "li.hua";
    const result = f.applyFilters(LEADS);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("2");
  });

  it("filters by search text matching businessTypeLabel", () => {
    const f = create();
    f.search.value = "家族滞在";
    const result = f.applyFilters(LEADS);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("2");
  });

  it("search is case-insensitive for latin characters", () => {
    const f = create();
    f.search.value = "MICHAEL";
    expect(f.applyFilters(LEADS)).toHaveLength(1);
  });

  it("filters by status", () => {
    const f = create();
    f.statusFilter.value = "lost";
    const result = f.applyFilters(LEADS);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("3");
  });

  it("filters by owner", () => {
    const f = create();
    f.ownerFilter.value = "tanaka";
    const result = f.applyFilters(LEADS);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("2");
  });

  it("filters by group", () => {
    const f = create();
    f.groupFilter.value = "osaka";
    const result = f.applyFilters(LEADS);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("3");
  });

  it("filters by businessType", () => {
    const f = create();
    f.businessTypeFilter.value = "family-stay";
    const result = f.applyFilters(LEADS);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("2");
  });

  it("filters by dateFrom", () => {
    const f = create();
    f.dateFrom.value = "2026-04-07";
    const result = f.applyFilters(LEADS);
    expect(result).toHaveLength(2);
    expect(result.map((l) => l.id).sort()).toEqual(["1", "2"]);
  });

  it("filters by dateTo", () => {
    const f = create();
    f.dateTo.value = "2026-03-31";
    const result = f.applyFilters(LEADS);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("3");
  });

  it("filters by date range (from + to)", () => {
    const f = create();
    f.dateFrom.value = "2026-04-07";
    f.dateTo.value = "2026-04-07";
    const result = f.applyFilters(LEADS);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("2");
  });

  it("combines multiple filters (intersection)", () => {
    const f = create();
    f.search.value = "Michael";
    f.groupFilter.value = "osaka";
    expect(f.applyFilters(LEADS)).toHaveLength(0);
  });

  it("ignores unknown group option values gracefully", () => {
    const f = create();
    f.groupFilter.value = "nonexistent";
    expect(f.applyFilters(LEADS)).toHaveLength(3);
  });
});
