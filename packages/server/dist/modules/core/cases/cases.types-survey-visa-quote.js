// ────────────────────────────────────────────────────────────────
// P1 survey_data / visa_plan / quote_price 读写契约 — 冻结
//
// 明确三者的存储层、写入口、读取口与校验规则。
//
// 权威来源：
//   - p1-sv-000-01 §3（案件 BMV 字段）、§8（问卷数据）、§9（写入口矩阵）
//   - p1-sv-000-02 §1.1–§1.2（schema 落点）
//   - P1/01 §2 Step 4（问卷+报价）
//
// 存储分层：
//   - visa_plan:   Case 表 DDL 列（text），通过 create/update API 写入
//   - quote_price: Case 表 DDL 列（numeric(15,2)），通过 create/update API 写入
//   - survey_data: DocumentRequirement 表 JSONB 列（P1 新增），
//                  通过 document-items service 写入（category=questionnaire）
// ────────────────────────────────────────────────────────────────
// ── visa_plan 契约 ──
/**
 * visa_plan 的合法值范围。
 *
 * 非严格枚举 — 允许自由文本，但推荐使用标准化值。
 * 标准化值用于列表筛选和统计。
 */
export const STANDARD_VISA_PLANS = [
  "new_1year",
  "new_3year",
  "new_5year",
  "renewal_1year",
  "renewal_3year",
  "renewal_5year",
  "change_status",
];
/**
 * visa_plan 写入校验。
 *
 * 允许 null（P0 降级）、标准值或自由文本（最长 200 字符）。
 *
 * @param value 待校验值
 * @returns 是否为合法 visa_plan
 */
export function validateVisaPlan(value) {
  if (value === null || value === undefined) return true;
  if (typeof value !== "string") return false;
  return value.length <= 200;
}
// ── quote_price 契约 ──
/**
 * quote_price 写入校验。
 *
 * 允许 null（未报价）、非负数值（精度 15,2）。
 *
 * @param value 待校验值
 * @returns 是否为合法 quote_price
 */
export function validateQuotePrice(value) {
  if (value === null || value === undefined) return true;
  if (typeof value !== "number") return false;
  if (!Number.isFinite(value)) return false;
  return value >= 0;
}
// ── survey_data 契约 ──
/**
 * survey_data 所属资料项的识别条件。
 *
 * 在 document_items 表中，category=questionnaire 的记录
 * 可携带 survey_data JSONB 列。
 */
export const SURVEY_DATA_CATEGORY = "questionnaire";
/**
 * survey_data 写入校验。
 *
 * 允许 null（未回收）或任意 JSONB 对象。
 * 内层 key 由模板 requirement_blueprint 的 questionnaire 项约束。
 *
 * @param value 待校验值
 * @returns 是否为合法 survey_data
 */
export function validateSurveyData(value) {
  if (value === null || value === undefined) return true;
  if (typeof value !== "object" || Array.isArray(value)) return false;
  return true;
}
// ── DocumentItem P1 扩展类型 ──
/**
 * P1 扩展：资料项类别。
 *
 * P0 不使用 category 字段；P1 新增 category 列区分普通资料项与问卷类资料项。
 * category=questionnaire 的资料项可携带 survey_data。
 */
export const DOCUMENT_ITEM_CATEGORIES = [
  "standard",
  "questionnaire",
  "company",
  "personal",
];
//# sourceMappingURL=cases.types-survey-visa-quote.js.map
