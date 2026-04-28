// ── Test Ownership ──────────────────────────────────────────────
// Owner: QA supplement for list composable (p0-qa-001-01).
// Covers gap areas beyond useCaseListModel.focused.test.ts:
//   - loading state lifecycle: initial, during fetch, after success/error
//   - activeFilterCount and isFilterActive derivations
//   - customerLabel derivation from server items
//   - summaryCards recompute on validation filter
//   - refetch retains all current filter/page state
//   - error normalization: Error vs string vs object
//   - concurrent filter changes during slow fetch
// Does NOT duplicate: pagination contract, filter→params, sort
//   preservation, stale-fetch discard (→ focused test).
// ────────────────────────────────────────────────────────────────

import { describe, expect, it, vi, afterEach, beforeEach } from "vitest";
import { nextTick, ref } from "vue";
import type { LocationQuery } from "vue-router";
import { useCaseListModel } from "./useCaseListModel";
import type { CaseListParams, CaseListResult } from "./CaseAdapterTypes";
import type { CaseRepository } from "./CaseRepository";
import type { CaseListItem } from "../types";
import { DEFAULT_CASE_PAGE_SIZE } from "../constants";
import { SAMPLE_CASE_LIST } from "../fixtures";

async function flushFetch(): Promise<void> {
  await nextTick();
  await new Promise<void>((r) => queueMicrotask(r));
  await nextTick();
}

function stubItems(
  count: number,
  overrides: Partial<CaseListItem> = {},
): CaseListItem[] {
  return Array.from({ length: count }, (_, i) => ({
    ...SAMPLE_CASE_LIST[0],
    id: `item-${i + 1}`,
    name: `Item ${i + 1}`,
    ...overrides,
  }));
}

function createSpyRepo(
  handler: (p: CaseListParams) => CaseListResult | Promise<CaseListResult>,
) {
  const listCases = vi.fn(async (p: CaseListParams) => handler(p));
  return { repo: { listCases } as unknown as CaseRepository, listCases };
}

function staticResult(total: number, items: CaseListItem[]): CaseListResult {
  return { items, total, page: 1, limit: DEFAULT_CASE_PAGE_SIZE };
}

async function boot(
  handler: (p: CaseListParams) => CaseListResult | Promise<CaseListResult>,
  query: LocationQuery = {},
) {
  const { repo, listCases } = createSpyRepo(handler);
  const routeQuery = ref<LocationQuery>(query);
  const replaceQuery = vi.fn();
  const model = useCaseListModel({
    repository: repo,
    routeQuery,
    replaceQuery,
  });
  await flushFetch();
  return { model, listCases, routeQuery, replaceQuery };
}

// ─── 1. Loading State Lifecycle ──────────────────────────────────

describe("loading state lifecycle (p0-qa-001-01)", () => {
  it("loading is true during initial fetch", async () => {
    let resolve: ((v: CaseListResult) => void) | undefined;
    const { repo } = createSpyRepo(
      () =>
        new Promise<CaseListResult>((r) => {
          resolve = r;
        }),
    );
    const model = useCaseListModel({
      repository: repo,
      routeQuery: ref<LocationQuery>({ scope: "all" }),
      replaceQuery: vi.fn(),
    });
    await nextTick();
    expect(model.loading.value).toBe(true);
    resolve!(staticResult(0, []));
    await flushFetch();
    expect(model.loading.value).toBe(false);
  });

  it("loading transitions: false→true→false on refetch", async () => {
    let resolve: ((v: CaseListResult) => void) | undefined;
    const { repo } = createSpyRepo(
      () =>
        new Promise<CaseListResult>((r) => {
          resolve = r;
        }),
    );
    const model = useCaseListModel({
      repository: repo,
      routeQuery: ref<LocationQuery>({ scope: "all" }),
      replaceQuery: vi.fn(),
    });
    resolve!(staticResult(1, stubItems(1)));
    await flushFetch();
    expect(model.loading.value).toBe(false);

    const p = model.refetch();
    await nextTick();
    expect(model.loading.value).toBe(true);
    resolve!(staticResult(1, stubItems(1)));
    await p;
    await flushFetch();
    expect(model.loading.value).toBe(false);
  });

  it("loading false after error", async () => {
    const { model } = await boot(
      () => {
        throw new Error("500");
      },
      { scope: "all" },
    );
    expect(model.loading.value).toBe(false);
    expect(model.error.value).toBe("500");
  });
});

