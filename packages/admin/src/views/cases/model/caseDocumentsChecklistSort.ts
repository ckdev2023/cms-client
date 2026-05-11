import type { DocumentListItem } from "../../documents/types";

/**
 * 蓝图 slug（`checklist_item_code`）的稳定字典序。
 * 与 `compareDocumentListItemsForChecklistStableOrder`、建案预览段内条目排序共用。
 *
 * @param slugA - slug A（可为空）
 * @param slugB - slug B（可为空）
 * @returns 负数表示 `slugA` 在前；零表示 slug 等价需继续 tie-break；正数表示 `slugB` 在前
 */
export function compareChecklistSlugStableOrder(
  slugA: string | undefined | null,
  slugB: string | undefined | null,
): number {
  const ca = (slugA ?? "").trim();
  const cb = (slugB ?? "").trim();
  if (ca !== cb) {
    if (!ca) return 1;
    if (!cb) return -1;
    return ca.localeCompare(cb, "en");
  }
  return 0;
}

/**
 * 比较两条资料清单行在同一提供方分组内的稳定顺序。
 *
 * 优先比较 `checklistItemCode`（蓝图 slug）；缺省时排在有 code 的行之后；
 * code 相同则比较资料名称与行 id。
 *
 * @param a - 资料列表行（`DocumentRepository.listDocuments`）
 * @param b - 资料列表行
 * @returns 负数表示 `a` 应排在 `b` 前；正数表示 `b` 在前；零表示等价
 */
export function compareDocumentListItemsForChecklistStableOrder(
  a: DocumentListItem,
  b: DocumentListItem,
): number {
  const bySlug = compareChecklistSlugStableOrder(
    a.checklistItemCode,
    b.checklistItemCode,
  );
  if (bySlug !== 0) return bySlug;
  const byName = a.name.localeCompare(b.name, "und");
  if (byName !== 0) return byName;
  return a.id.localeCompare(b.id);
}
