/**
 * 任务 Tab 的类型定义。
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
export interface TaskItem {
  /**
   *
   */
  id: string;
  /**
   *
   */
  label: string;
  /**
   * 优先于 `label` 展示（如建案自动任务按 `taskType` 本地化）。
   */
  labelI18nKey?: string;
  /**
   *
   */
  done: boolean;
  /**
   * 服务端原始状态（`"pending"` / `"in_progress"` / `"completed"` / `"cancelled"`）。
   */
  status: string;
  /**
   *
   */
  due: string;
  /**
   * 首字母头像（大写首字符或 "—"）。
   */
  assignee: string;
  /**
   * 负责人全名；用于 tooltip / title 属性。
   */
  assigneeFullName: string;
  /**
   *
   */
  color: string;
  /**
   *
   */
  dueColor: string;
}
