import { test, describe } from "node:test";
import assert from "node:assert/strict";

import type {
  CaseTemplate,
  CaseTemplateWorkflowStepDef,
  CaseTemplateExtraFieldDef,
  CaseTemplateRequirementDef,
} from "../model/coreEntities";

import {
  BMV_CASE_TYPE,
  BMV_WORKFLOW_STEPS_BLUEPRINT,
  BMV_EXTRA_FIELDS_SCHEMA,
  BMV_REQUIREMENT_BLUEPRINT,
  BMV_REMINDER_SCHEDULE_BLUEPRINT,
  BMV_STEP_CODES,
  BMV_FIELD_NAME_CANON,
  buildBmvTemplateConfig,
} from "./cases.template-bmv";

// 1. workflow_steps_blueprint

void describe("BMV_WORKFLOW_STEPS_BLUEPRINT", () => {
  void test("contains exactly 15 steps", () => {
    assert.equal(BMV_WORKFLOW_STEPS_BLUEPRINT.length, 15);
  });
  void test("all step codes are unique", () => {
    const codes = BMV_WORKFLOW_STEPS_BLUEPRINT.map((s) => s.stepCode);
    assert.equal(new Set(codes).size, codes.length);
  });
  void test("sort order ascending from 1", () => {
    const orders = BMV_WORKFLOW_STEPS_BLUEPRINT.map((s) => s.sortOrder);
    for (let i = 0; i < orders.length; i++) {
      assert.equal(orders[i], i + 1);
    }
  });
  void test("every step has non-empty label", () => {
    for (const step of BMV_WORKFLOW_STEPS_BLUEPRINT) {
      assert.ok(step.label.length > 0);
    }
  });
  void test("COE_SENT has billing gate block", () => {
    const coeSent = BMV_WORKFLOW_STEPS_BLUEPRINT.find(
      (s) => s.stepCode === "COE_SENT",
    );
    assert.ok(coeSent?.billingGate);
    assert.equal(coeSent.billingGate.mode, "block");
    assert.equal(coeSent.billingGate.milestone, "final_payment");
  });
  void test("NEED_SUPPLEMENT can loop to SUPPLEMENT_PROCESSING", () => {
    const step = BMV_WORKFLOW_STEPS_BLUEPRINT.find(
      (s) => s.stepCode === "NEED_SUPPLEMENT",
    );
    assert.ok(step);
    assert.equal(step.canLoopTo, "SUPPLEMENT_PROCESSING");
  });
  void test("satisfies CaseTemplateWorkflowStepDef[]", () => {
    const typed: CaseTemplateWorkflowStepDef[] = BMV_WORKFLOW_STEPS_BLUEPRINT;
    assert.ok(Array.isArray(typed));
  });
});

// 2. extra_fields_schema

void describe("BMV_EXTRA_FIELDS_SCHEMA", () => {
  void test("contains visa_plan, coe_issued_at, coe_expiry_date, entry_confirmed_at, overseas_consulate", () => {
    const codes = BMV_EXTRA_FIELDS_SCHEMA.map((f) => f.fieldCode);
    assert.ok(codes.includes("visa_plan"));
    assert.ok(codes.includes("coe_issued_at"));
    assert.ok(codes.includes("coe_expiry_date"));
    assert.ok(codes.includes("entry_confirmed_at"));
    assert.ok(codes.includes("overseas_consulate"));
  });
  void test("all field codes unique", () => {
    const codes = BMV_EXTRA_FIELDS_SCHEMA.map((f) => f.fieldCode);
    assert.equal(new Set(codes).size, codes.length);
  });
  void test("field codes are snake_case", () => {
    for (const f of BMV_EXTRA_FIELDS_SCHEMA) {
      assert.match(f.fieldCode, /^[a-z][a-z0-9_]*$/);
    }
  });
  void test("every field has valid storage", () => {
    const allowedStorages = new Set<string>(["ddl_column", "extra_fields"]);
    for (const f of BMV_EXTRA_FIELDS_SCHEMA) {
      assert.ok(allowedStorages.has(f.storage));
    }
  });
  void test("visa_plan is enum with ddl_column storage", () => {
    const vp = BMV_EXTRA_FIELDS_SCHEMA.find((f) => f.fieldCode === "visa_plan");
    assert.ok(vp);
    assert.equal(vp.fieldType, "enum");
    assert.equal(vp.required, true);
    assert.equal(vp.storage, "ddl_column");
    assert.ok(Array.isArray(vp.enumValues) && vp.enumValues.length > 0);
  });
  void test("overseas_consulate uses extra_fields storage", () => {
    const f = BMV_EXTRA_FIELDS_SCHEMA.find(
      (f) => f.fieldCode === "overseas_consulate",
    );
    assert.ok(f);
    assert.equal(f.storage, "extra_fields");
  });
  void test("enum fields have enumValues", () => {
    for (const f of BMV_EXTRA_FIELDS_SCHEMA) {
      if (f.fieldType === "enum") {
        assert.ok(Array.isArray(f.enumValues) && f.enumValues.length > 0);
      }
    }
  });
  void test("non-enum fields lack enumValues", () => {
    for (const f of BMV_EXTRA_FIELDS_SCHEMA) {
      if (f.fieldType !== "enum") {
        assert.equal(f.enumValues, undefined);
      }
    }
  });
  void test("satisfies CaseTemplateExtraFieldDef[]", () => {
    const typed: CaseTemplateExtraFieldDef[] = BMV_EXTRA_FIELDS_SCHEMA;
    assert.ok(Array.isArray(typed));
  });
});

