/**
 * 共享 timeline 文案解析器 — CaseLogTab 与 CaseOverviewTab 共用。
 *
 * Adapter 层返回的 params 中包含「待翻译的 i18n key」（如 `cases.constants.phases.APPROVED`），
 * 视图层需先把这些 key 翻译成当前 locale 下的文案，再传给外层 `t()` 做最终插值。
 */

/**
 * timeline 条目中与文案解析有关的最小字段集。
 */
export interface TimelineTextSource {
  /** i18n key（如 `cases.log.timeline.phaseChange`）。 */
  text: string;
  /** 插值参数；可含 `*Key` 字段待二次翻译。 */
  textParams?: Record<string, unknown>;
}

/**
 * vue-i18n 的 `t` / `te` 最小子集——解耦 Vue 依赖便于单测。
 */
export interface I18nAccessor {
  /**
   *
   */
  t: (key: string, params?: Record<string, unknown>) => string;
  /**
   *
   */
  te: (key: string) => boolean;
}

/**
 * 解析时间线文本——对 `fromPhaseKey` / `toPhaseKey` / `suffixKey` 进行
 * 二次翻译后再插值。
 *
 * @param entry - timeline 条目（需包含 `text` + 可选 `textParams`）
 * @param i18n  - 当前 locale 的 `t` / `te`
 * @returns 已翻译的展示文本
 */
export function resolveTimelineText(
  entry: TimelineTextSource,
  i18n: I18nAccessor,
): string {
  const params = resolveTimelineParams(entry.textParams, i18n);
  if (i18n.te(entry.text)) return i18n.t(entry.text, params);
  if (typeof params.fallback === "string" && params.fallback) {
    return params.fallback;
  }
  return entry.text;
}

/**
 * 拷贝 textParams 并就地替换 `*Key` 字段为已翻译值。
 *
 * @param raw  - adapter 透传的原始 params
 * @param i18n - 当前 locale 的 `t` / `te`
 * @returns 已翻译的参数对象
 */
export function resolveTimelineParams(
  raw: Record<string, unknown> | undefined,
  i18n: I18nAccessor,
): Record<string, unknown> {
  const params: Record<string, unknown> = { ...(raw ?? {}) };
  resolveKeyParam(params, "fromPhaseKey", "from", i18n);
  resolveKeyParam(params, "toPhaseKey", "to", i18n);
  resolveKeyParam(params, "suffixKey", "suffix", i18n);
  return params;
}

function resolveKeyParam(
  params: Record<string, unknown>,
  keyField: string,
  outField: string,
  i18n: I18nAccessor,
): void {
  const key = params[keyField];
  if (typeof key !== "string" || !key) return;
  if (i18n.te(key)) {
    params[outField] = i18n.t(key);
  } else if (params[outField] == null) {
    params[outField] = key;
  }
}
