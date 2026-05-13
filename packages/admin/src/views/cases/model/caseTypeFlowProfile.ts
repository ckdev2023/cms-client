import type { CaseTypeFlowProfile } from "../types-detail";

/**
 * 将案件种类代码规范为小写并按连字符规整，用于包含 `renewal` 等后缀的判定。
 *
 * @param caseTypeCode — 后端或模板返回的案件类型代号
 * @returns 规整后的比对键字符串
 */
function normalizedCaseTypeCode(caseTypeCode: string): string {
  return caseTypeCode.trim().toLowerCase().replace(/-/g, "_");
}

/**
 * 判断是否属于「認定証＋海外领馆査証」が主となる典型ワークフローの案件形状。
 * 「更新」「renewal」系は在日内完結が中心となるため除外する。
 *
 * @param caseTypeCode — `case.type` / `caseTypeCode` と同種の代号字符串
 * @returns その形状として COE 海外送付を前提とし得る場合は `true`
 */
function hasOverseasCoeCaseShape(caseTypeCode: string): boolean {
  const n = normalizedCaseTypeCode(caseTypeCode);
  if (!n || n.includes("renewal")) return false;

  if (n === "work") return true;

  if (n === "hum" || n.startsWith("hum_")) return true;

  if (n.startsWith("eng_humanities_intl")) return true;

  const engineerLike = [
    "engineer_visa",
    "engineer_humanities_intl_visa",
  ] as const;
  return engineerLike.some((p) => n === p || n.startsWith(`${p}_`));
}

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
    hasCoeFlow: isBmvCert || hasOverseasCoeCaseShape(caseTypeCode),
    hasFinalPaymentGate: isBmv,
    hasSurveyQuote: isBmv,
  };
}
