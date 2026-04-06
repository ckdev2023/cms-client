/**
 * 案件摘要（列表用）。
 */
export type CaseSummary = {
  /** 案件 ID。 */
  id: string;
  /** 案件类型代码。 */
  caseTypeCode: string;
  /** 案件状态。 */
  status: string;
  /** 到期时间（可选）。 */
  dueAt: string | null;
};

/**
 * 时间线条目。
 */
export type TimelineEntry = {
  /** 条目 ID。 */
  id: string;
  /** 动作。 */
  action: string;
  /** 创建时间。 */
  createdAt: string;
};

/**
 * 资料项摘要。
 */
export type DocumentItemSummary = {
  /** 资料项 ID。 */
  id: string;
  /** 名称。 */
  name: string;
  /** 状态。 */
  status: string;
};

/**
 * 案件详情。
 */
export type CaseDetail = CaseSummary & {
  /** 关联资料项。 */
  documents: DocumentItemSummary[];
  /** 时间线。 */
  timeline: TimelineEntry[];
};
