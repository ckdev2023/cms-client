// ── Test Ownership ──────────────────────────────────────────────
// Owner: list composable (useCaseListModel) — filter state, route
//   sync, derived computeds, and its own matchesCaseFilters.
// Does NOT test: real repository HTTP wiring (→ CaseRepository.test.ts),
//   adapters, builders, or other composables.
// ────────────────────────────────────────────────────────────────

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ref, nextTick } from "vue";
import type { LocationQuery } from "vue-router";
import { useCaseListModel } from "./useCaseListModel";
import { SAMPLE_CASE_LIST } from "../fixtures";
import type { CaseListItem, CaseScope } from "../types";
import {
  DEFAULT_CASE_LIST_FILTERS,
  DEFAULT_CASE_PAGE_SIZE,
} from "../constants";
import { CASE_SUMMARY_CARD_KEYS } from "./CaseAdapterTypes";
import type { CaseListParams, CaseListResult } from "./CaseAdapterTypes";
import type { CaseRepository } from "./CaseRepository";

const item = SAMPLE_CASE_LIST[0];

// ─── Async helpers ──────────────────────────────────────────────

async function flushFetch(): Promise<void> {
  await nextTick();
  await new Promise<void>((r) => queueMicrotask(r));
  await nextTick();
}

// ─── Mock repository ────────────────────────────────────────────
// Simulates server-side filtering on SAMPLE_CASE_LIST so existing
// test assertions remain valid.

function createMockListCases(data: CaseListItem[] = SAMPLE_CASE_LIST) {
  return vi.fn(async (params: CaseListParams): Promise<CaseListResult> => {
    let filtered = [...data];
    if (params.scope && params.scope !== "all") {
      filtered = filtered.filter((c) =>
        c.visibleScopes.includes(params.scope as CaseScope),
      );
    }
    if (params.search) {
      const q = params.search.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.applicant.toLowerCase().includes(q) ||
          c.id.toLowerCase().includes(q) ||
          c.type.toLowerCase().includes(q),
      );
    }
    if (params.stage)
      filtered = filtered.filter((c) => c.stageId === params.stage);
    if (params.owner)
      filtered = filtered.filter((c) => c.ownerId === params.owner);
    if (params.group)
      filtered = filtered.filter((c) => c.groupId === params.group);
    if (params.risk)
      filtered = filtered.filter((c) => c.riskStatus === params.risk);
    if (params.customerId)
      filtered = filtered.filter((c) => c.customerId === params.customerId);

    const page = params.page ?? 1;
    const limit = params.limit ?? filtered.length;
    const start = (page - 1) * limit;
    const paged = filtered.slice(start, start + limit);

    return {
      items: paged,
      total: filtered.length,
      page,
      limit,
    };
  });
}

function createMockRepository(): {
  repository: CaseRepository;
  listCases: ReturnType<typeof createMockListCases>;
} {
  const listCases = createMockListCases();
  const repository = { listCases } as unknown as CaseRepository;
  return { repository, listCases };
}

// ─── useCaseListModel (composable) ──────────────────────────────

async function createModel(query: LocationQuery = {}) {
  const routeQuery = ref<LocationQuery>(query);
  const replaceQuery = vi.fn();
  const { repository, listCases } = createMockRepository();
  const model = useCaseListModel({
    repository,
    routeQuery,
    replaceQuery,
  });
  await flushFetch();
  return { model, routeQuery, replaceQuery, listCases };
}

const firstCustomerId = SAMPLE_CASE_LIST.find((c) => c.customerId)!.customerId!;

