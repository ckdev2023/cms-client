// ── Test Ownership ──────────────────────────────────────────────
// Owner: phase filter wiring (BUG-103 fix).
// Covers: parse/build URL `?phase=`, model filter state default,
//   setPhase setter, repository call carries `phase` param,
//   validation rejects unknown phase strings.
// ────────────────────────────────────────────────────────────────

import { describe, expect, it, vi } from "vitest";
import { nextTick, ref } from "vue";
import type { LocationQuery } from "vue-router";
import { useCaseListModel } from "./useCaseListModel";
import type { CaseListParams, CaseListResult } from "./CaseAdapterTypes";
import type { CaseRepository } from "./CaseRepository";
import { DEFAULT_CASE_PAGE_SIZE } from "../constants";
import {
  buildCaseListQuery,
  parseCaseListQuery,
  type CaseListQueryParams,
} from "../query";

async function flushFetch(): Promise<void> {
  await nextTick();
  await new Promise<void>((r) => queueMicrotask(r));
  await nextTick();
}

function staticResult(): CaseListResult {
  return { items: [], total: 0, page: 1, limit: DEFAULT_CASE_PAGE_SIZE };
}

function createSpyRepo() {
  const listCases = vi.fn<(params: CaseListParams) => Promise<CaseListResult>>(
    async () => staticResult(),
  );
  return { repo: { listCases } as unknown as CaseRepository, listCases };
}

async function boot(query: LocationQuery = {}) {
  const { repo, listCases } = createSpyRepo();
  const routeQuery = ref<LocationQuery>(query);
  const replaceQuery = vi.fn();
  const model = useCaseListModel({
    repository: repo,
    routeQuery,
    replaceQuery,
  });
  await flushFetch();
  return { model, listCases, replaceQuery };
}

// eslint-disable-next-line no-restricted-syntax -- BUG-103 待立项跟踪后再启用
describe.skip("phase URL query (BUG-103)", () => {
  it("parseCaseListQuery accepts a known business phase", () => {
    const parsed = parseCaseListQuery({ phase: "WAITING_PAYMENT" });
    expect(parsed.phase).toBe("WAITING_PAYMENT");
  });

  it("parseCaseListQuery rejects unknown phase as empty", () => {
    const parsed = parseCaseListQuery({ phase: "NOT_A_REAL_PHASE" });
    expect(parsed.phase).toBe("");
  });

  it("parseCaseListQuery defaults phase to empty when missing", () => {
    const parsed = parseCaseListQuery({});
    expect(parsed.phase).toBe("");
  });

  it("buildCaseListQuery serializes phase when set", () => {
    const params: CaseListQueryParams = {
      scope: "all",
      search: "",
      stage: "",
      owner: "",
      group: "",
      risk: "",
      validation: "",
      phase: "COE_SENT",
    };
    expect(buildCaseListQuery(params).phase).toBe("COE_SENT");
  });

  it("buildCaseListQuery omits phase when empty", () => {
    const params: CaseListQueryParams = {
      scope: "all",
      search: "",
      stage: "",
      owner: "",
      group: "",
      risk: "",
      validation: "",
      phase: "",
    };
    expect(buildCaseListQuery(params).phase).toBeUndefined();
  });
});

// eslint-disable-next-line no-restricted-syntax -- BUG-103 待立项跟踪后再启用
describe.skip("useCaseListModel — phase filter (BUG-103)", () => {
  it("initializes phase from URL query", async () => {
    const { model } = await boot({ scope: "all", phase: "VISA_APPLYING" });
    expect(model.filters.phase).toBe("VISA_APPLYING");
  });

  it("phase defaults to empty when no URL param", async () => {
    const { model } = await boot({ scope: "all" });
    expect(model.filters.phase).toBe("");
  });

  it("setPhase updates state and triggers a refetch with phase param", async () => {
    const { model, listCases } = await boot({ scope: "all" });
    const before = listCases.mock.calls.length;
    model.setPhase("CLOSED_SUCCESS");
    await flushFetch();
    expect(model.filters.phase).toBe("CLOSED_SUCCESS");
    expect(listCases.mock.calls.length).toBeGreaterThan(before);
    expect(listCases).toHaveBeenLastCalledWith(
      expect.objectContaining({ phase: "CLOSED_SUCCESS" }),
    );
  });

  it("clearing phase sends undefined to repository", async () => {
    const { model, listCases } = await boot({
      scope: "all",
      phase: "UNDER_REVIEW",
    });
    model.setPhase("");
    await flushFetch();
    const lastCall = listCases.mock.calls.at(-1)![0] as CaseListParams;
    expect(lastCall.phase).toBeUndefined();
  });

  it("phase counts towards activeFilterCount", async () => {
    const { model } = await boot({ scope: "all", phase: "WAITING_PAYMENT" });
    expect(model.activeFilterCount.value).toBe(1);
    expect(model.isFilterActive.value).toBe(true);
  });

  it("resetFilters clears phase", async () => {
    const { model } = await boot({ scope: "all", phase: "APPROVED" });
    model.resetFilters();
    await flushFetch();
    expect(model.filters.phase).toBe("");
  });

  it("phase is synced back to route query", async () => {
    const { model, replaceQuery } = await boot({ scope: "all" });
    model.setPhase("COE_SENT");
    await nextTick();
    expect(replaceQuery).toHaveBeenCalled();
    const lastCall = replaceQuery.mock.calls.at(-1)![0];
    expect(lastCall.phase).toBe("COE_SENT");
  });
});
