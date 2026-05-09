import type { ValidationData } from "../types-detail";

const STALE_THRESHOLD_MS = 5_000;

/**
 * lastTimeIso が dataMaxUpdatedAt より STALE_THRESHOLD_MS 以上古い場合に
 * true を返す（データ変更後に自動復算がまだ反映されていない状態）。
 *
 * いずれかの ISO 文字列が空／不正な場合は false（安全側）。
 *
 * @param v - 校验データ
 * @returns stale 状態かどうか
 */
export function isValidationStale(v: ValidationData): boolean {
  if (!v.lastTimeIso || !v.dataMaxUpdatedAt) return false;
  const runMs = new Date(v.lastTimeIso).getTime();
  const dataMs = new Date(v.dataMaxUpdatedAt).getTime();
  if (Number.isNaN(runMs) || Number.isNaN(dataMs)) return false;
  return dataMs - runMs > STALE_THRESHOLD_MS;
}
