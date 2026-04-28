import { describe, expect, it, vi } from "vitest";
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
  const model = useCaseListModel({
    repository,
    routeQuery,
    replaceQuery: vi.fn(),
  });
  await flushFetch();
  return { model, listCases };
}

describe("server response contract (p0-fe-004-03)", () => {
  it("total from CaseListResult drives model.total", async () => {
    const { model } = await createModel(
      () => staticResult(42, stubItems(DEFAULT_CASE_PAGE_SIZE)),
      { scope: "all" },
    );
    expect(model.total.value).toBe(42);
  });

  it("items from CaseListResult become filteredCases (without validation filter)", async () => {
    const items = stubItems(7, "srv");
    const { model } = await createModel(() => staticResult(7, items), {
      scope: "all",
    });
    expect(model.filteredCases.value).toHaveLength(7);
    expect(model.filteredCases.value.map((c) => c.id)).toEqual(
      items.map((c) => c.id),
    );
  });

  it("empty server response yields empty filteredCases and total=0", async () => {
    const { model } = await createModel(() => staticResult(0, []), {
      scope: "all",
    });
    expect(model.filteredCases.value).toEqual([]);
    expect(model.total.value).toBe(0);
    expect(model.totalPages.value).toBe(1);
  });

  it("stale fetch is discarded when a newer fetch completes first", async () => {
    let callCount = 0;
    const { repository } = createSpyRepository(async () => {
      const thisCall = ++callCount;
      if (thisCall === 1) {
        await new Promise((r) => setTimeout(r, 100));
        return staticResult(99, stubItems(1, "stale"));
      }
      return staticResult(3, stubItems(3, "fresh"));
    });

    const routeQuery = ref<LocationQuery>({ scope: "all" });
    const model = useCaseListModel({
      repository,
      routeQuery,
      replaceQuery: vi.fn(),
    });

    model.setSearch("trigger-race");
    await new Promise((r) => setTimeout(r, 150));
    await flushFetch();

    expect(
      model.filteredCases.value.every((c) => c.id.startsWith("fresh")),
    ).toBe(true);
  });

  it("error response sets error state and clears items", async () => {
    const { model } = await createModel(
      () => {
        throw new Error("500 Internal");
      },
      { scope: "all" },
    );
    expect(model.error.value).toBe("500 Internal");
    expect(model.filteredCases.value).toEqual([]);
    expect(model.total.value).toBe(0);
  });

  it("non-Error throw is stringified", async () => {
    const { model } = await createModel(
      () => {
        throw "raw string error";
      },
      { scope: "all" },
    );
    expect(model.error.value).toBe("raw string error");
  });

  it("successful fetch after error clears error state", async () => {
    let shouldFail = true;
    const { model } = await createModel(
      () => {
        if (shouldFail) throw new Error("temp fail");
        return staticResult(1, stubItems(1));
      },
      { scope: "all" },
    );

    expect(model.error.value).toBe("temp fail");

    shouldFail = false;
    await model.refetch();
    await flushFetch();

    expect(model.error.value).toBeNull();
    expect(model.filteredCases.value).toHaveLength(1);
  });

  it("loading is true during fetch and false after", async () => {
    let resolve: (() => void) | undefined;
    const { repository } = createSpyRepository(() => {
      return new Promise<CaseListResult>((r) => {
        resolve = () => r(staticResult(1, stubItems(1)));
      });
    });

    const routeQuery = ref<LocationQuery>({ scope: "all" });
    const model = useCaseListModel({
      repository,
      routeQuery,
      replaceQuery: vi.fn(),
    });

    await nextTick();
    expect(model.loading.value).toBe(true);

    resolve!();
    await flushFetch();
    expect(model.loading.value).toBe(false);
  });
});

describe("pagination + filter combined lifecycle (p0-fe-004-03)", () => {
  it("filter change on page>1 resets page then fetches with page=1", async () => {
    const callLog: CaseListParams[] = [];
    const { model } = await createModel(
      (params) => {
        callLog.push({ ...params });
        return {
          items: stubItems(DEFAULT_CASE_PAGE_SIZE),
          total: DEFAULT_CASE_PAGE_SIZE * 5,
          page: params.page ?? 1,
          limit: params.limit ?? DEFAULT_CASE_PAGE_SIZE,
        };
      },
      { scope: "all" },
    );

    model.setPage(4);
    await flushFetch();
    const pageCall = callLog.at(-1)!;
    expect(pageCall.page).toBe(4);

    model.setStage("S7");
    await flushFetch();
    const filterCall = callLog.at(-1)!;
    expect(filterCall.page).toBe(1);
    expect(filterCall.stage).toBe("S7");
  });

  it("rapid filter changes coalesce: final fetch uses latest values", async () => {
    const callLog: CaseListParams[] = [];
    const { model } = await createModel(
      (params) => {
        callLog.push({ ...params });
        return staticResult(0, []);
      },
      { scope: "all" },
    );

    const initialCalls = callLog.length;

    model.setSearch("first");
    model.setSearch("second");
    model.setSearch("third");
    await flushFetch();

    const postFilterCalls = callLog.slice(initialCalls);
    const lastCall = postFilterCalls.at(-1)!;
    expect(lastCall.search).toBe("third");
  });

  it("refetch keeps current page", async () => {
    const total = DEFAULT_CASE_PAGE_SIZE * 3;
    const { model, listCases } = await createModel(
      (params) => ({
        items: stubItems(DEFAULT_CASE_PAGE_SIZE),
        total,
        page: params.page ?? 1,
        limit: params.limit ?? DEFAULT_CASE_PAGE_SIZE,
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