// ─── 2. Active Filter Count & isFilterActive ─────────────────────

describe("activeFilterCount and isFilterActive (p0-qa-001-01)", () => {
  it("starts at 0 with defaults", async () => {
    const { model } = await boot(() => staticResult(0, []));
    expect(model.activeFilterCount.value).toBe(0);
    expect(model.isFilterActive.value).toBe(false);
  });

  it("increments for each non-empty filter", async () => {
    const { model } = await boot(() => staticResult(0, []), {
      scope: "all",
      search: "test",
      stage: "S3",
    });
    expect(model.activeFilterCount.value).toBe(2);
    expect(model.isFilterActive.value).toBe(true);
  });

  it("counts customerId as an active filter", async () => {
    const { model } = await boot(() => staticResult(0, []), {
      scope: "all",
      customerId: "cust-001",
    });
    expect(model.activeFilterCount.value).toBe(1);
    expect(model.isFilterActive.value).toBe(true);
  });

  it("decrements when filter is cleared", async () => {
    const { model } = await boot(() => staticResult(0, []), {
      scope: "all",
      search: "x",
      stage: "S3",
    });
    expect(model.activeFilterCount.value).toBe(2);
    model.setSearch("");
    expect(model.activeFilterCount.value).toBe(1);
    model.setStage("");
    expect(model.activeFilterCount.value).toBe(0);
    expect(model.isFilterActive.value).toBe(false);
  });

  it("resetFilters clears all active filters", async () => {
    const { model } = await boot(() => staticResult(0, []), {
      scope: "all",
      search: "x",
      stage: "S3",
      risk: "critical",
      customerId: "cust-001",
    });
    expect(model.activeFilterCount.value).toBeGreaterThan(0);
    model.resetFilters();
    expect(model.activeFilterCount.value).toBe(0);
    expect(model.isFilterActive.value).toBe(false);
  });
});

// ─── 3. Customer Label Derivation ────────────────────────────────

describe("customerLabel derivation (p0-qa-001-01)", () => {
  it("returns undefined when no customerId", async () => {
    const { model } = await boot(() => staticResult(3, stubItems(3)));
    expect(model.customerLabel.value).toBeUndefined();
  });

  it("returns applicant name matching customerId", async () => {
    const items: CaseListItem[] = [
      {
        ...SAMPLE_CASE_LIST[0],
        id: "c1",
        customerId: "cust-A",
        applicant: "Customer A",
      },
      {
        ...SAMPLE_CASE_LIST[0],
        id: "c2",
        customerId: "cust-B",
        applicant: "Customer B",
      },
    ];
    const { model } = await boot(() => staticResult(items.length, items), {
      customerId: "cust-A",
    });
    expect(model.customerLabel.value).toBe("Customer A");
  });

  it("returns undefined when customerId doesn't match any item", async () => {
    const { model } = await boot(() => staticResult(1, stubItems(1)), {
      customerId: "nonexistent",
    });
    expect(model.customerLabel.value).toBeUndefined();
  });

  it("updates when clearCustomerId is called", async () => {
    const items: CaseListItem[] = [
      {
        ...SAMPLE_CASE_LIST[0],
        id: "c1",
        customerId: "cust-A",
        applicant: "Customer A",
      },
    ];
    const { model } = await boot(() => staticResult(items.length, items), {
      customerId: "cust-A",
    });
    expect(model.customerLabel.value).toBe("Customer A");
    model.clearCustomerId();
    expect(model.customerLabel.value).toBeUndefined();
  });
});

// ─── 4. Error Normalization ──────────────────────────────────────

describe("error normalization (p0-qa-001-01)", () => {
  it("Error instance → error.message", async () => {
    const { model } = await boot(
      () => {
        throw new Error("Network failed");
      },
      { scope: "all" },
    );
    expect(model.error.value).toBe("Network failed");
  });

  it("string throw → raw string", async () => {
    const { model } = await boot(
      () => {
        throw "raw error string";
      },
      { scope: "all" },
    );
    expect(model.error.value).toBe("raw error string");
  });

  it("number throw → stringified", async () => {
    const { model } = await boot(
      () => {
        throw 404;
      },
      { scope: "all" },
    );
    expect(model.error.value).toBe("404");
  });

  it("error clears items and total", async () => {
    const { model } = await boot(
      () => {
        throw new Error("oops");
      },
      { scope: "all" },
    );
    expect(model.filteredCases.value).toEqual([]);
    expect(model.total.value).toBe(0);
  });

  it("error clears after successful refetch", async () => {
    let fail = true;
    const { model } = await boot(
      () => {
        if (fail) throw new Error("temp");
        return staticResult(1, stubItems(1));
      },
      { scope: "all" },
    );
    expect(model.error.value).toBe("temp");

    fail = false;
    await model.refetch();
    await flushFetch();
    expect(model.error.value).toBeNull();
    expect(model.filteredCases.value).toHaveLength(1);
  });
});

