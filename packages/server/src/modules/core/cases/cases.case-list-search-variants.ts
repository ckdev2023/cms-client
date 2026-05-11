/**
 * 将简体「经营」与日语常用表记「経営」互转生成 SQL / 前台过滤用的等价关键词。
 *
 * @param raw - 用户输入的案件列表关键字
 * @returns 去重后的搜索词变体序列
 */
export function expandCaseListSearchVariants(raw: string): string[] {
  const trimmed = raw.trim();
  if (!trimmed.length) return [];

  const variants = new Set<string>([trimmed]);
  if (trimmed.includes("经营"))
    variants.add(trimmed.replaceAll("经营", "経営"));
  if (trimmed.includes("経営"))
    variants.add(trimmed.replaceAll("経営", "经营"));
  return [...variants];
}
