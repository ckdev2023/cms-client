/** 案件标识展示工具：列表与详情共用同一格式化口径，避免详情页回退到 UUID。 */

/**
 * 计算案件可读标识。
 *
 * 优先返回业务编号 `caseNo`（如 `CASE-202604-0003`）；当其缺失或仅含空白时回退到内部 `id`（UUID）。
 * 列表行 (`CaseTableRow`) 与详情头部面包屑 (`CaseDetailView`) 共用此 helper，保证两处展示始终一致。
 *
 * @param caseNo - 后端下发的业务编号，可能为空或缺失。
 * @param id - 内部主键 UUID，作为兜底文案；不应为空。
 * @returns 可直接展示在 UI 上的案件标识字符串。
 */
export function formatCaseIdentity(
  caseNo: string | null | undefined,
  id: string,
): string {
  const trimmed = typeof caseNo === "string" ? caseNo.trim() : "";
  return trimmed || id;
}
