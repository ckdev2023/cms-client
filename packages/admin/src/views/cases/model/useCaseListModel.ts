import { computed, reactive, ref, watch, type Ref } from "vue";
import type { LocationQuery } from "vue-router";
import type {
  CaseGroupFilter,
  CaseListFiltersState,
  CaseListItem,
  CaseOwnerFilter,
  CaseRiskFilter,
  CaseScope,
  CaseStageFilter,
  CaseValidationFilter,
} from "../types";
import {
  CASE_GROUP_OPTIONS,
  CASE_OWNER_OPTIONS,
  CASE_STAGE_IDS,
  CASE_STAGES,
  DEFAULT_CASE_LIST_FILTERS,
  DEFAULT_CASE_PAGE_SIZE,
} from "../constants";
import {
  buildCaseListQuery,
  isValidStageId,
  parseCaseListQuery,
  type CaseListQueryParams,
} from "../query";
import type { CaseRepository } from "./CaseRepository";
import type { CaseListParams } from "./CaseAdapterTypes";
import { adaptCaseSummaryCards } from "./CaseAdapterMappers";

// ─── Filter matching ────────────────────────────────────────────

function matchesSearch(item: CaseListItem, query: string): boolean {
  const q = query.toLowerCase();
  return (
    item.name.toLowerCase().includes(q) ||
    item.applicant.toLowerCase().includes(q) ||
    item.id.toLowerCase().includes(q) ||
    item.type.toLowerCase().includes(q)
  );
}

const FIELD_MATCHERS: [keyof CaseListFiltersState, keyof CaseListItem][] = [
  ["stage", "stageId"],
  ["owner", "ownerId"],
  ["group", "groupId"],
  ["risk", "riskStatus"],
  ["validation", "validationStatus"],
];

/**
 * 判断单条案件是否满足全部筛选条件。
 *
 * @param item - 待判断的案件
 * @param filters - 筛选状态
 * @param customerId - 可选的客户来源过滤
 * @returns 是否通过所有筛选
 */
export function matchesCaseFilters(
  item: CaseListItem,
  filters: CaseListFiltersState,
  customerId?: string,
): boolean {
  if (filters.search && !matchesSearch(item, filters.search)) return false;
  for (const [fk, ik] of FIELD_MATCHERS) {
    if (filters[fk] && item[ik] !== filters[fk]) return false;
  }
  return !(customerId && item.customerId !== customerId);
}

// ─── Filter setters factory ─────────────────────────────────────

function createFilterSetters(
  filters: CaseListFiltersState,
  customerId: Ref<string | undefined>,
) {
  return {
    setScope(scope: CaseScope) {
      filters.scope = scope;
    },
    setSearch(value: string) {
      filters.search = value;
    },
    setStage(value: CaseStageFilter) {
      filters.stage = value;
    },
    setOwner(value: CaseOwnerFilter) {
      filters.owner = value;
    },
    setGroup(value: CaseGroupFilter) {
      filters.group = value;
    },
    setRisk(value: CaseRiskFilter) {
      filters.risk = value;
    },
    setValidation(value: CaseValidationFilter) {
      filters.validation = value;
    },
    clearCustomerId() {
      customerId.value = undefined;
    },
    resetFilters() {
      Object.assign(filters, { ...DEFAULT_CASE_LIST_FILTERS });
      customerId.value = undefined;
    },
  };
}

// ─── Route sync ─────────────────────────────────────────────────

/**
 * 仅当浏览器原生导航（前进/后退、深链等）使 URL 与「最近一次我们 push 出去的 query」
 * 不一致时，才把 URL 反向写回 filters。
 *
 * 不能简单比较 URL 与当前 filters：用户连续输入时，filters 已经超前于 URL，
 * 但还有“早先 push 的旧 URL”在异步导航队列里完成回执。若直接以 URL 为准，
 * 会用旧 URL 覆盖最新的 filters（造成只保留首字符的输入丢字 bug）。
 *
 * 实现：用 Map 记录最近一段时间内由我们自己 push 出去的 query 字符串，
 * 收到 routeQuery 变更时，若命中我们自己的 push 即视为 echo 直接忽略；
 * 未命中才按外部导航处理，回写到 filters。
 * @param filters - 反向写回的目标 filters reactive 对象
 * @param customerId - 反向写回的目标 customerId ref
 * @param routeQuery - 当前路由 query 的响应式引用
 * @param replaceQuery - 由 view 注入的 router.replace 包装
 * @param onInvalidStage - 检测到非法 stage 值时的回调
 */
