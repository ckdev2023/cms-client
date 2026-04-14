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
  /**
   *
   */
  label: string;
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
  /**
   *
   */
  label: string;
}

const COLLECTED_STATUS = "approved";
const WAIVED_STATUS = "waived";

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
    return { collected: 0, total: 0, percent: 0, label: "无必需资料" };
  }

  const percent = Math.round((collected / total) * 100);
  return {
    collected,
    total,
    percent,
    label: `${collected} / ${total} 完成`,
  };
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
    label: rate.label,
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
 * 判断资料清单是否为空状态（无任何分组或分组内全无资料项）。
 *
 * @param groups - 提供方分组数组
 * @returns 是否为空
 */
export function isDocumentListEmpty(groups: DocumentGroup[]): boolean {
  if (groups.length === 0) return true;
  return groups.every((g) => g.items.length === 0);
}
