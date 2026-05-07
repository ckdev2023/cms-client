/**
 * 线索选项值 → 本地化标签解析器。
 *
 * 服务端在详情聚合中通常透传枚举原值（如 `walkin` / `highly-skilled` /
 * `admin`），UI 层需根据当前 locale 显示可读文案；当遇到未知值或服务端
 * 已下发预翻译标签（如 fixture 中的 `"介绍"`）时，原样回传，避免吞掉
 * 既有显示。
 */

import {
  BUSINESS_TYPE_OPTIONS_I18N,
  normalizeBusinessType,
} from "../../../i18n/messages/_shared/businessTypes";

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
 * @param value - 业务类型枚举值（如 `highly-skilled`）。
 * @param t - vue-i18n 的 `t` 翻译函数。
 * @returns 本地化标签；未识别的值原样返回。
 */
export function resolveLeadBusinessTypeLabel(
  value: string,
  t: Translate,
): string {
  if (!value) return "";
  const normalized = normalizeBusinessType(value);
  if (!normalized) return value;
  const opt = BUSINESS_TYPE_OPTIONS_I18N.find((o) => o.value === normalized);
  return opt ? t(opt.labelKey) : value;
}
