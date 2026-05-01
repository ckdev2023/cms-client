// ────────────────────────────────────────────────────────────────
// P1 Intake 契约扩展 — 冻结接口边界
//
// 明确 intake 模块在经营管理签（BMV）流程中的职责：
//   - 问卷发送/回收状态管理
//   - survey_data 结构化入口
//   - 与 Customer.bmvProfile 的衔接边界
//
// 权威来源：
//   - P1/01 §2 Step 3–4（问卷与报价）
//   - p1-sv-000-01 §8（问卷数据真相源）
//   - p1-sv-000-02 §1.4（survey_data 落点）
//   - P1/02 §3.1（portal/intake）
//
// 设计决策：
//   - IntakeForm.formData 在 P0 为通用 JSONB；P1 通过 BMV 专属 schema
//     约束问卷内容格式
//   - 问卷回收后，survey_data 写入 DocumentRequirement（category=questionnaire）
//   - IntakeForm 本身保存问卷原始提交数据，不做结构化存储
//   - survey_data 的结构化提取和写入由 case 创建流程负责
// ────────────────────────────────────────────────────────────────

import { isBmvCaseTypeCode } from "../../core/cases/cases.template-bmv";

export { isBmvCaseTypeCode };

export const INTAKE_FORM_STATUSES = [
  "draft",
  "submitted",
  "reviewed",
  "archived",
] as const;

/** IntakeForm 状态枚举值。 */
export type IntakeFormStatus = (typeof INTAKE_FORM_STATUSES)[number];

/**
 * P1 扩展：问卷类型标识。
 *
 * 用于区分 IntakeForm 的用途。BMV 问卷使用 "bmv_questionnaire"，
 * 通用信息采集使用 "general"。
 */
export const INTAKE_FORM_TYPES = [
  "general",
  "bmv_questionnaire",
  "bmv_quote",
] as const;

/** IntakeForm 类型枚举值（映射到 DB form_kind 列）。 */
export type IntakeFormType = (typeof INTAKE_FORM_TYPES)[number];

/**
 * 校验 form_kind 是否为合法值。
 *
 * @param value 待校验值
 * @returns 是否为合法 IntakeFormType
 */
export function isValidFormKind(value: unknown): value is IntakeFormType {
  return (
    typeof value === "string" &&
    (INTAKE_FORM_TYPES as readonly string[]).includes(value)
  );
}

/**
 * P1 扩展：BMV 问卷回收结果。
 *
 * 当 BMV 问卷从 draft → submitted 后，admin 可确认回收
 * 并将结构化 survey_data 提取到 DocumentRequirement。
 *
 * 此类型定义从 IntakeForm.formData 提取 survey_data 时的输入格式。
 */
export type BmvSurveyDataExtractInput = {
  intakeFormId: string;
  caseId: string;
  documentItemId: string;
};

/**
 * P1 扩展：问卷发送请求参数。
 *
 * 由 admin 触发（通过 Customer BMV 承接流程），
 * 创建一个 BMV 类型的 IntakeForm 并关联到 lead。
 */
export type BmvQuestionnaireCreateInput = {
  appUserId: string;
  leadId?: string | null;
  formType: "bmv_questionnaire";
};

/**
 * P1 扩展：问卷回收确认请求参数。
 *
 * admin 确认问卷已回收后，触发：
 *   1. IntakeForm.status → "reviewed"
 *   2. Customer.bmvProfile.questionnaireStatus → "returned"
 *   3. survey_data 写入对应 DocumentRequirement（P1 Batch 4 实现）
 */
export type BmvQuestionnaireConfirmInput = {
  intakeFormId: string;
  surveyData?: Record<string, unknown>;
};

// ────────────────────────────────────────────────────────────────
// 接口边界约定
//
// intake → customer: 问卷状态变更通过 Customer BMV action（§2.2）
//   - sendBmvQuestionnaire()：创建 IntakeForm + 推进 questionnaireStatus
//   - generateBmvQuote()：确认回收 + 推进 quoteStatus
//
// intake → case: 建案时消费 survey_data
//   - cases.service.create() 读取 IntakeForm.formData
//   - 写入 DocumentRequirement.survey_data（category=questionnaire）
//
// intake → document-items: survey_data 最终归属
//   - P1 中 survey_data 存储在 DocumentRequirement（category=questionnaire）
//   - IntakeForm.formData 保留原始提交数据
//   - DocumentRequirement.survey_data 保留结构化提取结果
// ────────────────────────────────────────────────────────────────

/**
 * Intake → Cases 接口边界。
 *
 * 建案限制（对齐 p1-sv-000-01 §2.4）：
 *   - 非 BMV 案件：无额外限制
 *   - BMV 案件：Customer.bmvProfile.signStatus === "signed"
 *     且 intakeStatus === "ready_for_case_creation"
 *
 * cases.controller 在 `POST /cases` 时：
 *   - 若 caseTypeCode === "business_manager_visa"，
 *     须额外校验 Customer BMV profile 门禁
 *   - 校验逻辑在 cases.service.create() 中实现，
 *     不在 intake 或 leads 模块中
 */
export type CaseCreationPrerequisite = {
  caseTypeCode: string;
  customerId: string;
  requiresBmvGate: boolean;
};

