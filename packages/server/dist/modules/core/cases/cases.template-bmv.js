/**
 * 経営管理签（BMV）案件模板蓝图定義。
 *
 * 此文件是经営管理签模板的唯一配置真相源，
 * 供 TemplatesService.createVersion() 或 seed 脚本使用。
 *
 * 字段命名口径（p1-sv-001-02 冻結）：
 *   - caseType: snake_case（business_manager_visa）
 *   - stepCode: UPPER_SNAKE_CASE（WAITING_MATERIAL）
 *   - extra_fields_schema fieldCode: snake_case（visa_plan, coe_issued_at）
 *   - requirement_blueprint itemCode: snake_case（bmv_questionnaire）
 */
export const BMV_CASE_TYPE = "business_manager_visa";
/**
 * 判定 caseTypeCode 是否属于经営管理签系列。
 *
 * 匹配规则（与 migration 038 `LIKE 'biz_mgmt%'` 对齐）：
 *   - 精确匹配 `business_manager_visa`
 *   - 前缀匹配 `biz_mgmt`（含 `biz_mgmt_4m`、`biz_mgmt_1y`、`biz_mgmt_renewal` 等）
 *
 * @param code 案件类型编码
 * @returns 是否属于 BMV 系列
 */
export function isBmvCaseTypeCode(code) {
  return code === BMV_CASE_TYPE || code.startsWith("biz_mgmt");
}
/**
 * 経管签業務子步骤蓝图（P1/01 §3 M5）。
 */
export const BMV_WORKFLOW_STEPS_BLUEPRINT = [
  {
    stepCode: "WAITING_MATERIAL",
    label: "資料待ち",
    parentStage: "S3",
    sortOrder: 1,
    canLoopTo: null,
    billingGate: null,
  },
  {
    stepCode: "MATERIAL_PREPARING",
    label: "資料準備中",
    parentStage: "S3",
    sortOrder: 2,
    canLoopTo: null,
    billingGate: null,
  },
  {
    stepCode: "REVIEWING",
    label: "内部審査中",
    parentStage: "S4",
    sortOrder: 3,
    canLoopTo: null,
    billingGate: null,
  },
  {
    stepCode: "APPLYING",
    label: "申請中",
    parentStage: "S6",
    sortOrder: 4,
    canLoopTo: null,
    billingGate: null,
  },
  {
    stepCode: "UNDER_REVIEW",
    label: "入管審査中",
    parentStage: "S7",
    sortOrder: 5,
    canLoopTo: null,
    billingGate: null,
  },
  {
    stepCode: "NEED_SUPPLEMENT",
    label: "補正指示あり",
    parentStage: "S7",
    sortOrder: 6,
    canLoopTo: "SUPPLEMENT_PROCESSING",
    billingGate: null,
  },
  {
    stepCode: "SUPPLEMENT_PROCESSING",
    label: "補正対応中",
    parentStage: "S7",
    sortOrder: 7,
    canLoopTo: "UNDER_REVIEW",
    billingGate: null,
  },
  {
    stepCode: "APPROVED",
    label: "許可",
    parentStage: "S8",
    sortOrder: 8,
    canLoopTo: null,
    billingGate: null,
  },
  {
    stepCode: "WAITING_PAYMENT",
    label: "尾款待ち",
    parentStage: "S8",
    sortOrder: 9,
    canLoopTo: null,
    billingGate: null,
  },
  {
    stepCode: "COE_SENT",
    label: "認定証明書送付済",
    parentStage: "S8",
    sortOrder: 10,
    canLoopTo: null,
    billingGate: { mode: "block", milestone: "final_payment" },
  },
  {
    stepCode: "VISA_APPLYING",
    label: "海外ビザ申請中",
    parentStage: "S8",
    sortOrder: 11,
    canLoopTo: null,
    billingGate: null,
  },
  {
    stepCode: "ENTRY_SUCCESS",
    label: "入国成功",
    parentStage: "S8",
    sortOrder: 12,
    canLoopTo: null,
    billingGate: null,
  },
  {
    stepCode: "VISA_REJECTED",
    label: "ビザ不許可",
    parentStage: "S9",
    sortOrder: 13,
    canLoopTo: null,
    billingGate: null,
  },
  {
    stepCode: "RESIDENCE_PERIOD_RECORDED",
    label: "在留期間記録済",
    parentStage: "S8",
    sortOrder: 14,
    canLoopTo: null,
    billingGate: null,
  },
  {
    stepCode: "RENEWAL_REMINDER_SCHEDULED",
    label: "更新リマインダー設定済",
    parentStage: "S9",
    sortOrder: 15,
    canLoopTo: null,
    billingGate: null,
  },
];
export const BMV_STEP_CODES = BMV_WORKFLOW_STEPS_BLUEPRINT.map(
  (s) => s.stepCode,
);
/**
 * 経管签模板専属字段 schema（p1-sv-001-02 冻結）。
 *
 * fieldCode: snake_case, storage: ddl_column | extra_fields
 */
