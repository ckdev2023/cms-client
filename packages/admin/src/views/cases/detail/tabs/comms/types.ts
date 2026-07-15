/**
 * 沟通记录 / 日志 Tab 的类型定义。
 *
 * 位置沿革：自 `views/cases/types-detail.ts`（1759 行 / 126 处 import 的类型枢纽）
 * 按 Tab 归属拆出（B3）。归属口径沿用 B1 确立的九子域划分——以 CASE_DETAIL_TABS、
 * RefetchTag slice、seam adapter 分布、i18n 命名空间四方互证，非按文件名臆断。
 *
 * 本文件只依赖模块类型内核 `types-core.ts`，不得 import 其他 Tab 的类型
 * （「tabs 之间互不 import」，由 depcruise 的 no-circular 与后续边界规则守门）。
 */

import type { LogCategoryKey, TimelineTrack } from "../../../types-core";

/**
 *
 */
export type MessageTypeKey =
  | "internal"
  | "client_visible"
  | "phone"
  | "meeting"
  | "auto_email";

/**
 *
 */
export interface MessageItem {
  /**
   *
   */
  id: string;
  /**
   *
   */
  avatar: string;
  /**
   *
   */
  avatarStyle: string;
  /**
   *
   */
  author: string;
  /**
   *
   */
  type: MessageTypeKey;
  /** i18n key — view 层必须用 t() 翻译。 */
  typeLabelKey: string;
  /**
   * @deprecated T2.6 完成后删除，改用 typeLabelKey + t()。
   */
  typeLabel: string;
  /**
   *
   */
  body: string;
  /** 已格式化的展示时间（locale 敏感）。 */
  time: string;
  /** 原始 ISO 8601 时间戳；adapter 未传 locale 时可能为 undefined。 */
  timeIso?: string;
  /**
   *
   */
  actionLabel?: string;
}

/**
 *
 */
export interface LogEntry {
  /**
   *
   */
  type: LogCategoryKey | string;
  /**
   *
   */
  avatar: string;
  /**
   *
   */
  avatarStyle: string;
  /**
   *
   */
  text: string;
  /**
   *
   */
  textParams?: Record<string, unknown>;
  /**
   *
   */
  category: string;
  /**
   *
   */
  categoryChip: string;
  /**
   *
   */
  objectType: string;
  /**
   *
   */
  time: string;
  /**
   *
   */
  dotColor: string;
  /** 数据修复 / 合成标记；值为 `"data_repair"` 时 UI 显示灰色 chip。 */
  synthesized?: string;
  /** 事件轨道——`business_phase` / `stage` / `other`。 */
  track?: TimelineTrack;
}
