import test from "node:test";
import assert from "node:assert/strict";

import {
  DOCUMENT_ITEM_CATEGORIES,
  STANDARD_VISA_PLANS,
  SURVEY_DATA_CATEGORY,
  validateQuotePrice,
  validateSurveyData,
  validateVisaPlan,
} from "./cases.types-survey-visa-quote";

// ── visa_plan validation ──

void test("validateVisaPlan accepts null", () => {
  assert.ok(validateVisaPlan(null));
});

void test("validateVisaPlan accepts undefined", () => {
  assert.ok(validateVisaPlan(undefined));
});

void test("validateVisaPlan accepts standard values", () => {
  for (const plan of STANDARD_VISA_PLANS) {
    assert.ok(validateVisaPlan(plan), `should accept: ${plan}`);
  }
});

void test("validateVisaPlan accepts free text within 200 chars", () => {
  assert.ok(validateVisaPlan("経営管理ビザ 新規 5年"));
  assert.ok(validateVisaPlan("custom plan description"));
});

void test("validateVisaPlan rejects string over 200 chars", () => {
  const long = "a".repeat(201);
  assert.equal(validateVisaPlan(long), false);
});

void test("validateVisaPlan rejects non-string types", () => {
  assert.equal(validateVisaPlan(42), false);
  assert.equal(validateVisaPlan(true), false);
  assert.equal(validateVisaPlan({}), false);
  assert.equal(validateVisaPlan([]), false);
});

// ── quote_price validation ──

void test("validateQuotePrice accepts null", () => {
  assert.ok(validateQuotePrice(null));
});

void test("validateQuotePrice accepts undefined", () => {
  assert.ok(validateQuotePrice(undefined));
});

void test("validateQuotePrice accepts zero", () => {
  assert.ok(validateQuotePrice(0));
});

void test("validateQuotePrice accepts positive number", () => {
  assert.ok(validateQuotePrice(500000));
  assert.ok(validateQuotePrice(123456.78));
});

void test("validateQuotePrice rejects negative number", () => {
  assert.equal(validateQuotePrice(-1), false);
  assert.equal(validateQuotePrice(-0.01), false);
});

void test("validateQuotePrice rejects NaN and Infinity", () => {
  assert.equal(validateQuotePrice(NaN), false);
  assert.equal(validateQuotePrice(Infinity), false);
  assert.equal(validateQuotePrice(-Infinity), false);
});

void test("validateQuotePrice rejects non-number types", () => {
  assert.equal(validateQuotePrice("500000"), false);
  assert.equal(validateQuotePrice(true), false);
  assert.equal(validateQuotePrice({}), false);
});

// ── survey_data validation ──

void test("validateSurveyData accepts null", () => {
  assert.ok(validateSurveyData(null));
});

void test("validateSurveyData accepts undefined", () => {
  assert.ok(validateSurveyData(undefined));
});

void test("validateSurveyData accepts empty object", () => {
  assert.ok(validateSurveyData({}));
});

void test("validateSurveyData accepts nested object", () => {
  assert.ok(
    validateSurveyData({
      companyName: "株式会社テスト",
      capitalAmount: 5000000,
      businessPlan: { summary: "..." },
      directors: [{ name: "田中", role: "代表取締役" }],
    }),
  );
});

void test("validateSurveyData rejects array", () => {
  assert.equal(validateSurveyData([1, 2, 3]), false);
});

void test("validateSurveyData rejects primitive types", () => {
  assert.equal(validateSurveyData("string"), false);
  assert.equal(validateSurveyData(42), false);
  assert.equal(validateSurveyData(true), false);
});

// ── category constants ──

void test("SURVEY_DATA_CATEGORY is questionnaire", () => {
  assert.equal(SURVEY_DATA_CATEGORY, "questionnaire");
});

void test("DOCUMENT_ITEM_CATEGORIES includes all 4 categories", () => {
  assert.deepEqual(
    [...DOCUMENT_ITEM_CATEGORIES],
    ["standard", "questionnaire", "company", "personal"],
  );
});

void test("STANDARD_VISA_PLANS includes new and renewal variants", () => {
  const plans = new Set(STANDARD_VISA_PLANS);
  assert.ok(plans.has("new_1year"));
  assert.ok(plans.has("new_3year"));
  assert.ok(plans.has("new_5year"));
  assert.ok(plans.has("renewal_1year"));
  assert.ok(plans.has("renewal_3year"));
  assert.ok(plans.has("renewal_5year"));
  assert.ok(plans.has("change_status"));
});

// ── write contract structural assertions ──

void test("CaseCreateInput includes visaPlan field", () => {
  const input: import("./cases.types").CaseCreateInput = {
    customerId: "cust-1",
    caseTypeCode: "business_manager_visa",
    ownerUserId: "user-1",
    visaPlan: "new_5year",
    quotePrice: 500000,
  };

  assert.equal(input.visaPlan, "new_5year");
  assert.equal(input.quotePrice, 500000);
});

void test("CaseUpdateInput includes visaPlan field", () => {
  const input: import("./cases.types").CaseUpdateInput = {
    visaPlan: "renewal_3year",
    quotePrice: 300000,
  };

  assert.equal(input.visaPlan, "renewal_3year");
  assert.equal(input.quotePrice, 300000);
});

void test("CaseCreateInput visaPlan can be null", () => {
  const input: import("./cases.types").CaseCreateInput = {
    customerId: "cust-1",
    caseTypeCode: "visa",
    ownerUserId: "user-1",
    visaPlan: null,
  };

  assert.equal(input.visaPlan, null);
});

void test("CaseUpdateInput visaPlan can be null", () => {
  const input: import("./cases.types").CaseUpdateInput = {
    visaPlan: null,
  };

  assert.equal(input.visaPlan, null);
});

// ── read contract structural assertions ──

void test("Case entity type includes visaPlan and quotePrice fields", () => {
  const mockCase: Pick<
    import("../model/coreEntities").Case,
    "visaPlan" | "quotePrice"
  > = {
    visaPlan: "new_5year",
    quotePrice: 500000,
  };
  assert.equal(mockCase.visaPlan, "new_5year");
  assert.equal(mockCase.quotePrice, 500000);
});
