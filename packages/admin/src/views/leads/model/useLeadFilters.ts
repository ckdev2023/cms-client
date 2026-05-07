import { ref, reactive, computed, toRefs, watch } from "vue";
import type { Ref } from "vue";
import type { LocationQuery } from "vue-router";
import type {
  LeadFiltersState,
  LeadScope,
  LeadStatus,
  LeadStatusFilter,
  LeadSummary,
  SelectOption,
} from "../types";
import type { LeadListParams } from "./LeadAdapterTypes";

const LEAD_STATUS_VALUES: readonly LeadStatus[] = [
  "new",
  "following",
  "pending_sign",
  "signed",
  "converted_case",
  "lost",
];

function toLeadStatusFilter(value: string): LeadStatusFilter {
  return (LEAD_STATUS_VALUES as readonly string[]).includes(value)
    ? (value as LeadStatus)
    : "";
}

/**
 *
 */
export interface UseLeadFiltersDeps {
  /**
   *
   */
  groupOptions: SelectOption[];
  /**
   *
   */
  ownerOptions: SelectOption[];
  /**
   *
   */
  businessTypeOptions: SelectOption[];
  /** 路由 query 的响应式引用，用于初始化及监听浏览器前进/后退。 */
  routeQuery?: Ref<LocationQuery>;
  /** 将筛选状态写回 URL；由视图层注入 `router.replace`。 */
  replaceQuery?: (query: Record<string, string | undefined>) => void;
}

interface DropdownState {
  status: string;
  owner: string;
  group: string;
  businessType: string;
  groupOptions: SelectOption[];
}

const BLANK_FILTERS: Omit<LeadFiltersState, "scope"> = {
  search: "",
  status: "",
  owner: "",
  group: "",
  businessType: "",
  dateFrom: "",
  dateTo: "",
};

function matchesSearch(lead: LeadSummary, query: string): boolean {
  const q = query.toLowerCase();
  return (
    lead.name.toLowerCase().includes(q) ||
    lead.phone.toLowerCase().includes(q) ||
    lead.email.toLowerCase().includes(q) ||
    lead.businessTypeLabel.toLowerCase().includes(q) ||
    lead.sourceLabel.toLowerCase().includes(q)
  );
}

function matchesDropdowns(lead: LeadSummary, s: DropdownState): boolean {
  if (s.status && lead.status !== s.status) return false;
  if (s.group) {
    const known = s.groupOptions.some((o) => o.value === s.group);
    if (known && lead.groupId !== s.group) return false;
  }
  if (s.owner && lead.ownerId !== s.owner) return false;
  if (s.businessType && lead.businessType !== s.businessType) return false;
  return true;
}

function matchesDateRange(
  lead: LeadSummary,
  from: string,
  to: string,
): boolean {
  if (!from && !to) return true;
  const updated = lead.updatedAt;
  if (!updated) return true;
  if (from && updated < from) return false;
  if (to && updated > to) return false;
  return true;
}

function buildListParams(
  scopeVal: LeadScope,
  f: Omit<LeadFiltersState, "scope">,
  tagsVal: string[],
  pageVal: number,
  limitVal: number,
): LeadListParams {
  return {
    scope: scopeVal || undefined,
    search: f.search || undefined,
    status: f.status || undefined,
    ownerUserId: f.owner || undefined,
    groupId: f.group || undefined,
    businessType: f.businessType || undefined,
    tags: tagsVal.length > 0 ? tagsVal : undefined,
    dateFrom: f.dateFrom || undefined,
    dateTo: f.dateTo || undefined,
    page: pageVal,
    limit: limitVal,
  };
}

// ─── Route ↔ filter sync ────────────────────────────────────────

function readQueryString(query: LocationQuery, key: string): string {
  const v = query[key];
  return typeof v === "string" ? v : "";
}

interface ParsedFilterQuery {
  status: LeadStatusFilter;
  owner: string;
  group: string;
  businessType: string;
  tags: string[];
}

function parseFiltersFromQuery(query: LocationQuery): ParsedFilterQuery {
  const tagsRaw = readQueryString(query, "tags");
  return {
    status: toLeadStatusFilter(readQueryString(query, "status")),
    owner: readQueryString(query, "owner"),
    group: readQueryString(query, "group"),
    businessType: readQueryString(query, "businessType"),
    tags: tagsRaw ? tagsRaw.split(",").filter(Boolean) : [],
  };
}

