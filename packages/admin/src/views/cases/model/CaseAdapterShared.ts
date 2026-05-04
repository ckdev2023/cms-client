import type { CaseStageId } from "../types";
import { CASE_STAGES } from "../constants";

/**
 * 安全地将 unknown 值转为 record（仅当值为非数组对象时）。
 *
 * @param value - 待检查的值
 * @returns 一个 record，若非普通对象则返回 `null`
 */
export function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/**
 * 从 record 中读取字符串字段，缺省返回 `""`。
 *
 * @param record - 来源记录
 * @param key - 字段键名
 * @returns 字符串值或 `""`
 */
export function readString(
  record: Record<string, unknown>,
  key: string,
): string {
  const v = record[key];
  return typeof v === "string" ? v : "";
}

/**
 * 从 record 中读取可空字符串字段。
 *
 * @param record - 来源记录
 * @param key - 字段键名
 * @returns 字符串值，若缺失则返回 `null`
 */
export function readNullableString(
  record: Record<string, unknown>,
  key: string,
): string | null {
  const v = record[key];
  if (v === null || v === undefined) return null;
  return typeof v === "string" ? v : null;
}

/**
 * 从 record 中读取字符串字段，空字符串视为缺失，返回 `undefined`。
 *
 * @param record - 来源记录
 * @param key - 字段键名
 * @returns 非空字符串值或 `undefined`
 */
export function readOptionalString(
  record: Record<string, unknown>,
  key: string,
): string | undefined {
  const v = record[key];
  return typeof v === "string" && v ? v : undefined;
}

/**
 * 从 record 中读取数值字段，缺省返回 `0`。
 *
 * @param record - 来源记录
 * @param key - 字段键名
 * @returns 有限数值或 `0`
 */
export function readNumber(
  record: Record<string, unknown>,
  key: string,
): number {
  const v = record[key];
  if (typeof v === "number" && Number.isFinite(v)) return v;
  return 0;
}

/**
 * 从 record 中读取布尔字段（严格 `true` 检查）。
 *
 * @param record - 来源记录
 * @param key - 字段键名
 * @returns 仅当字段为字面量 `true` 时返回 `true`
 */
export function readBoolean(
  record: Record<string, unknown>,
  key: string,
): boolean {
  return record[key] === true;
}

/**
 * 将原始阶段字符串解析为类型化的 `CaseStageId`。
 *
 * @param value - 原始阶段字符串
 * @returns 类型化阶段 ID，无法识别时默认 `"S1"`
 */
export function resolveStageId(value: string): CaseStageId {
  return value in CASE_STAGES ? (value as CaseStageId) : "S1";
}

/**
 * 将阶段 ID 映射为 fallback 标签（不经过 i18n）。
 *
 * @param stageId - 类型化阶段 ID
 * @returns 中文 fallback 标签；未匹配时返回原始值
 */
export function resolveStageLabel(stageId: CaseStageId): string {
  return CASE_STAGES[stageId]?.label ?? stageId;
}

/**
 * 将阶段 ID 映射为 i18n key，供 `t()` 翻译。
 *
 * @param stageId - 类型化阶段 ID
 * @returns i18n key；未匹配时返回 `""`
 */
export function resolveStageI18nKey(stageId: CaseStageId): string {
  return CASE_STAGES[stageId]?.i18nKey ?? "";
}

/**
 * 将阶段 ID 映射为 badge 类名（对齐 `BADGE_TONE_MAP`）。
 *
 * @param stageId - 类型化阶段 ID
 * @returns badge 类名（如 `"badge-orange"`）
 */
export function resolveStageBadge(stageId: CaseStageId): string {
  return CASE_STAGES[stageId]?.badge ?? "badge-gray";
}

/**
 * 判断截止日期是否处于紧急状态（已过期或 `thresholdDays` 天内到期）。
 *
 * @param dueAt - ISO 日期字符串或 `null`
 * @param thresholdDays - 紧急阈值天数，默认 7
 * @returns `true` 表示到期日在阈值内或已过期
 */
export function isDeadlineDanger(
  dueAt: string | null,
  thresholdDays = 7,
): boolean {
  if (!dueAt) return false;
  try {
    const due = new Date(dueAt);
    if (Number.isNaN(due.getTime())) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    const diffDays = (due.getTime() - today.getTime()) / 86_400_000;
    return diffDays <= thresholdDays;
  } catch {
    return false;
  }
}

/**
 * 将风险等级字符串映射为三级风险状态。
 *
 * @param riskLevel - 服务端返回的风险等级
 * @returns 标准化后的风险状态
 */
export function resolveRiskStatus(
  riskLevel: string,
): "normal" | "attention" | "critical" {
  if (riskLevel === "high" || riskLevel === "critical") return "critical";
  if (riskLevel === "medium" || riskLevel === "attention") return "attention";
  return "normal";
}

/**
 * 从原始校验记录中推导校验状态。
 *
 * @param latestVr - 最新校验运行记录
 * @returns `"passed"`、`"pending"` 或 `"failed"` 之一
 */
export function resolveValidationStatus(
  latestVr: unknown,
): "passed" | "pending" | "failed" {
  const record = asRecord(latestVr);
  if (!record) return "pending";
  const status = readString(record, "status");
  if (status === "passed") return "passed";
  if (status === "failed") return "failed";
  return "pending";
}

/**
 * 将 ISO 日期字符串格式化为零填充 slash 格式 `YYYY/MM/DD`。
 *
 * @param isoString - ISO 时间戳或 `null`
 * @returns 格式化日期或 `""`
 */
export function formatDate(isoString: string | null): string {
  if (!isoString) return "";
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}/${m}/${day}`;
}

/**
 * ISO 日期字符串 → `YYYY-MM-DD`（HTML date input 用）。
 *
 * @param isoString - ISO 时间戳或 `null`
 * @returns `YYYY-MM-DD` 或 `""`
 */
export function toDateInputValue(isoString: string | null): string {
  if (!isoString) return "";
  try {
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return "";
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  } catch {
    return "";
  }
}
