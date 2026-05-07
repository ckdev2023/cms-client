import { describe, expect, it } from "vitest";
import { adaptLeadBulkResult } from "./LeadAdapterBulkMappers";

describe("adaptLeadBulkResult — bulk endpoint response shape", () => {
  it("reads updatedCount from {updatedCount} server response (bulk tags fix)", () => {
    expect(adaptLeadBulkResult({ updatedCount: 3 })).toEqual({
      updatedCount: 3,
    });
  });
  it("treats {updatedCount, errors} response as valid (bulk status)", () => {
    expect(adaptLeadBulkResult({ updatedCount: 2, errors: [] })).toEqual({
      updatedCount: 2,
    });
  });
  it("falls back to 0 when updatedCount missing", () => {
    expect(adaptLeadBulkResult({})).toEqual({ updatedCount: 0 });
  });
  it("treats array response as updatedCount=length (bulk export)", () => {
    expect(adaptLeadBulkResult([{ id: "L1" }, { id: "L2" }])).toEqual({
      updatedCount: 2,
    });
  });
  it("never returns null on unexpected response (defensive)", () => {
    expect(adaptLeadBulkResult(null)).toEqual({ updatedCount: 0 });
    expect(adaptLeadBulkResult(undefined)).toEqual({ updatedCount: 0 });
    expect(adaptLeadBulkResult("oops")).toEqual({ updatedCount: 0 });
  });
});