function buildFilterQuery(
  f: Omit<LeadFiltersState, "scope">,
  tags: string[],
): Record<string, string | undefined> {
  return {
    status: f.status || undefined,
    owner: f.owner || undefined,
    group: f.group || undefined,
    businessType: f.businessType || undefined,
    tags: tags.length > 0 ? tags.join(",") : undefined,
  };
}

function setupRouteSync(
  f: Omit<LeadFiltersState, "scope">,
  tagsFilter: Ref<string[]>,
  routeQuery: Ref<LocationQuery>,
  replaceQuery: (query: Record<string, string | undefined>) => void,
) {
  let skipRouteSync = false;

  function syncToRoute() {
    if (skipRouteSync) return;
    replaceQuery(buildFilterQuery(f, tagsFilter.value));
  }

  watch(
    () => ({
      status: f.status,
      owner: f.owner,
      group: f.group,
      businessType: f.businessType,
      tags: tagsFilter.value,
    }),
    () => syncToRoute(),
  );

  watch(routeQuery, (query) => {
    skipRouteSync = true;
    const next = parseFiltersFromQuery(query);
    f.status = next.status;
    f.owner = next.owner;
    f.group = next.group;
    f.businessType = next.businessType;
    tagsFilter.value = next.tags;
    skipRouteSync = false;
  });
}

function createFiltersReactive(initial: ParsedFilterQuery | null) {
  return reactive<Omit<LeadFiltersState, "scope">>({
    ...BLANK_FILTERS,
    ...(initial
      ? {
          status: initial.status,
          owner: initial.owner,
          group: initial.group,
          businessType: initial.businessType,
        }
      : {}),
  });
}

function applyFiltersToList(
  leads: LeadSummary[],
  f: Omit<LeadFiltersState, "scope">,
  tagsFilter: readonly string[],
  groupOptions: SelectOption[],
): LeadSummary[] {
  const dd: DropdownState = {
    status: f.status,
    owner: f.owner,
    group: f.group,
    businessType: f.businessType,
    groupOptions,
  };
  return leads.filter(
    (l) =>
      (!f.search || matchesSearch(l, f.search)) &&
      matchesDropdowns(l, dd) &&
      matchesDateRange(l, f.dateFrom, f.dateTo) &&
      (tagsFilter.length === 0 || tagsFilter.every((t) => l.tags?.includes(t))),
  );
}

/**
 * 线索列表筛选状态管理。
 *
 * @param deps - 筛选器依赖的下拉选项
 * @returns 筛选状态、重置方法与过滤函数
 */
export function useLeadFilters(deps: UseLeadFiltersDeps) {
  const scope = ref<LeadScope>("mine");
  const initial = deps.routeQuery
    ? parseFiltersFromQuery(deps.routeQuery.value)
    : null;
  const f = createFiltersReactive(initial);
  const tagsFilter: Ref<string[]> = ref(initial?.tags ?? []);
  const page = ref(1);
  const limit = ref(20);

  if (deps.routeQuery && deps.replaceQuery) {
    setupRouteSync(f, tagsFilter, deps.routeQuery, deps.replaceQuery);
  }

  const isFilterActive = computed(
    () => Object.values(f).some((v) => v !== "") || tagsFilter.value.length > 0,
  );

  function resetFilters() {
    Object.assign(f, { ...BLANK_FILTERS });
    tagsFilter.value = [];
    page.value = 1;
  }

  const r = toRefs(f);
  return {
    scope,
    search: r.search,
    statusFilter: r.status,
    ownerFilter: r.owner,
    groupFilter: r.group,
    businessTypeFilter: r.businessType,
    tagsFilter,
    dateFrom: r.dateFrom,
    dateTo: r.dateTo,
    page,
    limit,
    isFilterActive,
    resetFilters,
    applyFilters: (leads: LeadSummary[]) =>
      applyFiltersToList(leads, f, tagsFilter.value, deps.groupOptions),
    toListParams: () =>
      buildListParams(
        scope.value,
        f,
        tagsFilter.value,
        page.value,
        limit.value,
      ),
  };
}
