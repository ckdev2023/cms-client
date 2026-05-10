import { describe, expect, it, vi } from "vitest";
import { nextTick, ref } from "vue";
import type { LocationQuery } from "vue-router";
import { useCaseListModel } from "./useCaseListModel";
import type { CaseListParams, CaseListResult } from "./CaseAdapterTypes";
import { CASE_LIST_PARAM_KEYS } from "./CaseAdapterTypes";
import type { CaseRepository } from "./CaseRepository";
import type { CaseListItem } from "../types";
import { DEFAULT_CASE_PAGE_SIZE } from "../constants";
import { SAMPLE_CASE_LIST } from "../fixtures";

function lastPaginatedListParams(listCases: {
  mock: { calls: unknown[][] };
}): CaseListParams {
  const paginatedCalls = listCases.mock.calls
    .map((c) => c[0] as CaseListParams)
    .filter(
      (p) => (p.limit ?? DEFAULT_CASE_PAGE_SIZE) === DEFAULT_CASE_PAGE_SIZE,
    );
  return paginatedCalls.at(-1)!;
}

// ─── Async helpers ──────────────────────────────────────────────

async function flushFetch(): Promise<void> {
  await nextTick();
  await new Promise<void>((r) => queueMicrotask(r));
  await nextTick();
}

// ─── Spy repository factory ─────────────────────────────────────

function createSpyRepository(
  handler: (params: CaseListParams) => CaseListResult | Promise<CaseListResult>,
) {
  const listCases = vi.fn(async (params: CaseListParams) => handler(params));
  const repository = { listCases } as unknown as CaseRepository;
  return { repository, listCases };
}

function stubItems(count: number, prefix = "item"): CaseListItem[] {
  return Array.from({ length: count }, (_, i) => ({
    ...SAMPLE_CASE_LIST[0],
    id: `${prefix}-${i + 1}`,
    name: `${prefix} ${i + 1}`,
  }));
}

function staticResult(
  total: number,
  pageItems: CaseListItem[],
): CaseListResult {
  return { items: pageItems, total, page: 1, limit: DEFAULT_CASE_PAGE_SIZE };
}

async function createModel(
  handler: (params: CaseListParams) => CaseListResult | Promise<CaseListResult>,
  query: LocationQuery = {},
) {
  const { repository, listCases } = createSpyRepository(handler);
  const routeQuery = ref<LocationQuery>(query);
  const replaceQuery = vi.fn();
  const model = useCaseListModel({ repository, routeQuery, replaceQuery });
  await flushFetch();
  return { model, listCases, routeQuery, replaceQuery };
}

// ─── 1. Pagination Contract ──────────────────────────────────────

