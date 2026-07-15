/**
 * 期限 Tab 的类型定义。
 *
 * 位置沿革：自 `views/cases/types-detail.ts`（1759 行 / 126 处 import 的类型枢纽）
 * 按 Tab 归属拆出（B3）。归属口径沿用 B1 确立的九子域划分——以 CASE_DETAIL_TABS、
 * RefetchTag slice、seam adapter 分布、i18n 命名空间四方互证，非按文件名臆断。
 *
 * 本文件只依赖模块类型内核 `types-core.ts`，不得 import 其他 Tab 的类型
 * （「tabs 之间互不 import」，由 depcruise 的 no-circular 与后续边界规则守门）。
 */

/**
 *
 */
export interface DeadlineItem {
  /**
   *
   */
  id: number | string;
  /**
   *
   */
  title: string;
  /**
   *
   */
  desc: string;
  /**
   *
   */
  date: string;
  /**
   *
   */
  remaining: string;
  /**
   *
   */
  remainingKey?: string;
  /**
   *
   */
  remainingParams?: Record<string, unknown>;
  /**
   *
   */
  severity: string;
}
