const VALID_EXTRA_FIELD_TYPES = new Set([
  "string",
  "number",
  "boolean",
  "date",
  "enum",
  "text",
]);
function isValidExtraField(s, keys) {
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
export function validateExtraFieldsSchema(schema) {
  if (!Array.isArray(schema)) return false;
  const keys = new Set();
  for (const item of schema) {
    if (!item || typeof item !== "object") return false;
    if (!isValidExtraField(item, keys)) return false;
  }
  return true;
}
// ── RequirementBlueprint ──
export const REQUIREMENT_CATEGORIES = [
  "standard",
  "questionnaire",
  "company",
  "personal",
];
const VALID_CATEGORIES = new Set(REQUIREMENT_CATEGORIES);
const VALID_OWNER_SIDES = new Set(["applicant", "customer", "office"]);
function isValidRequirementItem(r, codes) {
  if (
    typeof r.checklistItemCode !== "string" ||
    r.checklistItemCode.length === 0
  )
    return false;
  if (codes.has(r.checklistItemCode)) return false;
  codes.add(r.checklistItemCode);
  if (typeof r.name !== "string" || r.name.length === 0) return false;
  if (typeof r.category !== "string" || !VALID_CATEGORIES.has(r.category))
    return false;
  if (typeof r.requiredFlag !== "boolean") return false;
  if (typeof r.ownerSide !== "string" || !VALID_OWNER_SIDES.has(r.ownerSide))
    return false;
  if (typeof r.sortOrder !== "number") return false;
  return true;
}
/**
 * 校验 requirement_blueprint 数组结构合法性。
 *
 * @param blueprint 待校验数组
 * @returns 是否为合法 RequirementBlueprintItem[]
 */
export function validateRequirementBlueprint(blueprint) {
  if (!Array.isArray(blueprint)) return false;
  const codes = new Set();
  for (const item of blueprint) {
    if (!item || typeof item !== "object") return false;
    if (!isValidRequirementItem(item, codes)) return false;
  }
  return true;
}
/**
 * 校验 workflow_steps_blueprint 数组结构合法性。
 *
 * @param blueprint 待校验数组
 * @returns 是否为合法 WorkflowStepBlueprint[]
 */
export function validateWorkflowStepsBlueprint(blueprint) {
  if (!Array.isArray(blueprint)) return false;
  const codes = new Set();
  for (const item of blueprint) {
    if (!item || typeof item !== "object") return false;
    const s = item;
    if (typeof s.stepCode !== "string" || s.stepCode.length === 0) return false;
    if (codes.has(s.stepCode)) return false;
    codes.add(s.stepCode);
    if (typeof s.label !== "string" || s.label.length === 0) return false;
    if (typeof s.sortOrder !== "number") return false;
  }
  return true;
}
function isValidReminderItem(r) {
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
export function validateReminderScheduleBlueprint(blueprint) {
  if (!Array.isArray(blueprint)) return false;
  for (const item of blueprint) {
    if (!item || typeof item !== "object") return false;
    if (!isValidReminderItem(item)) return false;
  }
  return true;
}
/**
 * 从通用 config Record 中提取结构化 CaseTemplateConfig。
 *
 * @param config 通用 config 对象
 * @returns 结构化 CaseTemplateConfig
 */
export function parseCaseTemplateConfig(config) {
  const result = {};
  if (Array.isArray(config.workflowStepsBlueprint)) {
    result.workflowStepsBlueprint = config.workflowStepsBlueprint;
  }
  if (Array.isArray(config.extraFieldsSchema)) {
    result.extraFieldsSchema = config.extraFieldsSchema;
  }
  if (Array.isArray(config.requirementBlueprint)) {
    result.requirementBlueprint = config.requirementBlueprint;
  }
  if (Array.isArray(config.reminderScheduleBlueprint)) {
    result.reminderScheduleBlueprint = config.reminderScheduleBlueprint;
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
//# sourceMappingURL=cases.types-template-blueprints.js.map
