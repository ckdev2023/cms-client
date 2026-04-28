import { flushPromises } from "@vue/test-utils";
import { nextTick, ref } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  BillingGroupFilter,
  BillingOwnerFilter,
  PaymentLogEntry,
} from "../types";
import type { PaymentLogResult } from "./BillingAdapters";
import type { PaymentLogDataSource } from "./useBillingPaymentLog";
import { useBillingPaymentLog } from "./useBillingPaymentLog";

const SAMPLE_ENTRY: PaymentLogEntry = {
  id: "p1",
  date: "2025-03-01",
  caseNo: "CAS-001",
  caseName: "Case A",
  amount: 50000,
  node: "着手金",
  receipt: true,
  recordStatus: "valid",
  operator: "admin",
  note: "",
};

const SAMPLE_LOG: PaymentLogResult = {
  items: [SAMPLE_ENTRY],
  entries: [SAMPLE_ENTRY],
  total: 1,
};

function createDataSource(
  overrides: Partial<PaymentLogDataSource> = {},
): PaymentLogDataSource {
  return {
    getPaymentLog: vi
      .fn<PaymentLogDataSource["getPaymentLog"]>()
      .mockResolvedValue(SAMPLE_LOG),
    ...overrides,
  };
}

function createDeps(
  overrides: Partial<{ dataSource: PaymentLogDataSource }> = {},
) {
  return {
    groupFilter: ref<BillingGroupFilter>(""),
    ownerFilter: ref<BillingOwnerFilter>(""),
    search: ref(""),
    dataSource: createDataSource(),
    ...overrides,
  };
}

describe("useBillingPaymentLog", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("loads data on mount", async () => {
    const deps = createDeps();
    const model = useBillingPaymentLog(deps);

    expect(model.loading.value).toBe(true);
    await flushPromises();

    expect(model.loading.value).toBe(false);
    expect(model.entries.value).toEqual(SAMPLE_LOG.items);
    expect(model.total.value).toBe(1);
    expect(model.error.value).toBeNull();
  });

  it("defaults recordStatus to valid", () => {
    const deps = createDeps();
    const model = useBillingPaymentLog(deps);
    expect(model.recordStatus.value).toBe("valid");
  });

  it("sets error on fetch failure", async () => {
    const dataSource = createDataSource({
      getPaymentLog: vi
        .fn()
        .mockRejectedValue(new Error("Fetch payment failed")),
    });
    const deps = createDeps({ dataSource });
    const model = useBillingPaymentLog(deps);
    await flushPromises();

    expect(model.loading.value).toBe(false);
    expect(model.error.value).toBe("Fetch payment failed");
    expect(model.entries.value).toEqual([]);
  });

  it("resets page to 1 when groupFilter changes", async () => {
    const deps = createDeps();
    const model = useBillingPaymentLog(deps);
    await flushPromises();

    model.page.value = 3;
    await nextTick();
    await flushPromises();

    deps.groupFilter.value = "tokyo-1";
    await nextTick();
    await flushPromises();

    expect(model.page.value).toBe(1);
  });

  it("resets page to 1 when ownerFilter changes", async () => {
    const deps = createDeps();
    const model = useBillingPaymentLog(deps);
    await flushPromises();

    model.page.value = 2;
    await nextTick();
    await flushPromises();

    deps.ownerFilter.value = "admin";
    await nextTick();
    await flushPromises();

    expect(model.page.value).toBe(1);
  });

  it("resets page to 1 when recordStatus changes", async () => {
    const deps = createDeps();
    const model = useBillingPaymentLog(deps);
    await flushPromises();

    model.page.value = 2;
    await nextTick();
    await flushPromises();

    model.recordStatus.value = "voided";
    await nextTick();
    await flushPromises();

    expect(model.page.value).toBe(1);
  });

  it("does NOT reset page on page-only change", async () => {
    const deps = createDeps();
    const model = useBillingPaymentLog(deps);
    await flushPromises();

    model.page.value = 2;
    await nextTick();
    await flushPromises();

    expect(model.page.value).toBe(2);
    expect(deps.dataSource.getPaymentLog).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 2 }),
    );
  });

  it("debounces search by 250ms", async () => {
    const deps = createDeps();
    useBillingPaymentLog(deps);
    await flushPromises();

    const callsBefore = (
      deps.dataSource.getPaymentLog as ReturnType<typeof vi.fn>
    ).mock.calls.length;

    deps.search.value = "test";
    await nextTick();

    vi.advanceTimersByTime(200);
    await nextTick();
    await flushPromises();
    expect(
      (deps.dataSource.getPaymentLog as ReturnType<typeof vi.fn>).mock.calls
        .length,
    ).toBe(callsBefore);

    vi.advanceTimersByTime(50);
    await nextTick();
    await flushPromises();
    expect(
      (deps.dataSource.getPaymentLog as ReturnType<typeof vi.fn>).mock.calls
        .length,
    ).toBeGreaterThan(callsBefore);
  });

  it("refresh re-fetches data", async () => {
    const deps = createDeps();
    const model = useBillingPaymentLog(deps);
    await flushPromises();

    const callsBefore = (
      deps.dataSource.getPaymentLog as ReturnType<typeof vi.fn>
    ).mock.calls.length;
    await model.refresh();

    expect(
      (deps.dataSource.getPaymentLog as ReturnType<typeof vi.fn>).mock.calls
        .length,
    ).toBeGreaterThan(callsBefore);
  });

  it("passes correct params including recordStatus to dataSource", async () => {
    const deps = createDeps();
    deps.groupFilter.value = "tokyo-1";
    deps.ownerFilter.value = "admin";

    useBillingPaymentLog(deps);
    await flushPromises();

    expect(deps.dataSource.getPaymentLog).toHaveBeenCalledWith(
      expect.objectContaining({
        recordStatus: "valid",
        groupId: "tokyo-1",
        ownerId: "admin",
        page: 1,
        limit: 20,
      }),
    );
  });

  it("defaults page=1 and limit=20", () => {
    const deps = createDeps();
    const model = useBillingPaymentLog(deps);

    expect(model.page.value).toBe(1);
    expect(model.limit.value).toBe(20);
  });

  it("exposes from and to date refs defaulting to empty", () => {
    const deps = createDeps();
    const model = useBillingPaymentLog(deps);
    expect(model.from.value).toBe("");
    expect(model.to.value).toBe("");
  });

  it("passes from/to params to dataSource when set", async () => {
    const deps = createDeps();
    const model = useBillingPaymentLog(deps);
    await flushPromises();

    model.from.value = "2026-01-01";
    model.to.value = "2026-04-30";
    await nextTick();
    await flushPromises();

    expect(deps.dataSource.getPaymentLog).toHaveBeenLastCalledWith(
      expect.objectContaining({
        from: "2026-01-01",
        to: "2026-04-30",
        page: 1,
      }),
    );
  });

  it("resets page to 1 when from changes", async () => {
    const deps = createDeps();
    const model = useBillingPaymentLog(deps);
    await flushPromises();

    model.page.value = 3;
    await nextTick();
    await flushPromises();

    model.from.value = "2026-01-01";
    await nextTick();
    await flushPromises();

    expect(model.page.value).toBe(1);
  });

  it("resets page to 1 when to changes", async () => {
    const deps = createDeps();
    const model = useBillingPaymentLog(deps);
    await flushPromises();

    model.page.value = 2;
    await nextTick();
    await flushPromises();

    model.to.value = "2026-12-31";
    await nextTick();
    await flushPromises();

    expect(model.page.value).toBe(1);
  });
});
