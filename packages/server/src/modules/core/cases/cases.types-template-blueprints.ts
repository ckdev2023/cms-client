import type { CaseTemplateWorkflowStepDef } from "../model/coreEntities";

// ────────────────────────────────────────────────────────────────
// P1 模板蓝图类型定义 — 冻结契约
//
// 覆盖 CaseTemplate.config 内 4 个蓝图 key 的结构化类型：
//   workflow_steps_blueprint / extra_fields_schema /
//   requirement_blueprint / reminder_schedule_blueprint
//
// 权威来源：
//   - p1-sv-000-01 §4（模板蓝图真相源）
//   - p1-sv-000-02 §1.4（config 落点与 kind/key）
//   - P1/01 §3 M1–M2
//   - P0/07-数据模型设计 §3.8
// ────────────────────────────────────────────────────────────────

// ── ExtraFieldSchema ──

/** 模板专属字段可用类型。 */
export type ExtraFieldType =
  | "string"
  | "number"
  | "boolean"
  | "date"
  | "enum"
  | "text";

/**
 * 模板专属字段定义。
 *
 * 建案时根据此 schema 初始化 `Case.extra_fields` 的合法 key 与默认值；
 * 更新 `extra_fields` 时按此 schema 校验类型、必填与枚举约束。
 */
export type ExtraFieldSchema = {
  fieldKey: string;
  label: string;
  fieldType: ExtraFieldType;
  required: boolean;
  defaultValue: unknown;
  enumValues?: string[];
  description?: string;
};

const VALID_EXTRA_FIELD_TYPES: ReadonlySet<string> = new Set([
  "string",
  "number",
  "boolean",
  "date",
  "enum",
  "text",
]);

function isValidExtraField(
  s: Record<string, unknown>,
  keys: Set<string>,
): boolean {
  if (typeof s.fieldKey !== "string" || s.fieldKey.length === 0) return false;
  if (keys.has(s.fieldKey)) return false;
  keys.add(s.fieldKey);
  if (
    typeof s.fieldType !== "string" ||
    !VALID_EXTRA_FIELD_TYPES.has(s.fieldType)
  )
    return false;
  if (typeof s.label !== "string" || s.label.length === 0) return false;
  if (typeof s.required !== "boolean") return false;
  if (
    s.fieldType === "enum" &&
    (!Array.isArray(s.enumValues) || s.enumValues.length === 0)
  )
    return false;
  return true;
}

/**
 * 校验 extra_fields_schema 数组结构合法性。
 *
 * @param schema 待校验数组
 * @returns 是否为合法 ExtraFieldSchema[]
 */
export function validateExtraFieldsSchema(
  schema: unknown[],
): schema is ExtraFieldSchema[] {
  if (!Array.isArray(schema)) return false;
  const keys = new Set<string>();
  for (const item of schema) {
    if (!item || typeof item !== "object") return false;
    if (!isValidExtraField(item as Record<string, unknown>, keys)) return false;
  }
  return true;
}

// ── RequirementBlueprint ──

export const REQUIREMENT_CATEGORIES = [
  "standard",
  "questionnaire",
  "company",
  "personal",
] as const;

/** 资料清单类别枚举值。 */
export type RequirementCategory = (typeof REQUIREMENT_CATEGORIES)[number];

/** 进度分组角色枚举值 — 与 document_items.provided_by_role 列对齐。 */
export const PROVIDED_BY_ROLES = ["applicant", "supporter", "office"] as const;

/**
 *
 */
export type ProvidedByRole = (typeof PROVIDED_BY_ROLES)[number];

/**
 * 模板资料清单蓝图项。
 *
 * 建案时根据此 blueprint 批量 INSERT document_items 行。
 * `category=questionnaire` 的项与普通资料项统一参与完成率/审核/催办。
 */
export type RequirementBlueprintItem = {
  checklistItemCode: string;
  name: string;
  category: RequirementCategory;
  requiredFlag: boolean;
  ownerSide: "applicant" | "customer" | "office";
  sortOrder: number;
  description?: string;
  providedByRole?: ProvidedByRole;
};

const VALID_CATEGORIES: ReadonlySet<string> = new Set(REQUIREMENT_CATEGORIES);
const VALID_OWNER_SIDES: ReadonlySet<string> = new Set([
  "applicant",
  "customer",
  "office",
]);
const VALID_PROVIDED_BY_ROLES: ReadonlySet<string> = new Set(PROVIDED_BY_ROLES);

function isValidRequirementItem(
  r: Record<string, unknown>,
  codes: Set<string>,
): boolean {
  if (!hasUniqueChecklistCode(r, codes)) return false;
  if (typeof r.name !== "string" || r.name.length === 0) return false;
  if (typeof r.category !== "string" || !VALID_CATEGORIES.has(r.category))
    return false;
  if (typeof r.requiredFlag !== "boolean") return false;
  if (typeof r.ownerSide !== "string" || !VALID_OWNER_SIDES.has(r.ownerSide))
    return false;
  if (typeof r.sortOrder !== "number") return false;
  if (!isValidOptionalProvidedByRole(r.providedByRole)) return false;
  return true;
}

function hasUniqueChecklistCode(
  r: Record<string, unknown>,
  codes: Set<string>,
): boolean {
  if (
    typeof r.checklistItemCode !== "string" ||
    r.checklistItemCode.length === 0
  ) {
    return false;
  }
  if (codes.has(r.checklistItemCode)) return false;
  codes.add(r.checklistItemCode);
  return true;
}

