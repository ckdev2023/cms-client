import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  canonicalizeCaseTypeCode,
  WIZARD_SEED_MATRIX,
} from "./caseTypeCanonical";
import { BMV_CASE_TYPE } from "./cases.template-bmv";

void describe("canonicalizeCaseTypeCode", () => {
  void test("family → dependent_visa", () => {
    assert.equal(canonicalizeCaseTypeCode("family"), "dependent_visa");
  });

  void test("family_stay → dependent_visa", () => {
    assert.equal(canonicalizeCaseTypeCode("family_stay"), "dependent_visa");
  });

  void test("bmv → business_manager_visa", () => {
    assert.equal(canonicalizeCaseTypeCode("bmv"), BMV_CASE_TYPE);
  });

  void test("biz_mgmt_cert_4m → business_manager_visa (via isBmvCaseTypeCode)", () => {
    assert.equal(canonicalizeCaseTypeCode("biz_mgmt_cert_4m"), BMV_CASE_TYPE);
  });

  void test("biz_mgmt_cert_1y → business_manager_visa", () => {
    assert.equal(canonicalizeCaseTypeCode("biz_mgmt_cert_1y"), BMV_CASE_TYPE);
  });

  void test("biz_mgmt_renewal → business_manager_visa", () => {
    assert.equal(canonicalizeCaseTypeCode("biz_mgmt_renewal"), BMV_CASE_TYPE);
  });

  void test("business_manager_visa stays canonical", () => {
    assert.equal(
      canonicalizeCaseTypeCode("business_manager_visa"),
      BMV_CASE_TYPE,
    );
  });

  void test("eng_humanities_intl_cert → eng_humanities_intl", () => {
    assert.equal(
      canonicalizeCaseTypeCode("eng_humanities_intl_cert"),
      "eng_humanities_intl",
    );
  });

  void test("eng_humanities_intl_renewal → eng_humanities_intl", () => {
    assert.equal(
      canonicalizeCaseTypeCode("eng_humanities_intl_renewal"),
      "eng_humanities_intl",
    );
  });

  void test("work stays as-is", () => {
    assert.equal(canonicalizeCaseTypeCode("work"), "work");
  });

  void test("intra_company_transfer stays as-is", () => {
    assert.equal(
      canonicalizeCaseTypeCode("intra_company_transfer"),
      "intra_company_transfer",
    );
  });

  void test("company_setup stays as-is", () => {
    assert.equal(canonicalizeCaseTypeCode("company_setup"), "company_setup");
  });

  void test("unknown code passes through", () => {
    assert.equal(
      canonicalizeCaseTypeCode("totally_unknown"),
      "totally_unknown",
    );
  });

  void test("dependent_visa is idempotent", () => {
    assert.equal(canonicalizeCaseTypeCode("dependent_visa"), "dependent_visa");
  });
});

void describe("WIZARD_SEED_MATRIX", () => {
  void test("every entry has consistent canonical via canonicalizeCaseTypeCode", () => {
    for (const entry of WIZARD_SEED_MATRIX) {
      assert.equal(
        canonicalizeCaseTypeCode(entry.wizardId),
        entry.canonical,
        `wizardId="${entry.wizardId}" expected canonical="${entry.canonical}"`,
      );
    }
  });

  void test("covers all Admin CaseTemplateId values", () => {
    const expected = [
      "family",
      "work",
      "bmv",
      "biz_mgmt_cert_4m",
      "biz_mgmt_cert_1y",
      "biz_mgmt_renewal",
      "eng_humanities_intl_cert",
      "eng_humanities_intl_renewal",
      "intra_company_transfer",
      "company_setup",
    ];
    const covered = new Set(WIZARD_SEED_MATRIX.map((e) => e.wizardId));
    for (const id of expected) {
      assert.ok(covered.has(id), `missing wizard id: ${id}`);
    }
  });

  void test("seed-existing entries have canonical matching seedCaseTemplates", () => {
    const seedCaseTypes = new Set([
      "dependent_visa",
      "work",
      "business_manager_visa",
    ]);
    for (const entry of WIZARD_SEED_MATRIX) {
      if (entry.seedExists) {
        assert.ok(
          seedCaseTypes.has(entry.canonical),
          `seedExists=true but canonical="${entry.canonical}" not in seed`,
        );
      }
    }
  });
});