export const BMV_EXTRA_FIELDS_SCHEMA = [
  {
    fieldCode: "visa_plan",
    label: "ビザプラン",
    fieldType: "enum",
    required: true,
    storage: "ddl_column",
    enumValues: ["1year", "3years", "5years"],
  },
  {
    fieldCode: "coe_issued_at",
    label: "認定証明書交付日",
    fieldType: "datetime",
    required: false,
    storage: "ddl_column",
  },
  {
    fieldCode: "coe_expiry_date",
    label: "認定証明書有効期限",
    fieldType: "date",
    required: false,
    storage: "ddl_column",
  },
  {
    fieldCode: "entry_confirmed_at",
    label: "入国確認日",
    fieldType: "datetime",
    required: false,
    storage: "ddl_column",
  },
  {
    fieldCode: "overseas_consulate",
    label: "在外公館名",
    fieldType: "string",
    required: false,
    storage: "extra_fields",
  },
];
/**
 * 経管签資料清単蓝图（p1-sv-001-02 冻結）。
 *
 * itemCode: snake_case, providedByRole: applicant | customer | office
 */
export const BMV_REQUIREMENT_BLUEPRINT = [
  {
    itemCode: "bmv_questionnaire",
    name: "経営管理ビザ情報表",
    category: "questionnaire",
    ownerSide: "customer",
    requiredFlag: true,
    providedByRole: "applicant",
  },
  {
    itemCode: "bmv_passport_copy",
    name: "パスポートコピー",
    category: "standard",
    ownerSide: "customer",
    requiredFlag: true,
    providedByRole: "applicant",
    dueDaysFromOpen: 14,
  },
  {
    itemCode: "bmv_photo",
    name: "証明写真",
    category: "standard",
    ownerSide: "customer",
    requiredFlag: true,
    providedByRole: "applicant",
    dueDaysFromOpen: 14,
  },
  {
    itemCode: "bmv_resume",
    name: "履歴書",
    category: "standard",
    ownerSide: "customer",
    requiredFlag: true,
    providedByRole: "applicant",
  },
  {
    itemCode: "bmv_business_plan",
    name: "事業計画書",
    category: "standard",
    ownerSide: "customer",
    requiredFlag: true,
    providedByRole: "applicant",
  },
  {
    itemCode: "bmv_company_registry",
    name: "法人登記事項証明書",
    category: "standard",
    ownerSide: "customer",
    requiredFlag: true,
    providedByRole: "applicant",
  },
  {
    itemCode: "bmv_office_lease",
    name: "事務所賃貸借契約書",
    category: "standard",
    ownerSide: "customer",
    requiredFlag: true,
    providedByRole: "applicant",
  },
  {
    itemCode: "bmv_financial_statements",
    name: "決算書類（直近年度）",
    category: "standard",
    ownerSide: "customer",
    requiredFlag: false,
    providedByRole: "applicant",
  },
  {
    itemCode: "bmv_tax_certificate",
    name: "納税証明書",
    category: "standard",
    ownerSide: "customer",
    requiredFlag: false,
    providedByRole: "applicant",
  },
  {
    itemCode: "bmv_capital_proof",
    name: "資本金の出所を証する書類",
    category: "standard",
    ownerSide: "customer",
    requiredFlag: true,
    providedByRole: "applicant",
  },
  {
    itemCode: "bmv_reason_statement",
    name: "申請理由書",
    category: "standard",
    ownerSide: "office",
    requiredFlag: true,
    providedByRole: "office",
  },
  {
    itemCode: "bmv_application_form",
    name: "在留資格認定証明書交付申請書",
    category: "standard",
    ownerSide: "office",
    requiredFlag: true,
    providedByRole: "office",
  },
];
export const BMV_REMINDER_SCHEDULE_BLUEPRINT = [
  {
    daysBefore: 180,
    channel: "in_app",
    recipientType: "owner",
    label: "在留到期前180天提醒",
  },
  {
    daysBefore: 90,
    channel: "in_app",
    recipientType: "owner",
    label: "在留到期前90天提醒",
  },
  {
    daysBefore: 30,
    channel: "in_app",
    recipientType: "owner",
    label: "在留到期前30天提醒",
  },
];
/**
 * 构建经营管理签模板配置对象。
 * @returns 可直接写入模板配置表的 BMV 模板配置。
 */
export function buildBmvTemplateConfig() {
  return {
    caseType: BMV_CASE_TYPE,
    applicationType: null,
    reviewRequiredFlag: true,
    billingGateMode: "block",
    workflowStepsBlueprint: BMV_WORKFLOW_STEPS_BLUEPRINT,
    extraFieldsSchema: BMV_EXTRA_FIELDS_SCHEMA,
    requirementBlueprint: BMV_REQUIREMENT_BLUEPRINT,
    reminderScheduleBlueprint: BMV_REMINDER_SCHEDULE_BLUEPRINT,
  };
}
export const BMV_FIELD_NAME_CANON = {
  visa_plan: { db: "visa_plan", ts: "visaPlan" },
  coe_issued_at: { db: "coe_issued_at", ts: "coeIssuedAt" },
  coe_expiry_date: { db: "coe_expiry_date", ts: "coeExpiryDate" },
  coe_sent_at: { db: "coe_sent_at", ts: "coeSentAt" },
  entry_confirmed_at: { db: "entry_confirmed_at", ts: "entryConfirmedAt" },
  overseas_visa_start_at: {
    db: "overseas_visa_start_at",
    ts: "overseasVisaStartAt",
  },
  supplement_count: { db: "supplement_count", ts: "supplementCount" },
  post_approval_stage: { db: "post_approval_stage", ts: "postApprovalStage" },
  application_flow_type: {
    db: "application_flow_type",
    ts: "applicationFlowType",
  },
  close_reason: { db: "close_reason", ts: "closeReason" },
  quote_price: { db: "quote_price", ts: "quotePrice" },
  overseas_consulate: {
    db: null,
    ts: null,
    extraFieldsKey: "overseas_consulate",
  },
};
//# sourceMappingURL=cases.template-bmv.js.map
