import { computed, ref, watch, type Ref } from "vue";
import { DashboardRepositoryError } from "./DashboardRepository";
import {
  DASHBOARD_SCOPE_OPTIONS,
  type DashboardGroupOption,
  type DashboardRepository,
  type DashboardScope,
  type DashboardSummaryData,
  type DashboardTimeWindow,
} from "./dashboardTypes";

/**
 * 视图层可识别的仪表盘错误码。
 */
export type DashboardModelErrorCode =
  | "unauthorized"
  | "requestFailed"
  | "noGroupAccess"
  | "noPrimaryGroup";

interface DashboardModelState {
  scope: Ref<DashboardScope>;
  selectedGroup: Ref<string | null>;
  groupOptions: Ref<DashboardGroupOption[]>;
  timeWindow: Ref<DashboardTimeWindow>;
  data: Ref<DashboardSummaryData | null>;
  loading: Ref<boolean>;
  errorCode: Ref<DashboardModelErrorCode | null>;
}

function mapDashboardError(error: unknown): DashboardModelErrorCode {
  if (error instanceof DashboardRepositoryError) {
    if (error.code === "UNAUTHORIZED") return "unauthorized";
    if (error.message === "NO_GROUP_ACCESS") return "noGroupAccess";
    if (error.message === "NO_PRIMARY_GROUP") return "noPrimaryGroup";
  }

  return "requestFailed";
}

function createDashboardState(): DashboardModelState {
  return {
    scope: ref<DashboardScope>("mine"),
    selectedGroup: ref<string | null>(null),
    groupOptions: ref<DashboardGroupOption[]>([]),
    timeWindow: ref<DashboardTimeWindow>(7),
    data: ref<DashboardSummaryData | null>(null),
    loading: ref(false),
    errorCode: ref<DashboardModelErrorCode | null>(null),
  };
}

function createDashboardLoader(
  state: DashboardModelState,
  repository: DashboardRepository,
): () => Promise<void> {
  let requestVersion = 0;

  return async function loadDashboard(): Promise<void> {
    const activeRequest = ++requestVersion;
    state.loading.value = true;
    state.errorCode.value = null;

    try {
      const groupId =
        state.scope.value === "group" && state.selectedGroup.value
          ? state.selectedGroup.value
          : undefined;

      const nextData = await repository.getSummary({
        scope: state.scope.value,
        timeWindow: state.timeWindow.value,
        groupId,
      });

      if (activeRequest !== requestVersion) return;
      state.data.value = nextData;
    } catch (error) {
      if (activeRequest !== requestVersion) return;
      state.data.value = null;
      state.errorCode.value = mapDashboardError(error);
    } finally {
      if (activeRequest === requestVersion) {
        state.loading.value = false;
      }
    }
  };
}

async function loadGroupOptions(
  state: DashboardModelState,
  repository: DashboardRepository,
): Promise<void> {
  try {
    const groups = await repository.listGroups();
    state.groupOptions.value = groups;

    const memberGroups = groups.filter((g) => g.isMember);
    const primary =
      memberGroups.find((g) => g.isPrimary) ?? memberGroups[0] ?? null;

    state.selectedGroup.value = primary?.id ?? null;
  } catch {
    state.groupOptions.value = [];
    state.errorCode.value = "requestFailed";
  }
}

function createDashboardView(
  state: DashboardModelState,
  loadDashboard: () => Promise<void>,
) {
  return {
    scope: state.scope,
    selectedGroup: state.selectedGroup,
    timeWindow: state.timeWindow,
    scopeOptions: DASHBOARD_SCOPE_OPTIONS,
    groupOptions: computed(() => state.groupOptions.value),
    data: computed(() => state.data.value),
    summary: computed(() => state.data.value?.summary ?? null),
    panels: computed(() => state.data.value?.panels ?? null),
    loading: computed(() => state.loading.value),
    errorCode: computed(() => state.errorCode.value),
    hasData: computed(() => state.data.value !== null),
    isGroupFilterDisabled: computed(
      () =>
        state.scope.value !== "group" || state.groupOptions.value.length === 0,
    ),
    isGroupTabDisabled: computed(
      () =>
        state.groupOptions.value.length === 0 ||
        state.groupOptions.value.every((g) => !g.isMember),
    ),
    scopeSummaryKey: computed(
      () => `dashboard.scopeSummary.${state.scope.value}`,
    ),
    retry(): Promise<void> {
      return loadDashboard();
    },
  };
}

/**
 * 创建仪表盘页面的视图模型，负责状态管理与数据加载。
 *
 * @param input 视图模型依赖项。
 * @param input.repository 仪表盘摘要仓储实现。
 * @returns 提供给页面模板消费的响应式状态与操作。
 */
export function useDashboardModel(input: {
  /**
   * 仪表盘摘要仓储实现。
   */
  repository: DashboardRepository;
}) {
  const state = createDashboardState();
  const loadDashboard = createDashboardLoader(state, input.repository);

  void loadGroupOptions(state, input.repository);

  watch(
    [state.scope, state.timeWindow, state.selectedGroup],
    () => {
      void loadDashboard();
    },
    { immediate: true },
  );

  return createDashboardView(state, loadDashboard);
}
