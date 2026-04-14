import { describe, expect, it } from "vitest";
import { computed } from "vue";
import { useCustomerContactsModel } from "./useCustomerContactsModel";

function makeId(id: string) {
  return computed(() => id);
}

describe("useCustomerContactsModel", () => {
  it("returns all relations for a customer", () => {
    const { allRelations, filteredRelations } = useCustomerContactsModel(
      makeId("cust-002"),
    );
    expect(allRelations.value.length).toBe(2);
    expect(filteredRelations.value.length).toBe(2);
  });

  it("returns empty array for customer with no relations", () => {
    const { allRelations } = useCustomerContactsModel(makeId("cust-003"));
    expect(allRelations.value).toHaveLength(0);
  });

  it("returns empty array for non-existent customer", () => {
    const { allRelations } = useCustomerContactsModel(makeId("nonexistent"));
    expect(allRelations.value).toHaveLength(0);
  });

  it("filters by search query (name)", () => {
    const { filteredRelations, setSearch } = useCustomerContactsModel(
      makeId("cust-002"),
    );
    setSearch("佐藤");
    expect(filteredRelations.value.length).toBe(1);
    expect(filteredRelations.value[0].name).toContain("佐藤");
  });

  it("filters by search query (email)", () => {
    const { filteredRelations, setSearch } = useCustomerContactsModel(
      makeId("cust-002"),
    );
    setSearch("sato-office");
    expect(filteredRelations.value.length).toBe(1);
  });

  it("filters by tag", () => {
    const { filteredRelations, setSearch } = useCustomerContactsModel(
      makeId("cust-001"),
    );
    setSearch("緊急連絡先");
    expect(filteredRelations.value.length).toBe(1);
  });

  it("returns empty when search has no match", () => {
    const { filteredRelations, setSearch } = useCustomerContactsModel(
      makeId("cust-001"),
    );
    setSearch("zzz-no-match");
    expect(filteredRelations.value).toHaveLength(0);
  });

  it("defaults to no selection", () => {
    const { selectedCount, isAllSelected, hasSelection } =
      useCustomerContactsModel(makeId("cust-002"));
    expect(selectedCount.value).toBe(0);
    expect(isAllSelected.value).toBe(false);
    expect(hasSelection.value).toBe(false);
  });

  it("toggleSelect selects and deselects an item", () => {
    const { selectedIds, selectedCount, toggleSelect } =
      useCustomerContactsModel(makeId("cust-002"));
    toggleSelect("REL-002-1");
    expect(selectedIds.value["REL-002-1"]).toBe(true);
    expect(selectedCount.value).toBe(1);

    toggleSelect("REL-002-1");
    expect(selectedIds.value["REL-002-1"]).toBe(false);
    expect(selectedCount.value).toBe(0);
  });

  it("toggleSelectAll selects and deselects all filtered items", () => {
    const { isAllSelected, isIndeterminate, selectedCount, toggleSelectAll } =
      useCustomerContactsModel(makeId("cust-002"));

    toggleSelectAll();
    expect(isAllSelected.value).toBe(true);
    expect(isIndeterminate.value).toBe(false);
    expect(selectedCount.value).toBe(2);

    toggleSelectAll();
    expect(isAllSelected.value).toBe(false);
    expect(selectedCount.value).toBe(0);
  });

  it("isIndeterminate is true when partially selected", () => {
    const { isIndeterminate, isAllSelected, toggleSelect } =
      useCustomerContactsModel(makeId("cust-002"));
    toggleSelect("REL-002-1");
    expect(isIndeterminate.value).toBe(true);
    expect(isAllSelected.value).toBe(false);
  });

  it("hasSelection reflects whether any item is selected", () => {
    const { hasSelection, toggleSelect } = useCustomerContactsModel(
      makeId("cust-002"),
    );
    expect(hasSelection.value).toBe(false);
    toggleSelect("REL-002-1");
    expect(hasSelection.value).toBe(true);
  });
});
