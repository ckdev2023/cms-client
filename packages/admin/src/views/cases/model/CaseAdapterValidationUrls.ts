function deriveApiPrefix(casesApiPath: string): string {
  return casesApiPath.replace(/\/cases\/?$/, "");
}

/**
 * 构造 validation runs URL。
 *
 * @param casesApiPath - cases API 基路径
 * @param caseId - 案件 ID
 * @returns 接口地址
 */
export function buildCaseValidationRunsUrl(
  casesApiPath: string,
  caseId: string,
): string {
  return `${deriveApiPrefix(casesApiPath)}/validation-runs?caseId=${encodeURIComponent(caseId)}`;
}

/**
 * 构造 review records URL。
 *
 * @param casesApiPath - cases API 基路径
 * @param caseId - 案件 ID
 * @returns 接口地址
 */
export function buildCaseReviewRecordsUrl(
  casesApiPath: string,
  caseId: string,
): string {
  return `${deriveApiPrefix(casesApiPath)}/review-records?caseId=${encodeURIComponent(caseId)}`;
}

/**
 * 构造 billing plans URL。
 *
 * @param casesApiPath - cases API 基路径
 * @param caseId - 案件 ID
 * @returns 接口地址
 */
export function buildCaseBillingPlansUrl(
  casesApiPath: string,
  caseId: string,
): string {
  return `${deriveApiPrefix(casesApiPath)}/billing-plans?caseId=${encodeURIComponent(caseId)}`;
}

/**
 * 构造 payment records URL。
 *
 * @param casesApiPath - cases API 基路径
 * @param caseId - 案件 ID
 * @returns 接口地址
 */
export function buildCasePaymentRecordsUrl(
  casesApiPath: string,
  caseId: string,
): string {
  return `${deriveApiPrefix(casesApiPath)}/payment-records?caseId=${encodeURIComponent(caseId)}`;
}

/**
 * 构造 submission packages URL。
 *
 * @param casesApiPath - cases API 基路径
 * @param caseId - 案件 ID
 * @returns 接口地址
 */
export function buildCaseSubmissionPackagesUrl(
  casesApiPath: string,
  caseId: string,
): string {
  return `${deriveApiPrefix(casesApiPath)}/submission-packages?caseId=${encodeURIComponent(caseId)}`;
}

/**
 * 构造 billing tab aggregate URL。
 *
 * @param casesApiPath - cases API 基路径
 * @param caseId - 案件 ID
 * @returns 接口地址
 */
export function buildCaseBillingTabAggregateUrl(
  casesApiPath: string,
  caseId: string,
): string {
  return `${casesApiPath}/${encodeURIComponent(caseId)}/billing-tab-aggregate`;
}
