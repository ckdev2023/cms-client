/**
 * 资料清单 Tab 的类型定义。
 *
 * 位置沿革：自 `views/cases/types-detail.ts`（1759 行 / 126 处 import 的类型枢纽）
 * 按 Tab 归属拆出（B3）。归属口径沿用 B1 确立的九子域划分——以 CASE_DETAIL_TABS、
 * RefetchTag slice、seam adapter 分布、i18n 命名空间四方互证，非按文件名臆断。
 *
 * 本文件只依赖模块类型内核 `types-core.ts`，不得 import 其他 Tab 的类型
 * （「tabs 之间互不 import」，由 depcruise 的 no-circular 与后续边界规则守门）。
 */

/**
 * 附件版本记录（§7.2）。
 */
export interface DocumentFileVersion {
  /**
   *
   */
  version: number;
  /**
   *
   */
  fileName: string;
  /**
   *
   */
  relativePath: string;
  /**
   *
   */
  registeredAt: string;
  /**
   *
   */
  storageType: string;
  /**
   *
   */
  referenceSource: string;
  /** 有效期（ISO 日期），可无。 */
  expiryDate?: string | null;
}

/**
 * 审核记录（§7.3）。
 */
export interface DocumentReviewRecord {
  /**
   *
   */
  conclusion: "approved" | "rejected";
  /**
   *
   */
  conclusionLabel: string;
  /** 退回时必填原因。 */
  reason: string | null;
  /**
   *
   */
  reviewer: string;
  /**
   *
   */
  time: string;
}

/**
 * 催办记录（§7.4）。
 */
export interface DocumentReminderRecord {
  /**
   *
   */
  time: string;
  /**
   *
   */
  method: string;
  /**
   *
   */
  target: string;
  /**
   *
   */
  operator: string;
}

/**
 *
 */
export interface DocumentItem {
  /**
   *
   */
  name: string;
  /**
   *
   */
  meta: string;
  /**
   *
   */
  status: string;
  /**
   *
   */
  /** i18n key — view 层必须用 t() 翻译 */
  statusLabelKey: string;
  /**
   *
   */
  canWaive?: boolean;
  /** 本地归档相对路径；`null` 或 `undefined` 表示"未登记"。 */
  relativePath?: string | null;
  /** i18n key — 引用来源标记；view 层必须用 t() 翻译 */
  referenceLabelKey?: string | null;
  /** 引用此版本的案件数（> 1 时展示多案件引用提示）。 */
  referenceCount?: number;
  /** 附件版本历史。 */
  versions?: DocumentFileVersion[];
  /** 审核记录。 */
  reviews?: DocumentReviewRecord[];
  /** 催办记录时间线。 */
  reminders?: DocumentReminderRecord[];
  /** 行内操作按钮可见标志。 */
  actions?: DocumentItemActions;
  /**
   * 后端原始状态（保留 `waiting_upload` / `revision_required` 等服务端枚举），
   * 用于行内动作守卫的精确判断；前端展示仍用上面的归一化 `status`。
   */
  backendStatus?: string;
  /** 资料项类别（`standard` / `questionnaire` 等），影响"催办"等守卫。 */
  category?: string;
}

/**
 * 行内动作可见性（§8）。
 */
export interface DocumentItemActions {
  /** 可审核通过（状态=uploaded_reviewing）。 */
  canApprove?: boolean;
  /** 可退回补正（状态=uploaded_reviewing）。 */
  canReject?: boolean;
  /** 可发送催办（状态∈{pending, rejected}）。 */
  canRemind?: boolean;
  /** 可标记 waived。 */
  canWaive?: boolean;
  /** 可取消豁免（状态=waived）。 */
  canUnwaive?: boolean;
  /** 可登记资料（本地归档）。 */
  canRegister?: boolean;
  /** 可引用既有版本。 */
  canReference?: boolean;
}

/**
 *
 */
export interface DocumentGroup {
  /**
   *
   */
  group: string;
  /**
   *
   */
  count: string;
  /**
   *
   */
  items: DocumentItem[];
}
