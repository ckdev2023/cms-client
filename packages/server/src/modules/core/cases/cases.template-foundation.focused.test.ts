import { test, describe } from "node:test";
import assert from "node:assert/strict";

import type {
  CaseTemplate,
  CaseTemplateWorkflowStepDef,
} from "../model/coreEntities";
import {
  validateExtraFieldsSchema,
  validateRequirementBlueprint,
  validateWorkflowStepsBlueprint,
  validateReminderScheduleBlueprint,
  parseCaseTemplateConfig,
} from "./cases.types-template-blueprints";
import type {
  ExtraFieldSchema,
  RequirementBlueprintItem,
  WorkflowStepBlueprint,
} from "./cases.types-template-blueprints";
import {
  BMV_CASE_TYPE_CODE,
  BMV_WORKFLOW_STEPS_BLUEPRINT,
  BMV_EXTRA_FIELDS_SCHEMA,
  BMV_REQUIREMENT_BLUEPRINT,
  BMV_REMINDER_SCHEDULE_BLUEPRINT,
  buildBmvTemplateConfig,
  buildBmvMinimalConfig,
} from "./bmvTemplateConfig";
import {
  BMV_CASE_TYPE,
  BMV_STEP_CODES,
  BMV_WORKFLOW_STEPS_BLUEPRINT as REEXPORTED_STEPS,
  BMV_EXTRA_FIELDS_SCHEMA as REEXPORTED_FIELDS,
  BMV_REQUIREMENT_BLUEPRINT as REEXPORTED_REQS,
} from "./cases.template-bmv";

// ────────────────────────────────────────────────────────────────
// 1. 類型契約: coreEntities ↔ cases.types-template-blueprints 対齊
// ────────────────────────────────────────────────────────────────

void describe("type alignment: coreEntities ↔ blueprint types", () => {
  void test("ExtraFieldSchema and CaseTemplateExtraFieldDef are distinct types (p1-sv-001-02)", () => {
    const schema: ExtraFieldSchema = {
      fieldKey: "test",
      label: "test",
      fieldType: "string",
      required: false,
      defaultValue: null,
    };
    assert.equal(schema.fieldKey, "test");
    // CaseTemplateExtraFieldDef now uses fieldCode (snake_case) + storage
    // ExtraFieldSchema uses fieldKey (camelCase) -- intentionally divergent
  });

  void test("RequirementBlueprintItem and CaseTemplateRequirementDef are distinct types (p1-sv-001-02)", () => {
    const item: RequirementBlueprintItem = {
      checklistItemCode: "test-item",
      name: "test",
      category: "standard",
      requiredFlag: true,
      ownerSide: "customer",
      sortOrder: 1,
    };
    assert.equal(item.checklistItemCode, "test-item");
    // CaseTemplateRequirementDef now uses itemCode (snake_case) + providedByRole
    // RequirementBlueprintItem uses checklistItemCode (kebab-case) -- intentionally divergent
  });

  void test("WorkflowStepBlueprint is CaseTemplateWorkflowStepDef", () => {
    const step: WorkflowStepBlueprint = {
      stepCode: "TEST",
      label: "test",
      parentStage: "S1",
      sortOrder: 1,
      canLoopTo: null,
      billingGate: null,
    };
    const def: CaseTemplateWorkflowStepDef = step;
    assert.equal(def.stepCode, "TEST");
  });
});

// ────────────────────────────────────────────────────────────────
// 2. Validation 函数: 正例 + 負例 覆蓋
// ────────────────────────────────────────────────────────────────

