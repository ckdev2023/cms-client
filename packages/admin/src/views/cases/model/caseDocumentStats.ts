import type { DocumentGroup, DocumentItem } from "../types-detail";

/**
 * 按提供方完成率统计。
 */
export interface ProviderCompletionStat {
  /**
   *
   */
  group: string;
  /**
   *
   */
  collected: number;
  /**
   *
   */
  total: number;
  /**
   *
   */
  percent: number;
}

/**
 * 案件资料总体完成率统计。
 */
export interface CaseDocumentCompletionRate {
  /**
   *
   */
  collected: number;
  /**
   *
   */
  total: number;
  /**
   *
   */
  percent: number;
}

const COLLECTED_STATUS = "approved";
const WAIVED_STATUS = "waived";
const REVIEWING_STATUS = "uploaded_reviewing";

/**
 * 资料项按状态分桶统计。
 */
export interface DocumentStatusBreakdown {
  /**
   *
   */
  approved: number;
  /**
   *
   */
  reviewing: number;
  /**
   *
   */
  pending: number;
  /**
   *
   */
  waived: number;
  /**
   *
   */
  total: number;
}

/**
 * 判断资料项是否已通过。
 *
 * @param item - 资料项
 * @returns 是否已通过
 */
export function isDocumentCollected(item: DocumentItem): boolean {
  return item.status === COLLECTED_STATUS;
}

/**
 * 判断资料项是否被免除。
 *
 * @param item - 资料项
 * @returns 是否被免除
 */
export function isDocumentWaived(item: DocumentItem): boolean {
  return item.status === WAIVED_STATUS;
}

/**
 * 从资料项数组计算完成率（waived 不计入分母）。
 *
 * @param items - 资料项数组
 * @returns 完成率统计
 */
export function computeItemsCompletionRate(
  items: DocumentItem[],
): CaseDocumentCompletionRate {
  const waivedCount = items.filter(isDocumentWaived).length;
  const total = items.length - waivedCount;
  const collected = items.filter(isDocumentCollected).length;

  if (total <= 0) {
    return { collected: 0, total: 0, percent: 0 };
  }

  const percent = Math.round((collected / total) * 100);
  return { collected, total, percent };
}

/**
 * 计算单个提供方分组的完成率（waived 不计入分母）。
 *
 * @param group - 提供方分组
 * @returns 提供方完成率统计
 */
export function computeProviderStat(
  group: DocumentGroup,
): ProviderCompletionStat {
  const rate = computeItemsCompletionRate(group.items);
  return {
    group: group.group,
    collected: rate.collected,
    total: rate.total,
    percent: rate.percent,
  };
}

/**
 * 计算案件详情中所有提供方分组的完成率。
 *
 * @param groups - 提供方分组数组
 * @returns 各提供方完成率统计
 */
export function computeAllProviderStats(
  groups: DocumentGroup[],
): ProviderCompletionStat[] {
  return groups.map(computeProviderStat);
}

/**
 * 计算案件详情的总体资料完成率（waived 不计入分母，跨所有分组合并）。
 *
 * @param groups - 提供方分组数组
 * @returns 总体完成率统计
 */
export function computeCaseDocumentCompletionRate(
  groups: DocumentGroup[],
): CaseDocumentCompletionRate {
  const allItems = groups.flatMap((g) => g.items);
  return computeItemsCompletionRate(allItems);
}

/**
 * 按状态分桶统计（waived 不计入 total）。
 *
 * @param items 资料行列表
 * @returns 已通过 / 待审核 / 待提交 / 已豁免 / 总数（不含 waived）
 */
export function computeDocumentStatusBreakdown(
  items: DocumentItem[],
): DocumentStatusBreakdown {
  let approved = 0;
  let reviewing = 0;
  let waived = 0;
  for (const item of items) {
    if (item.status === COLLECTED_STATUS) approved++;
    else if (item.status === REVIEWING_STATUS) reviewing++;
    else if (item.status === WAIVED_STATUS) waived++;
  }
  const total = items.length - waived;
  const pending = total - approved - reviewing;
  return { approved, reviewing, pending, waived, total };
}

/**
 * 按状态分桶统计所有分组合并后的结果。
 *
 * @param groups 资料分组列表
 * @returns 合并所有分组下资料行的状态分桶统计
 */
export function computeGroupsStatusBreakdown(
  groups: DocumentGroup[],
): DocumentStatusBreakdown {
  return computeDocumentStatusBreakdown(groups.flatMap((g) => g.items));
}

/**
 * 判断资料清单是否为空状态（无任何分组或分组内全无资料项）。
 *
 * @param groups - 提供方分组数组
 * @returns 是否为空
 */
export function isDocumentListEmpty(groups: DocumentGroup[]): boolean {
  if (groups.length === 0) return true;
  return groups.every((g) => g.items.length === 0);
}

/**
 * 完成率分母为 0 时，顶栏/分组副标题用的 i18n key（有行但全豁免 vs 真无项）。
 *
 * @param hasAnyDocumentRows - 当前统计范围内是否存在资料行（含已豁免）
 * @returns `completion.allWaived` 或 `completion.empty` 文案键
 */
export function completionZeroDenominatorMessageKey(
  hasAnyDocumentRows: boolean,
):
  | "cases.detail.documents.completion.allWaived"
  | "cases.detail.documents.completion.empty" {
  return hasAnyDocumentRows
    ? "cases.detail.documents.completion.allWaived"
    : "cases.detail.documents.completion.empty";
}
