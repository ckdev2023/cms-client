import type { CustomerLocalizedNames } from "../types-detail";
import { readString } from "./CaseAdapterShared";

const EMPTY_LOCALIZED_NAMES: CustomerLocalizedNames = {
  zh: "",
  ja: "",
  en: "",
};

/**
 * deepLink 中提取多语言顾客名称。
 *
 * @param dl - deepLink 原始数据对象
 * @returns 多语言名称对象
 */
export function buildCustomerLocalizedNames(
  dl: Record<string, unknown> | null,
): CustomerLocalizedNames {
  if (!dl) return { ...EMPTY_LOCALIZED_NAMES };
  return {
    zh: readString(dl, "customerNameZh"),
    ja: readString(dl, "customerNameJa"),
    en: readString(dl, "customerNameEn"),
  };
}

const LOCALE_TO_NAME_KEY: Record<string, keyof CustomerLocalizedNames> = {
  "zh-CN": "zh",
  "ja-JP": "ja",
  "en-US": "en",
};

/**
 * 按 UI locale 选择顾客多语言名称，无匹配时 fallback 到默认名。
 *
 * @param names - 多语言名称对象
 * @param fallback - 默认名称（通常为 `detail.client`）
 * @param locale - 当前 UI locale（如 `zh-CN`、`ja-JP`、`en-US`）
 * @returns 与当前 locale 匹配的顾客名，无匹配时返回 fallback
 */
export function resolveLocalizedCustomerName(
  names: CustomerLocalizedNames | null | undefined,
  fallback: string,
  locale: string,
): string {
  if (!names) return fallback;
  const key = LOCALE_TO_NAME_KEY[locale];
  if (key && names[key]) return names[key];
  return fallback;
}