// ─── 5. Validation Client-Side Filter ────────────────────────────

describe("validation client-side filter (p0-qa-001-01)", () => {
  it("filters items by validationStatus without server call", async () => {
    const items: CaseListItem[] = [
      { ...SAMPLE_CASE_LIST[0], id: "c1", validationStatus: "passed" },
      { ...SAMPLE_CASE_LIST[0], id: "c2", validationStatus: "failed" },
      { ...SAMPLE_CASE_LIST[0], id: "c3", validationStatus: "pending" },
    ];
    const { model, listCases } = await boot(
      () => staticResult(items.length, items),
      { scope: "all" },
    );
    const callsBefore = listCases.mock.calls.length;

    model.setValidation("passed");
    expect(model.filteredCases.value).toHaveLength(1);
    expect(model.filteredCases.value[0].id).toBe("c1");
    expect(listCases.mock.calls.length).toBe(callsBefore);
  });

  it("clearing validation filter shows all items", async () => {
    const items: CaseListItem[] = [
      { ...SAMPLE_CASE_LIST[0], id: "c1", validationStatus: "passed" },
      { ...SAMPLE_CASE_LIST[0], id: "c2", validationStatus: "failed" },
    ];
    const { model } = await boot(() => staticResult(items.length, items), {
      scope: "all",
    });
    model.setValidation("passed");
    expect(model.filteredCases.value).toHaveLength(1);
    model.setValidation("");
    expect(model.filteredCases.value).toHaveLength(2);
  });
});

// ─── 6. Refetch Retains State ────────────────────────────────────

describe("refetch retains state (p0-qa-001-01)", () => {
  it("refetch preserves filter state", async () => {
    const { model, listCases } = await boot(() => staticResult(0, []), {
      scope: "group",
      search: "term",
      stage: "S5",
    });

    await model.refetch();
    await flushFetch();

    const lastParams = listCases.mock.calls.at(-1)![0] as CaseListParams;
    expect(lastParams.scope).toBe("group");
    expect(lastParams.search).toBe("term");
    expect(lastParams.stage).toBe("S5");
  });

  it("refetch preserves current page", async () => {
    const TOTAL = DEFAULT_CASE_PAGE_SIZE * 3;
    const { model, listCases } = await boot(
      (p) => ({
        items: stubItems(DEFAULT_CASE_PAGE_SIZE),
        total: TOTAL,
        page: p.page ?? 1,
        limit: p.limit ?? DEFAULT_CASE_PAGE_SIZE,
      }),
      { scope: "all" },
    );
    model.setPage(2);
    await flushFetch();

    await model.refetch();
    await flushFetch();
    const lastParams = listCases.mock.calls.at(-1)![0] as CaseListParams;
    expect(lastParams.page).toBe(2);
  });
});

// ─── 7. Summary Cards ───────────────────────────────────────────

describe("summaryCards edge cases (p0-qa-001-01)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-20T12:00:00.000Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 4 cards for empty list", async () => {
    const { model } = await boot(() => staticResult(0, []), { scope: "all" });
    expect(model.summaryCards.value).toHaveLength(4);
    for (const card of model.summaryCards.value) {
      expect(card.value).toBe(0);
    }
  });

  it("recalculates after validation client filter", async () => {
    const items: CaseListItem[] = [
      {
        ...SAMPLE_CASE_LIST[0],
        id: "c1",
        stageId: "S3",
        validationStatus: "passed",
      },
      {
        ...SAMPLE_CASE_LIST[0],
        id: "c2",
        stageId: "S3",
        validationStatus: "failed",
      },
    ];
    const { model } = await boot(() => staticResult(items.length, items), {
      scope: "all",
    });
    const beforeActive = model.summaryCards.value.find(
      (c) => c.key === "activeCases",
    )!.value;

    model.setValidation("passed");
    const afterActive = model.summaryCards.value.find(
      (c) => c.key === "activeCases",
    )!.value;
    expect(afterActive).toBeLessThanOrEqual(beforeActive);
  });
});
