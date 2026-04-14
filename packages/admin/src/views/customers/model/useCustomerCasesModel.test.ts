import { describe, expect, it } from "vitest";
import { computed } from "vue";
import { useCustomerCasesModel } from "./useCustomerCasesModel";

function makeId(id: string) {
  return computed(() => id);
}

describe("useCustomerCasesModel", () => {
  it("defaults to 'all' filter", () => {
    const { caseFilter } = useCustomerCasesModel(makeId("cust-001"));
    expect(caseFilter.value).toBe("all");
  });

  it("returns all cases for a customer with cases", () => {
    const { allCases, filteredCases } = useCustomerCasesModel(
      makeId("cust-001"),
    );
    expect(allCases.value.length).toBe(3);
    expect(filteredCases.value.length).toBe(3);
  });

  it("returns empty array for a customer with no cases", () => {
    const { allCases, filteredCases } = useCustomerCasesModel(
      makeId("cust-004"),
    );
    expect(allCases.value).toHaveLength(0);
    expect(filteredCases.value).toHaveLength(0);
  });

  it("returns empty array for non-existent customer", () => {
    const { allCases } = useCustomerCasesModel(makeId("nonexistent"));
    expect(allCases.value).toHaveLength(0);
  });

  it("filters by active status", () => {
    const { filteredCases, setCaseFilter } = useCustomerCasesModel(
      makeId("cust-001"),
    );
    setCaseFilter("active");
    expect(filteredCases.value.length).toBe(1);
    expect(filteredCases.value[0].status).toBe("active");
  });

  it("filters by archived status", () => {
    const { filteredCases, setCaseFilter } = useCustomerCasesModel(
      makeId("cust-001"),
    );
    setCaseFilter("archived");
    expect(filteredCases.value.length).toBe(2);
    filteredCases.value.forEach((c) => expect(c.status).toBe("archived"));
  });

  it("returns to all when filter is reset", () => {
    const { filteredCases, allCases, setCaseFilter } = useCustomerCasesModel(
      makeId("cust-001"),
    );
    setCaseFilter("active");
    expect(filteredCases.value.length).toBeLessThan(allCases.value.length);
    setCaseFilter("all");
    expect(filteredCases.value.length).toBe(allCases.value.length);
  });

  it("filterOptions reflects counts correctly", () => {
    const { filterOptions } = useCustomerCasesModel(makeId("cust-001"));
    const opts = filterOptions.value;
    expect(opts).toHaveLength(3);
    expect(opts[0].count).toBe(3);
    expect(opts[1].count).toBe(1);
    expect(opts[2].count).toBe(2);
  });
});
