import { describe, expect, it } from "vitest";
import { computed } from "vue";
import { useCustomerCommsModel } from "./useCustomerCommsModel";

function makeId(id: string) {
  return computed(() => id);
}

describe("useCustomerCommsModel", () => {
  it("defaults to 'all' filter", () => {
    const { commFilter } = useCustomerCommsModel(makeId("cust-001"));
    expect(commFilter.value).toBe("all");
  });

  it("returns all comms for a customer with records", () => {
    const { allComms, filteredComms } = useCustomerCommsModel(
      makeId("cust-001"),
    );
    expect(allComms.value.length).toBe(3);
    expect(filteredComms.value.length).toBe(3);
  });

  it("returns empty array for a customer with no comms", () => {
    const { allComms, filteredComms } = useCustomerCommsModel(
      makeId("cust-004"),
    );
    expect(allComms.value).toHaveLength(0);
    expect(filteredComms.value).toHaveLength(0);
  });

  it("returns empty array for non-existent customer", () => {
    const { allComms } = useCustomerCommsModel(makeId("nonexistent"));
    expect(allComms.value).toHaveLength(0);
  });

  it("filters by internal visibility", () => {
    const { filteredComms, setCommFilter } = useCustomerCommsModel(
      makeId("cust-001"),
    );
    setCommFilter("internal");
    expect(filteredComms.value.length).toBe(1);
    expect(filteredComms.value[0].visibility).toBe("internal");
  });

  it("filters by customer visibility", () => {
    const { filteredComms, setCommFilter } = useCustomerCommsModel(
      makeId("cust-001"),
    );
    setCommFilter("customer");
    expect(filteredComms.value.length).toBe(2);
    filteredComms.value.forEach((c) => expect(c.visibility).toBe("customer"));
  });

  it("returns to all when filter is reset", () => {
    const { filteredComms, allComms, setCommFilter } = useCustomerCommsModel(
      makeId("cust-001"),
    );
    setCommFilter("internal");
    expect(filteredComms.value.length).toBeLessThan(allComms.value.length);
    setCommFilter("all");
    expect(filteredComms.value.length).toBe(allComms.value.length);
  });

  it("computes correct counts", () => {
    const { totalCount, internalCount, customerCount } = useCustomerCommsModel(
      makeId("cust-001"),
    );
    expect(totalCount.value).toBe(3);
    expect(internalCount.value).toBe(1);
    expect(customerCount.value).toBe(2);
  });

  it("counts are zero for empty customer", () => {
    const { totalCount, internalCount, customerCount } = useCustomerCommsModel(
      makeId("cust-004"),
    );
    expect(totalCount.value).toBe(0);
    expect(internalCount.value).toBe(0);
    expect(customerCount.value).toBe(0);
  });
});
