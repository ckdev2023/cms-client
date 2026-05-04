import { flushPromises } from "@vue/test-utils";
import { nextTick } from "vue";
import { describe, expect, it, vi } from "vitest";
import { DashboardRepositoryError } from "./DashboardRepository";
import { useDashboardModel } from "./useDashboardModel";
import type {
  DashboardGroupOption,
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

function createGroupOptions(
  overrides: Partial<DashboardGroupOption>[] = [],
): DashboardGroupOption[] {
  const defaults: DashboardGroupOption[] = [
    { id: "g-tokyo1", name: "Tokyo 1", isPrimary: true, isMember: true },
    { id: "g-osaka", name: "Osaka", isPrimary: false, isMember: true },
  ];
  if (overrides.length === 0) return defaults;
  return overrides.map((o, i) => ({ ...defaults[i % defaults.length], ...o }));
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

function stubRepo(
  overrides: Partial<DashboardRepository> = {},
): DashboardRepository {
  return {
    getSummary: vi.fn().mockResolvedValue(createSummary()),
    listGroups: vi.fn().mockResolvedValue(createGroupOptions()),
    ...overrides,
  };
}

describe("useDashboardModel", () => {
  it("loads dashboard data immediately", async () => {
    const repository = stubRepo();

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

  it("fetches groupOptions on startup and selects primary", async () => {
    const repository = stubRepo();

    const model = useDashboardModel({ repository });
    await flushPromises();

    expect(repository.listGroups).toHaveBeenCalledOnce();
    expect(model.groupOptions.value).toHaveLength(2);
    expect(model.selectedGroup.value).toBe("g-tokyo1");
  });

  it("falls back to first option when no primary exists", async () => {
    const repository = stubRepo({
      listGroups: vi.fn().mockResolvedValue([
        { id: "g-a", name: "A", isPrimary: false, isMember: true },
        { id: "g-b", name: "B", isPrimary: false, isMember: true },
      ]),
    });

    const model = useDashboardModel({ repository });
    await flushPromises();

    expect(model.selectedGroup.value).toBe("g-a");
  });

  it("keeps selectedGroup null when listGroups returns empty", async () => {
    const repository = stubRepo({
      listGroups: vi.fn().mockResolvedValue([]),
    });

    const model = useDashboardModel({ repository });
    await flushPromises();

    expect(model.selectedGroup.value).toBeNull();
    expect(model.groupOptions.value).toHaveLength(0);
  });

  it("tolerates listGroups failure gracefully and reports errorCode", async () => {
    const repository = stubRepo({
      listGroups: vi.fn().mockRejectedValue(new Error("network")),
    });

    const model = useDashboardModel({ repository });
    await flushPromises();

    expect(model.groupOptions.value).toHaveLength(0);
    expect(model.selectedGroup.value).toBeNull();
    expect(model.errorCode.value).toBe("requestFailed");
  });

  it("reloads when scope and timeWindow change", async () => {
    const allSummary = createSummary({
      scope: "all",
      timeWindow: 30,
      summary: {
        todayTasks: 20,
        upcomingCases: 11,
        pendingSubmissions: 4,
        riskCases: 3,
      },
    });
    const repository = stubRepo({
      getSummary: vi
        .fn()
        .mockResolvedValue(createSummary())
        .mockResolvedValueOnce(createSummary())
        .mockResolvedValueOnce(createSummary()),
    });

    const model = useDashboardModel({ repository });
    await flushPromises();

    (repository.getSummary as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      allSummary,
    );
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

  it("passes groupId when scope is group", async () => {
    const repository = stubRepo();

    const model = useDashboardModel({ repository });
    await flushPromises();

    model.scope.value = "group";
    await nextTick();
    await flushPromises();

    expect(repository.getSummary).toHaveBeenLastCalledWith({
      scope: "group",
      timeWindow: 7,
      groupId: "g-tokyo1",
    });
  });

  it("does not pass groupId when scope is mine or all", async () => {
    const repository = stubRepo();

    const model = useDashboardModel({ repository });
    await flushPromises();

    model.scope.value = "all";
    await nextTick();
    await flushPromises();

    expect(repository.getSummary).toHaveBeenLastCalledWith({
      scope: "all",
      timeWindow: 7,
    });
  });

  it("reloads when selectedGroup changes while scope is group", async () => {
    const repository = stubRepo();

    const model = useDashboardModel({ repository });
    await flushPromises();

    model.scope.value = "group";
    await nextTick();
    await flushPromises();

    const callsBefore = (repository.getSummary as ReturnType<typeof vi.fn>).mock
      .calls.length;

    model.selectedGroup.value = "g-osaka";
    await nextTick();
    await flushPromises();

    expect(repository.getSummary).toHaveBeenLastCalledWith({
      scope: "group",
      timeWindow: 7,
      groupId: "g-osaka",
    });
    expect(
      (repository.getSummary as ReturnType<typeof vi.fn>).mock.calls.length,
    ).toBeGreaterThan(callsBefore);
  });

  it("maps unauthorized errors for the view layer", async () => {
    const repository = stubRepo({
      getSummary: vi.fn().mockRejectedValue(
        new DashboardRepositoryError({
          code: "UNAUTHORIZED",
          message: "denied",
          status: 401,
        }),
      ),
    });

    const model = useDashboardModel({ repository });
    await flushPromises();

    expect(model.errorCode.value).toBe("unauthorized");
    expect(model.hasData.value).toBe(false);
  });

  it("keeps only the latest response when requests overlap", async () => {
    const first = deferred<DashboardSummaryData>();
    const second = deferred<DashboardSummaryData>();
    const repository = stubRepo({
      getSummary: vi
        .fn<DashboardRepository["getSummary"]>()
        .mockImplementationOnce(() => first.promise)
        .mockImplementationOnce(() => second.promise),
    });

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

  it("isGroupFilterDisabled is true when scope is not group", async () => {
    const repository = stubRepo();

    const model = useDashboardModel({ repository });
    await flushPromises();

    expect(model.scope.value).toBe("mine");
    expect(model.isGroupFilterDisabled.value).toBe(true);
  });

  it("isGroupFilterDisabled is false when scope is group and options exist", async () => {
    const repository = stubRepo();

    const model = useDashboardModel({ repository });
    await flushPromises();

    model.scope.value = "group";
    await nextTick();

    expect(model.isGroupFilterDisabled.value).toBe(false);
  });

  it("isGroupFilterDisabled is true when scope is group but options are empty", async () => {
    const repository = stubRepo({
      listGroups: vi.fn().mockResolvedValue([]),
    });

    const model = useDashboardModel({ repository });
    await flushPromises();

    model.scope.value = "group";
    await nextTick();

    expect(model.isGroupFilterDisabled.value).toBe(true);
  });

  it("omits groupId from getSummary when groups are empty and scope is group", async () => {
    const repository = stubRepo({
      listGroups: vi.fn().mockResolvedValue([]),
    });

    const model = useDashboardModel({ repository });
    await flushPromises();

    model.scope.value = "group";
    await nextTick();
    await flushPromises();

    expect(model.isGroupFilterDisabled.value).toBe(true);
    expect(model.selectedGroup.value).toBeNull();
    expect(repository.getSummary).toHaveBeenLastCalledWith({
      scope: "group",
      timeWindow: 7,
    });
  });

  it("scopeSummaryKey returns group key when scope is group", async () => {
    const repository = stubRepo();

    const model = useDashboardModel({ repository });
    await flushPromises();

    model.scope.value = "group";
    await nextTick();

    expect(model.scopeSummaryKey.value).toBe("dashboard.scopeSummary.group");
  });

  it("scopeSummaryKey returns mine key for default scope", async () => {
    const repository = stubRepo();

    const model = useDashboardModel({ repository });
    await flushPromises();

    expect(model.scopeSummaryKey.value).toBe("dashboard.scopeSummary.mine");
  });

  it("clears data when getSummary fails", async () => {
    const repository = stubRepo();

    const model = useDashboardModel({ repository });
    await flushPromises();

    expect(model.hasData.value).toBe(true);

    (repository.getSummary as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("server error"),
    );
    model.scope.value = "all";
    await nextTick();
    await flushPromises();

    expect(model.data.value).toBeNull();
    expect(model.hasData.value).toBe(false);
    expect(model.errorCode.value).toBe("requestFailed");
  });

  it("selects primary isMember group as default", async () => {
    const repository = stubRepo({
      listGroups: vi.fn().mockResolvedValue([
        { id: "g-vis", name: "Visible", isPrimary: true, isMember: false },
        { id: "g-own", name: "Own", isPrimary: false, isMember: true },
      ]),
    });

    const model = useDashboardModel({ repository });
    await flushPromises();

    expect(model.selectedGroup.value).toBe("g-own");
  });

  it("prefers isPrimary+isMember over first isMember", async () => {
    const repository = stubRepo({
      listGroups: vi.fn().mockResolvedValue([
        { id: "g-a", name: "A", isPrimary: false, isMember: true },
        { id: "g-b", name: "B", isPrimary: true, isMember: true },
      ]),
    });

    const model = useDashboardModel({ repository });
    await flushPromises();

    expect(model.selectedGroup.value).toBe("g-b");
  });

  it("keeps selectedGroup null when all groups have isMember=false", async () => {
    const repository = stubRepo({
      listGroups: vi.fn().mockResolvedValue([
        { id: "g-a", name: "A", isPrimary: true, isMember: false },
        { id: "g-b", name: "B", isPrimary: false, isMember: false },
      ]),
    });

    const model = useDashboardModel({ repository });
    await flushPromises();

    expect(model.selectedGroup.value).toBeNull();
  });

  it("isGroupTabDisabled is true when all groups have isMember=false", async () => {
    const repository = stubRepo({
      listGroups: vi.fn().mockResolvedValue([
        { id: "g-a", name: "A", isPrimary: true, isMember: false },
        { id: "g-b", name: "B", isPrimary: false, isMember: false },
      ]),
    });

    const model = useDashboardModel({ repository });
    await flushPromises();

    expect(model.isGroupTabDisabled.value).toBe(true);
  });

  it("isGroupTabDisabled is false when at least one group has isMember=true", async () => {
    const repository = stubRepo();

    const model = useDashboardModel({ repository });
    await flushPromises();

    expect(model.isGroupTabDisabled.value).toBe(false);
  });

  it("isGroupTabDisabled is true when groupOptions are empty", async () => {
    const repository = stubRepo({
      listGroups: vi.fn().mockResolvedValue([]),
    });

    const model = useDashboardModel({ repository });
    await flushPromises();

    expect(model.isGroupTabDisabled.value).toBe(true);
  });

  it("maps noGroupAccess errorCode from DashboardRepositoryError", async () => {
    const repository = stubRepo({
      getSummary: vi.fn().mockRejectedValue(
        new DashboardRepositoryError({
          code: "BAD_RESPONSE",
          message: "NO_GROUP_ACCESS",
          status: 403,
        }),
      ),
    });

    const model = useDashboardModel({ repository });
    await flushPromises();

    expect(model.errorCode.value).toBe("noGroupAccess");
    expect(model.data.value).toBeNull();
  });

  it("maps noPrimaryGroup errorCode from DashboardRepositoryError", async () => {
    const repository = stubRepo({
      getSummary: vi.fn().mockRejectedValue(
        new DashboardRepositoryError({
          code: "BAD_RESPONSE",
          message: "NO_PRIMARY_GROUP",
          status: 400,
        }),
      ),
    });

    const model = useDashboardModel({ repository });
    await flushPromises();

    expect(model.errorCode.value).toBe("noPrimaryGroup");
    expect(model.data.value).toBeNull();
  });

  it("loadGroupOptions failure sets errorCode to requestFailed", async () => {
    const repository = stubRepo({
      listGroups: vi.fn().mockRejectedValue(new Error("fail")),
    });

    const model = useDashboardModel({ repository });
    await flushPromises();

    expect(model.groupOptions.value).toHaveLength(0);
    expect(model.errorCode.value).toBe("requestFailed");
  });
});
