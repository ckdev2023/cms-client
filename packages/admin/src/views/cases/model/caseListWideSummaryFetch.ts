import type { CaseListFiltersState, CaseListItem } from "../types";
import { CASE_LIST_SUMMARY_BASIS_CAP } from "../constants";
import type { CaseRepository } from "./CaseRepository";
import type { CaseListParams, CaseListResult } from "./CaseAdapterTypes";
import { resolveCaseListGroupFilterForApi } from "../../../shared/model/useGroupOptions";

/**
 * 构建案件列表仓储请求参数（与列表页 URL / `useCaseListModel` 共用）。
 *
 * @param filters - 界面筛选状态
 * @param customerId - 客户 ID 过滤，无则 undefined
 * @param riskBucket - 风险桶（dashboard 注入），无则 undefined
 * @param page - 页码（从 1 起）
 * @param limit - 每页条数
 * @returns `CaseRepository.listCases` 使用的查询参数
 */
export function buildCaseListRequestParams(
  filters: CaseListFiltersState,
  customerId: string | undefined,
  riskBucket: string | undefined,
  page: number,
  limit: number,
): CaseListParams {
  const resolvedGroup = resolveCaseListGroupFilterForApi(filters.group ?? "");
  return {
    scope: filters.scope || undefined,
    search: filters.search || undefined,
    stage: filters.stage || undefined,
    owner: filters.owner || undefined,
    group: resolvedGroup || undefined,
    risk: filters.risk || undefined,
    riskBucket: riskBucket || undefined,
    customerId,
    page,
    limit,
  };
}

/**
 * 当分页首屏不足以覆盖匹配总数时，再拉一批案件用于汇总卡片（单批上限为 `CASE_LIST_SUMMARY_BASIS_CAP`，与后端 list `limit` 上限一致）。
 *
 * @param repository - 案件仓储
 * @param filters - 与当前列表相同的筛选状态
 * @param customerId - 客户过滤
 * @param riskBucket - 风险并集桶过滤
 * @param gen - 本次拉取代数，用于丢弃过期异步结果
 * @param getGeneration - 返回当前最新拉取代数
 * @param pageBatch - 已拿到的当前页列表结果（含 total）
 * @returns 用作 `adaptCaseSummaryCards` 输入的案件行集合
 */
export async function fetchWideCaseListSummaryBasis(
  repository: CaseRepository,
  filters: CaseListFiltersState,
  customerId: string | undefined,
  riskBucket: string | undefined,
  gen: number,
  getGeneration: () => number,
  pageBatch: CaseListResult,
): Promise<CaseListItem[]> {
  const basis = pageBatch.items;
  const capped = Math.min(pageBatch.total, CASE_LIST_SUMMARY_BASIS_CAP);
  const needsWide =
    pageBatch.total > pageBatch.items.length && capped > pageBatch.items.length;
  if (!needsWide) return basis;
  const wideParams = buildCaseListRequestParams(
    filters,
    customerId,
    riskBucket,
    1,
    capped,
  );
  try {
    const wide = await repository.listCases(wideParams);
    if (gen !== getGeneration()) return basis;
    return wide.items;
  } catch {
    if (gen !== getGeneration()) return basis;
    return pageBatch.items;
  }
}
