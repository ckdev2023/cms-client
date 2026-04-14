export const LOCALE_STORAGE_KEY = "cms-admin-locale";

export const SUPPORTED_LOCALES = ["zh-CN", "en-US", "ja-JP"] as const;

/**
 * 应用当前支持的语言代码。
 */
export type AppLocale = (typeof SUPPORTED_LOCALES)[number];

/**
 * 语言下拉选项定义。
 */
export interface LocaleOption {
  /**
   * 选项对应的语言代码。
   */
  value: AppLocale;
  /**
   * 选项展示名称。
   */
  label: string;
}

interface LocaleNavigatorLike {
  language?: string;
  languages?: readonly string[];
}

interface LocaleStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const DEFAULT_LOCALE: AppLocale = "zh-CN";

export const localeOptions: LocaleOption[] = [
  { value: "zh-CN", label: "简体中文" },
  { value: "en-US", label: "English" },
  { value: "ja-JP", label: "日本語" },
];

/**
 * 将浏览器语言或持久化值归一化到当前支持的语言集合。
 *
 * @param input 原始语言值，例如 `en`、`en-US`、`zh-CN`
 * @returns 归一化后的应用语言；不支持时返回 `undefined`
 */
export function normalizeLocale(input?: string | null): AppLocale | undefined {
  if (!input) return undefined;

  const normalized = input.trim().toLowerCase();
  if (normalized.startsWith("zh")) return "zh-CN";
  if (normalized.startsWith("en")) return "en-US";
  if (normalized.startsWith("ja")) return "ja-JP";

  return undefined;
}

/**
 * 从浏览器语言偏好中推断应用启动语言。
 *
 * @param navigatorLike 可注入的浏览器语言对象，便于测试
 * @returns 当前应用应使用的初始语言
 */
export function detectPreferredLocale(
  navigatorLike?: LocaleNavigatorLike,
): AppLocale {
  const candidates = [
    ...(navigatorLike?.languages ?? []),
    navigatorLike?.language,
  ].filter(Boolean);

  for (const candidate of candidates) {
    const locale = normalizeLocale(candidate);
    if (locale) return locale;
  }

  return DEFAULT_LOCALE;
}

/**
 * 读取本地持久化语言配置。
 *
 * @param storageLike 可注入的存储实现，默认使用浏览器 `localStorage`
 * @returns 已保存的语言；不存在或无效时返回 `undefined`
 */
export function readStoredLocale(
  storageLike?: LocaleStorageLike,
): AppLocale | undefined {
  if (!storageLike) return undefined;

  try {
    return normalizeLocale(storageLike.getItem(LOCALE_STORAGE_KEY));
  } catch {
    return undefined;
  }
}

/**
 * 持久化当前语言到本地存储。
 *
 * @param locale 当前要保存的语言值
 * @param storageLike 可注入的存储实现，默认使用浏览器 `localStorage`
 */
export function persistLocale(
  locale: AppLocale,
  storageLike?: LocaleStorageLike,
): void {
  if (!storageLike) return;

  try {
    storageLike.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // 存储失败时保持静默，避免影响主界面渲染。
  }
}

/**
 * 同步当前语言到文档根节点，便于屏幕阅读器和浏览器识别。
 *
 * @param locale 当前应用语言
 * @param doc 可注入的文档对象，便于测试
 */
export function syncDocumentLanguage(
  locale: AppLocale,
  doc?: Pick<Document, "documentElement">,
): void {
  doc?.documentElement?.setAttribute("lang", locale);
}
