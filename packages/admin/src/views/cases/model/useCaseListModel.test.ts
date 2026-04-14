import { describe, expect, it, vi } from "vitest";
import { ref, nextTick } from "vue";
import type { LocationQuery } from "vue-router";
import { matchesCaseFilters, useCaseListModel } from "./useCaseListModel";
import { SAMPLE_CASE_LIST } from "../fixtures";
import type { CaseListFiltersState } from "../types";
import { DEFAULT_CASE_LIST_FILTERS } from "../constants";

const defaults: CaseListFiltersState = { ...DEFAULT_CASE_LIST_FILTERS };
const item = SAMPLE_CASE_LIST[0];

// ─── matchesCaseFilters (pure function) ─────────────────────────

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

// ─── useCaseListModel (composable) ──────────────────────────────

function createModel(query: LocationQuery = {}) {
  const routeQuery = ref<LocationQuery>(query);
  const replaceQuery = vi.fn();
  const model = useCaseListModel({
    allCases: () => SAMPLE_CASE_LIST,
    routeQuery,
    replaceQuery,
  });
  return { model, routeQuery, replaceQuery };
}

const firstCustomerId = SAMPLE_CASE_LIST.find((c) => c.customerId)!.customerId!;

describe("useCaseListModel", () => {
  it("initializes with default filters when query is empty", () => {
    const { model } = createModel();
    expect(model.filters.scope).toBe("mine");
    expect(model.filters.search).toBe("");
    expect(model.customerId.value).toBeUndefined();
  });

  it("parses initial query params", () => {
    const { model } = createModel({
      scope: "all",
      search: item.applicant,
      customerId: firstCustomerId,
    });
    expect(model.filters.scope).toBe("all");
    expect(model.filters.search).toBe(item.applicant);
    expect(model.customerId.value).toBe(firstCustomerId);
  });

  it("filteredCases applies scope + filters", () => {
    const { model } = createModel({ scope: "all" });
    const all = model.filteredCases.value;
    expect(all.length).toBe(SAMPLE_CASE_LIST.length);

    model.setSearch(item.applicant);
    const filtered = model.filteredCases.value;
    expect(filtered.length).toBeGreaterThan(0);
    expect(
      filtered.every((c) =>
        c.applicant.toLowerCase().includes(item.applicant.toLowerCase()),
      ),
    ).toBe(true);
  });

  it("customerId filters to specific customer", () => {
    const { model } = createModel({
      scope: "all",
      customerId: firstCustomerId,
    });
    const result = model.filteredCases.value;
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((c) => c.customerId === firstCustomerId)).toBe(true);
  });

  it("clearCustomerId removes customer filter", () => {
    const { model } = createModel({
      scope: "all",
      customerId: firstCustomerId,
    });
    const before = model.filteredCases.value.length;
    model.clearCustomerId();
    expect(model.customerId.value).toBeUndefined();
    expect(model.filteredCases.value.length).toBeGreaterThanOrEqual(before);
  });

  it("resetFilters restores defaults", () => {
    const { model } = createModel({
      scope: "all",
      search: "test",
      stage: "S2",
      customerId: firstCustomerId,
    });
    model.resetFilters();
    expect(model.filters.scope).toBe(DEFAULT_CASE_LIST_FILTERS.scope);
    expect(model.filters.search).toBe("");
    expect(model.filters.stage).toBe("");
    expect(model.customerId.value).toBeUndefined();
  });

  it("activeFilterCount tracks number of active filters", () => {
    const { model } = createModel({ scope: "all" });
    expect(model.activeFilterCount.value).toBe(0);

    model.setSearch("test");
    expect(model.activeFilterCount.value).toBe(1);

    model.setStage("S2");
    expect(model.activeFilterCount.value).toBe(2);
  });

  it("isFilterActive reflects whether any filter is active", () => {
    const { model } = createModel({ scope: "all" });
    expect(model.isFilterActive.value).toBe(false);

    model.setOwner("suzuki");
    expect(model.isFilterActive.value).toBe(true);
  });

  it("syncs filters to route query on change", async () => {
    const { model, replaceQuery } = createModel({ scope: "all" });
    model.setSearch(item.applicant);
    await nextTick();
    expect(replaceQuery).toHaveBeenCalled();
    const lastCall = replaceQuery.mock.calls.at(-1)![0];
    expect(lastCall.search).toBe(item.applicant);
  });

  it("syncs route query changes back to filters", async () => {
    const { model, routeQuery } = createModel({ scope: "all" });
    routeQuery.value = { scope: "group", search: item.applicant };
    await nextTick();
    expect(model.filters.scope).toBe("group");
    expect(model.filters.search).toBe(item.applicant);
  });

  it("scope setter updates scope", () => {
    const { model } = createModel();
    model.setScope("all");
    expect(model.filters.scope).toBe("all");
  });

  it("individual filter setters work", () => {
    const { model } = createModel({ scope: "all" });
    model.setStage("S3");
    expect(model.filters.stage).toBe("S3");
    model.setOwner("tanaka");
    expect(model.filters.owner).toBe("tanaka");
    model.setGroup("osaka");
    expect(model.filters.group).toBe("osaka");
    model.setRisk("critical");
    expect(model.filters.risk).toBe("critical");
    model.setValidation("failed");
    expect(model.filters.validation).toBe("failed");
  });

  it("customerLabel resolves applicant name from data", () => {
    const { model } = createModel({
      scope: "all",
      customerId: firstCustomerId,
    });
    expect(model.customerLabel.value).toBeTruthy();
  });
});
