/**
 * 门禁与提交 Tab 的类型定义。
 *
 * 位置沿革：自 `views/cases/types-detail.ts`（1759 行 / 126 处 import 的类型枢纽）
 * 按 Tab 归属拆出（B3）。归属口径沿用 B1 确立的九子域划分——以 CASE_DETAIL_TABS、
 * RefetchTag slice、seam adapter 分布、i18n 命名空间四方互证，非按文件名臆断。
 *
 * 本文件只依赖模块类型内核 `types-core.ts`，不得 import 其他 Tab 的类型
 * （「tabs 之间互不 import」，由 depcruise 的 no-circular 与后续边界规则守门）。
 */

import type { CaseDetailTab, GateId } from "../../../types-core";

/**
 *
 */
export interface GateItem {
  /**
   *
   */
  gate: GateId | string;
  /**
   *
   */
  title: string;
  /** i18n key — 优先于 title；view 层存在时用 t(titleKey, titleParams) 渲染。 */
  titleKey?: string;
  /**
   *
   */
  titleParams?: Record<string, unknown>;
  /**
   *
   */
  fix?: string;
  /**
   *
   */
  note?: string;
  /** i18n key — 优先于 note；view 层存在时用 t(noteKey, noteParams) 渲染。 */
  noteKey?: string;
  /**
   *
   */
  noteParams?: Record<string, unknown>;
  /**
   *
   */
  assignee?: string;
  /**
   *
   */
  deadline?: string;
  /**
   *
   */
  actionLabel?: string;
  /**
   *
   */
  actionTab?: CaseDetailTab | string;
}

/**
 *
 */
export interface ValidationData {
  /**
   *
   */
  lastTime: string;
  /** 原始 ISO 时间戳；view 层可用于 locale-aware 格式化，缺失时回退 `lastTime`。 */
  lastTimeIso?: string;
  /** 关联资料/文书的最大 updatedAt ISO；用于 stale 判定（A2）。 */
  dataMaxUpdatedAt?: string;
  /**
   *
   */
  blocking: GateItem[];
  /**
   *
   */
  warnings: GateItem[];
  /**
   *
   */
  info: GateItem[];
  /**
   *
   */
  retriggerNote?: string;
}

/**
 *
 */
export interface SubmissionPackage {
  /**
   *
   */
  id: string;
  /**
   *
   */
  status: string;
  /**
   *
   */
  locked: boolean;
  /**
   *
   */
  date: string;
  /**
   *
   */
  summary: string;
}

/**
 *
 */
export interface CorrectionPackage {
  /**
   *
   */
  id: string;
  /**
   *
   */
  status: string;
  /**
   *
   */
  noticeDate: string;
  /**
   *
   */
  relatedSub: string;
  /**
   *
   */
  corrDeadline: string;
  /**
   *
   */
  items: string;
  /**
   *
   */
  note: string;
}

/**
 *
 */
export interface DoubleReviewEntry {
  /**
   *
   */
  initials: string;
  /**
   *
   */
  name: string;
  /**
   *
   */
  verdict: string;
  /**
   *
   */
  verdictBadge: string;
  /**
   *
   */
  time: string;
  /**
   *
   */
  comment: string | null;
  /**
   *
   */
  rejectReason: string | null;
}

/**
 *
 */
export interface RiskConfirmationRecord {
  /**
   *
   */
  confirmedBy: string;
  /**
   *
   */
  reason: string;
  /**
   *
   */
  evidence: string;
  /**
   *
   */
  time: string;
  /**
   *
   */
  amount: string;
}
