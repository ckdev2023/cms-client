import test from "node:test";
import assert from "node:assert/strict";

import { expandCaseListSearchVariants } from "./cases.case-list-search-variants";

void test("expandCaseListSearchVariants: empty / whitespace yields []", () => {
  assert.deepEqual(expandCaseListSearchVariants(""), []);
  assert.deepEqual(expandCaseListSearchVariants("   "), []);
});

void test("expandCaseListSearchVariants: 经营 ↔ 経営", () => {
  assert.deepEqual(expandCaseListSearchVariants("ABC"), ["ABC"]);
  assert.deepEqual(expandCaseListSearchVariants("经营管理"), [
    "经营管理",
    "経営管理",
  ]);
  assert.deepEqual(expandCaseListSearchVariants("経営管理（認定4M）"), [
    "経営管理（認定4M）",
    "经营管理（認定4M）",
  ]);
});
