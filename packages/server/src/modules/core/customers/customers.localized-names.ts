import type { CustomerLocalizedNames } from "./customers.types";

/**
 * 将 `localizedNames` 输入合并到 `baseProfile` 对应字段。
 * @param baseProfile - 现有基础档案
 * @param localizedNames - 多语言名称输入
 * @returns 合并后的基础档案
 */
export function mergeLocalizedNamesIntoProfile(
  baseProfile: Record<string, unknown>,
  localizedNames: CustomerLocalizedNames | undefined,
): Record<string, unknown> {
  if (!localizedNames) return baseProfile;
  const merged = { ...baseProfile };
  if (localizedNames.zh !== undefined) {
    merged.name_cn = localizedNames.zh ?? undefined;
  }
  if (localizedNames.ja !== undefined) {
    merged.name_jp = localizedNames.ja ?? undefined;
  }
  if (localizedNames.en !== undefined) {
    merged.name_en = localizedNames.en ?? undefined;
  }
  if (localizedNames.defaultLocale !== undefined) {
    merged.name_default_locale = localizedNames.defaultLocale ?? undefined;
  }
  return merged;
}

/**
 * 从 `baseProfile` 中提取多语言名称并投影为 DTO 字段。
 * @param baseProfile - 客户基础档案
 * @returns 多语言名称 DTO
 */
export function resolveLocalizedNamesFromProfile(
  baseProfile: Record<string, unknown>,
): CustomerLocalizedNames {
  const zh = normalizeToNullableString(baseProfile.name_cn);
  const ja = normalizeToNullableString(baseProfile.name_jp);
  const en = normalizeToNullableString(baseProfile.name_en);
  const rawLocale = normalizeToNullableString(baseProfile.name_default_locale);
  const defaultLocale =
    rawLocale === "zh" || rawLocale === "ja" || rawLocale === "en"
      ? rawLocale
      : null;
  return { zh, ja, en, defaultLocale };
}

function normalizeToNullableString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