void describe("validation functions — positive cases", () => {
  void test("validateExtraFieldsSchema accepts BMV schema", () => {
    assert.ok(validateExtraFieldsSchema(BMV_EXTRA_FIELDS_SCHEMA));
  });

  void test("validateRequirementBlueprint accepts BMV blueprint", () => {
    assert.ok(validateRequirementBlueprint(BMV_REQUIREMENT_BLUEPRINT));
  });

  void test("validateWorkflowStepsBlueprint accepts BMV blueprint", () => {
    assert.ok(validateWorkflowStepsBlueprint(BMV_WORKFLOW_STEPS_BLUEPRINT));
  });

  void test("validateReminderScheduleBlueprint accepts BMV blueprint", () => {
    assert.ok(
      validateReminderScheduleBlueprint(BMV_REMINDER_SCHEDULE_BLUEPRINT),
    );
  });
});

void describe("validation functions — rejection edge cases", () => {
  void test("validateExtraFieldsSchema rejects non-array", () => {
    assert.equal(
      validateExtraFieldsSchema("not-array" as unknown as unknown[]),
      false,
    );
  });

  void test("validateExtraFieldsSchema rejects null item", () => {
    assert.equal(validateExtraFieldsSchema([null]), false);
  });

  void test("validateExtraFieldsSchema rejects missing label", () => {
    assert.equal(
      validateExtraFieldsSchema([
        {
          fieldKey: "x",
          fieldType: "string",
          required: false,
          defaultValue: null,
        },
      ]),
      false,
    );
  });

  void test("validateExtraFieldsSchema rejects missing required field", () => {
    assert.equal(
      validateExtraFieldsSchema([
        { fieldKey: "x", label: "l", fieldType: "string", defaultValue: null },
      ]),
      false,
    );
  });

  void test("validateRequirementBlueprint rejects missing name", () => {
    assert.equal(
      validateRequirementBlueprint([
        {
          checklistItemCode: "x",
          category: "standard",
          requiredFlag: true,
          ownerSide: "customer",
          sortOrder: 1,
        },
      ]),
      false,
    );
  });

  void test("validateRequirementBlueprint rejects missing sortOrder", () => {
    assert.equal(
      validateRequirementBlueprint([
        {
          checklistItemCode: "x",
          name: "n",
          category: "standard",
          requiredFlag: true,
          ownerSide: "customer",
        },
      ]),
      false,
    );
  });

  void test("validateWorkflowStepsBlueprint rejects missing label", () => {
    assert.equal(
      validateWorkflowStepsBlueprint([{ stepCode: "X", sortOrder: 1 }]),
      false,
    );
  });

  void test("validateReminderScheduleBlueprint rejects negative daysBefore", () => {
    assert.equal(
      validateReminderScheduleBlueprint([
        {
          daysBefore: -1,
          channel: "in_app",
          recipientType: "owner",
          label: "x",
        },
      ]),
      false,
    );
  });

  void test("validateReminderScheduleBlueprint rejects empty channel", () => {
    assert.equal(
      validateReminderScheduleBlueprint([
        { daysBefore: 30, channel: "", recipientType: "owner", label: "x" },
      ]),
      false,
    );
  });
});

// ────────────────────────────────────────────────────────────────
// 3. 最小模板創建条件
// ────────────────────────────────────────────────────────────────

