/** Tab 头标徽章计数器（用于案件详情页 Tab 之上的提示数字 / 标签）。 */
export interface TabCounter {
  /**
   *
   */
  label: string;
  /**
   *
   */
  tone: "default" | "warning" | "danger";
  /**
   *
   */
  i18nKey?: string;
  /**
   *
   */
  i18nParams?: Record<string, unknown>;
}
