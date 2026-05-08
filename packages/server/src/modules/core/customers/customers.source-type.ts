import type { CustomerSourceType } from "./customers.types";
import { CUSTOMER_SOURCE_TYPES } from "./customers.types";

const SOURCE_CHANNEL_TO_TYPE: Record<string, CustomerSourceType> = {
  web: "WEB",
  referral: "REFERRAL",
  ad: "ADS",
  ads: "ADS",
};

/**
 * base_profile から sourceType を解決する。
 * 優先順位: legacy sourceType/source_type → sourceChannel 互換マッピング。
 *
 * @param bp - base_profile のレコード
 * @param pickOptionalString - 文字列ピッカー関数
 * @returns 解決済み CustomerSourceType または null
 */
export function pickSourceType(
  bp: Record<string, unknown>,
  pickOptionalString: (
    record: Record<string, unknown>,
    fields: readonly string[],
  ) => string | null,
): CustomerSourceType | null {
  const raw = pickOptionalString(bp, ["sourceType", "source_type"]);
  const legacy =
    raw && (CUSTOMER_SOURCE_TYPES as readonly string[]).includes(raw)
      ? (raw as CustomerSourceType)
      : null;
  if (legacy) return legacy;
  const ch = pickOptionalString(bp, ["sourceChannel", "source_channel"]);
  return ch ? (SOURCE_CHANNEL_TO_TYPE[ch.toLowerCase()] ?? null) : null;
}