void describe("minimum template creation conditions", () => {
  void test("minimal config (no blueprints) is a valid object", () => {
    const minimal = buildBmvMinimalConfig();
    assert.ok(typeof minimal === "object");
    assert.ok(!Array.isArray(minimal));
    assert.equal(minimal.billingGateMode, "warn");
    assert.equal(minimal.reviewRequiredFlag, false);
  });

  void test("minimal config has no blueprint arrays", () => {
    const minimal = buildBmvMinimalConfig();
    assert.equal(minimal.workflowStepsBlueprint, undefined);
    assert.equal(minimal.extraFieldsSchema, undefined);
    assert.equal(minimal.requirementBlueprint, undefined);
    assert.equal(minimal.reminderScheduleBlueprint, undefined);
  });

  void test("minimal config is JSON-serializable", () => {
    const minimal = buildBmvMinimalConfig();
    const json = JSON.stringify(minimal);
    const parsed = JSON.parse(json) as Record<string, unknown>;
    assert.ok(typeof parsed === "object");
    assert.ok(Object.keys(parsed).length >= 1);
  });

  void test("parseCaseTemplateConfig accepts minimal config", () => {
    const raw = JSON.parse(JSON.stringify(buildBmvMinimalConfig())) as Record<
      string,
      unknown
    >;
    const parsed = parseCaseTemplateConfig(raw);
    assert.equal(parsed.billingGateMode, "warn");
    assert.equal(parsed.reviewRequiredFlag, false);
    assert.equal(parsed.workflowStepsBlueprint, undefined);
  });

  void test("parseCaseTemplateConfig round-trips full config", () => {
    const full = buildBmvTemplateConfig();
    const raw = JSON.parse(JSON.stringify(full)) as Record<string, unknown>;
    const parsed = parseCaseTemplateConfig(raw);
    assert.equal(parsed.workflowStepsBlueprint?.length, 15);
    assert.equal(
      parsed.extraFieldsSchema?.length,
      BMV_EXTRA_FIELDS_SCHEMA.length,
    );
    assert.equal(
      parsed.requirementBlueprint?.length,
      BMV_REQUIREMENT_BLUEPRINT.length,
    );
    assert.equal(parsed.reminderScheduleBlueprint?.length, 3);
    assert.equal(parsed.billingGateMode, "block");
    assert.equal(parsed.reviewRequiredFlag, true);
  });

  void test("parseCaseTemplateConfig ignores non-array blueprint values", () => {
    const parsed = parseCaseTemplateConfig({
      workflowStepsBlueprint: "not-array",
      extraFieldsSchema: 42,
      requirementBlueprint: true,
      reminderScheduleBlueprint: {},
    });
    assert.equal(parsed.workflowStepsBlueprint, undefined);
    assert.equal(parsed.extraFieldsSchema, undefined);
    assert.equal(parsed.requirementBlueprint, undefined);
    assert.equal(parsed.reminderScheduleBlueprint, undefined);
  });

  void test("CaseTemplate entity accepts null blueprints (P0 degraded mode)", () => {
    const tpl: CaseTemplate = {
      id: "tpl-1",
      orgId: "org-1",
      templateName: "P0 template",
      caseType: "family_stay",
      applicationType: null,
      requirementBlueprint: null,
      defaultTasksBlueprint: null,
      validationRulesetRef: null,
      reviewRequiredFlag: false,
      billingGateMode: "off",
      workflowStepsBlueprint: null,
      extraFieldsSchema: null,
      reminderScheduleBlueprint: null,
      activeFlag: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    assert.ok(tpl.id);
    assert.equal(tpl.workflowStepsBlueprint, null);
    assert.equal(tpl.extraFieldsSchema, null);
    assert.equal(tpl.requirementBlueprint, null);
  });
});

// ────────────────────────────────────────────────────────────────
// 4. 命名口径冻結 cross-file consistency
// ────────────────────────────────────────────────────────────────

void describe("naming convention freeze — cross-file consistency", () => {
  void test("BMV_CASE_TYPE_CODE matches BMV_CASE_TYPE re-export", () => {
    assert.equal(BMV_CASE_TYPE_CODE, BMV_CASE_TYPE);
    assert.equal(BMV_CASE_TYPE_CODE, "business_manager_visa");
  });

  void test("re-exported workflow steps match canonical source", () => {
    assert.equal(REEXPORTED_STEPS.length, BMV_WORKFLOW_STEPS_BLUEPRINT.length);
    for (let i = 0; i < REEXPORTED_STEPS.length; i++) {
      assert.equal(
        REEXPORTED_STEPS[i].stepCode,
        BMV_WORKFLOW_STEPS_BLUEPRINT[i].stepCode,
      );
    }
  });

  void test("re-exported extra fields use snake_case fieldCode convention", () => {
    assert.ok(REEXPORTED_FIELDS.length > 0, "should have extra fields");
    for (const f of REEXPORTED_FIELDS) {
      assert.ok(
        /^[a-z][a-z0-9_]*$/.test(f.fieldCode),
        `${f.fieldCode} not snake_case`,
      );
    }
  });

  void test("re-exported requirements use snake_case itemCode convention", () => {
    assert.ok(REEXPORTED_REQS.length > 0, "should have requirements");
    for (const r of REEXPORTED_REQS) {
      assert.ok(
        /^bmv_[a-z][a-z0-9_]*$/.test(r.itemCode),
        `${r.itemCode} not snake_case`,
      );
    }
  });

  void test("both sources share the same case type code", () => {
    assert.equal(BMV_CASE_TYPE, BMV_CASE_TYPE_CODE);
  });

  void test("all stepCodes are UPPER_SNAKE_CASE", () => {
    for (const code of BMV_STEP_CODES) {
      assert.ok(
        /^[A-Z][A-Z0-9_]*$/.test(code),
        `${code} is not UPPER_SNAKE_CASE`,
      );
    }
  });

  void test("all fieldKeys are camelCase (bmvTemplateConfig convention)", () => {
    for (const f of BMV_EXTRA_FIELDS_SCHEMA) {
      assert.ok(
        /^[a-z][a-zA-Z0-9]*$/.test(f.fieldKey),
        `${f.fieldKey} is not camelCase`,
      );
    }
  });

  void test("all checklistItemCodes are kebab-case with bmv- prefix (bmvTemplateConfig convention)", () => {
    for (const r of BMV_REQUIREMENT_BLUEPRINT) {
      assert.ok(
        /^bmv-[a-z][a-z0-9-]*$/.test(r.checklistItemCode),
        `${r.checklistItemCode} is not kebab-case`,
      );
    }
  });

  void test("BMV_CASE_TYPE_CODE is snake_case", () => {
    assert.ok(/^[a-z][a-z0-9_]*$/.test(BMV_CASE_TYPE_CODE));
  });
});

// ────────────────────────────────────────────────────────────────
// 5. Blueprint 完整性 gate
// ────────────────────────────────────────────────────────────────

void describe("blueprint completeness gate", () => {
  void test("full BMV config passes all 4 validation functions", () => {
    const config = buildBmvTemplateConfig();
    assert.ok(config.workflowStepsBlueprint);
    assert.ok(config.extraFieldsSchema);
    assert.ok(config.requirementBlueprint);
    assert.ok(config.reminderScheduleBlueprint);
    assert.ok(validateWorkflowStepsBlueprint(config.workflowStepsBlueprint));
    assert.ok(validateExtraFieldsSchema(config.extraFieldsSchema));
    assert.ok(validateRequirementBlueprint(config.requirementBlueprint));
    assert.ok(
      validateReminderScheduleBlueprint(config.reminderScheduleBlueprint),
    );
  });

  void test("BMV config contains exactly the expected blueprint keys", () => {
    const config = buildBmvTemplateConfig();
    const keys = Object.keys(config).sort();
    assert.ok(keys.includes("workflowStepsBlueprint"));
    assert.ok(keys.includes("extraFieldsSchema"));
    assert.ok(keys.includes("requirementBlueprint"));
    assert.ok(keys.includes("reminderScheduleBlueprint"));
    assert.ok(keys.includes("billingGateMode"));
    assert.ok(keys.includes("reviewRequiredFlag"));
  });

  void test("BMV workflow has COE_SENT billing gate as the only block gate", () => {
    const blockGates = BMV_WORKFLOW_STEPS_BLUEPRINT.filter(
      (s) => s.billingGate?.mode === "block",
    );
    assert.equal(blockGates.length, 1);
    assert.equal(blockGates[0].stepCode, "COE_SENT");
  });

  void test("BMV requirement has exactly one questionnaire item", () => {
    const questionnaires = BMV_REQUIREMENT_BLUEPRINT.filter(
      (r) => r.category === "questionnaire",
    );
    assert.equal(questionnaires.length, 1);
    assert.equal(questionnaires[0].checklistItemCode, "bmv-questionnaire");
  });
});
