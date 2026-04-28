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
] as const;

/** 标准签证方案枚举值。 */
export type StandardVisaPlan = (typeof STANDARD_VISA_PLANS)[number];

/**
 * visa_plan 写入校验。
 *
 * 允许 null（P0 降级）、标准值或自由文本（最长 200 字符）。
 *
 * @param value 待校验值
 * @returns 是否为合法 visa_plan
 */
export function validateVisaPlan(value: unknown): value is string | null {
  if (value === null || value === undefined) return true;
  if (typeof value !== "string") return false;
  return value.length <= 200;
}

/**
 * visa_plan 写入契约。
 *
 * 唯一写入口：cases.service.create() / cases.service.update()
 * 写入层：CaseCreateInput.visaPlan / CaseUpdateInput.visaPlan
 * 存储列：cases.visa_plan (text)
 */
export type VisaPlanWriteContract = {
  writeEndpoints: ["POST /cases", "PATCH /cases/:id"];
  inputField: "visaPlan";
  storageColumn: "visa_plan";
  storageTable: "cases";
  type: "string | null";
  maxLength: 200;
};

/**
 * visa_plan 读取契约。
 *
 * 唯一读取口：
 *   - CaseListItemDto.visaPlan（列表）
 *   - CaseDetailAggregateDto.case.visaPlan（详情）
 */
export type VisaPlanReadContract = {
  listEndpoint: "GET /cases";
  detailEndpoint: "GET /cases/:id";
  listDtoField: "visaPlan";
  detailDtoPath: "case.visaPlan";
};

// ── quote_price 契约 ──

/**
 * quote_price 写入校验。
 *
 * 允许 null（未报价）、非负数值（精度 15,2）。
 *
 * @param value 待校验值
 * @returns 是否为合法 quote_price
 */
export function validateQuotePrice(value: unknown): value is number | null {
  if (value === null || value === undefined) return true;
  if (typeof value !== "number") return false;
  if (!Number.isFinite(value)) return false;
  return value >= 0;
}

/**
 * quote_price 写入契约。
 *
 * 唯一写入口：cases.service.create() / cases.service.update()
 * 存储列：cases.quote_price (numeric(15,2))
 *
 * 不变量（p1-sv-000-01 D2）：
 *   Case.quotePrice 不回写 Customer.bmvProfile
 */
export type QuotePriceWriteContract = {
  writeEndpoints: ["POST /cases", "PATCH /cases/:id"];
  inputField: "quotePrice";
  storageColumn: "quote_price";
  storageTable: "cases";
  type: "number | null";
  precision: 15;
  scale: 2;
};

/**
 * quote_price 读取契约。
 *
 * 唯一读取口：
 *   - CaseListItemDto.quotePrice（列表）
 *   - CaseDetailAggregateDto.case.quotePrice（详情）
 */
export type QuotePriceReadContract = {
  listEndpoint: "GET /cases";
  detailEndpoint: "GET /cases/:id";
  listDtoField: "quotePrice";
  detailDtoPath: "case.quotePrice";
};

// ── survey_data 契约 ──

/**
 * survey_data 所属资料项的识别条件。
 *
 * 在 document_items 表中，category=questionnaire 的记录
 * 可携带 survey_data JSONB 列。
 */
export const SURVEY_DATA_CATEGORY = "questionnaire" as const;

/**
 * survey_data 写入校验。
 *
 * 允许 null（未回收）或任意 JSONB 对象。
 * 内层 key 由模板 requirement_blueprint 的 questionnaire 项约束。
 *
 * @param value 待校验值
 * @returns 是否为合法 survey_data
 */
export function validateSurveyData(
  value: unknown,
): value is Record<string, unknown> | null {
  if (value === null || value === undefined) return true;
  if (typeof value !== "object" || Array.isArray(value)) return false;
  return true;
}

/**
 * survey_data 写入契约。
 *
 * 唯一写入口：document-items.service（P1 扩展）
 * 存储列：document_items.survey_data (JSONB，P1 新增列)
 * 归属条件：document_items.category = 'questionnaire'
 *
 * 不变量（p1-sv-000-01 D11）：
 *   survey_data 不复制到 Case.extra_fields
 *
 * 不变量（p1-sv-000-01 §8.4）：
 *   survey_data 只存在于 DocumentRequirement（问卷类资料项），
 *   不复制到 Case 或 Customer
 */
export type SurveyDataWriteContract = {
  writeEndpoints: ["PATCH /document-items/:id/survey-data"];
  storageColumn: "survey_data";
  storageTable: "document_items";
  categoryFilter: "questionnaire";
  type: "Record<string, unknown> | null";
};

/**
 * survey_data 读取契约。
 *
 * 唯一读取口：
 *   - GET /document-items?caseId=:caseId（资料项列表，含 survey_data）
 *   - 前端通过 category=questionnaire 过滤
 */
export type SurveyDataReadContract = {
  listEndpoint: "GET /document-items";
  queryFilter: "caseId + category=questionnaire";
  responseField: "surveyData";
};

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
] as const;

/** 资料项类别枚举值。 */
export type DocumentItemCategory = (typeof DOCUMENT_ITEM_CATEGORIES)[number];

/**
 * P1 扩展：资料项创建输入（含 category 与 survey_data）。
 *
 * 在 P0 DocumentItemCreateInput 基础上追加可选字段，
 * 不删除/改名现有属性。
 */
export type DocumentItemCreateInputP1Extension = {
  category?: DocumentItemCategory;
  surveyData?: Record<string, unknown> | null;
};

/**
 * P1 扩展：资料项更新输入（含 survey_data）。
 */
export type DocumentItemUpdateSurveyDataInput = {
  surveyData: Record<string, unknown> | null;
};