function isValidOptionalProvidedByRole(value: unknown): boolean {
  if (value === undefined) return true;
  if (typeof value !== "string") return false;
  return VALID_PROVIDED_BY_ROLES.has(value);
}

/**
 * 校验 requirement_blueprint 数组结构合法性。
 *
 * @param blueprint 待校验数组
 * @returns 是否为合法 RequirementBlueprintItem[]
 */
export function validateRequirementBlueprint(
  blueprint: unknown[],
): blueprint is RequirementBlueprintItem[] {
  if (!Array.isArray(blueprint)) return false;
  const codes = new Set<string>();
  for (const item of blueprint) {
    if (!item || typeof item !== "object") return false;
    if (!isValidRequirementItem(item as Record<string, unknown>, codes))
      return false;
  }
  return true;
}

// ── WorkflowStepBlueprint ──

/** 工作流步骤蓝图项（复用 CaseTemplateWorkflowStepDef）。 */
export type WorkflowStepBlueprint = CaseTemplateWorkflowStepDef;

/**
 * 校验 workflow_steps_blueprint 数组结构合法性。
 *
 * @param blueprint 待校验数组
 * @returns 是否为合法 WorkflowStepBlueprint[]
 */
export function validateWorkflowStepsBlueprint(
  blueprint: unknown[],
): blueprint is WorkflowStepBlueprint[] {
  if (!Array.isArray(blueprint)) return false;
  const codes = new Set<string>();
  for (const item of blueprint) {
    if (!item || typeof item !== "object") return false;
    const s = item as Record<string, unknown>;
    if (typeof s.stepCode !== "string" || s.stepCode.length === 0) return false;
    if (codes.has(s.stepCode)) return false;
    codes.add(s.stepCode);
    if (typeof s.label !== "string" || s.label.length === 0) return false;
    if (typeof s.sortOrder !== "number") return false;
  }
  return true;
}

// ── ReminderScheduleBlueprint ──

/**
 * 在留到期提醒蓝图项（P1 Batch 5 启用）。
 *
 * daysBefore: 到期前天数（如 180 / 90 / 30）
 * channel: 提醒通道（email / sms / in_app）
 * recipientType: 提醒接收方类型
 */
export type ReminderScheduleBlueprintItem = {
  daysBefore: number;
  channel: string;
  recipientType: string;
  label: string;
};

function isValidReminderItem(r: Record<string, unknown>): boolean {
  if (typeof r.daysBefore !== "number" || r.daysBefore <= 0) return false;
  if (typeof r.channel !== "string" || r.channel.length === 0) return false;
  if (typeof r.recipientType !== "string" || r.recipientType.length === 0)
    return false;
  if (typeof r.label !== "string" || r.label.length === 0) return false;
  return true;
}

/**
 * 校验 reminder_schedule_blueprint 数组结构合法性。
 *
 * @param blueprint 待校验数组
 * @returns 是否为合法 ReminderScheduleBlueprintItem[]
 */
export function validateReminderScheduleBlueprint(
  blueprint: unknown[],
): blueprint is ReminderScheduleBlueprintItem[] {
  if (!Array.isArray(blueprint)) return false;
  for (const item of blueprint) {
    if (!item || typeof item !== "object") return false;
    if (!isValidReminderItem(item as Record<string, unknown>)) return false;
  }
  return true;
}

// ── CaseTemplateConfig ──

/**
 * CaseTemplate config blob 的结构化类型。
 *
 * 存放在 `template_versions.config` 内。
 * P0 仅填充基础字段；P1 填充蓝图 key。
 */
export type CaseTemplateConfig = {
  workflowStepsBlueprint?: WorkflowStepBlueprint[];
  extraFieldsSchema?: ExtraFieldSchema[];
  requirementBlueprint?: RequirementBlueprintItem[];
  reminderScheduleBlueprint?: ReminderScheduleBlueprintItem[];
  billingGateMode?: "off" | "warn" | "block";
  reviewRequiredFlag?: boolean;
};

/**
 * 从通用 config Record 中提取结构化 CaseTemplateConfig。
 *
 * @param config 通用 config 对象
 * @returns 结构化 CaseTemplateConfig
 */
export function parseCaseTemplateConfig(
  config: Record<string, unknown>,
): CaseTemplateConfig {
  const result: CaseTemplateConfig = {};

  if (Array.isArray(config.workflowStepsBlueprint)) {
    result.workflowStepsBlueprint =
      config.workflowStepsBlueprint as WorkflowStepBlueprint[];
  }
  if (Array.isArray(config.extraFieldsSchema)) {
    result.extraFieldsSchema = config.extraFieldsSchema as ExtraFieldSchema[];
  }
  if (Array.isArray(config.requirementBlueprint)) {
    result.requirementBlueprint =
      config.requirementBlueprint as RequirementBlueprintItem[];
  }
  if (Array.isArray(config.reminderScheduleBlueprint)) {
    result.reminderScheduleBlueprint =
      config.reminderScheduleBlueprint as ReminderScheduleBlueprintItem[];
  }
  if (
    config.billingGateMode === "off" ||
    config.billingGateMode === "warn" ||
    config.billingGateMode === "block"
  ) {
    result.billingGateMode = config.billingGateMode;
  }
  if (typeof config.reviewRequiredFlag === "boolean") {
    result.reviewRequiredFlag = config.reviewRequiredFlag;
  }

  return result;
}