function setupRouteSync(
  filters: CaseListFiltersState,
  customerId: Ref<string | undefined>,
  routeQuery: Ref<LocationQuery>,
  replaceQuery: (query: Record<string, string | undefined>) => void,
  onInvalidStage?: (raw: string) => void,
) {
  const pendingPushes = new Map<string, number>();
  const PUSH_TTL_MS = 1500;

  function purgeExpired(now: number): void {
    for (const [key, ts] of pendingPushes) {
      if (now - ts > PUSH_TTL_MS) pendingPushes.delete(key);
    }
  }

  function serialiseQuery(query: Record<string, string | undefined>): string {
    const sorted = Object.keys(query)
      .filter((k) => query[k] !== undefined)
      .sort()
      .map((k) => [k, query[k]] as const);
    return JSON.stringify(sorted);
  }

  function syncToRoute() {
    const now = Date.now();
    purgeExpired(now);
    const params: CaseListQueryParams = {
      ...filters,
      customerId: customerId.value,
    };
    const built = buildCaseListQuery(params);
    pendingPushes.set(serialiseQuery(built), now);
    replaceQuery(built);
  }

  watch(
    () => ({ ...filters, customerId: customerId.value }),
    () => syncToRoute(),
  );

  watch(routeQuery, (query) => {
    detectInvalidStage(query, onInvalidStage);
    const next = parseCaseListQuery(query);
    const nextKey = serialiseQuery(buildCaseListQuery(next));
    if (pendingPushes.has(nextKey)) {
      pendingPushes.delete(nextKey);
      return;
    }
    purgeExpired(Date.now());
    filters.scope = next.scope;
    filters.search = next.search;
    filters.stage = next.stage;
    filters.owner = next.owner;
    filters.group = next.group;
    filters.risk = next.risk;
    filters.validation = next.validation;
    customerId.value = next.customerId;
  });
}

// ─── Helpers ────────────────────────────────────────────────────

function filtersToListParams(
  filters: CaseListFiltersState,
  customerId: string | undefined,
  page: number,
  limit: number,
): CaseListParams {
  return {
    scope: filters.scope || undefined,
    search: filters.search || undefined,
    stage: filters.stage || undefined,
    owner: filters.owner || undefined,
    group: filters.group || undefined,
    risk: filters.risk || undefined,
    customerId,
    page,
    limit,
  };
}

function detectInvalidStage(
  query: LocationQuery,
  onInvalidStage?: (raw: string) => void,
): void {
  if (!onInvalidStage) return;
  const raw = typeof query.stage === "string" ? query.stage : "";
  if (raw && !isValidStageId(raw)) {
    onInvalidStage(raw);
  }
}

function createListState(parsed: ReturnType<typeof parseCaseListQuery>) {
  return {
    filters: reactive<CaseListFiltersState>({
      scope: parsed.scope,
      search: parsed.search,
      stage: parsed.stage,
      owner: parsed.owner,
      group: parsed.group,
      risk: parsed.risk,
      validation: parsed.validation,
    }),
    customerId: ref<string | undefined>(parsed.customerId),
    items: ref<CaseListItem[]>([]),
    total: ref(0),
    page: ref(1),
    pageSize: DEFAULT_CASE_PAGE_SIZE,
    loading: ref(false),
    error: ref<string | null>(null),
  };
}

function createFetchCases(input: {
  repository: CaseRepository;
  filters: CaseListFiltersState;
  customerId: Ref<string | undefined>;
  page: Ref<number>;
  pageSize: number;
  items: Ref<CaseListItem[]>;
  total: Ref<number>;
  loading: Ref<boolean>;
  error: Ref<string | null>;
}) {
  let fetchGeneration = 0;

  return async function fetchCases(): Promise<void> {
    const gen = ++fetchGeneration;
    input.loading.value = true;
    input.error.value = null;
    try {
      const params = filtersToListParams(
        input.filters,
        input.customerId.value,
        input.page.value,
        input.pageSize,
      );
      const result = await input.repository.listCases(params);
      if (gen !== fetchGeneration) return;
      input.items.value = result.items;
      input.total.value = result.total;
    } catch (e) {
      if (gen !== fetchGeneration) return;
      input.error.value = e instanceof Error ? e.message : String(e);
      input.items.value = [];
      input.total.value = 0;
    } finally {
      if (gen === fetchGeneration) input.loading.value = false;
    }
  };
}

function createDerivedState(
  filters: CaseListFiltersState,
  customerId: Ref<string | undefined>,
  items: Ref<CaseListItem[]>,
  total: Ref<number>,
  pageSize: number,
) {
  const filteredCases = computed(() => {
    if (!filters.validation) return items.value;
    return items.value.filter((c) => c.validationStatus === filters.validation);
  });
  const totalPages = computed(() =>
    total.value > 0 ? Math.ceil(total.value / pageSize) : 1,
  );
  const activeFilterCount = computed(
    () =>
      [
        filters.search,
        filters.stage,
        filters.owner,
        filters.group,
        filters.risk,
        filters.validation,
        customerId.value,
      ].filter(Boolean).length,
  );
  const customerLabel = computed(() => {
    if (!customerId.value) return undefined;
    return items.value.find((item) => item.customerId === customerId.value)
      ?.applicant;
  });

  return {
    filteredCases,
    totalPages,
    activeFilterCount,
    isFilterActive: computed(() => activeFilterCount.value > 0),
    customerLabel,
    summaryCards: computed(() => adaptCaseSummaryCards(filteredCases.value)),
  };
}