// 3. requirement_blueprint

void describe("BMV_REQUIREMENT_BLUEPRINT", () => {
  void test("has questionnaire item", () => {
    assert.ok(
      BMV_REQUIREMENT_BLUEPRINT.some((r) => r.category === "questionnaire"),
    );
  });
  void test("has standard items", () => {
    assert.ok(BMV_REQUIREMENT_BLUEPRINT.some((r) => r.category === "standard"));
  });
  void test("all item codes unique", () => {
    const codes = BMV_REQUIREMENT_BLUEPRINT.map((r) => r.itemCode);
    assert.equal(new Set(codes).size, codes.length);
  });
  void test("item codes are snake_case with bmv_ prefix", () => {
    for (const r of BMV_REQUIREMENT_BLUEPRINT) {
      assert.match(r.itemCode, /^bmv_[a-z][a-z0-9_]*$/);
    }
  });
  void test("every item has non-empty name", () => {
    for (const r of BMV_REQUIREMENT_BLUEPRINT) {
      assert.ok(r.name.length > 0);
    }
  });
  void test("ownerSide valid", () => {
    const valid = new Set(["applicant", "customer", "office"]);
    for (const r of BMV_REQUIREMENT_BLUEPRINT) {
      assert.ok(valid.has(r.ownerSide));
    }
  });
  void test("providedByRole valid", () => {
    const valid = new Set(["applicant", "customer", "office"]);
    for (const r of BMV_REQUIREMENT_BLUEPRINT) {
      assert.ok(valid.has(r.providedByRole));
    }
  });
  void test("bmv_questionnaire is required questionnaire", () => {
    const q = BMV_REQUIREMENT_BLUEPRINT.find(
      (r) => r.itemCode === "bmv_questionnaire",
    );
    assert.ok(q);
    assert.equal(q.category, "questionnaire");
    assert.equal(q.requiredFlag, true);
  });
  void test("office-provided items have ownerSide=office", () => {
    for (const r of BMV_REQUIREMENT_BLUEPRINT) {
      if (r.providedByRole === "office") {
        assert.equal(r.ownerSide, "office");
      }
    }
  });
  void test("dueDaysFromOpen positive when present", () => {
    for (const r of BMV_REQUIREMENT_BLUEPRINT) {
      if (typeof r.dueDaysFromOpen === "number") {
        assert.ok(r.dueDaysFromOpen > 0);
      }
    }
  });
  void test("satisfies CaseTemplateRequirementDef[]", () => {
    const typed: CaseTemplateRequirementDef[] = BMV_REQUIREMENT_BLUEPRINT;
    assert.ok(Array.isArray(typed));
  });
});

// 4. buildBmvTemplateConfig

