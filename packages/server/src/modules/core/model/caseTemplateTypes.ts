/**
 * CaseTemplate blueprint sub-type definitions.
 *
 * Split from coreEntities.ts to keep file size < 500 lines;
 * coreEntities.ts re-exports these types so imports don't change.
 */

/**
 *
 */
export type CaseTemplateWorkflowStepDef = {
  stepCode: string;
  label: string;
  parentStage: string | null;
  sortOrder: number;
  canLoopTo: string | null;
  billingGate: {
    mode: "off" | "warn" | "block";
    milestone: string | null;
  } | null;
};

/**
 * extra_fields_schema item (p1-sv-001-02 frozen).
 * fieldCode: snake_case matching DB column names.
 * storage: "ddl_column" or "extra_fields".
 */
export type CaseTemplateExtraFieldDef = {
  fieldCode: string;
  label: string;
  fieldType: "string" | "number" | "boolean" | "date" | "datetime" | "enum";
  required: boolean;
  storage: "ddl_column" | "extra_fields";
  enumValues?: readonly string[];
  defaultValue?: string | number | boolean | null;
};

/**
 * requirement_blueprint item (p1-sv-001-02 frozen).
 * itemCode: snake_case (e.g. bmv_questionnaire).
 */
export type CaseTemplateRequirementDef = {
  itemCode: string;
  name: string;
  category: "standard" | "questionnaire" | "company" | "personal";
  requiredFlag: boolean;
  ownerSide: "applicant" | "customer" | "office";
  providedByRole: "applicant" | "customer" | "office";
  dueDaysFromOpen?: number;
};