function setupRefetchWatchers(
  filters: CaseListFiltersState,
  customerId: Ref<string | undefined>,
  page: Ref<number>,
  fetchCases: () => Promise<void>,
): void {
  watch(
    () => ({
      scope: filters.scope,
      search: filters.search,
      stage: filters.stage,
      owner: filters.owner,
      group: filters.group,
      risk: filters.risk,
      customerId: customerId.value,
    }),
    () => {
      page.value = 1;
      void fetchCases();
    },
  );
  watch(page, () => {
    void fetchCases();
  });
}

function createPageSetter(totalPages: Ref<number>, page: Ref<number>) {
  return function setPage(nextPage: number) {
    const clamped = Math.max(1, Math.min(nextPage, totalPages.value));
    if (clamped !== page.value) page.value = clamped;
  };
}

type CaseListState = ReturnType<typeof createListState>;
type CaseListDerivedState = ReturnType<typeof createDerivedState>;

const CASE_STAGE_OPTIONS = CASE_STAGE_IDS.map((id) => ({
  value: id,
  label: CASE_STAGES[id].label,
}));

function createListModelResult(input: {
  state: CaseListState;
  derived: CaseListDerivedState;
  filterSetters: ReturnType<typeof createFilterSetters>;
  setPage: (page: number) => void;
  refetch: () => Promise<void>;
}) {
  return {
    filters: input.state.filters,
    customerId: input.state.customerId,
    filteredCases: input.derived.filteredCases,
    total: input.state.total,
    page: input.state.page,
    pageSize: input.state.pageSize,
    totalPages: input.derived.totalPages,
    loading: input.state.loading,
    error: input.state.error,
    activeFilterCount: input.derived.activeFilterCount,
    isFilterActive: input.derived.isFilterActive,
    customerLabel: input.derived.customerLabel,
    summaryCards: input.derived.summaryCards,
    stageOptions: CASE_STAGE_OPTIONS,
    ownerOptions: CASE_OWNER_OPTIONS,
    groupOptions: CASE_GROUP_OPTIONS,
    ...input.filterSetters,
    setPage: input.setPage,
    refetch: input.refetch,
  };
}

// ─── Composable ─────────────────────────────────────────────────

/**
 *
 */
export interface UseCaseListModelDeps {
  /**
   * 真实 CaseRepository 实例（由 CaseListView 注入）。
   */
  repository: CaseRepository;
  /**
   *
   */
  routeQuery: Ref<LocationQuery>;
  /**
   *
   */
  replaceQuery: (query: Record<string, string | undefined>) => void;
  /** URL stage 参数非法时的回调（由视图层注入 toast 通知）。 */
  onInvalidStage?: (rawValue: string) => void;
}

/**
 * 案件列表 Model：筛选、URL 参数双向同步、客户来源过滤。
 *
 * 通过注入的 CaseRepository 发起异步列表查询；
 * `validation` 字段仅客户端过滤，不参与 HTTP 请求。
 *
 * @param deps - 仓储、路由 query 与路由操作注入
 * @returns 筛选状态、过滤结果、加载状态与操作方法
 */
export function useCaseListModel(deps: UseCaseListModelDeps) {
  detectInvalidStage(deps.routeQuery.value, deps.onInvalidStage);
  const parsed = parseCaseListQuery(deps.routeQuery.value);
  const state = createListState(parsed);
  const fetchCases = createFetchCases({
    repository: deps.repository,
    filters: state.filters,
    customerId: state.customerId,
    page: state.page,
    pageSize: state.pageSize,
    items: state.items,
    total: state.total,
    loading: state.loading,
    error: state.error,
  });
  const derived = createDerivedState(
    state.filters,
    state.customerId,
    state.items,
    state.total,
    state.pageSize,
  );

  setupRefetchWatchers(state.filters, state.customerId, state.page, fetchCases);
  setupRouteSync(
    state.filters,
    state.customerId,
    deps.routeQuery,
    deps.replaceQuery,
    deps.onInvalidStage,
  );

  void fetchCases();
  const filterSetters = createFilterSetters(state.filters, state.customerId);
  const setPage = createPageSetter(derived.totalPages, state.page);

  return createListModelResult({
    state,
    derived,
    filterSetters,
    setPage,
    refetch: fetchCases,
  });
}
