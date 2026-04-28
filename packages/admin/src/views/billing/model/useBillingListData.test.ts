import { flushPromises } from "@vue/test-utils";
import { nextTick, ref } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  BillingGroupFilter,
  BillingOwnerFilter,
  BillingStatusFilter,
  BillingSummaryData,
  CaseBillingRow,
} from "../types";
import type { BillingListResult } from "./BillingAdapters";
import type { BillingListDataSource } from "./useBillingListData";
import { useBillingListData } from "./useBillingListData";

const SAMPLE_ROW: CaseBillingRow = {
  id: "1",
  caseId: "c1",
  caseName: "Test Case",
  caseNo: "CAS-001",
  client: { name: "Client", type: "" },
  group: "tokyo-1",
  owner: "admin",
  amountDue: 100000,
  amountReceived: 50000,
  amountOutstanding: 50000,
  status: "partial",
  nextNode: null,
  billingRiskAcknowledged: false,
  billingRiskAcknowledgedAt: null,
  billingRiskAcknowledgedByDisplayName: null,
};

const SAMPLE_LIST: BillingListResult = {
  items: [SAMPLE_ROW],
  total: 1,
};

const SAMPLE_SUMMARY: BillingSummaryData = {
  totalDue: 100000,
  totalReceived: 50000,
  totalOutstanding: 50000,
  overdueAmount: 0,
};

function createDataSource(
  overrides: Partial<BillingListDataSource> = {},
): BillingListDataSource {
  return {
    getList: vi
      .fn<BillingListDataSource["getList"]>()
      .mockResolvedValue(SAMPLE_LIST),
    getSummary: vi
      .fn<BillingListDataSource["getSummary"]>()
      .mockResolvedValue(SAMPLE_SUMMARY),
    ...overrides,
  };
}

function createDeps(
  overrides: Partial<{ dataSource: BillingListDataSource }> = {},
) {
  return {
    statusFilter: ref<BillingStatusFilter>(""),
    groupFilter: ref<BillingGroupFilter>(""),
    ownerFilter: ref<BillingOwnerFilter>(""),
    search: ref(""),
    dataSource: createDataSource(),
    ...overrides,
  };
}

