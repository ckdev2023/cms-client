import { ref, reactive, computed, toRefs } from "vue";
import type {
  LeadFiltersState,
  LeadScope,
  LeadSummary,
  SelectOption,
} from "../types";

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

/**
 * 线索列表筛选状态管理。
 *
 * @param deps - 筛选器依赖的下拉选项
 * @returns 筛选状态、重置方法与过滤函数
 */
export function useLeadFilters(deps: UseLeadFiltersDeps) {
  const scope = ref<LeadScope>("mine");
  const f = reactive({ ...BLANK_FILTERS });

  const isFilterActive = computed(() => Object.values(f).some((v) => v !== ""));

  function resetFilters() {
    Object.assign(f, { ...BLANK_FILTERS });
  }

  function applyFilters(leads: LeadSummary[]): LeadSummary[] {
    const dd: DropdownState = {
      status: f.status,
      owner: f.owner,
      group: f.group,
      businessType: f.businessType,
      groupOptions: deps.groupOptions,
    };
    return leads.filter(
      (l) =>
        (!f.search || matchesSearch(l, f.search)) &&
        matchesDropdowns(l, dd) &&
        matchesDateRange(l, f.dateFrom, f.dateTo),
    );
  }

  const refs = toRefs(f);
  return {
    scope,
    search: refs.search,
    statusFilter: refs.status,
    ownerFilter: refs.owner,
    groupFilter: refs.group,
    businessTypeFilter: refs.businessType,
    dateFrom: refs.dateFrom,
    dateTo: refs.dateTo,
    isFilterActive,
    resetFilters,
    applyFilters,
  };
}
