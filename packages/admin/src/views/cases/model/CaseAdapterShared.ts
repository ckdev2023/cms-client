import type { CaseStageId } from "../types";

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

const VALID_STAGES = new Set<string>([
  "S1",
  "S2",
  "S3",
  "S4",
  "S5",
  "S6",
  "S7",
  "S8",
  "S9",
]);

/**
 * 将原始阶段字符串解析为类型化的 `CaseStageId`。
 *
 * @param value - 原始阶段字符串
 * @returns 类型化阶段 ID，无法识别时默认 `"S1"`
 */
export function resolveStageId(value: string): CaseStageId {
  return VALID_STAGES.has(value) ? (value as CaseStageId) : "S1";
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
 * 将 ISO 日期字符串格式化为 ja-JP 本地化显示。
 *
 * @param isoString - ISO 时间戳或 `null`
 * @returns 格式化日期或 `""`
 */
export function formatDate(isoString: string | null): string {
  if (!isoString) return "";
  try {
    const d = new Date(isoString);
    return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("ja-JP");
  } catch {
    return "";
  }
}
