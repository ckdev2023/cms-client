import { describe, expect, it, vi } from "vitest";
import { nextTick, ref } from "vue";
import type { LocationQuery } from "vue-router";
import { useCaseListModel } from "./useCaseListModel";
import type { CaseListParams, CaseListResult } from "./CaseAdapterTypes";
import type { CaseRepository } from "./CaseRepository";
import type { CaseListItem } from "../types";
import {
  CASE_LIST_SUMMARY_BASIS_CAP,
  DEFAULT_CASE_PAGE_SIZE,
} from "../constants";
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
  const model = useCaseListModel({
    repository: repo,
    routeQuery,
    replaceQuery: vi.fn(),
  });
  await flushFetch();
  return { model, listCases };
}

describe("summaryCards wide-list basis (pagination)", () => {
  it("second listCases widens summary basis when total exceeds first page", async () => {
    const callLog: CaseListParams[] = [];
    const { model, listCases } = await boot(
      (params) => {
        callLog.push({ ...params });
        const limit = params.limit ?? DEFAULT_CASE_PAGE_SIZE;
        const page = params.page ?? 1;
        if (page === 1 && limit === DEFAULT_CASE_PAGE_SIZE) {
          return {
            items: stubItems(DEFAULT_CASE_PAGE_SIZE),
            total: 35,
            page: 1,
            limit,
          };
        }
        if (page === 1 && limit === 35) {
          return {
            items: stubItems(35),
            total: 35,
            page: 1,
            limit: 35,
          };
        }
        return staticResult(0, []);
      },
      { scope: "all" },
    );

    expect(listCases.mock.calls.length).toBe(2);
    expect(callLog.at(-1)).toMatchObject({
      page: 1,
      limit: 35,
    });
    const active = model.summaryCards.value.find(
      (c) => c.key === "activeCases",
    );
    expect(active?.value).toBe(35);
  });

  it("wide fetch uses CASE_LIST_SUMMARY_BASIS_CAP when total exceeds cap", async () => {
    const TOTAL = CASE_LIST_SUMMARY_BASIS_CAP + 50;
    let secondLimit = 0;
    const { listCases } = await boot(
      (params) => {
        const lim = params.limit ?? DEFAULT_CASE_PAGE_SIZE;
        const page = params.page ?? 1;
        if (page === 1 && lim === DEFAULT_CASE_PAGE_SIZE) {
          return {
            items: stubItems(DEFAULT_CASE_PAGE_SIZE),
            total: TOTAL,
            page: 1,
            limit: lim,
          };
        }
        secondLimit = lim;
        return {
          items: stubItems(Math.min(lim, 5)),
          total: TOTAL,
          page: 1,
          limit: lim,
        };
      },
      { scope: "all" },
    );

    expect(secondLimit).toBe(CASE_LIST_SUMMARY_BASIS_CAP);
    expect(listCases.mock.calls.length).toBeGreaterThanOrEqual(2);
  });
});
