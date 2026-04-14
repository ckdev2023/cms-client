import { describe, it, expect } from "vitest";
import {
  deriveCustomerSummaryStats,
  useCustomerFilters,
} from "./useCustomerFilters";
import type {
  CustomerSummary,
  CustomerViewerContext,
  SelectOption,
} from "../types";

const GROUP_OPTIONS: SelectOption[] = [
  { value: "tokyo-1", label: "東京一組" },
  { value: "osaka", label: "大阪組" },
];

const OWNER_OPTIONS: SelectOption[] = [
  { value: "ys", label: "山田翔太" },
  { value: "tk", label: "高橋健太" },
];

const VIEWER: CustomerViewerContext = {
  ownerName: "山田翔太",
  group: "東京一組",
};

function customer(
  partial: Partial<CustomerSummary> & { id: string },
): CustomerSummary {
  return {
    displayName: "",
    legalName: "",
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
    ...partial,
  };
}

const CUSTOMERS: CustomerSummary[] = [
  customer({
    id: "1",
    displayName: "田中太郎",
    legalName: "田中太郎",
    furigana: "タナカタロウ",
    phone: "090-1234-5678",
    email: "tanaka@example.com",
    activeCases: 1,
    owner: { initials: "YS", name: "山田翔太" },
    group: "東京一組",
  }),
  customer({
    id: "2",
    displayName: "Li Wei",
    legalName: "Li Wei",
    furigana: "リウェイ",
    email: "liwei@example.com",
    activeCases: 0,
    owner: { initials: "TK", name: "高橋健太" },
    group: "大阪組",
  }),
];

function create() {
  return useCustomerFilters({
    groupOptions: GROUP_OPTIONS,
    ownerOptions: OWNER_OPTIONS,
  });
}

describe("useCustomerFilters", () => {
  it("initializes with default values", () => {
    const f = create();
    expect(f.scope.value).toBe("mine");
    expect(f.search.value).toBe("");
    expect(f.groupFilter.value).toBe("");
    expect(f.ownerFilter.value).toBe("");
    expect(f.activeCasesFilter.value).toBe("");
    expect(f.isFilterActive.value).toBe(false);
  });

  it("isFilterActive becomes true when search is set", () => {
    const f = create();
    f.search.value = "test";
    expect(f.isFilterActive.value).toBe(true);
  });

  it("isFilterActive becomes true when groupFilter is set", () => {
    const f = create();
    f.groupFilter.value = "tokyo-1";
    expect(f.isFilterActive.value).toBe(true);
  });

  it("isFilterActive becomes true when ownerFilter is set", () => {
    const f = create();
    f.ownerFilter.value = "ys";
    expect(f.isFilterActive.value).toBe(true);
  });

  it("isFilterActive becomes true when activeCasesFilter is set", () => {
    const f = create();
    f.activeCasesFilter.value = "yes";
    expect(f.isFilterActive.value).toBe(true);
  });

  it("resetFilters clears all filter values but not scope", () => {
    const f = create();
    f.scope.value = "group";
    f.search.value = "test";
    f.groupFilter.value = "tokyo-1";
    f.ownerFilter.value = "ys";
    f.activeCasesFilter.value = "yes";
    f.resetFilters();
    expect(f.search.value).toBe("");
    expect(f.groupFilter.value).toBe("");
    expect(f.ownerFilter.value).toBe("");
    expect(f.activeCasesFilter.value).toBe("");
    expect(f.scope.value).toBe("group");
  });

  it("applyFilters returns all customers when no filter is active", () => {
    const f = create();
    expect(f.applyFilters(CUSTOMERS)).toHaveLength(2);
  });

  it("filters by mine scope using the current viewer", () => {
    const f = create();
    f.scope.value = "mine";
    const result = f.applyFilters(CUSTOMERS, VIEWER);
    expect(result).toHaveLength(1);
    expect(result[0].owner.name).toBe("山田翔太");
  });

  it("filters by group scope using the current viewer", () => {
    const f = create();
    f.scope.value = "group";
    const result = f.applyFilters(CUSTOMERS, VIEWER);
    expect(result).toHaveLength(1);
    expect(result[0].group).toBe("東京一組");
  });

  it("all scope keeps customers across owners and groups", () => {
    const f = create();
    f.scope.value = "all";
    expect(f.applyFilters(CUSTOMERS, VIEWER)).toHaveLength(2);
  });

  it("filters by search text matching displayName", () => {
    const f = create();
    f.search.value = "田中";
    const result = f.applyFilters(CUSTOMERS);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
  });

  it("filters by search text matching furigana", () => {
    const f = create();
    f.search.value = "リウェイ";
    const result = f.applyFilters(CUSTOMERS);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("2");
  });

  it("filters by search text matching phone", () => {
    const f = create();
    f.search.value = "090";
    expect(f.applyFilters(CUSTOMERS)).toHaveLength(1);
  });

  it("filters by search text matching email", () => {
    const f = create();
    f.search.value = "liwei";
    expect(f.applyFilters(CUSTOMERS)).toHaveLength(1);
  });

  it("search is case-insensitive for latin characters", () => {
    const f = create();
    f.search.value = "LI WEI";
    expect(f.applyFilters(CUSTOMERS)).toHaveLength(1);
  });

  it("filters by group (resolves option value → label)", () => {
    const f = create();
    f.groupFilter.value = "osaka";
    const result = f.applyFilters(CUSTOMERS);
    expect(result).toHaveLength(1);
    expect(result[0].group).toBe("大阪組");
  });

  it("filters by owner (resolves option value → label)", () => {
    const f = create();
    f.ownerFilter.value = "tk";
    const result = f.applyFilters(CUSTOMERS);
    expect(result).toHaveLength(1);
    expect(result[0].owner.name).toBe("高橋健太");
  });

  it("filters active cases = yes (activeCases > 0)", () => {
    const f = create();
    f.activeCasesFilter.value = "yes";
    const result = f.applyFilters(CUSTOMERS);
    expect(result).toHaveLength(1);
    expect(result[0].activeCases).toBeGreaterThan(0);
  });

  it("filters active cases = no (activeCases === 0)", () => {
    const f = create();
    f.activeCasesFilter.value = "no";
    const result = f.applyFilters(CUSTOMERS);
    expect(result).toHaveLength(1);
    expect(result[0].activeCases).toBe(0);
  });

  it("combines multiple filters (intersection)", () => {
    const f = create();
    f.search.value = "田中";
    f.groupFilter.value = "osaka";
    expect(f.applyFilters(CUSTOMERS)).toHaveLength(0);
  });

  it("ignores unknown group option values", () => {
    const f = create();
    f.groupFilter.value = "nonexistent";
    expect(f.applyFilters(CUSTOMERS)).toHaveLength(2);
  });

  it("ignores unknown owner option values", () => {
    const f = create();
    f.ownerFilter.value = "nonexistent";
    expect(f.applyFilters(CUSTOMERS)).toHaveLength(2);
  });
});

describe("deriveCustomerSummaryStats", () => {
  it("derives viewer-aware summary counts from customer rows", () => {
    expect(deriveCustomerSummaryStats(CUSTOMERS, VIEWER)).toEqual({
      mine: 1,
      group: 1,
      active: 1,
      noActive: 1,
    });
  });
});