describe("useCaseListModel", () => {
  it("initializes with default filters when query is empty", async () => {
    const { model } = await createModel();
    expect(model.filters.scope).toBe("mine");
    expect(model.filters.search).toBe("");
    expect(model.customerId.value).toBeUndefined();
  });

  it("parses initial query params", async () => {
    const { model } = await createModel({
      scope: "all",
      search: item.applicant,
      customerId: firstCustomerId,
    });
    expect(model.filters.scope).toBe("all");
    expect(model.filters.search).toBe(item.applicant);
    expect(model.customerId.value).toBe(firstCustomerId);
  });

  it("filteredCases applies scope + filters via repository", async () => {
    const { model } = await createModel({ scope: "all" });
    const all = model.filteredCases.value;
    expect(all.length).toBe(SAMPLE_CASE_LIST.length);

    model.setSearch(item.applicant);
    await flushFetch();
    const filtered = model.filteredCases.value;
    expect(filtered.length).toBeGreaterThan(0);
    expect(
      filtered.every((c) =>
        c.applicant.toLowerCase().includes(item.applicant.toLowerCase()),
      ),
    ).toBe(true);
  });

  it("customerId filters to specific customer", async () => {
    const { model } = await createModel({
      scope: "all",
      customerId: firstCustomerId,
    });
    const result = model.filteredCases.value;
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((c) => c.customerId === firstCustomerId)).toBe(true);
  });

  it("clearCustomerId removes customer filter", async () => {
    const { model } = await createModel({
      scope: "all",
      customerId: firstCustomerId,
    });
    const before = model.filteredCases.value.length;
    model.clearCustomerId();
    await flushFetch();
    expect(model.customerId.value).toBeUndefined();
    expect(model.filteredCases.value.length).toBeGreaterThanOrEqual(before);
  });

  it("resetFilters restores defaults", async () => {
    const { model } = await createModel({
      scope: "all",
      search: "test",
      stage: "S2",
      customerId: firstCustomerId,
    });
    model.resetFilters();
    await flushFetch();
    expect(model.filters.scope).toBe(DEFAULT_CASE_LIST_FILTERS.scope);
    expect(model.filters.search).toBe("");
    expect(model.filters.stage).toBe("");
    expect(model.customerId.value).toBeUndefined();
  });

  it("activeFilterCount tracks number of active filters", async () => {
    const { model } = await createModel({ scope: "all" });
    expect(model.activeFilterCount.value).toBe(0);

    model.setSearch("test");
    expect(model.activeFilterCount.value).toBe(1);

    model.setStage("S2");
    expect(model.activeFilterCount.value).toBe(2);
  });

  it("isFilterActive reflects whether any filter is active", async () => {
    const { model } = await createModel({ scope: "all" });
    expect(model.isFilterActive.value).toBe(false);

    model.setOwner("suzuki");
    expect(model.isFilterActive.value).toBe(true);
  });

  it("syncs filters to route query on change", async () => {
    const { model, replaceQuery } = await createModel({ scope: "all" });
    model.setSearch(item.applicant);
    await nextTick();
    expect(replaceQuery).toHaveBeenCalled();
    const lastCall = replaceQuery.mock.calls.at(-1)![0];
    expect(lastCall.search).toBe(item.applicant);
  });

  it("syncs route query changes back to filters", async () => {
    const { model, routeQuery } = await createModel({ scope: "all" });
    routeQuery.value = { scope: "group", search: item.applicant };
    await flushFetch();
    expect(model.filters.scope).toBe("group");
    expect(model.filters.search).toBe(item.applicant);
  });

  /**
   * 复现 BUG：连续输入触发 router.replace 后，迟到的 routeQuery 回执
   * 用旧 URL 覆盖最新 filters，导致 search 输入只保留首字符。
   * 修复后：自己 push 出去的 query 即使作为 echo 迟到，也不应反向覆盖
   * 已经超前的 filters。
   */
  it("rapid setSearch + stale route echo does not clobber latest filters", async () => {
    const routeQuery = ref<LocationQuery>({ scope: "all" });
    const replaceQuery = vi.fn();
    const { repository } = createMockRepository();
    const model = useCaseListModel({
      repository,
      routeQuery,
      replaceQuery,
    });
    await flushFetch();

    model.setSearch("B");
    await nextTick();
    model.setSearch("BU");
    await nextTick();
    model.setSearch("BUG-111");
    await nextTick();

    expect(model.filters.search).toBe("BUG-111");

    routeQuery.value = { scope: "all", search: "B" };
    await flushFetch();

    expect(model.filters.search).toBe("BUG-111");

    routeQuery.value = { scope: "all", search: "BUG-111" };
    await flushFetch();

    expect(model.filters.search).toBe("BUG-111");
  });

  it("external route query change still updates filters", async () => {
    const { model, routeQuery } = await createModel({ scope: "all" });
    model.setSearch("local-typed");
    await nextTick();

    routeQuery.value = { scope: "all", search: "from-deep-link" };
    await flushFetch();

    expect(model.filters.search).toBe("from-deep-link");
  });

  it("scope setter updates scope", async () => {
    const { model } = await createModel();
    model.setScope("all");
    expect(model.filters.scope).toBe("all");
  });

  it("individual filter setters work", async () => {
    const { model } = await createModel({ scope: "all" });
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

  it("customerLabel resolves applicant name from data", async () => {
    const { model } = await createModel({
      scope: "all",
      customerId: firstCustomerId,
    });
    expect(model.customerLabel.value).toBeTruthy();
  });

  it("validation filter is applied client-side on server results", async () => {
    const { model } = await createModel({ scope: "all" });
    const allCount = model.filteredCases.value.length;

    model.setValidation("failed");
    const failedCount = model.filteredCases.value.length;
    expect(failedCount).toBeLessThan(allCount);
    expect(
      model.filteredCases.value.every((c) => c.validationStatus === "failed"),
    ).toBe(true);
  });

  it("exposes loading and error state", async () => {
    const { model } = await createModel({ scope: "all" });
    expect(model.loading.value).toBe(false);
    expect(model.error.value).toBeNull();
  });

  it("exposes total from server response", async () => {
    const { model } = await createModel({ scope: "all" });
    expect(model.total.value).toBe(SAMPLE_CASE_LIST.length);
  });

  it("passes server-affecting params to repository.listCases", async () => {
    const { listCases } = await createModel({
      scope: "group",
      search: "test",
      stage: "S3",
    });
    expect(listCases).toHaveBeenCalledWith(
      expect.objectContaining({
        scope: "group",
        search: "test",
        stage: "S3",
      }),
    );
  });

  it("handles repository errors gracefully", async () => {
    const failingRepo = {
      listCases: vi.fn(async () => {
        throw new Error("Network error");
      }),
    } as unknown as CaseRepository;

    const routeQuery = ref<LocationQuery>({ scope: "all" });
    const model = useCaseListModel({
      repository: failingRepo,
      routeQuery,
      replaceQuery: vi.fn(),
    });
    await flushFetch();

    expect(model.error.value).toBe("Network error");
    expect(model.filteredCases.value).toEqual([]);
    expect(model.loading.value).toBe(false);
  });

  it("refetch re-fetches from repository", async () => {
    const { model, listCases } = await createModel({ scope: "all" });
    const callsBefore = listCases.mock.calls.length;
    await model.refetch();
    expect(listCases.mock.calls.length).toBe(callsBefore + 1);
  });

  describe("pagination (p0-fe-004-02)", () => {
    /**
     * 创建一个带分页仓储 mock 的列表模型。
     *
     * 该 mock 会固定返回较大的 `total`，从而保证无论页大小如何都存在多页数据。
     * @param query - 初始路由 query
     * @returns 带分页仓储 mock 的列表模型与调用记录
     */
    async function createPaginatedModel(query: LocationQuery = {}) {
      const FAKE_TOTAL = DEFAULT_CASE_PAGE_SIZE * 3;
      const listCases = vi.fn(
        async (params: CaseListParams): Promise<CaseListResult> => {
          const page = params.page ?? 1;
          const limit = params.limit ?? DEFAULT_CASE_PAGE_SIZE;
          return {
            items: SAMPLE_CASE_LIST.slice(
              0,
              Math.min(limit, SAMPLE_CASE_LIST.length),
            ),
            total: FAKE_TOTAL,
            page,
            limit,
          };
        },
      );
      const repository = { listCases } as unknown as CaseRepository;
      const routeQuery = ref<LocationQuery>(query);
      const replaceQuery = vi.fn();
      const model = useCaseListModel({ repository, routeQuery, replaceQuery });
      await flushFetch();
      return { model, listCases, routeQuery, replaceQuery };
    }

    it("exposes page, pageSize, and totalPages", async () => {
      const { model } = await createModel({ scope: "all" });
      expect(model.page.value).toBe(1);
      expect(model.pageSize).toBe(DEFAULT_CASE_PAGE_SIZE);
      expect(model.totalPages.value).toBeGreaterThanOrEqual(1);
    });

    it("totalPages computes from total and pageSize", async () => {
      const { model } = await createModel({ scope: "all" });
      const expected = Math.ceil(
        SAMPLE_CASE_LIST.length / DEFAULT_CASE_PAGE_SIZE,
      );
      expect(model.totalPages.value).toBe(expected);
    });

    it("passes page and limit to repository.listCases", async () => {
      const { listCases } = await createModel({ scope: "all" });
      expect(listCases).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 1,
          limit: DEFAULT_CASE_PAGE_SIZE,
        }),
      );
    });

    it("setPage changes page and refetches", async () => {
      const { model, listCases } = await createPaginatedModel({ scope: "all" });
      const callsBefore = listCases.mock.calls.length;
      model.setPage(2);
      await flushFetch();
      expect(model.page.value).toBe(2);
      expect(listCases.mock.calls.length).toBeGreaterThan(callsBefore);
    });

    it("setPage clamps to valid range", async () => {
      const { model } = await createPaginatedModel({ scope: "all" });
      model.setPage(0);
      expect(model.page.value).toBe(1);
      model.setPage(9999);
      expect(model.page.value).toBe(model.totalPages.value);
    });

    it("filter change resets page to 1", async () => {
      const { model } = await createPaginatedModel({ scope: "all" });
      model.setPage(2);
      await flushFetch();
      expect(model.page.value).toBe(2);

      model.setSearch("test");
      await flushFetch();
      expect(model.page.value).toBe(1);
    });

    it("resetFilters resets page to 1", async () => {
      const { model } = await createPaginatedModel({ scope: "all" });
      model.setPage(2);
      await flushFetch();
      expect(model.page.value).toBe(2);
      model.resetFilters();
      await flushFetch();
      expect(model.page.value).toBe(1);
    });
  });

  describe("summaryCards (p0-fe-002b-06)", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-04-20T12:00:00.000Z"));
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it("exposes summaryCards computed with 4 cards", async () => {
      const { model } = await createModel({ scope: "all" });
      expect(model.summaryCards.value).toHaveLength(4);
      expect(model.summaryCards.value.map((c) => c.key)).toEqual([
        ...CASE_SUMMARY_CARD_KEYS,
      ]);
    });

    it("summaryCards reflects filteredCases", async () => {
      const { model } = await createModel({ scope: "all" });
      const allCards = model.summaryCards.value;
      const allActive = allCards.find((c) => c.key === "activeCases")!.value;

      model.setStage("S9");
      await flushFetch();
      const s9Cards = model.summaryCards.value;
      const s9Active = s9Cards.find((c) => c.key === "activeCases")!.value;
      expect(s9Active).toBe(0);
      expect(s9Active).toBeLessThan(allActive);
    });

    it("summaryCards updates when filters change", async () => {
      const { model } = await createModel({ scope: "all" });
      const before = model.summaryCards.value.find(
        (c) => c.key === "activeCases",
      )!.value;

      model.setStage("S3");
      await flushFetch();
      const after = model.summaryCards.value.find(
        (c) => c.key === "activeCases",
      )!.value;
      expect(after).toBeLessThanOrEqual(before);
    });
  });
});