describe("pagination contract (p0-fe-004-03)", () => {
  it("every listCases call includes page and limit", async () => {
    const { listCases } = await createModel(() => staticResult(0, []));
    for (const call of listCases.mock.calls) {
      const params = call[0] as CaseListParams;
      expect(params).toHaveProperty("page");
      expect(params).toHaveProperty("limit");
      expect(typeof params.page).toBe("number");
      expect(typeof params.limit).toBe("number");
    }
  });

  it("initial fetch sends page=1 and limit=DEFAULT_CASE_PAGE_SIZE", async () => {
    const { listCases } = await createModel(
      () => staticResult(50, stubItems(DEFAULT_CASE_PAGE_SIZE)),
      { scope: "all" },
    );
    expect(listCases).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, limit: DEFAULT_CASE_PAGE_SIZE }),
    );
  });

  it("setPage(n) sends page=n in subsequent fetch", async () => {
    const TOTAL = DEFAULT_CASE_PAGE_SIZE * 5;
    const { model, listCases } = await createModel(
      (params) => ({
        items: stubItems(Math.min(params.limit ?? DEFAULT_CASE_PAGE_SIZE, 5)),
        total: TOTAL,
        page: params.page ?? 1,
        limit: params.limit ?? DEFAULT_CASE_PAGE_SIZE,
      }),
      { scope: "all" },
    );

    model.setPage(3);
    await flushFetch();
    const lastPageCall = lastPaginatedListParams(listCases);
    expect(lastPageCall.page).toBe(3);
    expect(lastPageCall.limit).toBe(DEFAULT_CASE_PAGE_SIZE);
  });

  it("totalPages rounds up correctly for non-divisible totals", async () => {
    const TOTAL = DEFAULT_CASE_PAGE_SIZE * 2 + 7;
    const { model } = await createModel(
      () => staticResult(TOTAL, stubItems(DEFAULT_CASE_PAGE_SIZE)),
      { scope: "all" },
    );
    expect(model.totalPages.value).toBe(
      Math.ceil(TOTAL / DEFAULT_CASE_PAGE_SIZE),
    );
  });

  it("totalPages is 1 when total=0", async () => {
    const { model } = await createModel(() => staticResult(0, []), {
      scope: "all",
    });
    expect(model.totalPages.value).toBe(1);
  });

  it("totalPages is 1 when total=1", async () => {
    const { model } = await createModel(() => staticResult(1, stubItems(1)), {
      scope: "all",
    });
    expect(model.totalPages.value).toBe(1);
  });

  it("totalPages matches exactly when total equals page boundary", async () => {
    const TOTAL = DEFAULT_CASE_PAGE_SIZE * 3;
    const { model } = await createModel(
      () => staticResult(TOTAL, stubItems(DEFAULT_CASE_PAGE_SIZE)),
      { scope: "all" },
    );
    expect(model.totalPages.value).toBe(3);
  });

  it("page clamps down when total shrinks below current page", async () => {
    let currentTotal = DEFAULT_CASE_PAGE_SIZE * 5;
    const { model } = await createModel(
      (params) => ({
        items: stubItems(Math.min(params.limit ?? DEFAULT_CASE_PAGE_SIZE, 3)),
        total: currentTotal,
        page: params.page ?? 1,
        limit: params.limit ?? DEFAULT_CASE_PAGE_SIZE,
      }),
      { scope: "all" },
    );

    model.setPage(5);
    await flushFetch();
    expect(model.page.value).toBe(5);

    currentTotal = DEFAULT_CASE_PAGE_SIZE * 2;
    model.setPage(999);
    expect(model.page.value).toBe(model.totalPages.value);
  });

  it("page resets to 1 when any server-affecting filter changes", async () => {
    const TOTAL = DEFAULT_CASE_PAGE_SIZE * 3;
    const { model } = await createModel(
      (params) => ({
        items: stubItems(DEFAULT_CASE_PAGE_SIZE),
        total: TOTAL,
        page: params.page ?? 1,
        limit: params.limit ?? DEFAULT_CASE_PAGE_SIZE,
      }),
      { scope: "all" },
    );

    model.setPage(3);
    await flushFetch();
    expect(model.page.value).toBe(3);

    model.setStage("S3");
    await flushFetch();
    expect(model.page.value).toBe(1);
  });

  it("page resets to 1 for each filter type individually", async () => {
    const TOTAL = DEFAULT_CASE_PAGE_SIZE * 3;
    const { model } = await createModel(
      (params) => ({
        items: stubItems(DEFAULT_CASE_PAGE_SIZE),
        total: TOTAL,
        page: params.page ?? 1,
        limit: params.limit ?? DEFAULT_CASE_PAGE_SIZE,
      }),
      { scope: "all" },
    );

    const filterActions: [string, () => void][] = [
      ["search", () => model.setSearch("test")],
      ["stage", () => model.setStage("S4")],
      ["owner", () => model.setOwner("tanaka")],
      ["group", () => model.setGroup("tokyo-1")],
      ["risk", () => model.setRisk("critical")],
      ["scope", () => model.setScope("group")],
    ];

    for (const [, action] of filterActions) {
      model.setPage(2);
      await flushFetch();
      action();
      await flushFetch();
      expect(model.page.value).toBe(1);
    }
  });

  it("error during paginated fetch preserves error state without crashing", async () => {
    let shouldFail = false;
    const { model } = await createModel(
      (params) => {
        if (shouldFail) throw new Error("Server error on page 2");
        return {
          items: stubItems(DEFAULT_CASE_PAGE_SIZE),
          total: DEFAULT_CASE_PAGE_SIZE * 3,
          page: params.page ?? 1,
          limit: params.limit ?? DEFAULT_CASE_PAGE_SIZE,
        };
      },
      { scope: "all" },
    );

    expect(model.error.value).toBeNull();
    expect(model.filteredCases.value.length).toBe(DEFAULT_CASE_PAGE_SIZE);

    shouldFail = true;
    model.setPage(2);
    await flushFetch();

    expect(model.error.value).toBe("Server error on page 2");
    expect(model.filteredCases.value).toEqual([]);
    expect(model.loading.value).toBe(false);
  });
});

