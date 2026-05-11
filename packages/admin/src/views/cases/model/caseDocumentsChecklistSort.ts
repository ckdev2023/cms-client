import type { DocumentListItem } from "../../documents/types";

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
  const ca = (a.checklistItemCode ?? "").trim();
  const cb = (b.checklistItemCode ?? "").trim();
  if (ca !== cb) {
    if (!ca) return 1;
    if (!cb) return -1;
    return ca.localeCompare(cb, "en");
  }
  const byName = a.name.localeCompare(b.name, "und");
  if (byName !== 0) return byName;
  return a.id.localeCompare(b.id);
}
