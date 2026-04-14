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
} from "../constants";
import {
  buildCaseListQuery,
  parseCaseListQuery,
  type CaseListQueryParams,
} from "../query";
import { filterByScope } from "../fixtures";

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

function setupRouteSync(
  filters: CaseListFiltersState,
  customerId: Ref<string | undefined>,
  routeQuery: Ref<LocationQuery>,
  replaceQuery: (query: Record<string, string | undefined>) => void,
) {
  let skipRouteSync = false;

  function syncToRoute() {
    if (skipRouteSync) return;
    const params: CaseListQueryParams = {
      ...filters,
      customerId: customerId.value,
    };
    replaceQuery(buildCaseListQuery(params));
  }

  watch(
    () => ({ ...filters, customerId: customerId.value }),
    () => syncToRoute(),
  );

  watch(routeQuery, (query) => {
    skipRouteSync = true;
    const next = parseCaseListQuery(query);
    filters.scope = next.scope;
    filters.search = next.search;
    filters.stage = next.stage;
    filters.owner = next.owner;
    filters.group = next.group;
    filters.risk = next.risk;
    filters.validation = next.validation;
    customerId.value = next.customerId;
    skipRouteSync = false;
  });
}

// ─── Derived computed ───────────────────────────────────────────

function createDerivedState(
  deps: UseCaseListModelDeps,
  filters: CaseListFiltersState,
  customerId: Ref<string | undefined>,
) {
  const scopedCases = computed(() =>
    filterByScope(deps.allCases(), filters.scope),
  );
  const filteredCases = computed(() =>
    scopedCases.value.filter((c) =>
      matchesCaseFilters(c, filters, customerId.value),
    ),
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
  const isFilterActive = computed(() => activeFilterCount.value > 0);
  const customerLabel = computed(() => {
    if (!customerId.value) return undefined;
    return scopedCases.value.find(
      (item) => item.customerId === customerId.value,
    )?.applicant;
  });
  return {
    scopedCases,
    filteredCases,
    activeFilterCount,
    isFilterActive,
    customerLabel,
  };
}

// ─── Composable ─────────────────────────────────────────────────

/**
 *
 */
export interface UseCaseListModelDeps {
  /**
   *
   */
  allCases: () => CaseListItem[];
  /**
   *
   */
  routeQuery: Ref<LocationQuery>;
  /**
   *
   */
  replaceQuery: (query: Record<string, string | undefined>) => void;
}

/**
 * 案件列表 Model：筛选、URL 参数双向同步、客户来源过滤。
 *
 * @param deps - 数据源与路由操作注入
 * @returns 筛选状态、过滤结果与操作方法
 */
export function useCaseListModel(deps: UseCaseListModelDeps) {
  const parsed = parseCaseListQuery(deps.routeQuery.value);
  const filters = reactive<CaseListFiltersState>({
    scope: parsed.scope,
    search: parsed.search,
    stage: parsed.stage,
    owner: parsed.owner,
    group: parsed.group,
    risk: parsed.risk,
    validation: parsed.validation,
  });
  const customerId = ref<string | undefined>(parsed.customerId);
  const derived = createDerivedState(deps, filters, customerId);

  setupRouteSync(filters, customerId, deps.routeQuery, deps.replaceQuery);

  return {
    filters,
    customerId,
    ...derived,
    stageOptions: CASE_STAGE_IDS.map((id) => ({
      value: id,
      label: CASE_STAGES[id].label,
    })),
    ownerOptions: CASE_OWNER_OPTIONS,
    groupOptions: CASE_GROUP_OPTIONS,
    ...createFilterSetters(filters, customerId),
  };
}
