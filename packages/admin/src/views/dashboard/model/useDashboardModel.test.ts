import { flushPromises } from "@vue/test-utils";
import { nextTick } from "vue";
import { describe, expect, it, vi } from "vitest";
import { DashboardRepositoryError } from "./DashboardRepository";
import { useDashboardModel } from "./useDashboardModel";
import type {
  DashboardRepository,
  DashboardSummaryData,
} from "./dashboardTypes";

function createSummary(
  overrides: Partial<DashboardSummaryData> = {},
): DashboardSummaryData {
  return {
    scope: "mine",
    timeWindow: 7,
    summary: {
      todayTasks: 6,
      upcomingCases: 3,
      pendingSubmissions: 2,
      riskCases: 1,
    },
    panels: {
      todo: [],
      deadlines: [],
      submissions: [],
      risks: [],
    },
    ...overrides,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

describe("useDashboardModel", () => {
  it("loads dashboard data immediately", async () => {
    const repository: DashboardRepository = {
      getSummary: vi.fn().mockResolvedValue(createSummary()),
    };

    const model = useDashboardModel({ repository });
    await flushPromises();

    expect(repository.getSummary).toHaveBeenCalledWith({
      scope: "mine",
      timeWindow: 7,
    });
    expect(model.summary.value?.todayTasks).toBe(6);
    expect(model.loading.value).toBe(false);
    expect(model.errorCode.value).toBeNull();
  });

  it("reloads when scope and timeWindow change", async () => {
    const repository: DashboardRepository = {
      getSummary: vi
        .fn()
        .mockResolvedValueOnce(createSummary())
        .mockResolvedValueOnce(
          createSummary({
            scope: "all",
            timeWindow: 30,
            summary: {
              todayTasks: 20,
              upcomingCases: 11,
              pendingSubmissions: 4,
              riskCases: 3,
            },
          }),
        ),
    };

    const model = useDashboardModel({ repository });
    await flushPromises();

    model.scope.value = "all";
    model.timeWindow.value = 30;
    await nextTick();
    await flushPromises();

    expect(repository.getSummary).toHaveBeenLastCalledWith({
      scope: "all",
      timeWindow: 30,
    });
    expect(model.summary.value?.todayTasks).toBe(20);
  });

  it("maps unauthorized errors for the view layer", async () => {
    const repository: DashboardRepository = {
      getSummary: vi.fn().mockRejectedValue(
        new DashboardRepositoryError({
          code: "UNAUTHORIZED",
          message: "denied",
          status: 401,
        }),
      ),
    };

    const model = useDashboardModel({ repository });
    await flushPromises();

    expect(model.errorCode.value).toBe("unauthorized");
    expect(model.hasData.value).toBe(false);
  });

  it("keeps only the latest response when requests overlap", async () => {
    const first = deferred<DashboardSummaryData>();
    const second = deferred<DashboardSummaryData>();
    const repository: DashboardRepository = {
      getSummary: vi
        .fn<DashboardRepository["getSummary"]>()
        .mockImplementationOnce(() => first.promise)
        .mockImplementationOnce(() => second.promise),
    };

    const model = useDashboardModel({ repository });

    model.scope.value = "all";
    await nextTick();

    second.resolve(
      createSummary({
        scope: "all",
        summary: {
          todayTasks: 99,
          upcomingCases: 9,
          pendingSubmissions: 8,
          riskCases: 7,
        },
      }),
    );
    await flushPromises();

    first.resolve(createSummary());
    await flushPromises();

    expect(model.summary.value?.todayTasks).toBe(99);
    expect(model.scopeSummaryKey.value).toBe("dashboard.scopeSummary.all");
  });

  it("exposes group fallback metadata", async () => {
    const repository: DashboardRepository = {
      getSummary: vi.fn().mockResolvedValue(createSummary({ scope: "group" })),
    };

    const model = useDashboardModel({ repository });
    await flushPromises();

    model.scope.value = "group";
    await nextTick();
    await flushPromises();

    expect(model.isGroupFilterDisabled).toBe(true);
    expect(model.groupFilterHintKey).toBe("dashboard.filters.groupPending");
    expect(model.scopeSummaryKey.value).toBe(
      "dashboard.scopeSummary.groupFallback",
    );
  });
});
