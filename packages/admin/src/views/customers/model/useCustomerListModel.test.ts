import { describe, it, expect } from "vitest";
import { useCustomerListModel, matchesFilters } from "./useCustomerListModel";
import type { CustomerSummary } from "../types";

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
    furigana: "リウェイ",
    email: "liwei@example.com",
    activeCases: 0,
    owner: { initials: "TK", name: "高橋健太" },
    group: "大阪組",
  }),
  customer({
    id: "3",
    displayName: "佐藤美咲",
    furigana: "サトウミサキ",
    phone: "070-8888-1208",
    activeCases: 0,
    owner: { initials: "TK", name: "高橋健太" },
    group: "東京一組",
  }),
];

function create(data: CustomerSummary[] = CUSTOMERS) {
  return useCustomerListModel(() => data);
}

describe("matchesFilters", () => {
  it("passes all when filters are default", () => {
    const filters = {
      scope: "mine" as const,
      search: "",
      group: "",
      owner: "",
      activeCases: "" as const,
    };
    expect(CUSTOMERS.every((c) => matchesFilters(c, filters))).toBe(true);
  });

  it("rejects when search text does not match", () => {
    const filters = {
      scope: "mine" as const,
      search: "nonexistent",
      group: "",
      owner: "",
      activeCases: "" as const,
    };
    expect(CUSTOMERS.some((c) => matchesFilters(c, filters))).toBe(false);
  });

  it("filters by activeCases = yes", () => {
    const filters = {
      scope: "mine" as const,
      search: "",
      group: "",
      owner: "",
      activeCases: "yes" as const,
    };
    const result = CUSTOMERS.filter((c) => matchesFilters(c, filters));
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
  });
});

describe("useCustomerListModel", () => {
  it("returns all customers when filters are at defaults", () => {
    const model = create();
    expect(model.filteredCustomers.value).toHaveLength(3);
  });

  it("filters customers by search text", () => {
    const model = create();
    model.setSearch("田中");
    expect(model.filteredCustomers.value).toHaveLength(1);
    expect(model.filteredCustomers.value[0].id).toBe("1");
  });

  it("filters by activeCases", () => {
    const model = create();
    model.setActiveCases("no");
    expect(model.filteredCustomers.value).toHaveLength(2);
    expect(
      model.filteredCustomers.value.every((c) => c.activeCases === 0),
    ).toBe(true);
  });

  it("starts with empty selection", () => {
    const model = create();
    expect(model.selectedIds.value.size).toBe(0);
    expect(model.selectedCount.value).toBe(0);
    expect(model.isAllSelected.value).toBe(false);
    expect(model.isIndeterminate.value).toBe(false);
  });

  it("toggleSelectRow adds and removes ids", () => {
    const model = create();
    model.toggleSelectRow("1", true);
    expect(model.selectedIds.value.has("1")).toBe(true);
    expect(model.selectedCount.value).toBe(1);

    model.toggleSelectRow("1", false);
    expect(model.selectedIds.value.has("1")).toBe(false);
    expect(model.selectedCount.value).toBe(0);
  });

  it("toggleSelectAll selects all filtered customers", () => {
    const model = create();
    model.toggleSelectAll(true);
    expect(model.selectedCount.value).toBe(3);
    expect(model.isAllSelected.value).toBe(true);
    expect(model.isIndeterminate.value).toBe(false);
  });

  it("toggleSelectAll(false) deselects all filtered customers", () => {
    const model = create();
    model.toggleSelectAll(true);
    model.toggleSelectAll(false);
    expect(model.selectedCount.value).toBe(0);
    expect(model.isAllSelected.value).toBe(false);
  });

  it("isIndeterminate is true when partially selected", () => {
    const model = create();
    model.toggleSelectRow("1", true);
    expect(model.isIndeterminate.value).toBe(true);
    expect(model.isAllSelected.value).toBe(false);
  });

  it("clearSelection empties the selection", () => {
    const model = create();
    model.toggleSelectRow("1", true);
    model.toggleSelectRow("2", true);
    model.clearSelection();
    expect(model.selectedCount.value).toBe(0);
  });

  it("resetFilters clears filters and selection", () => {
    const model = create();
    model.setSearch("test");
    model.toggleSelectRow("1", true);
    model.resetFilters();
    expect(model.filters.search).toBe("");
    expect(model.selectedIds.value.size).toBe(0);
  });

  it("selectedCount reflects only filtered rows", () => {
    const model = create();
    model.toggleSelectRow("1", true);
    model.toggleSelectRow("2", true);
    expect(model.selectedCount.value).toBe(2);

    model.setSearch("田中");
    expect(model.filteredCustomers.value).toHaveLength(1);
    expect(model.selectedCount.value).toBe(1);
  });

  it("isAllSelected considers only filtered rows", () => {
    const model = create();
    model.toggleSelectRow("1", true);
    expect(model.isAllSelected.value).toBe(false);

    model.setSearch("田中");
    expect(model.isAllSelected.value).toBe(true);
  });

  it("returns false for isAllSelected on empty list", () => {
    const model = create([]);
    expect(model.isAllSelected.value).toBe(false);
    expect(model.isIndeterminate.value).toBe(false);
  });
});
