import type {
  CaseTemplateConfig,
  ExtraFieldSchema,
  ReminderScheduleBlueprintItem,
  RequirementBlueprintItem,
  WorkflowStepBlueprint,
} from "./cases.types-template-blueprints";

// ────────────────────────────────────────────────────────────────
// 経営管理签（BMV）模板配置 — P1 冻结
//
// 权威来源：
//   - P1/01 §3 M1–M2（模板底座 + 问卷报价）
//   - p1-sv-000-01 §4–§5（蓝图真相源 + 子步骤枚举）
//   - p1-sv-000-02 §1.4（config kind/key）
//
// 字段命名口径：
//   - DB snake_case: visa_plan, coe_issued_at, coe_expiry_date, etc.
//   - TS camelCase: visaPlan, coeIssuedAt, coeExpiryDate, etc.
//   - extra_fields_schema fieldKey: camelCase（与 TS entity 一致）
//   - requirement_blueprint checklistItemCode: kebab-case（bmv-questionnaire, bmv-passport, etc.）
// ────────────────────────────────────────────────────────────────

export const BMV_CASE_TYPE_CODE = "business_manager_visa" as const;

// ── Workflow Steps ──

export const BMV_WORKFLOW_STEP_CODES = [
  "WAITING_MATERIAL",
  "MATERIAL_PREPARING",
  "REVIEWING",
  "APPLYING",
  "UNDER_REVIEW",
  "NEED_SUPPLEMENT",
  "SUPPLEMENT_PROCESSING",
  "APPROVED",
  "WAITING_PAYMENT",
  "COE_SENT",
  "VISA_APPLYING",
  "ENTRY_SUCCESS",
  "VISA_REJECTED",
  "RESIDENCE_PERIOD_RECORDED",
  "RENEWAL_REMINDER_SCHEDULED",
] as const;

/**
 *
 */
export type BmvWorkflowStepCode = (typeof BMV_WORKFLOW_STEP_CODES)[number];

export const BMV_WORKFLOW_STEPS_BLUEPRINT: WorkflowStepBlueprint[] = [
  {
    stepCode: "WAITING_MATERIAL",
    label: "等待资料",
    parentStage: "S2",
    sortOrder: 1,
    canLoopTo: null,
    billingGate: null,
  },
  {
    stepCode: "MATERIAL_PREPARING",
    label: "资料准备中",
    parentStage: "S3",
    sortOrder: 2,
    canLoopTo: null,
    billingGate: null,
  },
  {
    stepCode: "REVIEWING",
    label: "内部审核",
    parentStage: "S4",
    sortOrder: 3,
    canLoopTo: null,
    billingGate: null,
  },
  {
    stepCode: "APPLYING",
    label: "申请提交",
    parentStage: "S5",
    sortOrder: 4,
    canLoopTo: null,
    billingGate: null,
  },
  {
    stepCode: "UNDER_REVIEW",
    label: "审查中",
    parentStage: "S5",
    sortOrder: 5,
    canLoopTo: null,
    billingGate: null,
  },
  {
    stepCode: "NEED_SUPPLEMENT",
    label: "需要补正",
    parentStage: "S5",
    sortOrder: 6,
    canLoopTo: "SUPPLEMENT_PROCESSING",
    billingGate: null,
  },
  {
    stepCode: "SUPPLEMENT_PROCESSING",
    label: "补正处理中",
    parentStage: "S5",
    sortOrder: 7,
    canLoopTo: "UNDER_REVIEW",
    billingGate: null,
  },
  {
    stepCode: "APPROVED",
    label: "已下签",
    parentStage: "S6",
    sortOrder: 8,
    canLoopTo: null,
    billingGate: null,
  },
  {
    stepCode: "WAITING_PAYMENT",
    label: "等待尾款",
    parentStage: "S7",
    sortOrder: 9,
    canLoopTo: null,
    billingGate: null,
  },
  {
    stepCode: "COE_SENT",
    label: "COE已发送",
    parentStage: "S7",
    sortOrder: 10,
    canLoopTo: null,
    billingGate: { mode: "block", milestone: "final_payment" },
  },
  {
    stepCode: "VISA_APPLYING",
    label: "海外返签申请中",
    parentStage: "S7",
    sortOrder: 11,
    canLoopTo: null,
    billingGate: null,
  },
  {
    stepCode: "ENTRY_SUCCESS",
    label: "入境成功",
    parentStage: "S8",
    sortOrder: 12,
    canLoopTo: null,
    billingGate: null,
  },
  {
    stepCode: "VISA_REJECTED",
    label: "签证拒否",
    parentStage: "S9",
    sortOrder: 13,
    canLoopTo: null,
    billingGate: null,
  },
  {
    stepCode: "RESIDENCE_PERIOD_RECORDED",
    label: "在留期间已录入",
    parentStage: "S8",
    sortOrder: 14,
    canLoopTo: null,
    billingGate: null,
  },
  {
    stepCode: "RENEWAL_REMINDER_SCHEDULED",
    label: "续签提醒已设置",
    parentStage: "S8",
    sortOrder: 15,
    canLoopTo: null,
    billingGate: null,
  },
];