// ─── 2. Server Item Order Preservation (Sorting) ─────────────────

describe("server item order preservation (p0-fe-004-03)", () => {
  it("items appear in exact server response order", async () => {
    const serverOrder = ["z-last", "a-first", "m-middle", "b-second"];
    const serverItems = serverOrder.map((id) => ({
      ...SAMPLE_CASE_LIST[0],
      id,
      name: `Case ${id}`,
    }));

    const { model } = await createModel(
      () => staticResult(serverItems.length, serverItems),
      { scope: "all" },
    );

    const resultIds = model.filteredCases.value.map((c) => c.id);
    expect(resultIds).toEqual(serverOrder);
  });

  it("client-side validation filter preserves server order within filtered subset", async () => {
    const items: CaseListItem[] = [
      { ...SAMPLE_CASE_LIST[0], id: "c1", validationStatus: "failed" },
      { ...SAMPLE_CASE_LIST[0], id: "c2", validationStatus: "passed" },
      { ...SAMPLE_CASE_LIST[0], id: "c3", validationStatus: "failed" },
      { ...SAMPLE_CASE_LIST[0], id: "c4", validationStatus: "pending" },
    ];

    const { model } = await createModel(
      () => staticResult(items.length, items),
      { scope: "all" },
    );

    model.setValidation("failed");
    const failedIds = model.filteredCases.value.map((c) => c.id);
    expect(failedIds).toEqual(["c1", "c3"]);
  });

  it("page change yields new server-ordered items without re-sorting", async () => {
    const TOTAL = DEFAULT_CASE_PAGE_SIZE * 2;
    const page1Items = stubItems(DEFAULT_CASE_PAGE_SIZE, "page1");
    const page2Items = [
      { ...SAMPLE_CASE_LIST[0], id: "page2-z", name: "Z" },
      { ...SAMPLE_CASE_LIST[0], id: "page2-a", name: "A" },
      { ...SAMPLE_CASE_LIST[0], id: "page2-m", name: "M" },
    ] satisfies CaseListItem[];

    const { model } = await createModel(
      (params) => ({
        items: (params.page ?? 1) === 1 ? page1Items : page2Items,
        total: TOTAL,
        page: params.page ?? 1,
        limit: params.limit ?? DEFAULT_CASE_PAGE_SIZE,
      }),
      { scope: "all" },
    );

    expect(model.filteredCases.value.map((c) => c.id)).toEqual(
      page1Items.map((c) => c.id),
    );

    model.setPage(2);
    await flushFetch();

    expect(model.filteredCases.value.map((c) => c.id)).toEqual([
      "page2-z",
      "page2-a",
      "page2-m",
    ]);
  });
});

// ─── 3. Filter→Repository Call Contract ──────────────────────────