void describe("buildBmvTemplateConfig", () => {
  void test("has all blueprint keys", () => {
    const c = buildBmvTemplateConfig();
    assert.ok("workflowStepsBlueprint" in c);
    assert.ok("extraFieldsSchema" in c);
    assert.ok("requirementBlueprint" in c);
    assert.ok("reminderScheduleBlueprint" in c);
  });
  void test("billingGateMode is block", () => {
    assert.equal(buildBmvTemplateConfig().billingGateMode, "block");
  });
  void test("JSON-serializable", () => {
    const c = buildBmvTemplateConfig();
    assert.deepEqual(JSON.parse(JSON.stringify(c)), c);
  });
});

// 4b. reminder_schedule_blueprint

void describe("BMV_REMINDER_SCHEDULE_BLUEPRINT", () => {
  void test("covers 180/90/30 days", () => {
    const days = BMV_REMINDER_SCHEDULE_BLUEPRINT.map((r) => r.daysBefore).sort(
      (a, b) => b - a,
    );
    assert.deepEqual(days, [180, 90, 30]);
  });
});

// 5. CaseTemplate type compatibility

void describe("CaseTemplate type compatibility", () => {
  void test("BMV blueprints assignable to CaseTemplate fields", () => {
    const t: CaseTemplate = {
      id: "tpl-bmv-1",
      orgId: "org-1",
      templateName: "経営管理ビザ",
      caseType: BMV_CASE_TYPE,
      applicationType: null,
      requirementBlueprint: BMV_REQUIREMENT_BLUEPRINT,
      defaultTasksBlueprint: null,
      validationRulesetRef: null,
      reviewRequiredFlag: true,
      billingGateMode: "block",
      workflowStepsBlueprint: BMV_WORKFLOW_STEPS_BLUEPRINT,
      extraFieldsSchema: BMV_EXTRA_FIELDS_SCHEMA,
      reminderScheduleBlueprint: null,
      activeFlag: true,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    assert.equal(t.caseType, "business_manager_visa");
    assert.equal(t.workflowStepsBlueprint?.length, 15);
  });
  void test("P0 template with null blueprints valid", () => {
    const t: CaseTemplate = {
      id: "tpl-1",
      orgId: "org-1",
      templateName: "家族滞在",
      caseType: "family_stay",
      applicationType: null,
      requirementBlueprint: null,
      defaultTasksBlueprint: null,
      validationRulesetRef: null,
      reviewRequiredFlag: false,
      billingGateMode: "warn",
      workflowStepsBlueprint: null,
      extraFieldsSchema: null,
      reminderScheduleBlueprint: null,
      activeFlag: true,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    assert.equal(t.workflowStepsBlueprint, null);
  });
});

// 6. naming conventions

void describe("field naming conventions", () => {
  void test("BMV_CASE_TYPE is snake_case", () => {
    assert.match(BMV_CASE_TYPE, /^[a-z][a-z0-9_]*$/);
  });
  void test("step codes are UPPER_SNAKE_CASE", () => {
    for (const code of BMV_STEP_CODES) {
      assert.match(code, /^[A-Z][A-Z0-9_]*$/);
    }
  });
  void test("extra field codes are snake_case", () => {
    for (const f of BMV_EXTRA_FIELDS_SCHEMA) {
      assert.match(f.fieldCode, /^[a-z][a-z0-9_]*$/);
    }
  });
  void test("requirement item codes are snake_case with bmv_ prefix", () => {
    for (const r of BMV_REQUIREMENT_BLUEPRINT) {
      assert.match(r.itemCode, /^bmv_[a-z][a-z0-9_]*$/);
    }
  });
  void test("BMV_FIELD_NAME_CANON covers DDL-backed extra fields", () => {
    const ddl = BMV_EXTRA_FIELDS_SCHEMA.filter(
      (f) => f.storage === "ddl_column",
    );
    for (const f of ddl) {
      assert.ok(
        f.fieldCode in BMV_FIELD_NAME_CANON,
        `${f.fieldCode} missing from canon`,
      );
    }
  });
  void test("BMV_FIELD_NAME_CANON db/ts pairs consistent", () => {
    for (const [key, val] of Object.entries(BMV_FIELD_NAME_CANON)) {
      const v = val as { db: string | null; ts: string | null };
      if (v.db !== null) {
        assert.equal(v.db, key);
        assert.match(v.db, /^[a-z][a-z0-9_]*$/);
      }
      if (v.ts !== null) {
        assert.match(v.ts, /^[a-z][a-zA-Z0-9]*$/);
      }
    }
  });
});