// ── Extra Fields Schema ──

export const BMV_EXTRA_FIELDS_SCHEMA: ExtraFieldSchema[] = [
  {
    fieldKey: "visaPlan",
    label: "签证方案",
    fieldType: "string",
    required: false,
    defaultValue: null,
    description: "签证方案（与 Case.visaPlan 列同步，此处为校验 schema 定义）",
  },
  {
    fieldKey: "coeIssuedDate",
    label: "COE签发日期",
    fieldType: "date",
    required: false,
    defaultValue: null,
    description: "在留资格认定证明书签发日期",
  },
  {
    fieldKey: "coeExpiryDate",
    label: "COE有效期限",
    fieldType: "date",
    required: false,
    defaultValue: null,
    description: "在留资格认定证明书到期日",
  },
  {
    fieldKey: "businessType",
    label: "事业类型",
    fieldType: "enum",
    required: false,
    defaultValue: null,
    enumValues: ["new_establishment", "acquisition", "branch_office", "other"],
    description: "经营管理签事业类型",
  },
  {
    fieldKey: "capitalAmount",
    label: "资本金额",
    fieldType: "number",
    required: false,
    defaultValue: null,
    description: "资本金额（万日元）",
  },
  {
    fieldKey: "officeAddress",
    label: "事务所地址",
    fieldType: "string",
    required: false,
    defaultValue: null,
    description: "事业所所在地",
  },
  {
    fieldKey: "residenceYears",
    label: "在留年数",
    fieldType: "enum",
    required: false,
    defaultValue: null,
    enumValues: ["1", "3", "5"],
    description: "申请在留年数",
  },
];

// ── Requirement Blueprint ──