describe("filter→repository call contract (p0-fe-004-03)", () => {
  it("each filter setter sends its value to repository as CaseListParams key", async () => {
    const { model, listCases } = await createModel(() => staticResult(0, []), {
      scope: "all",
    });

    model.setSearch("keyword");
    await flushFetch();
    expect(listCases).toHaveBeenLastCalledWith(
      expect.objectContaining({ search: "keyword" }),
    );

    model.setStage("S5");
    await flushFetch();
    expect(listCases).toHaveBeenLastCalledWith(
      expect.objectContaining({ stage: "S5" }),
    );

    model.setOwner("tanaka");
    await flushFetch();
    expect(listCases).toHaveBeenLastCalledWith(
      expect.objectContaining({ owner: "tanaka" }),
    );

    model.setGroup("osaka");
    await flushFetch();
    expect(listCases).toHaveBeenLastCalledWith(
      expect.objectContaining({ group: "osaka" }),
    );

    model.setRisk("critical");
    await flushFetch();
    expect(listCases).toHaveBeenLastCalledWith(
      expect.objectContaining({ risk: "critical" }),
    );

    model.setScope("group");
    await flushFetch();
    expect(listCases).toHaveBeenLastCalledWith(
      expect.objectContaining({ scope: "group" }),
    );
  });

  it("validation filter is NEVER sent to repository.listCases", async () => {
    const { model, listCases } = await createModel(
      () => staticResult(5, stubItems(5)),
      { scope: "all" },
    );

    model.setValidation("failed");
    await flushFetch();

    for (const call of listCases.mock.calls) {
      const params = call[0] as CaseListParams;
      expect(params).not.toHaveProperty("validation");
    }
  });

  it("empty string filters are sent as undefined to repository", async () => {
    const { model, listCases } = await createModel(() => staticResult(0, []), {
      scope: "all",
      stage: "S3",
    });

    model.setStage("");
    await flushFetch();
    const lastCall = listCases.mock.calls.at(-1)![0] as CaseListParams;
    expect(lastCall.stage).toBeUndefined();
  });

  it("customerId flows through to repository params", async () => {
    const { listCases } = await createModel(
      () => staticResult(1, stubItems(1)),
      { scope: "all", customerId: "cust-deep-link" },
    );
    expect(listCases).toHaveBeenCalledWith(
      expect.objectContaining({ customerId: "cust-deep-link" }),
    );
  });

  it("clearCustomerId removes customerId from subsequent repository calls", async () => {
    const { model, listCases } = await createModel(
      () => staticResult(1, stubItems(1)),
      { scope: "all", customerId: "cust-001" },
    );

    model.clearCustomerId();
    await flushFetch();

    const lastCall = listCases.mock.calls.at(-1)![0] as CaseListParams;
    expect(lastCall.customerId).toBeUndefined();
  });

  it("combined filter change triggers single refetch with all params", async () => {
    const { listCases } = await createModel(() => staticResult(0, []), {
      scope: "all",
      search: "test",
      stage: "S3",
      owner: "suzuki",
    });

    const callsAfterInit = listCases.mock.calls.length;
    const lastParams = listCases.mock.calls.at(-1)![0] as CaseListParams;
    expect(lastParams).toMatchObject({
      scope: "all",
      search: "test",
      stage: "S3",
      owner: "suzuki",
      page: 1,
      limit: DEFAULT_CASE_PAGE_SIZE,
    });
    expect(listCases.mock.calls.length).toBe(callsAfterInit);
  });

  it("resetFilters sends default scope with cleared filters", async () => {
    const { model, listCases } = await createModel(() => staticResult(0, []), {
      scope: "all",
      search: "test",
      stage: "S3",
    });

    model.resetFilters();
    await flushFetch();

    const lastCall = listCases.mock.calls.at(-1)![0] as CaseListParams;
    expect(lastCall.scope).toBe("mine");
    expect(lastCall.search).toBeUndefined();
    expect(lastCall.stage).toBeUndefined();
    expect(lastCall.owner).toBeUndefined();
    expect(lastCall.group).toBeUndefined();
    expect(lastCall.risk).toBeUndefined();
    expect(lastCall.customerId).toBeUndefined();
  });

  it("repository params only contain CASE_LIST_PARAM_KEYS fields", async () => {
    const { listCases } = await createModel(() => staticResult(0, []), {
      scope: "all",
      search: "x",
      stage: "S2",
      owner: "o",
      group: "g",
      risk: "critical",
    });

    const allowedKeys = new Set([...CASE_LIST_PARAM_KEYS]);
    for (const call of listCases.mock.calls) {
      const params = call[0] as Record<string, unknown>;
      for (const key of Object.keys(params)) {
        if (params[key] !== undefined) {
          expect(
            allowedKeys.has(key as (typeof CASE_LIST_PARAM_KEYS)[number]),
          ).toBe(true);
        }
      }
    }
  });
});