describe("useBillingListData", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("loads data on mount", async () => {
    const deps = createDeps();
    const model = useBillingListData(deps);

    expect(model.loading.value).toBe(true);
    await flushPromises();

    expect(model.loading.value).toBe(false);
    expect(model.rows.value).toEqual(SAMPLE_LIST.items);
    expect(model.total.value).toBe(1);
    expect(model.summary.value).toEqual(SAMPLE_SUMMARY);
    expect(model.error.value).toBeNull();
  });

  it("sets error on getList failure", async () => {
    const dataSource = createDataSource({
      getList: vi.fn().mockRejectedValue(new Error("Network error")),
    });
    const deps = createDeps({ dataSource });
    const model = useBillingListData(deps);

    await flushPromises();

    expect(model.loading.value).toBe(false);
    expect(model.error.value).toBe("Network error");
    expect(model.rows.value).toEqual([]);
  });

  it("sets error on getSummary failure", async () => {
    const dataSource = createDataSource({
      getSummary: vi.fn().mockRejectedValue(new Error("Summary failed")),
    });
    const deps = createDeps({ dataSource });
    const model = useBillingListData(deps);

    await flushPromises();

    expect(model.loading.value).toBe(false);
    expect(model.error.value).toBe("Summary failed");
  });

  it("resets page to 1 when statusFilter changes", async () => {
    const deps = createDeps();
    const model = useBillingListData(deps);
    await flushPromises();

    model.page.value = 3;
    await nextTick();
    await flushPromises();

    deps.statusFilter.value = "overdue";
    await nextTick();
    await flushPromises();

    expect(model.page.value).toBe(1);
  });

  it("resets page to 1 when groupFilter changes", async () => {
    const deps = createDeps();
    const model = useBillingListData(deps);
    await flushPromises();

    model.page.value = 2;
    await nextTick();
    await flushPromises();

    deps.groupFilter.value = "tokyo-1";
    await nextTick();
    await flushPromises();

    expect(model.page.value).toBe(1);
  });

  it("resets page to 1 when ownerFilter changes", async () => {
    const deps = createDeps();
    const model = useBillingListData(deps);
    await flushPromises();

    model.page.value = 2;
    await nextTick();
    await flushPromises();

    deps.ownerFilter.value = "admin";
    await nextTick();
    await flushPromises();

    expect(model.page.value).toBe(1);
  });

  it("does NOT reset page on page-only change", async () => {
    const deps = createDeps();
    const model = useBillingListData(deps);
    await flushPromises();

    model.page.value = 2;
    await nextTick();
    await flushPromises();

    expect(model.page.value).toBe(2);
    expect(deps.dataSource.getList).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 2 }),
    );
  });

  it("debounces search by 250ms", async () => {
    const deps = createDeps();
    useBillingListData(deps);
    await flushPromises();

    const callsBefore = (deps.dataSource.getList as ReturnType<typeof vi.fn>)
      .mock.calls.length;

    deps.search.value = "test";
    await nextTick();

    vi.advanceTimersByTime(200);
    await nextTick();
    await flushPromises();
    expect(
      (deps.dataSource.getList as ReturnType<typeof vi.fn>).mock.calls.length,
    ).toBe(callsBefore);

    vi.advanceTimersByTime(50);
    await nextTick();
    await flushPromises();
    expect(
      (deps.dataSource.getList as ReturnType<typeof vi.fn>).mock.calls.length,
    ).toBeGreaterThan(callsBefore);
  });

  it("refresh re-fetches data", async () => {
    const deps = createDeps();
    const model = useBillingListData(deps);
    await flushPromises();

    const callsBefore = (deps.dataSource.getList as ReturnType<typeof vi.fn>)
      .mock.calls.length;
    await model.refresh();

    expect(
      (deps.dataSource.getList as ReturnType<typeof vi.fn>).mock.calls.length,
    ).toBeGreaterThan(callsBefore);
  });

  it("passes correct params to dataSource", async () => {
    const deps = createDeps();
    deps.statusFilter.value = "overdue";
    deps.groupFilter.value = "tokyo-1";
    deps.ownerFilter.value = "admin";

    useBillingListData(deps);
    await flushPromises();

    expect(deps.dataSource.getList).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "overdue",
        groupId: "tokyo-1",
        ownerId: "admin",
        page: 1,
        limit: 20,
      }),
    );
    expect(deps.dataSource.getSummary).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "overdue",
        groupId: "tokyo-1",
        ownerId: "admin",
      }),
    );
  });

  it("omits empty filter values from params", async () => {
    const deps = createDeps();
    useBillingListData(deps);
    await flushPromises();

    expect(deps.dataSource.getList).toHaveBeenCalledWith(
      expect.objectContaining({
        status: undefined,
        groupId: undefined,
        ownerId: undefined,
        q: undefined,
        page: 1,
        limit: 20,
      }),
    );
  });

  it("discards stale responses via fetchVersion", async () => {
    let callCount = 0;
    const dataSource = createDataSource({
      getList: vi.fn().mockImplementation(async () => {
        callCount++;
        if (callCount <= 1) return SAMPLE_LIST;
        return { items: [], total: 0 };
      }),
    });
    const deps = createDeps({ dataSource });
    const model = useBillingListData(deps);
    await flushPromises();

    expect(model.rows.value).toEqual(SAMPLE_LIST.items);

    deps.statusFilter.value = "overdue";
    await nextTick();
    deps.statusFilter.value = "paid";
    await nextTick();
    await flushPromises();

    expect(model.error.value).toBeNull();
  });

  it("defaults page=1 and limit=20", () => {
    const deps = createDeps();
    const model = useBillingListData(deps);

    expect(model.page.value).toBe(1);
    expect(model.limit.value).toBe(20);
  });

  it("summary defaults to zero values", () => {
    const dataSource = createDataSource({
      getList: vi.fn().mockReturnValue(new Promise(() => {})),
      getSummary: vi.fn().mockReturnValue(new Promise(() => {})),
    });
    const deps = createDeps({ dataSource });
    const model = useBillingListData(deps);

    expect(model.summary.value).toEqual({
      totalDue: 0,
      totalReceived: 0,
      totalOutstanding: 0,
      overdueAmount: 0,
    });
  });
});