export const BMV_REQUIREMENT_BLUEPRINT: RequirementBlueprintItem[] = [
  {
    checklistItemCode: "bmv-questionnaire",
    name: "经营管理签信息采集表",
    category: "questionnaire",
    requiredFlag: true,
    ownerSide: "customer",
    sortOrder: 1,
    description: "《2025M_C经管签信息表》— 问卷回收后方可确认报价",
  },
  {
    checklistItemCode: "bmv-passport-copy",
    name: "护照复印件",
    category: "personal",
    requiredFlag: true,
    ownerSide: "applicant",
    sortOrder: 2,
  },
  {
    checklistItemCode: "bmv-photo",
    name: "证件照（4cm×3cm）",
    category: "personal",
    requiredFlag: true,
    ownerSide: "applicant",
    sortOrder: 3,
  },
  {
    checklistItemCode: "bmv-resume",
    name: "履历书",
    category: "personal",
    requiredFlag: true,
    ownerSide: "applicant",
    sortOrder: 4,
  },
  {
    checklistItemCode: "bmv-business-plan",
    name: "事业计划书",
    category: "company",
    requiredFlag: true,
    ownerSide: "office",
    sortOrder: 5,
    description: "由行政书士事务所制作",
  },
  {
    checklistItemCode: "bmv-company-registry",
    name: "法人登记簿謄本",
    category: "company",
    requiredFlag: true,
    ownerSide: "customer",
    sortOrder: 6,
  },
  {
    checklistItemCode: "bmv-office-lease",
    name: "事务所租赁合同",
    category: "company",
    requiredFlag: true,
    ownerSide: "customer",
    sortOrder: 7,
  },
  {
    checklistItemCode: "bmv-office-photos",
    name: "事务所照片",
    category: "company",
    requiredFlag: true,
    ownerSide: "customer",
    sortOrder: 8,
  },
  {
    checklistItemCode: "bmv-capital-proof",
    name: "资本金汇款证明",
    category: "company",
    requiredFlag: true,
    ownerSide: "customer",
    sortOrder: 9,
  },
  {
    checklistItemCode: "bmv-financial-statement",
    name: "决算报告书",
    category: "company",
    requiredFlag: false,
    ownerSide: "customer",
    sortOrder: 10,
    description: "续签或已运营企业需提供",
  },
  {
    checklistItemCode: "bmv-tax-certificate",
    name: "纳税证明",
    category: "company",
    requiredFlag: true,
    ownerSide: "customer",
    sortOrder: 11,
    description: "保证人/申请人纳税证明",
  },
  {
    checklistItemCode: "bmv-reason-statement",
    name: "理由书",
    category: "standard",
    requiredFlag: true,
    ownerSide: "office",
    sortOrder: 12,
    description: "由行政书士事务所制作",
  },
  {
    checklistItemCode: "bmv-application-form",
    name: "在留资格认定证明书交付申请书",
    category: "standard",
    requiredFlag: true,
    ownerSide: "office",
    sortOrder: 13,
    description: "由行政书士事务所制作并提交",
  },
  {
    checklistItemCode: "bmv-business-overview",
    name: "事业概要说明书",
    category: "company",
    requiredFlag: true,
    ownerSide: "office",
    sortOrder: 14,
  },
  {
    checklistItemCode: "bmv-seal-certificate",
    name: "印鉴证明书",
    category: "company",
    requiredFlag: true,
    ownerSide: "customer",
    sortOrder: 15,
  },
  {
    checklistItemCode: "bmv-bank-statement",
    name: "银行存折复印件",
    category: "company",
    requiredFlag: true,
    ownerSide: "customer",
    sortOrder: 16,
  },
  {
    checklistItemCode: "bmv-guarantee-letter",
    name: "身元保证书",
    category: "standard",
    requiredFlag: true,
    ownerSide: "customer",
    sortOrder: 17,
  },
  {
    checklistItemCode: "bmv-corporate-summary",
    name: "会社概要书",
    category: "company",
    requiredFlag: true,
    ownerSide: "office",
    sortOrder: 18,
  },
];

// ── Reminder Schedule Blueprint（P1 Batch 5 启用）──

export const BMV_REMINDER_SCHEDULE_BLUEPRINT: ReminderScheduleBlueprintItem[] =
  [
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

// ── BMV Template Config Builder ──

/**
 * 构建经营管理签模板的完整 config 对象。
 *
 * 此函数返回的 config 应通过 `TemplatesService.createVersion()`
 * 写入 `template_versions.config`，kind="case_type"，key=BMV_CASE_TYPE_CODE。
 *
 * @returns 完整的 BMV 模板配置
 */
export function buildBmvTemplateConfig(): CaseTemplateConfig {
  return {
    workflowStepsBlueprint: BMV_WORKFLOW_STEPS_BLUEPRINT,
    extraFieldsSchema: BMV_EXTRA_FIELDS_SCHEMA,
    requirementBlueprint: BMV_REQUIREMENT_BLUEPRINT,
    reminderScheduleBlueprint: BMV_REMINDER_SCHEDULE_BLUEPRINT,
    billingGateMode: "block",
    reviewRequiredFlag: true,
  };
}

/**
 * 构建 BMV 模板创建的最小条件 config。
 *
 * 用于测试：无蓝图字段时模板仍可创建（降级运行）。
 *
 * @returns 最小 BMV 模板配置
 */
export function buildBmvMinimalConfig(): CaseTemplateConfig {
  return {
    billingGateMode: "warn",
    reviewRequiredFlag: false,
  };
}
