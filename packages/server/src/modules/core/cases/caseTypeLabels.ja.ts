/**
 * case_type_code → ja-JP 表示ラベル。
 *
 * 前端各 locale で buildFallbackName が上書きする想定のため、
 * ここには日本語のみ格納し DB 書き込み / SQL 検索 / CSV 出力で使用する。
 *
 * BUSINESS_TYPE_TO_CASE_TYPE_CODE の全 value + 既知別名を網羅する。
 */
export const CASE_TYPE_LABELS_JA: Readonly<Record<string, string>> = {
  highly_skilled: "高度専門職",
  work: "技術・人文知識・国際業務",
  engineer_humanities_intl_visa: "技術・人文知識・国際業務（認定）",
  dependent_visa: "家族滞在",
  family_stay: "家族滞在",
  business_manager_visa: "経営・管理",
  company_setup: "会社設立",
  permanent: "永住",
  other: "その他",
  general: "一般",
};

/**
 * caseTypeCode を ja-JP ラベルに変換する。
 *
 * @param code 案件タイプコード（例: "permanent", "work"）。
 * @returns 対応する ja-JP ラベル。未登録コードの場合は undefined。
 */
export function getCaseTypeLabelJa(code: string): string | undefined {
  return CASE_TYPE_LABELS_JA[code];
}