/**
 * 判断是否需要 BMV 建案门禁。
 *
 * 识别 `business_manager_visa` 及 `biz_mgmt_*` 前缀子类型，
 * 与 migration 038 `LIKE 'biz_mgmt%'` 模式对齐。
 *
 * @param caseTypeCode 案件类型编码
 * @returns 是否需要 BMV 建案门禁
 */
export function requiresBmvCaseCreationGate(caseTypeCode: string): boolean {
  return isBmvCaseTypeCode(caseTypeCode);
}

// ────────────────────────────────────────────────────────────────
// P1 扩展：问卷生命周期状态机契约
//
// IntakeForm（type=bmv_questionnaire）的状态流转：
//   draft → submitted → reviewed → archived
//
// 与 Customer.bmvProfile.questionnaireStatus 的对应关系：
//   IntakeForm.status=draft    ⟹ questionnaireStatus=sent
//   IntakeForm.status=submitted ⟹ questionnaireStatus 仍为 sent（待回收确认）
//   IntakeForm.status=reviewed  ⟹ questionnaireStatus=returned（admin 确认回收）
//   IntakeForm.status=archived  ⟹ questionnaireStatus=returned（归档，不变）
//
// 权威来源：
//   - P1/01 §2 Step 3（问卷发送/回收）
//   - p1-sv-000-01 §8（问卷数据真相源）
// ────────────────────────────────────────────────────────────────

/** 问卷状态允许的转换。 */
export const BMV_QUESTIONNAIRE_TRANSITIONS: readonly {
  from: IntakeFormStatus;
  to: IntakeFormStatus;
  trigger: string;
}[] = [
  { from: "draft", to: "submitted", trigger: "customer_submit" },
  { from: "submitted", to: "reviewed", trigger: "admin_confirm_receipt" },
  { from: "reviewed", to: "archived", trigger: "admin_archive" },
] as const;

/**
 * 检查问卷状态转换是否合法。
 *
 * @param from 当前状态
 * @param to 目标状态
 * @returns 是否为合法转换
 */
export function isValidQuestionnaireTransition(
  from: string,
  to: string,
): boolean {
  return BMV_QUESTIONNAIRE_TRANSITIONS.some(
    (t) => t.from === from && t.to === to,
  );
}

/**
 * BMV 问卷回收后的 survey_data 提取契约。
 *
 * 当 IntakeForm 转为 reviewed 后，admin 可触发 survey_data 提取：
 *   1. 从 IntakeForm.formData 提取结构化数据
 *   2. 写入 DocumentRequirement（category=questionnaire）的 survey_data 列
 *   3. 更新 Customer.bmvProfile.questionnaireStatus = "returned"
 *
 * 此流程在 P1 Batch 4 实现，此处仅定义契约。
 */
export type BmvSurveyDataExtractionContract = {
  sourceTable: "intake_forms";
  sourceField: "form_data";
  targetTable: "document_items";
  targetField: "survey_data";
  targetCategoryFilter: "questionnaire";
  customerProfileUpdate: "questionnaireStatus → returned";
};

/**
 * BMV 问卷 formData 的最小结构校验。
 *
 * P1 BMV 问卷的 formData 至少应包含以下顶层 key。
 * 校验为宽松模式：只检查结构存在，不深入校验子字段。
 */
export const BMV_QUESTIONNAIRE_REQUIRED_SECTIONS = [
  "companyInfo",
  "personalInfo",
  "businessPlan",
] as const;

/**
 * 校验 BMV 问卷 formData 是否满足最小结构要求。
 *
 * @param formData 问卷表单数据
 * @returns 校验结果（含缺失 sections）
 */
export function validateBmvQuestionnaireFormData(formData: unknown): {
  valid: boolean;
  missingSections: string[];
} {
  if (!formData || typeof formData !== "object" || Array.isArray(formData)) {
    return {
      valid: false,
      missingSections: [...BMV_QUESTIONNAIRE_REQUIRED_SECTIONS],
    };
  }
  const data = formData as Record<string, unknown>;
  const missing = BMV_QUESTIONNAIRE_REQUIRED_SECTIONS.filter(
    (s) => !(s in data),
  );
  return { valid: missing.length === 0, missingSections: missing };
}

// ────────────────────────────────────────────────────────────────
// Intake → Cases 建案限制契约（扩展）
//
// cases.service.create() 中的 BMV 门禁由
// cases.types-bmv-gate.ts 的 checkBmvCaseCreationGate 实现。
//
// intake 模块只负责：
//   1. requiresBmvCaseCreationGate() 判断是否需要门禁
//   2. 问卷状态管理（draft → submitted → reviewed）
//   3. formData 结构校验
//
// intake 不直接执行建案限制 — 门禁逻辑集中在 cases service。
// ────────────────────────────────────────────────────────────────

/** Intake → Case 接口边界中 intake 侧的职责清单。 */
export type IntakeToCaseResponsibility = {
  intakeOwns: [
    "questionnaire form lifecycle (draft → submitted → reviewed → archived)",
    "formData structural validation",
    "requiresBmvCaseCreationGate() flag",
  ];
  casesOwns: [
    "checkBmvCaseCreationGate() enforcement",
    "survey_data extraction to DocumentRequirement",
    "BMV extra fields initialization (visaPlan, quotePrice)",
  ];
  customerOwns: [
    "bmvProfile state machine (questionnaireStatus, quoteStatus, signStatus)",
    "intakeStatus derivation",
  ];
};
