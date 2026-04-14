import type { CompletionRate, DocumentItemStatus } from "./types";
import {
  LEGACY_STATUS_MAP,
  STATUS_SORT_PRIORITY,
  STATUS_TRANSITIONS,
} from "./constants";

// ─── relative_path validation (P0-CONTRACT §8.1.2) ──────────────

const CONTROL_CHAR_RE = /[\x00-\x1f\x7f]/;
const WINDOWS_ABSOLUTE_RE = /^[A-Za-z]:\\/;

const RELATIVE_PATH_ERROR = "请输入有效的相对路径（不含 .. 或绝对路径前缀）";

/**
 * 校验 `relative_path`。
 *
 * @param path - 待校验的相对路径字符串
 * @returns 错误消息或 `null`（合法）
 */
export function validateRelativePath(path: string): string | null {
  if (!path || !path.trim()) return RELATIVE_PATH_ERROR;
  if (path.includes("..")) return RELATIVE_PATH_ERROR;
  if (path.startsWith("~")) return RELATIVE_PATH_ERROR;
  if (path.startsWith("/")) return RELATIVE_PATH_ERROR;
  if (WINDOWS_ABSOLUTE_RE.test(path)) return RELATIVE_PATH_ERROR;
  if (CONTROL_CHAR_RE.test(path)) return RELATIVE_PATH_ERROR;
  return null;
}

// ─── Completion rate (§6.3) ─────────────────────────────────────

/**
 * 计算资料完成率（waived 不计入分母）。
 *
 * @param statuses - 资料项状态数组
 * @returns 完成率结构体
 */
export function computeCompletionRate(
  statuses: DocumentItemStatus[],
): CompletionRate {
  const waivedCount = statuses.filter((s) => s === "waived").length;
  const total = statuses.length - waivedCount;
  const collected = statuses.filter((s) => s === "approved").length;

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

// ─── Status sort comparator (§3.1) ─────────────────────────────

/**
 * 获取状态的默认排序优先级（数值越小越靠前）。
 *
 * @param status - 资料项状态
 * @returns 排序权重
 */
export function getStatusSortPriority(status: DocumentItemStatus): number {
  return STATUS_SORT_PRIORITY[status] ?? 99;
}

// ─── Legacy status mapping (§6.4) ───────────────────────────────

/**
 * 将 case-detail 旧状态 key 映射到 P0 权威状态。
 *
 * @param legacyKey - 旧状态 key（如 `idle`、`submitted`、`done`）
 * @returns P0 状态；未识别时回退为 `pending`
 */
export function mapLegacyStatus(legacyKey: string): DocumentItemStatus {
  return LEGACY_STATUS_MAP[legacyKey] ?? "pending";
}

// ─── Transition guard ───────────────────────────────────────────

/**
 * 判断是否允许从 `from` 状态流转到 `to` 状态。
 *
 * @param from - 当前状态
 * @param to - 目标状态
 * @returns 是否允许流转
 */
export function canTransition(
  from: DocumentItemStatus,
  to: DocumentItemStatus,
): boolean {
  return STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

// ─── Batch selectable guard (§10) ───────────────────────────────

/**
 * 判断资料项是否可被批量操作选中（approved/waived 不可选）。
 *
 * @param status - 资料项状态
 * @returns 是否可选
 */
export function isSelectableForBatch(status: DocumentItemStatus): boolean {
  return status !== "approved" && status !== "waived";
}
