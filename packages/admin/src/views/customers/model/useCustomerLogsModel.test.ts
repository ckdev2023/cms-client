import { describe, expect, it } from "vitest";
import { computed } from "vue";
import { useCustomerLogsModel } from "./useCustomerLogsModel";

function makeId(id: string) {
  return computed(() => id);
}

describe("useCustomerLogsModel", () => {
  it("defaults to 'all' filter and page 1", () => {
    const { logFilter, currentPage } = useCustomerLogsModel(makeId("cust-001"));
    expect(logFilter.value).toBe("all");
    expect(currentPage.value).toBe(1);
  });

  it("returns all logs for a customer with records", () => {
    const { allLogs, filteredLogs } = useCustomerLogsModel(makeId("cust-001"));
    expect(allLogs.value.length).toBe(4);
    expect(filteredLogs.value.length).toBe(4);
  });

  it("returns empty array for a customer with no logs", () => {
    const { allLogs, filteredLogs } = useCustomerLogsModel(makeId("cust-004"));
    expect(allLogs.value).toHaveLength(0);
    expect(filteredLogs.value).toHaveLength(0);
  });

  it("returns empty array for non-existent customer", () => {
    const { allLogs } = useCustomerLogsModel(makeId("nonexistent"));
    expect(allLogs.value).toHaveLength(0);
  });

  it("filters by type 'info'", () => {
    const { filteredLogs, setLogFilter } = useCustomerLogsModel(
      makeId("cust-001"),
    );
    setLogFilter("info");
    expect(filteredLogs.value.length).toBe(1);
    expect(filteredLogs.value[0].type).toBe("info");
  });

  it("filters by type 'case'", () => {
    const { filteredLogs, setLogFilter } = useCustomerLogsModel(
      makeId("cust-001"),
    );
    setLogFilter("case");
    expect(filteredLogs.value.length).toBe(1);
    expect(filteredLogs.value[0].type).toBe("case");
  });

  it("filters by type 'relation'", () => {
    const { filteredLogs, setLogFilter } = useCustomerLogsModel(
      makeId("cust-001"),
    );
    setLogFilter("relation");
    expect(filteredLogs.value.length).toBe(1);
    expect(filteredLogs.value[0].type).toBe("relation");
  });

  it("filters by type 'comm'", () => {
    const { filteredLogs, setLogFilter } = useCustomerLogsModel(
      makeId("cust-001"),
    );
    setLogFilter("comm");
    expect(filteredLogs.value.length).toBe(1);
    expect(filteredLogs.value[0].type).toBe("comm");
  });

  it("resets page to 1 when filter changes", () => {
    const { currentPage, setLogFilter } = useCustomerLogsModel(
      makeId("cust-001"),
    );
    currentPage.value = 2;
    setLogFilter("info");
    expect(currentPage.value).toBe(1);
  });

  it("totalCount reflects filtered results", () => {
    const { totalCount, setLogFilter } = useCustomerLogsModel(
      makeId("cust-001"),
    );
    expect(totalCount.value).toBe(4);
    setLogFilter("info");
    expect(totalCount.value).toBe(1);
  });

  it("totalPages is at least 1", () => {
    const { totalPages } = useCustomerLogsModel(makeId("cust-004"));
    expect(totalPages.value).toBe(1);
  });

  it("pagedLogs returns correct slice", () => {
    const { pagedLogs } = useCustomerLogsModel(makeId("cust-001"));
    expect(pagedLogs.value.length).toBe(4);
  });

  it("prevPage does not go below 1", () => {
    const { currentPage, prevPage } = useCustomerLogsModel(makeId("cust-001"));
    expect(currentPage.value).toBe(1);
    prevPage();
    expect(currentPage.value).toBe(1);
  });

  it("nextPage does not exceed totalPages", () => {
    const { currentPage, totalPages, nextPage } = useCustomerLogsModel(
      makeId("cust-001"),
    );
    expect(totalPages.value).toBe(1);
    nextPage();
    expect(currentPage.value).toBe(1);
  });
});
