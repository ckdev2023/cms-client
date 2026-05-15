import type { CaseDetail } from "../types";
import { buildOverviewTimelineFromLog } from "./CaseCommsLogsAdapter";
import { deriveOverviewBillingFieldsFromBillingTab } from "./deriveOverviewBillingFieldsFromBillingTab";

/** 案件详情页各异步标签页加载结果的字段合集（用于合并写回详情）。 */
export interface DetailTabDataBundle {
  /**
   *
   */
  documents: CaseDetail["documents"];
  /**
   *
   */
  forms: CaseDetail["forms"];
  /**
   *
   */
  validation: CaseDetail["validation"];
  /**
   *
   */
  billing: CaseDetail["billing"];
  /**
   *
   */
  submissionPackages: CaseDetail["submissionPackages"];
  /**
   *
   */
  doubleReview: CaseDetail["doubleReview"];
  /**
   *
   */
  messages: CaseDetail["messages"];
  /**
   *
   */
  logEntries: CaseDetail["logEntries"];
  /**
   *
   */
  tasks: CaseDetail["tasks"];
  /**
   *
   */
  deadlines: CaseDetail["deadlines"];
}

/**
 * 将各 tab 拉取到的切片合并回案件详情，并刷新概览时间线与财务状况摘要。
 *
 * @param detail — 聚合接口得到的详情基底
 * @param tabData — 异步加载的标签页局部数据（可部分字段）
 * @returns 合并后的详情视图模型
 */
export function applyTabData(
  detail: CaseDetail,
  tabData: Partial<DetailTabDataBundle>,
): CaseDetail {
  const merged = { ...detail, ...tabData };
  if (tabData.logEntries) {
    merged.timeline = buildOverviewTimelineFromLog(tabData.logEntries);
  }
  if (tabData.billing) {
    Object.assign(
      merged,
      deriveOverviewBillingFieldsFromBillingTab(tabData.billing),
    );
  }
  return merged;
}
