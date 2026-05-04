import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  INTAKE_FORM_STATUSES,
  INTAKE_FORM_TYPES,
  isValidFormKind,
  requiresBmvCaseCreationGate,
  isBmvCaseTypeCode,
  BMV_QUESTIONNAIRE_TRANSITIONS,
  isValidQuestionnaireTransition,
  BMV_QUESTIONNAIRE_REQUIRED_SECTIONS,
  validateBmvQuestionnaireFormData,
} from "./intake.types";
// ── existing enum tests ──
void test("INTAKE_FORM_STATUSES covers draft/submitted/reviewed/archived", () => {
  assert.deepEqual(
    [...INTAKE_FORM_STATUSES],
    ["draft", "submitted", "reviewed", "archived"],
  );
});
void test("INTAKE_FORM_TYPES includes general, bmv_questionnaire, and bmv_quote", () => {
  assert.ok(INTAKE_FORM_TYPES.includes("general"));
  assert.ok(INTAKE_FORM_TYPES.includes("bmv_questionnaire"));
  assert.ok(INTAKE_FORM_TYPES.includes("bmv_quote"));
});
void describe("isValidFormKind", () => {
  void test("accepts general", () => {
    assert.equal(isValidFormKind("general"), true);
  });
  void test("accepts bmv_questionnaire", () => {
    assert.equal(isValidFormKind("bmv_questionnaire"), true);
  });
  void test("accepts bmv_quote", () => {
    assert.equal(isValidFormKind("bmv_quote"), true);
  });
  void test("rejects unknown string", () => {
    assert.equal(isValidFormKind("unknown"), false);
  });
  void test("rejects non-string values", () => {
    assert.equal(isValidFormKind(123), false);
    assert.equal(isValidFormKind(null), false);
    assert.equal(isValidFormKind(undefined), false);
  });
});
void test("requiresBmvCaseCreationGate returns true for BMV type code", () => {
  assert.equal(requiresBmvCaseCreationGate("business_manager_visa"), true);
});
void test("requiresBmvCaseCreationGate returns true for biz_mgmt_* subtypes", () => {
  assert.equal(requiresBmvCaseCreationGate("biz_mgmt_4m"), true);
  assert.equal(requiresBmvCaseCreationGate("biz_mgmt_1y"), true);
  assert.equal(requiresBmvCaseCreationGate("biz_mgmt_renewal"), true);
});
void test("requiresBmvCaseCreationGate returns false for non-BMV type codes", () => {
  assert.equal(requiresBmvCaseCreationGate("visa"), false);
  assert.equal(requiresBmvCaseCreationGate("family_stay"), false);
  assert.equal(requiresBmvCaseCreationGate("tech_humanities"), false);
});
void describe("isBmvCaseTypeCode", () => {
  void test("matches business_manager_visa exactly", () => {
    assert.equal(isBmvCaseTypeCode("business_manager_visa"), true);
  });
  void test("matches biz_mgmt prefix subtypes (migration 038 alignment)", () => {
    assert.equal(isBmvCaseTypeCode("biz_mgmt_4m"), true);
    assert.equal(isBmvCaseTypeCode("biz_mgmt_1y"), true);
    assert.equal(isBmvCaseTypeCode("biz_mgmt_renewal"), true);
    assert.equal(isBmvCaseTypeCode("biz_mgmt"), true);
  });
  void test("rejects non-BMV type codes", () => {
    assert.equal(isBmvCaseTypeCode("visa"), false);
    assert.equal(isBmvCaseTypeCode("family_stay"), false);
    assert.equal(isBmvCaseTypeCode("tech_humanities"), false);
    assert.equal(isBmvCaseTypeCode(""), false);
  });
  void test("delegates from requiresBmvCaseCreationGate consistently", () => {
    const codes = [
      "business_manager_visa",
      "biz_mgmt_4m",
      "biz_mgmt_1y",
      "family_stay",
      "tech_humanities",
    ];
    for (const code of codes) {
      assert.equal(
        requiresBmvCaseCreationGate(code),
        isBmvCaseTypeCode(code),
        `mismatch for "${code}"`,
      );
    }
  });
});
// ── questionnaire transitions ──
void describe("BMV_QUESTIONNAIRE_TRANSITIONS", () => {
  void test("defines exactly 3 transitions", () => {
    assert.equal(BMV_QUESTIONNAIRE_TRANSITIONS.length, 3);
  });
  void test("covers the full lifecycle: draft → submitted → reviewed → archived", () => {
    const chain = BMV_QUESTIONNAIRE_TRANSITIONS.map((t) => `${t.from}→${t.to}`);
    assert.deepEqual(chain, [
      "draft→submitted",
      "submitted→reviewed",
      "reviewed→archived",
    ]);
  });
  void test("each transition has a trigger label", () => {
    for (const t of BMV_QUESTIONNAIRE_TRANSITIONS) {
      assert.ok(t.trigger.length > 0, `${t.from}→${t.to} missing trigger`);
    }
  });
});
void describe("isValidQuestionnaireTransition", () => {
  void test("accepts draft → submitted", () => {
    assert.equal(isValidQuestionnaireTransition("draft", "submitted"), true);
  });
  void test("accepts submitted → reviewed", () => {
    assert.equal(isValidQuestionnaireTransition("submitted", "reviewed"), true);
  });
  void test("accepts reviewed → archived", () => {
    assert.equal(isValidQuestionnaireTransition("reviewed", "archived"), true);
  });
  void test("rejects draft → reviewed (skipping submitted)", () => {
    assert.equal(isValidQuestionnaireTransition("draft", "reviewed"), false);
  });
  void test("rejects submitted → archived (skipping reviewed)", () => {
    assert.equal(
      isValidQuestionnaireTransition("submitted", "archived"),
      false,
    );
  });
  void test("rejects backward transitions", () => {
    assert.equal(isValidQuestionnaireTransition("submitted", "draft"), false);
    assert.equal(
      isValidQuestionnaireTransition("reviewed", "submitted"),
      false,
    );
    assert.equal(isValidQuestionnaireTransition("archived", "reviewed"), false);
  });
  void test("rejects same-state transitions", () => {
    assert.equal(isValidQuestionnaireTransition("draft", "draft"), false);
    assert.equal(
      isValidQuestionnaireTransition("submitted", "submitted"),
      false,
    );
  });
  void test("rejects unknown statuses", () => {
    assert.equal(isValidQuestionnaireTransition("unknown", "submitted"), false);
    assert.equal(isValidQuestionnaireTransition("draft", "unknown"), false);
  });
});
// ── formData validation ──
void describe("validateBmvQuestionnaireFormData", () => {
  void test("valid formData with all required sections passes", () => {
    const result = validateBmvQuestionnaireFormData({
      companyInfo: { name: "ABC Corp" },
      personalInfo: { fullName: "Tanaka" },
      businessPlan: { summary: "Import/Export" },
    });
    assert.equal(result.valid, true);
    assert.equal(result.missingSections.length, 0);
  });
  void test("formData with extra sections still passes", () => {
    const result = validateBmvQuestionnaireFormData({
      companyInfo: {},
      personalInfo: {},
      businessPlan: {},
      additionalNotes: "test",
    });
    assert.equal(result.valid, true);
  });
  void test("missing companyInfo fails with correct missing section", () => {
    const result = validateBmvQuestionnaireFormData({
      personalInfo: {},
      businessPlan: {},
    });
    assert.equal(result.valid, false);
    assert.deepEqual(result.missingSections, ["companyInfo"]);
  });
  void test("missing multiple sections reports all", () => {
    const result = validateBmvQuestionnaireFormData({
      personalInfo: {},
    });
    assert.equal(result.valid, false);
    assert.ok(result.missingSections.includes("companyInfo"));
    assert.ok(result.missingSections.includes("businessPlan"));
    assert.equal(result.missingSections.length, 2);
  });
  void test("empty object reports all sections missing", () => {
    const result = validateBmvQuestionnaireFormData({});
    assert.equal(result.valid, false);
    assert.equal(result.missingSections.length, 3);
  });
  void test("null formData fails", () => {
    const result = validateBmvQuestionnaireFormData(null);
    assert.equal(result.valid, false);
    assert.equal(result.missingSections.length, 3);
  });
  void test("undefined formData fails", () => {
    const result = validateBmvQuestionnaireFormData(undefined);
    assert.equal(result.valid, false);
  });
  void test("array formData fails", () => {
    const result = validateBmvQuestionnaireFormData([1, 2, 3]);
    assert.equal(result.valid, false);
  });
  void test("string formData fails", () => {
    const result = validateBmvQuestionnaireFormData("not an object");
    assert.equal(result.valid, false);
  });
});
void describe("BMV_QUESTIONNAIRE_REQUIRED_SECTIONS", () => {
  void test("contains the three required sections", () => {
    assert.deepEqual(
      [...BMV_QUESTIONNAIRE_REQUIRED_SECTIONS],
      ["companyInfo", "personalInfo", "businessPlan"],
    );
  });
});
// ── type contracts ──
void describe("intake type contracts", () => {
  void test("BmvQuestionnaireCreateInput requires bmv_questionnaire formType", () => {
    const input = {
      appUserId: "user-1",
      leadId: "lead-1",
      formType: "bmv_questionnaire",
    };
    assert.equal(input.formType, "bmv_questionnaire");
  });
  void test("BmvQuestionnaireConfirmInput accepts optional surveyData", () => {
    const withData = {
      intakeFormId: "form-1",
      surveyData: { companyInfo: {} },
    };
    assert.ok(withData.surveyData);
    const withoutData = {
      intakeFormId: "form-1",
    };
    assert.equal(withoutData.surveyData, undefined);
  });
  void test("BmvSurveyDataExtractInput requires all three IDs", () => {
    const input = {
      intakeFormId: "form-1",
      caseId: "case-1",
      documentItemId: "doc-item-1",
    };
    assert.ok(input.intakeFormId);
    assert.ok(input.caseId);
    assert.ok(input.documentItemId);
  });
  void test("CaseCreationPrerequisite includes requiresBmvGate flag", () => {
    const prereq = {
      caseTypeCode: "business_manager_visa",
      customerId: "cust-1",
      requiresBmvGate: true,
    };
    assert.equal(prereq.requiresBmvGate, true);
  });
});
// ── cross-module: intake ↔ cases alignment ──
void describe("intake ↔ cases alignment", () => {
  void test("requiresBmvCaseCreationGate matches the BMV case type code used in cases gate", () => {
    assert.equal(requiresBmvCaseCreationGate("business_manager_visa"), true);
    assert.equal(requiresBmvCaseCreationGate("biz_mgmt_4m"), true);
    assert.equal(requiresBmvCaseCreationGate("family_stay"), false);
  });
  void test("questionnaire lifecycle ends at reviewed before case creation", () => {
    const reviewedTransition = BMV_QUESTIONNAIRE_TRANSITIONS.find(
      (t) => t.to === "reviewed",
    );
    assert.ok(reviewedTransition);
    assert.equal(reviewedTransition.from, "submitted");
    assert.equal(reviewedTransition.trigger, "admin_confirm_receipt");
  });
});
//# sourceMappingURL=intake.types.test.js.map
