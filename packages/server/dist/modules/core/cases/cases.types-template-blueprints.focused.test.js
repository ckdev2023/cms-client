import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  validateExtraFieldsSchema,
  validateRequirementBlueprint,
  validateWorkflowStepsBlueprint,
  validateReminderScheduleBlueprint,
  parseCaseTemplateConfig,
  REQUIREMENT_CATEGORIES,
} from "./cases.types-template-blueprints";
import {
  SAMPLE_FIELDS,
  SAMPLE_REMINDERS,
  SAMPLE_REQS,
  SAMPLE_STEPS,
  VALID_FIELD,
  VALID_REMINDER,
  VALID_REQ,
  VALID_STEP,
} from "./cases.types-template-blueprints.focused.test-support";
// ────────────────────────────────────────────────────────────────
// 1. validateExtraFieldsSchema
// ────────────────────────────────────────────────────────────────
void describe("validateExtraFieldsSchema", () => {
  void test("accepts valid schema array", () => {
    assert.ok(validateExtraFieldsSchema(SAMPLE_FIELDS));
  });
  void test("accepts empty array", () => {
    assert.ok(validateExtraFieldsSchema([]));
  });
  void test("rejects non-array", () => {
    assert.equal(validateExtraFieldsSchema("nope"), false);
  });
  void test("rejects null item", () => {
    assert.equal(validateExtraFieldsSchema([null]), false);
  });
  void test("rejects empty fieldKey", () => {
    assert.equal(
      validateExtraFieldsSchema([{ ...VALID_FIELD, fieldKey: "" }]),
      false,
    );
  });
  void test("rejects missing fieldKey", () => {
    const rest = { ...VALID_FIELD };
    delete rest.fieldKey;
    assert.equal(validateExtraFieldsSchema([rest]), false);
  });
  void test("rejects duplicate fieldKey", () => {
    assert.equal(validateExtraFieldsSchema([VALID_FIELD, VALID_FIELD]), false);
  });
  void test("rejects invalid fieldType", () => {
    assert.equal(
      validateExtraFieldsSchema([{ ...VALID_FIELD, fieldType: "invalid" }]),
      false,
    );
  });
  void test("rejects enum without enumValues", () => {
    const rest = { ...VALID_FIELD };
    delete rest.enumValues;
    assert.equal(validateExtraFieldsSchema([rest]), false);
  });
  void test("rejects enum with empty enumValues", () => {
    assert.equal(
      validateExtraFieldsSchema([{ ...VALID_FIELD, enumValues: [] }]),
      false,
    );
  });
  void test("accepts enum with non-empty enumValues", () => {
    assert.ok(validateExtraFieldsSchema([VALID_FIELD]));
  });
  void test("rejects empty label", () => {
    assert.equal(
      validateExtraFieldsSchema([{ ...VALID_FIELD, label: "" }]),
      false,
    );
  });
  void test("rejects non-boolean required", () => {
    assert.equal(
      validateExtraFieldsSchema([{ ...VALID_FIELD, required: "yes" }]),
      false,
    );
  });
  void test("accepts all valid fieldType values", () => {
    const types = ["string", "number", "boolean", "date", "enum", "text"];
    for (const ft of types) {
      const item = {
        fieldKey: `f_${ft}`,
        label: `F ${ft}`,
        fieldType: ft,
        required: false,
        defaultValue: null,
        ...(ft === "enum" ? { enumValues: ["a"] } : {}),
      };
      assert.ok(
        validateExtraFieldsSchema([item]),
        `fieldType "${ft}" should be valid`,
      );
    }
  });
});
// ────────────────────────────────────────────────────────────────
// 2. validateRequirementBlueprint
// ────────────────────────────────────────────────────────────────
void describe("validateRequirementBlueprint", () => {
  void test("accepts valid blueprint array", () => {
    assert.ok(validateRequirementBlueprint(SAMPLE_REQS));
  });
  void test("accepts empty array", () => {
    assert.ok(validateRequirementBlueprint([]));
  });
  void test("rejects non-array", () => {
    assert.equal(validateRequirementBlueprint({}), false);
  });
  void test("rejects null item", () => {
    assert.equal(validateRequirementBlueprint([null]), false);
  });
  void test("rejects empty checklistItemCode", () => {
    assert.equal(
      validateRequirementBlueprint([{ ...VALID_REQ, checklistItemCode: "" }]),
      false,
    );
  });
  void test("rejects missing checklistItemCode", () => {
    const rest = { ...VALID_REQ };
    delete rest.checklistItemCode;
    assert.equal(validateRequirementBlueprint([rest]), false);
  });
  void test("rejects duplicate checklistItemCode", () => {
    assert.equal(validateRequirementBlueprint([VALID_REQ, VALID_REQ]), false);
  });
  void test("rejects invalid category", () => {
    assert.equal(
      validateRequirementBlueprint([{ ...VALID_REQ, category: "unknown" }]),
      false,
    );
  });
  void test("rejects invalid ownerSide", () => {
    assert.equal(
      validateRequirementBlueprint([{ ...VALID_REQ, ownerSide: "manager" }]),
      false,
    );
  });
  void test("rejects non-boolean requiredFlag", () => {
    assert.equal(
      validateRequirementBlueprint([{ ...VALID_REQ, requiredFlag: 1 }]),
      false,
    );
  });
  void test("rejects non-number sortOrder", () => {
    assert.equal(
      validateRequirementBlueprint([{ ...VALID_REQ, sortOrder: "1" }]),
      false,
    );
  });
  void test("accepts all valid categories", () => {
    for (const cat of REQUIREMENT_CATEGORIES) {
      const item = {
        ...VALID_REQ,
        checklistItemCode: `item-${cat}`,
        category: cat,
      };
      assert.ok(
        validateRequirementBlueprint([item]),
        `category "${cat}" should be valid`,
      );
    }
  });
  void test("accepts all valid ownerSides", () => {
    for (const side of ["applicant", "customer", "office"]) {
      const item = {
        ...VALID_REQ,
        checklistItemCode: `item-${side}`,
        ownerSide: side,
      };
      assert.ok(
        validateRequirementBlueprint([item]),
        `ownerSide "${side}" should be valid`,
      );
    }
  });
});
// ────────────────────────────────────────────────────────────────
// 3. validateWorkflowStepsBlueprint
// ────────────────────────────────────────────────────────────────
void describe("validateWorkflowStepsBlueprint", () => {
  void test("accepts valid steps array", () => {
    assert.ok(validateWorkflowStepsBlueprint(SAMPLE_STEPS));
  });
  void test("accepts empty array", () => {
    assert.ok(validateWorkflowStepsBlueprint([]));
  });
  void test("rejects non-array", () => {
    assert.equal(validateWorkflowStepsBlueprint(42), false);
  });
  void test("rejects empty stepCode", () => {
    assert.equal(
      validateWorkflowStepsBlueprint([{ ...VALID_STEP, stepCode: "" }]),
      false,
    );
  });
  void test("rejects missing stepCode", () => {
    const rest = { ...VALID_STEP };
    delete rest.stepCode;
    assert.equal(validateWorkflowStepsBlueprint([rest]), false);
  });
  void test("rejects duplicate stepCode", () => {
    assert.equal(
      validateWorkflowStepsBlueprint([VALID_STEP, VALID_STEP]),
      false,
    );
  });
  void test("rejects empty label", () => {
    assert.equal(
      validateWorkflowStepsBlueprint([{ ...VALID_STEP, label: "" }]),
      false,
    );
  });
  void test("rejects non-number sortOrder", () => {
    assert.equal(
      validateWorkflowStepsBlueprint([{ ...VALID_STEP, sortOrder: "1" }]),
      false,
    );
  });
  void test("rejects null item", () => {
    assert.equal(validateWorkflowStepsBlueprint([null]), false);
  });
});
// ────────────────────────────────────────────────────────────────
// 4. validateReminderScheduleBlueprint
// ────────────────────────────────────────────────────────────────
void describe("validateReminderScheduleBlueprint", () => {
  void test("accepts valid reminders array", () => {
    assert.ok(validateReminderScheduleBlueprint(SAMPLE_REMINDERS));
  });
  void test("accepts empty array", () => {
    assert.ok(validateReminderScheduleBlueprint([]));
  });
  void test("rejects non-positive daysBefore", () => {
    assert.equal(
      validateReminderScheduleBlueprint([{ ...VALID_REMINDER, daysBefore: 0 }]),
      false,
    );
  });
  void test("rejects negative daysBefore", () => {
    assert.equal(
      validateReminderScheduleBlueprint([
        { ...VALID_REMINDER, daysBefore: -1 },
      ]),
      false,
    );
  });
  void test("rejects empty channel", () => {
    assert.equal(
      validateReminderScheduleBlueprint([{ ...VALID_REMINDER, channel: "" }]),
      false,
    );
  });
  void test("rejects empty label", () => {
    assert.equal(
      validateReminderScheduleBlueprint([{ ...VALID_REMINDER, label: "" }]),
      false,
    );
  });
  void test("rejects empty recipientType", () => {
    assert.equal(
      validateReminderScheduleBlueprint([
        { ...VALID_REMINDER, recipientType: "" },
      ]),
      false,
    );
  });
});
// ────────────────────────────────────────────────────────────────
// 5. parseCaseTemplateConfig
// ────────────────────────────────────────────────────────────────
void describe("parseCaseTemplateConfig", () => {
  void test("parses empty config to empty result", () => {
    const result = parseCaseTemplateConfig({});
    assert.deepEqual(result, {});
  });
  void test("parses full config with all blueprints", () => {
    const config = {
      workflowStepsBlueprint: SAMPLE_STEPS,
      extraFieldsSchema: SAMPLE_FIELDS,
      requirementBlueprint: SAMPLE_REQS,
      reminderScheduleBlueprint: SAMPLE_REMINDERS,
      billingGateMode: "block",
      reviewRequiredFlag: true,
    };
    const parsed = parseCaseTemplateConfig(config);
    assert.ok(parsed.workflowStepsBlueprint);
    assert.ok(parsed.extraFieldsSchema);
    assert.ok(parsed.requirementBlueprint);
    assert.ok(parsed.reminderScheduleBlueprint);
    assert.equal(parsed.billingGateMode, "block");
    assert.equal(parsed.reviewRequiredFlag, true);
  });
  void test("extracts billingGateMode only for valid values", () => {
    assert.equal(
      parseCaseTemplateConfig({ billingGateMode: "off" }).billingGateMode,
      "off",
    );
    assert.equal(
      parseCaseTemplateConfig({ billingGateMode: "warn" }).billingGateMode,
      "warn",
    );
    assert.equal(
      parseCaseTemplateConfig({ billingGateMode: "block" }).billingGateMode,
      "block",
    );
    assert.equal(
      parseCaseTemplateConfig({ billingGateMode: "invalid" }).billingGateMode,
      undefined,
    );
    assert.equal(
      parseCaseTemplateConfig({ billingGateMode: null }).billingGateMode,
      undefined,
    );
  });
  void test("extracts reviewRequiredFlag only for boolean", () => {
    assert.equal(
      parseCaseTemplateConfig({ reviewRequiredFlag: true }).reviewRequiredFlag,
      true,
    );
    assert.equal(
      parseCaseTemplateConfig({ reviewRequiredFlag: false }).reviewRequiredFlag,
      false,
    );
    assert.equal(
      parseCaseTemplateConfig({ reviewRequiredFlag: "yes" }).reviewRequiredFlag,
      undefined,
    );
  });
  void test("ignores non-array blueprint values", () => {
    const parsed = parseCaseTemplateConfig({
      workflowStepsBlueprint: "not-array",
      extraFieldsSchema: 42,
      requirementBlueprint: null,
      reminderScheduleBlueprint: {},
    });
    assert.equal(parsed.workflowStepsBlueprint, undefined);
    assert.equal(parsed.extraFieldsSchema, undefined);
    assert.equal(parsed.requirementBlueprint, undefined);
    assert.equal(parsed.reminderScheduleBlueprint, undefined);
  });
  void test("round-trips through JSON serialization", () => {
    const config = {
      workflowStepsBlueprint: SAMPLE_STEPS,
      extraFieldsSchema: SAMPLE_FIELDS,
      requirementBlueprint: SAMPLE_REQS,
      billingGateMode: "block",
      reviewRequiredFlag: true,
    };
    const serialized = JSON.parse(JSON.stringify(config));
    const parsed = parseCaseTemplateConfig(serialized);
    assert.equal(parsed.workflowStepsBlueprint?.length, 2);
    assert.equal(parsed.extraFieldsSchema?.length, 2);
    assert.equal(parsed.requirementBlueprint?.length, 2);
  });
});
// ────────────────────────────────────────────────────────────────
// 6. Minimum conditions for valid template config
// ────────────────────────────────────────────────────────────────
void describe("minimum template creation conditions", () => {
  void test("P0 template needs only billingGateMode and reviewRequiredFlag", () => {
    const config = parseCaseTemplateConfig({
      billingGateMode: "warn",
      reviewRequiredFlag: false,
    });
    assert.equal(config.billingGateMode, "warn");
    assert.equal(config.reviewRequiredFlag, false);
    assert.equal(config.workflowStepsBlueprint, undefined);
    assert.equal(config.extraFieldsSchema, undefined);
    assert.equal(config.requirementBlueprint, undefined);
  });
  void test("P1 BMV-style template requires all four blueprint arrays", () => {
    const config = {
      workflowStepsBlueprint: SAMPLE_STEPS,
      extraFieldsSchema: SAMPLE_FIELDS,
      requirementBlueprint: SAMPLE_REQS,
      reminderScheduleBlueprint: SAMPLE_REMINDERS,
      billingGateMode: "block",
      reviewRequiredFlag: true,
    };
    const parsed = parseCaseTemplateConfig(config);
    assert.ok(parsed.workflowStepsBlueprint, "needs workflow steps");
    assert.ok(parsed.extraFieldsSchema, "needs extra fields schema");
    assert.ok(parsed.requirementBlueprint, "needs requirement blueprint");
    assert.ok(parsed.reminderScheduleBlueprint, "needs reminder schedule");
    assert.equal(parsed.billingGateMode, "block");
    assert.equal(parsed.reviewRequiredFlag, true);
  });
  void test("all sample blueprints pass their respective validators", () => {
    assert.ok(validateWorkflowStepsBlueprint(SAMPLE_STEPS), "steps must pass");
    assert.ok(validateExtraFieldsSchema(SAMPLE_FIELDS), "fields must pass");
    assert.ok(validateRequirementBlueprint(SAMPLE_REQS), "reqs must pass");
    assert.ok(
      validateReminderScheduleBlueprint(SAMPLE_REMINDERS),
      "reminders must pass",
    );
  });
  void test("REQUIREMENT_CATEGORIES is frozen and contains expected values", () => {
    assert.deepEqual(
      [...REQUIREMENT_CATEGORIES],
      ["standard", "questionnaire", "company", "personal"],
    );
  });
});
//# sourceMappingURL=cases.types-template-blueprints.focused.test.js.map
