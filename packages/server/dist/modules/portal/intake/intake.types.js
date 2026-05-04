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
];
/**
 * P1 扩展：问卷类型标识。
 *
 * 用于区分 IntakeForm 的用途。BMV 问卷使用 "bmv_questionnaire"，
 * 通用信息采集使用 "general"。
 */
export const INTAKE_FORM_TYPES = ["general", "bmv_questionnaire", "bmv_quote"];
/**
 * 校验 form_kind 是否为合法值。
 *
 * @param value 待校验值
 * @returns 是否为合法 IntakeFormType
 */
export function isValidFormKind(value) {
  return typeof value === "string" && INTAKE_FORM_TYPES.includes(value);
}
/**
 * 判断是否需要 BMV 建案门禁。
 *
 * 识别 `business_manager_visa` 及 `biz_mgmt_*` 前缀子类型，
 * 与 migration 038 `LIKE 'biz_mgmt%'` 模式对齐。
 *
 * @param caseTypeCode 案件类型编码
 * @returns 是否需要 BMV 建案门禁
 */
export function requiresBmvCaseCreationGate(caseTypeCode) {
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
export const BMV_QUESTIONNAIRE_TRANSITIONS = [
  { from: "draft", to: "submitted", trigger: "customer_submit" },
  { from: "submitted", to: "reviewed", trigger: "admin_confirm_receipt" },
  { from: "reviewed", to: "archived", trigger: "admin_archive" },
];
/**
 * 检查问卷状态转换是否合法。
 *
 * @param from 当前状态
 * @param to 目标状态
 * @returns 是否为合法转换
 */
export function isValidQuestionnaireTransition(from, to) {
  return BMV_QUESTIONNAIRE_TRANSITIONS.some(
    (t) => t.from === from && t.to === to,
  );
}
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
];
/**
 * 校验 BMV 问卷 formData 是否满足最小结构要求。
 *
 * @param formData 问卷表单数据
 * @returns 校验结果（含缺失 sections）
 */
export function validateBmvQuestionnaireFormData(formData) {
  if (!formData || typeof formData !== "object" || Array.isArray(formData)) {
    return {
      valid: false,
      missingSections: [...BMV_QUESTIONNAIRE_REQUIRED_SECTIONS],
    };
  }
  const data = formData;
  const missing = BMV_QUESTIONNAIRE_REQUIRED_SECTIONS.filter(
    (s) => !(s in data),
  );
  return { valid: missing.length === 0, missingSections: missing };
}
//# sourceMappingURL=intake.types.js.map
