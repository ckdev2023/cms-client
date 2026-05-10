import { describe, expect, it } from "vitest";
import { matchesCaseFilters } from "./useCaseListModel";
import { SAMPLE_CASE_LIST } from "../fixtures";
import type { CaseListFiltersState } from "../types";
import { DEFAULT_CASE_LIST_FILTERS } from "../constants";

const defaults: CaseListFiltersState = { ...DEFAULT_CASE_LIST_FILTERS };
const item = SAMPLE_CASE_LIST[0];

describe("matchesCaseFilters", () => {
  it("passes all defaults", () => {
    expect(matchesCaseFilters(item, defaults)).toBe(true);
  });

  it("filters by search (name)", () => {
    expect(
      matchesCaseFilters(item, { ...defaults, search: item.applicant }),
    ).toBe(true);
    expect(
      matchesCaseFilters(item, { ...defaults, search: "xyz-no-match" }),
    ).toBe(false);
  });

  it("filters by search (case ID)", () => {
    expect(matchesCaseFilters(item, { ...defaults, search: item.id })).toBe(
      true,
    );
  });

  it("filters by search (case number)", () => {
    const withNo = { ...item, caseNo: "CASE-FILTER-TEST-001" };
    expect(
      matchesCaseFilters(withNo, {
        ...defaults,
        search: "CASE-FILTER-TEST-001",
      }),
    ).toBe(true);
  });

  it("filters by stage", () => {
    expect(matchesCaseFilters(item, { ...defaults, stage: item.stageId })).toBe(
      true,
    );
    expect(matchesCaseFilters(item, { ...defaults, stage: "S9" })).toBe(
      item.stageId === "S9",
    );
  });

  it("filters by owner", () => {
    expect(matchesCaseFilters(item, { ...defaults, owner: item.ownerId })).toBe(
      true,
    );
    expect(
      matchesCaseFilters(item, { ...defaults, owner: "unknown-owner" }),
    ).toBe(false);
  });

  it("filters by group", () => {
    expect(matchesCaseFilters(item, { ...defaults, group: item.groupId })).toBe(
      true,
    );
    expect(
      matchesCaseFilters(item, { ...defaults, group: "nonexistent" }),
    ).toBe(false);
  });

  it("filters by risk", () => {
    expect(
      matchesCaseFilters(item, { ...defaults, risk: item.riskStatus }),
    ).toBe(true);
  });

  it("filters by validation", () => {
    expect(
      matchesCaseFilters(item, {
        ...defaults,
        validation: item.validationStatus,
      }),
    ).toBe(true);
  });

  it("filters by customerId", () => {
    expect(matchesCaseFilters(item, defaults, item.customerId)).toBe(true);
    expect(matchesCaseFilters(item, defaults, "CUS-9999-0000")).toBe(false);
  });

  it("passes when customerId is undefined", () => {
    expect(matchesCaseFilters(item, defaults, undefined)).toBe(true);
  });

  it("combines multiple filters", () => {
    const strict: CaseListFiltersState = {
      ...defaults,
      search: item.applicant,
      stage: item.stageId,
      owner: item.ownerId,
    };
    expect(matchesCaseFilters(item, strict)).toBe(true);

    const contradictory: CaseListFiltersState = {
      ...defaults,
      search: item.applicant,
      stage: "S9",
      owner: item.ownerId,
    };
    expect(matchesCaseFilters(item, contradictory)).toBe(item.stageId === "S9");
  });
});
