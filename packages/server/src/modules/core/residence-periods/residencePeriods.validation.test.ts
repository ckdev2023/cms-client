import assert from "node:assert/strict";
import test from "node:test";

import { BadRequestException } from "@nestjs/common";

import {
  INVALID_STATUS_OF_RESIDENCE_FOR_VISA,
  assertStatusOfResidenceMatchesVisaType,
} from "./residencePeriods.validation";

void test("accepts canonical statusOfResidence for known visaType (dependent_visa)", () => {
  assert.doesNotThrow(() => {
    assertStatusOfResidenceMatchesVisaType("dependent_visa", "家族滞在");
  });
});

void test("accepts canonical statusOfResidence for family_stay alias", () => {
  assert.doesNotThrow(() => {
    assertStatusOfResidenceMatchesVisaType("family_stay", "家族滞在");
  });
});

void test("accepts canonical statusOfResidence for business_manager_visa", () => {
  assert.doesNotThrow(() => {
    assertStatusOfResidenceMatchesVisaType(
      "business_manager_visa",
      "経営・管理",
    );
  });
});

void test("rejects typo (家族滑在) when visaType has canonical mapping", () => {
  assert.throws(
    () => {
      assertStatusOfResidenceMatchesVisaType("dependent_visa", "家族滑在");
    },
    (err: unknown) => {
      assert.ok(err instanceof BadRequestException);
      const msg = (err as Error).message;
      assert.ok(msg.includes(INVALID_STATUS_OF_RESIDENCE_FOR_VISA));
      assert.ok(msg.includes("家族滞在"));
      assert.ok(msg.includes("家族滑在"));
      return true;
    },
  );
});

void test("rejects mismatch (経営・管理 paired with dependent_visa)", () => {
  assert.throws(() => {
    assertStatusOfResidenceMatchesVisaType("dependent_visa", "経営・管理");
  }, BadRequestException);
});

void test("permits unknown visaType to keep arbitrary statusOfResidence (forward compat)", () => {
  assert.doesNotThrow(() => {
    assertStatusOfResidenceMatchesVisaType(
      "unknown_visa_code_v999",
      "Some new label not yet in catalog",
    );
  });
});
