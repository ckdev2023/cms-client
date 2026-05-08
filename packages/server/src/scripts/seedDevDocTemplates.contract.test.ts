import { describe, test } from "node:test";
import assert from "node:assert/strict";

import { DOC_TEMPLATE_SEEDS } from "./seedDevDocTemplates";
import { CASE_TEMPLATE_SEEDS } from "./seedCaseTemplates";

/**
 * Canonical caseTypeCode values derived from admin's
 * BUSINESS_TYPE_TO_CASE_TYPE_CODE (packages/admin/src/i18n/messages/_shared/businessTypes.ts).
 *
 * If admin adds a new business type mapping, this array MUST be updated —
 * the test below will fail immediately to prevent seed drift.
 */
const CANONICAL_CASE_TYPE_CODES = [
  "highly_skilled",
  "work",
  "dependent_visa",
  "business_manager_visa",
  "company_setup",
  "permanent",
  "other",
] as const;

void describe("seedDevDocTemplates contract", () => {
  const docTemplateCaseTypes = new Set(
    DOC_TEMPLATE_SEEDS.map((s) => s.caseType),
  );

  void test("covers all BUSINESS_TYPE_TO_CASE_TYPE_CODE canonical values", () => {
    const missing = CANONICAL_CASE_TYPE_CODES.filter(
      (code) => !docTemplateCaseTypes.has(code),
    );
    assert.deepEqual(
      missing,
      [],
      `DOC_TEMPLATE_SEEDS is missing caseType entries for: ${missing.join(", ")}`,
    );
  });

  void test("covers all CASE_TEMPLATE_SEEDS caseType values", () => {
    const caseTemplateCaseTypes = CASE_TEMPLATE_SEEDS.map((s) => s.caseType);
    const missing = caseTemplateCaseTypes.filter(
      (code) => !docTemplateCaseTypes.has(code),
    );
    assert.deepEqual(
      missing,
      [],
      `DOC_TEMPLATE_SEEDS is missing caseType entries for CASE_TEMPLATE_SEEDS values: ${missing.join(", ")}`,
    );
  });
});
