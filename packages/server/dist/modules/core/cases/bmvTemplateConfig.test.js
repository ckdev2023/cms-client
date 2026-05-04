import test from "node:test";
import assert from "node:assert/strict";
import {
  BMV_CASE_TYPE_CODE,
  BMV_EXTRA_FIELDS_SCHEMA,
  BMV_REMINDER_SCHEDULE_BLUEPRINT,
  BMV_REQUIREMENT_BLUEPRINT,
  BMV_WORKFLOW_STEP_CODES,
  BMV_WORKFLOW_STEPS_BLUEPRINT,
  buildBmvMinimalConfig,
  buildBmvTemplateConfig,
} from "./bmvTemplateConfig";
import {
  parseCaseTemplateConfig,
  validateExtraFieldsSchema,
  validateReminderScheduleBlueprint,
  validateRequirementBlueprint,
  validateWorkflowStepsBlueprint,
} from "./cases.types-template-blueprints";
// ── blueprint structure ──
void test("BMV workflow_steps_blueprint has 15 unique step codes matching the frozen enumeration", () => {
  assert.equal(
    BMV_WORKFLOW_STEPS_BLUEPRINT.length,
    BMV_WORKFLOW_STEP_CODES.length,
  );
  const codes = BMV_WORKFLOW_STEPS_BLUEPRINT.map((s) => s.stepCode);
  assert.deepEqual(codes, [...BMV_WORKFLOW_STEP_CODES]);
  assert.equal(new Set(codes).size, codes.length);
});
void test("BMV workflow_steps_blueprint sortOrder is contiguous starting at 1", () => {
  const orders = BMV_WORKFLOW_STEPS_BLUEPRINT.map((s) => s.sortOrder);
  for (let i = 0; i < orders.length; i++) {
    assert.equal(orders[i], i + 1, `sortOrder mismatch at index ${String(i)}`);
  }
});
void test("BMV workflow_steps_blueprint every step has parentStage in S1-S9", () => {
  const validStages = new Set([
    "S1",
    "S2",
    "S3",
    "S4",
    "S5",
    "S6",
    "S7",
    "S8",
    "S9",
  ]);
  for (const step of BMV_WORKFLOW_STEPS_BLUEPRINT) {
    assert.ok(
      step.parentStage !== null && validStages.has(step.parentStage),
      `${step.stepCode} has invalid parentStage: ${String(step.parentStage)}`,
    );
  }
});
void test("BMV COE_SENT step has billing gate block on final_payment", () => {
  const coeStep = BMV_WORKFLOW_STEPS_BLUEPRINT.find(
    (s) => s.stepCode === "COE_SENT",
  );
  assert.ok(coeStep, "COE_SENT step must exist");
  assert.deepEqual(coeStep.billingGate, {
    mode: "block",
    milestone: "final_payment",
  });
});
void test("BMV NEED_SUPPLEMENT / SUPPLEMENT_PROCESSING form loop pair", () => {
  const needSupplement = BMV_WORKFLOW_STEPS_BLUEPRINT.find(
    (s) => s.stepCode === "NEED_SUPPLEMENT",
  );
  const supplementProcessing = BMV_WORKFLOW_STEPS_BLUEPRINT.find(
    (s) => s.stepCode === "SUPPLEMENT_PROCESSING",
  );
  assert.ok(needSupplement);
  assert.ok(supplementProcessing);
  assert.equal(needSupplement.canLoopTo, "SUPPLEMENT_PROCESSING");
  assert.equal(supplementProcessing.canLoopTo, "UNDER_REVIEW");
});
// ── extra_fields_schema ──
void test("BMV extra_fields_schema has unique fieldKeys", () => {
  const keys = BMV_EXTRA_FIELDS_SCHEMA.map((s) => s.fieldKey);
  assert.equal(new Set(keys).size, keys.length);
});
void test("BMV extra_fields_schema contains visaPlan, coeIssuedDate, coeExpiryDate", () => {
  const keys = new Set(BMV_EXTRA_FIELDS_SCHEMA.map((s) => s.fieldKey));
  assert.ok(keys.has("visaPlan"));
  assert.ok(keys.has("coeIssuedDate"));
  assert.ok(keys.has("coeExpiryDate"));
});
void test("BMV extra_fields_schema enum fields have non-empty enumValues", () => {
  for (const field of BMV_EXTRA_FIELDS_SCHEMA) {
    if (field.fieldType === "enum") {
      assert.ok(
        Array.isArray(field.enumValues) && field.enumValues.length > 0,
        `${field.fieldKey} enum must have enumValues`,
      );
    }
  }
});
// ── requirement_blueprint ──
void test("BMV requirement_blueprint has unique checklistItemCodes", () => {
  const codes = BMV_REQUIREMENT_BLUEPRINT.map((r) => r.checklistItemCode);
  assert.equal(new Set(codes).size, codes.length);
});
void test("BMV requirement_blueprint contains at least one questionnaire item", () => {
  const questionnaires = BMV_REQUIREMENT_BLUEPRINT.filter(
    (r) => r.category === "questionnaire",
  );
  assert.ok(
    questionnaires.length >= 1,
    "Must have at least one questionnaire requirement",
  );
  assert.equal(questionnaires[0]?.checklistItemCode, "bmv-questionnaire");
});
void test("BMV requirement_blueprint sortOrder is unique and contiguous", () => {
  const orders = BMV_REQUIREMENT_BLUEPRINT.map((r) => r.sortOrder).sort(
    (a, b) => a - b,
  );
  for (let i = 0; i < orders.length; i++) {
    assert.equal(orders[i], i + 1, `sortOrder gap at index ${String(i)}`);
  }
});
void test("BMV requirement_blueprint ownerSide values are valid", () => {
  const valid = new Set(["applicant", "customer", "office"]);
  for (const item of BMV_REQUIREMENT_BLUEPRINT) {
    assert.ok(
      valid.has(item.ownerSide),
      `${item.checklistItemCode} has invalid ownerSide: ${item.ownerSide}`,
    );
  }
});
// ── reminder_schedule_blueprint ──
void test("BMV reminder_schedule_blueprint covers 180/90/30 days", () => {
  const days = BMV_REMINDER_SCHEDULE_BLUEPRINT.map((r) => r.daysBefore).sort(
    (a, b) => b - a,
  );
  assert.deepEqual(days, [180, 90, 30]);
});
// ── validation functions ──
void test("validateExtraFieldsSchema accepts valid BMV schema", () => {
  assert.ok(validateExtraFieldsSchema(BMV_EXTRA_FIELDS_SCHEMA));
});
void test("validateExtraFieldsSchema rejects duplicate fieldKeys", () => {
  const dup = [...BMV_EXTRA_FIELDS_SCHEMA, { ...BMV_EXTRA_FIELDS_SCHEMA[0] }];
  assert.equal(validateExtraFieldsSchema(dup), false);
});
void test("validateExtraFieldsSchema rejects empty fieldKey", () => {
  assert.equal(
    validateExtraFieldsSchema([
      {
        fieldKey: "",
        label: "test",
        fieldType: "string",
        required: false,
        defaultValue: null,
      },
    ]),
    false,
  );
});
void test("validateExtraFieldsSchema rejects invalid fieldType", () => {
  assert.equal(
    validateExtraFieldsSchema([
      {
        fieldKey: "x",
        label: "test",
        fieldType: "invalid",
        required: false,
        defaultValue: null,
      },
    ]),
    false,
  );
});
void test("validateExtraFieldsSchema rejects enum without enumValues", () => {
  assert.equal(
    validateExtraFieldsSchema([
      {
        fieldKey: "x",
        label: "test",
        fieldType: "enum",
        required: false,
        defaultValue: null,
      },
    ]),
    false,
  );
});
void test("validateRequirementBlueprint accepts valid BMV blueprint", () => {
  assert.ok(validateRequirementBlueprint(BMV_REQUIREMENT_BLUEPRINT));
});
void test("validateRequirementBlueprint rejects duplicate checklistItemCode", () => {
  const dup = [
    ...BMV_REQUIREMENT_BLUEPRINT,
    { ...BMV_REQUIREMENT_BLUEPRINT[0] },
  ];
  assert.equal(validateRequirementBlueprint(dup), false);
});
void test("validateRequirementBlueprint rejects invalid category", () => {
  assert.equal(
    validateRequirementBlueprint([
      {
        checklistItemCode: "x",
        name: "test",
        category: "unknown",
        requiredFlag: true,
        ownerSide: "customer",
        sortOrder: 1,
      },
    ]),
    false,
  );
});
void test("validateRequirementBlueprint rejects invalid ownerSide", () => {
  assert.equal(
    validateRequirementBlueprint([
      {
        checklistItemCode: "x",
        name: "test",
        category: "standard",
        requiredFlag: true,
        ownerSide: "unknown",
        sortOrder: 1,
      },
    ]),
    false,
  );
});
void test("validateWorkflowStepsBlueprint accepts valid BMV blueprint", () => {
  assert.ok(validateWorkflowStepsBlueprint(BMV_WORKFLOW_STEPS_BLUEPRINT));
});
void test("validateWorkflowStepsBlueprint rejects duplicate stepCode", () => {
  const dup = [
    ...BMV_WORKFLOW_STEPS_BLUEPRINT,
    { ...BMV_WORKFLOW_STEPS_BLUEPRINT[0] },
  ];
  assert.equal(validateWorkflowStepsBlueprint(dup), false);
});
void test("validateReminderScheduleBlueprint accepts valid BMV blueprint", () => {
  assert.ok(validateReminderScheduleBlueprint(BMV_REMINDER_SCHEDULE_BLUEPRINT));
});
void test("validateReminderScheduleBlueprint rejects zero daysBefore", () => {
  assert.equal(
    validateReminderScheduleBlueprint([
      { daysBefore: 0, channel: "in_app", recipientType: "owner", label: "x" },
    ]),
    false,
  );
});
// ── config builder ──
void test("buildBmvTemplateConfig returns full config with all 4 blueprints", () => {
  const config = buildBmvTemplateConfig();
  assert.ok(Array.isArray(config.workflowStepsBlueprint));
  assert.ok(Array.isArray(config.extraFieldsSchema));
  assert.ok(Array.isArray(config.requirementBlueprint));
  assert.ok(Array.isArray(config.reminderScheduleBlueprint));
  assert.equal(config.billingGateMode, "block");
  assert.equal(config.reviewRequiredFlag, true);
});
void test("buildBmvMinimalConfig returns config without blueprints", () => {
  const config = buildBmvMinimalConfig();
  assert.equal(config.workflowStepsBlueprint, undefined);
  assert.equal(config.extraFieldsSchema, undefined);
  assert.equal(config.requirementBlueprint, undefined);
  assert.equal(config.reminderScheduleBlueprint, undefined);
  assert.equal(config.billingGateMode, "warn");
  assert.equal(config.reviewRequiredFlag, false);
});
void test("parseCaseTemplateConfig round-trips from full BMV config", () => {
  const original = buildBmvTemplateConfig();
  const raw = JSON.parse(JSON.stringify(original));
  const parsed = parseCaseTemplateConfig(raw);
  assert.equal(
    parsed.workflowStepsBlueprint?.length,
    original.workflowStepsBlueprint?.length,
  );
  assert.equal(
    parsed.extraFieldsSchema?.length,
    original.extraFieldsSchema?.length,
  );
  assert.equal(
    parsed.requirementBlueprint?.length,
    original.requirementBlueprint?.length,
  );
  assert.equal(
    parsed.reminderScheduleBlueprint?.length,
    original.reminderScheduleBlueprint?.length,
  );
  assert.equal(parsed.billingGateMode, "block");
  assert.equal(parsed.reviewRequiredFlag, true);
});
void test("parseCaseTemplateConfig handles empty config gracefully", () => {
  const parsed = parseCaseTemplateConfig({});
  assert.equal(parsed.workflowStepsBlueprint, undefined);
  assert.equal(parsed.extraFieldsSchema, undefined);
  assert.equal(parsed.requirementBlueprint, undefined);
  assert.equal(parsed.reminderScheduleBlueprint, undefined);
  assert.equal(parsed.billingGateMode, undefined);
  assert.equal(parsed.reviewRequiredFlag, undefined);
});
void test("parseCaseTemplateConfig rejects non-array blueprint fields", () => {
  const parsed = parseCaseTemplateConfig({
    workflowStepsBlueprint: "not-array",
    extraFieldsSchema: 42,
  });
  assert.equal(parsed.workflowStepsBlueprint, undefined);
  assert.equal(parsed.extraFieldsSchema, undefined);
});
// ── naming convention ──
void test("BMV_CASE_TYPE_CODE is snake_case", () => {
  assert.equal(BMV_CASE_TYPE_CODE, "business_manager_visa");
  assert.ok(/^[a-z][a-z0-9_]*$/.test(BMV_CASE_TYPE_CODE));
});
void test("extra_fields_schema fieldKeys are camelCase", () => {
  for (const field of BMV_EXTRA_FIELDS_SCHEMA) {
    assert.ok(
      /^[a-z][a-zA-Z0-9]*$/.test(field.fieldKey),
      `${field.fieldKey} must be camelCase`,
    );
  }
});
void test("requirement_blueprint checklistItemCodes are kebab-case", () => {
  for (const item of BMV_REQUIREMENT_BLUEPRINT) {
    assert.ok(
      /^[a-z][a-z0-9-]*$/.test(item.checklistItemCode),
      `${item.checklistItemCode} must be kebab-case`,
    );
  }
});
void test("workflow_steps_blueprint stepCodes are UPPER_SNAKE_CASE", () => {
  for (const step of BMV_WORKFLOW_STEPS_BLUEPRINT) {
    assert.ok(
      /^[A-Z][A-Z0-9_]*$/.test(step.stepCode),
      `${step.stepCode} must be UPPER_SNAKE_CASE`,
    );
  }
});
// ── minimum template creation conditions ──
void test("TemplatesService.createVersion minimum requirement: kind + key + config object", () => {
  const minConfig = buildBmvMinimalConfig();
  assert.ok(typeof minConfig === "object");
  assert.ok(!Array.isArray(minConfig));
  const serialized = JSON.parse(JSON.stringify(minConfig));
  assert.ok(typeof serialized === "object");
  assert.ok(Object.keys(serialized).length >= 1);
});
void test("full BMV config is JSON-serializable", () => {
  const config = buildBmvTemplateConfig();
  const json = JSON.stringify(config);
  assert.ok(json.length > 0);
  const parsed = JSON.parse(json);
  assert.ok(Array.isArray(parsed.workflowStepsBlueprint));
});
//# sourceMappingURL=bmvTemplateConfig.test.js.map
