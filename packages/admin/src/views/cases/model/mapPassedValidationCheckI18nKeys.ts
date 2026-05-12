/**
 * 将服务端校验项的 title/message i18n 键映射为「已通过」专用键。
 *
 * @param titleKey - 未通过时使用的标题键，通常以 `.title` 结尾
 * @param messageKey - 未通过时使用的说明键，通常以 `.message` 结尾
 * @param passed - 该校验项是否通过
 * @returns 映射后的键；未通过或非标准键名时原样返回
 */
export function mapPassedValidationCheckI18nKeys(
  titleKey: string | undefined,
  messageKey: string | undefined,
  passed: boolean,
): { titleKey?: string; messageKey?: string } {
  if (!passed || !titleKey || !messageKey) {
    return { titleKey, messageKey };
  }
  if (!titleKey.endsWith(".title") || !messageKey.endsWith(".message")) {
    return { titleKey, messageKey };
  }
  const base = titleKey.slice(0, -".title".length);
  if (messageKey !== `${base}.message`) {
    return { titleKey, messageKey };
  }
  return {
    titleKey: `${base}.okTitle`,
    messageKey: `${base}.okMessage`,
  };
}
