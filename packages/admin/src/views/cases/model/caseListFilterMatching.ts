import type { CaseListFiltersState, CaseListItem } from "../types";
import { resolveCaseListGroupFilterForApi } from "../../../shared/model/useGroupOptions";

function matchesSearch(item: CaseListItem, query: string): boolean {
  const q = query.toLowerCase();
  const haystack = [
    item.name,
    item.applicant,
    item.id,
    item.type,
    item.caseNo ?? "",
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
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
    if (fk === "group") {
      if (!filters.group) continue;
      if (item.groupId !== resolveCaseListGroupFilterForApi(filters.group)) {
        return false;
      }
      continue;
    }
    if (filters[fk] && item[ik] !== filters[fk]) return false;
  }
  return !(customerId && item.customerId !== customerId);
}
