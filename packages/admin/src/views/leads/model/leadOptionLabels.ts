/**
 * 线索选项值 → 本地化标签解析器。
 *
 * 服务端在详情聚合中通常透传枚举原值（如 `walkin` / `highly-skilled` /
 * `admin`），UI 层需根据当前 locale 显示可读文案；当遇到未知值或服务端
 * 已下发预翻译标签（如 fixture 中的 `"介绍"`）时，原样回传，避免吞掉
 * 既有显示。
 */

import {
  normalizeBusinessType,
  resolveBusinessTypeLabel,
} from "../../../shared/i18n/businessTypes";

type Translate = (key: string) => string;

const SOURCE_LABEL_KEYS: Readonly<Record<string, string>> = {
  web: "leads.options.source.web",
  referral: "leads.options.source.referral",
  walkin: "leads.options.source.walkin",
  phone: "leads.options.source.phone",
  other: "leads.options.source.other",
};

const LANGUAGE_LABEL_KEYS: Readonly<Record<string, string>> = {
  ja: "leads.options.language.ja",
  zh: "leads.options.language.zh",
  en: "leads.options.language.en",
  vi: "leads.options.language.vi",
};

const CREATED_VIA_LABEL_KEYS: Readonly<Record<string, string>> = {
  admin: "leads.options.createdVia.admin",
  app_user: "leads.options.createdVia.appUser",
  portal: "leads.options.createdVia.portal",
};

/**
 * 服务端 `leads.source` 在管理端创建等场景可能为 `admin` / `app_user` /
 * `portal`（表示录入路径），不代表营销来源；不可与 `source_channel` 混用。
 *
 * @param value - 服务端 `source` 列或其它上下文字符串。
 * @returns `true` 表示该值仅代表录入路径，不应作为营销来源展示。
 */
export function isLeadCreationPathSource(value: string): boolean {
  return Boolean(value && Object.hasOwn(CREATED_VIA_LABEL_KEYS, value));
}

function resolveByMap(
  value: string,
  map: Readonly<Record<string, string>>,
  t: Translate,
): string {
  if (!value) return "";
  const key = map[value];
  return key ? t(key) : value;
}

/**
 * 将线索来源枚举值解析为本地化标签。
 *
 * @param value - 来源枚举值（如 `walkin`）；空字符串返回空串。
 * @param t - vue-i18n 的 `t` 翻译函数。
 * @returns 本地化标签；未识别的值原样返回。
 */
export function resolveLeadSourceLabel(value: string, t: Translate): string {
  return resolveByMap(value, SOURCE_LABEL_KEYS, t);
}

/**
 * 将首选语言枚举值解析为本地化标签。
 *
 * @param value - 语言枚举值（如 `zh`）。
 * @param t - vue-i18n 的 `t` 翻译函数。
 * @returns 本地化标签；未识别的值原样返回。
 */
export function resolveLeadLanguageLabel(value: string, t: Translate): string {
  return resolveByMap(value, LANGUAGE_LABEL_KEYS, t);
}

/**
 * 将创建路径枚举值解析为本地化标签。
 *
 * @param value - 创建路径枚举值（`admin` / `app_user` / `portal`）。
 * @param t - vue-i18n 的 `t` 翻译函数。
 * @returns 本地化标签；未识别的值原样返回。
 */
export function resolveLeadCreatedViaLabel(
  value: string,
  t: Translate,
): string {
  return resolveByMap(value, CREATED_VIA_LABEL_KEYS, t);
}

/**
 * 将业务类型枚举值解析为本地化标签。
 *
 * 内部走 `normalizeBusinessType` 兼容旧值（如 `business-manager` →
 * `business-management-visa`），未识别的值原样返回，保留 fixture 已经
 * 预翻译过的字面量（如 `"家族滞在"`）继续展示。
 *
 * 第二参数支持 locale 字符串（优先）或 `t` 翻译函数（向后兼容，
 * 下一 release 移除）。传入 locale 时直接走 shared catalog，不再
 * 经由 i18n `t()` 间接查找。
 *
 * @param value     业务类型枚举值（如 `highly-skilled`）
 * @param localeOrT locale 字符串或 vue-i18n `t` 函数（向后兼容）
 * @returns 本地化标签；未识别的值原样返回
 */
export function resolveLeadBusinessTypeLabel(
  value: string,
  localeOrT: string | Translate,
): string {
  if (!value) return "";
  const normalized = normalizeBusinessType(value);
  if (!normalized) return value;

  if (typeof localeOrT === "string") {
    return resolveBusinessTypeLabel(normalized, localeOrT, "primary");
  }

  // @deprecated — 传入 t 函数的旧路径；下一 release 移除
  return resolveBusinessTypeLabel(normalized, undefined, "primary");
}
