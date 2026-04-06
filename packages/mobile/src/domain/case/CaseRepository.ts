import type { CaseSummary, CaseDetail } from "./Case";

/**
 * Case 领域仓库接口。
 */
export type CaseRepository = {
  /**
   * 获取当前用户的案件列表。
   *
   * @returns 案件摘要列表
   */
  listMyCases(): Promise<CaseSummary[]>;

  /**
   * 获取案件详情。
   *
   * @param caseId 案件 ID
   * @returns 案件详情
   */
  getCaseDetail(caseId: string): Promise<CaseDetail>;
};
