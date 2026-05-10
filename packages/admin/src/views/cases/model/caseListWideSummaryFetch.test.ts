import { describe, expect, it } from "vitest";
import { buildCaseListRequestParams } from "./caseListWideSummaryFetch";
import type { CaseListFiltersState } from "../types";

describe("buildCaseListRequestParams", () => {
  it("maps filters to CaseListParams shape", () => {
    const filters: CaseListFiltersState = {
      scope: "group",
      search: "x",
      stage: "S4",
      owner: "u1",
      group: "",
      risk: "critical",
      validation: "",
      phase: "",
    };
    const params = buildCaseListRequestParams(filters, "c1", "high", 2, 40);
    expect(params).toMatchObject({
      scope: "group",
      search: "x",
      stage: "S4",
      owner: "u1",
      risk: "critical",
      riskBucket: "high",
      customerId: "c1",
      page: 2,
      limit: 40,
    });
    expect(params.group).toBeUndefined();
  });
});
