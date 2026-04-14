import { createI18n } from "vue-i18n";
import enUS from "./messages/en-US";
import jaJP from "./messages/ja-JP";
import zhCN from "./messages/zh-CN";
import {
  DEFAULT_LOCALE,
  detectPreferredLocale,
  localeOptions,
  persistLocale,
  readStoredLocale,
  syncDocumentLanguage,
  type AppLocale,
} from "./locale";

const messages = {
  "zh-CN": zhCN,
  "en-US": enUS,
  "ja-JP": jaJP,
} as const;

const initialLocale = resolveInitialLocale();

export const i18n = createI18n({
  legacy: false,
  globalInjection: true,
  locale: initialLocale,
  fallbackLocale: DEFAULT_LOCALE,
  messages,
});

syncDocumentLanguage(
  initialLocale,
  typeof document !== "undefined" ? document : undefined,
);

/**
 * 返回当前应用语言。
 *
 * @returns 当前激活的语言值
 */
export function getCurrentLocale(): AppLocale {
  return i18n.global.locale.value as AppLocale;
}

/**
 * 切换应用语言，并同步到本地持久化与文档根节点。
 *
 * @param locale 目标语言
 */
export function setAppLocale(locale: AppLocale): void {
  i18n.global.locale.value = locale;

  if (typeof window !== "undefined") {
    persistLocale(locale, window.localStorage);
  }

  syncDocumentLanguage(
    locale,
    typeof document !== "undefined" ? document : undefined,
  );
}

export { localeOptions };
export type { AppLocale };

/**
 * 解析应用启动时应使用的语言。
 *
 * @returns 初始语言值
 */
function resolveInitialLocale(): AppLocale {
  const stored =
    typeof window !== "undefined"
      ? readStoredLocale(window.localStorage)
      : undefined;
  if (stored) return stored;

  return detectPreferredLocale(
    typeof navigator !== "undefined" ? navigator : undefined,
  );
}
