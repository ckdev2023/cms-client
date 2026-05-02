// ── Test Ownership ──────────────────────────────────────────────
// Owner: BUG-202 — invalid stage deeplink → onInvalidStage callback.
// Covers: initial query + route change with invalid / valid / empty stage.
// ────────────────────────────────────────────────────────────────

import { describe, expect, it, vi } from "vitest";
import { ref, nextTick } from "vue";
import type { LocationQuery } from "vue-router";
import { useCaseListModel } from "./useCaseListModel";
import { SAMPLE_CASE_LIST } from "../fixtures";
import type { CaseListItem } from "../types";
import type { CaseListParams, CaseListResult } from "./CaseAdapterTypes";
import type { CaseRepository } from "./CaseRepository";

async function flushFetch(): Promise<void> {
  await nextTick();
  await new Promise<void>((r) => queueMicrotask(r));
  await nextTick();
}

function createMockRepository(): CaseRepository {
  return {
    listCases: vi.fn(
      async (params: CaseListParams): Promise<CaseListResult> => ({
        items: SAMPLE_CASE_LIST as CaseListItem[],
        total: SAMPLE_CASE_LIST.length,
        page: params.page ?? 1,
        limit: params.limit ?? SAMPLE_CASE_LIST.length,
      }),
    ),
  } as unknown as CaseRepository;
}

describe("useCaseListModel — invalid stage toast (BUG-202)", () => {
  it("calls onInvalidStage when initial query has invalid stage", async () => {
    const onInvalidStage = vi.fn();
    const routeQuery = ref<LocationQuery>({ stage: "BOGUS" });
    useCaseListModel({
      repository: createMockRepository(),
      routeQuery,
      replaceQuery: vi.fn(),
      onInvalidStage,
    });
    await flushFetch();
    expect(onInvalidStage).toHaveBeenCalledWith("BOGUS");
  });

  it("does not call onInvalidStage for valid stage", async () => {
    const onInvalidStage = vi.fn();
    const routeQuery = ref<LocationQuery>({ stage: "S3" });
    useCaseListModel({
      repository: createMockRepository(),
      routeQuery,
      replaceQuery: vi.fn(),
      onInvalidStage,
    });
    await flushFetch();
    expect(onInvalidStage).not.toHaveBeenCalled();
  });

  it("does not call onInvalidStage when stage is empty", async () => {
    const onInvalidStage = vi.fn();
    const routeQuery = ref<LocationQuery>({});
    useCaseListModel({
      repository: createMockRepository(),
      routeQuery,
      replaceQuery: vi.fn(),
      onInvalidStage,
    });
    await flushFetch();
    expect(onInvalidStage).not.toHaveBeenCalled();
  });

  it("calls onInvalidStage on route change with invalid stage", async () => {
    const onInvalidStage = vi.fn();
    const routeQuery = ref<LocationQuery>({ scope: "all" });
    useCaseListModel({
      repository: createMockRepository(),
      routeQuery,
      replaceQuery: vi.fn(),
      onInvalidStage,
    });
    await flushFetch();
    expect(onInvalidStage).not.toHaveBeenCalled();

    routeQuery.value = { scope: "all", stage: "INVALID_STAGE" };
    await flushFetch();
    expect(onInvalidStage).toHaveBeenCalledWith("INVALID_STAGE");
  });

  it("still falls back stage to empty string for invalid value", async () => {
    const onInvalidStage = vi.fn();
    const routeQuery = ref<LocationQuery>({ stage: "NOPE" });
    const model = useCaseListModel({
      repository: createMockRepository(),
      routeQuery,
      replaceQuery: vi.fn(),
      onInvalidStage,
    });
    await flushFetch();
    expect(model.filters.stage).toBe("");
  });
});
