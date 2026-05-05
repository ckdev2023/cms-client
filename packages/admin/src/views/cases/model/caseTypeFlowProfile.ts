import type { CaseTypeFlowProfile } from "../types-detail";

/**
 * 基于案件类型代码解析该类型支持的业务流程特征。
 *
 * @param caseTypeCode - 案件类型代码（如 `"biz_mgmt_cert_4m"`）
 * @returns 流程特征集合
 */
export function resolveCaseTypeFlowProfile(
  caseTypeCode: string,
): CaseTypeFlowProfile {
  const isBmvCert =
    caseTypeCode.startsWith("biz_mgmt_cert_") || caseTypeCode === "biz_mgmt";
  const isBmv =
    caseTypeCode.startsWith("biz_mgmt_") || caseTypeCode === "biz_mgmt";
  return {
    hasCoeFlow: isBmvCert,
    hasFinalPaymentGate: isBmv,
    hasSurveyQuote: isBmv,
  };
}
