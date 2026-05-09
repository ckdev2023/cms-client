import test from "node:test";
import assert from "node:assert/strict";

import {
  buildCaseListFilter,
  buildCaseListFilterPrefixed,
} from "./cases.service.list-filter";

void test("search clause matches case_name and case_no when no customer alias", () => {
  const { whereClause, params } = buildCaseListFilter({ search: "ABC" });
  assert.match(whereClause, /case_name ilike \$1/);
  assert.match(whereClause, /case_no ilike \$1/);
  assert.doesNotMatch(whereClause, /base_profile/);
  assert.deepEqual(params, ["%ABC%"]);
});

void test("search clause additionally matches customer display name when customerAlias provided", () => {
  const { whereClause, params } = buildCaseListFilterPrefixed(
    { search: "R6" },
    "cs.",
    { customerAlias: "cu" },
  );

  assert.match(whereClause, /cs\.case_name ilike \$1/);
  assert.match(whereClause, /cs\.case_no ilike \$1/);
  assert.match(
    whereClause,
    /cu\.base_profile->>'displayName'/,
    "should reference customer displayName",
  );
  assert.match(
    whereClause,
    /cu\.base_profile->>'name_jp'/,
    "should reference customer name_jp",
  );
  assert.match(
    whereClause,
    /cu\.base_profile->>'name_cn'/,
    "should reference customer name_cn",
  );
  assert.deepEqual(params, ["%R6%"]);
});

void test("search clause is omitted when search is empty", () => {
  const { whereClause } = buildCaseListFilterPrefixed({}, "cs.", {
    customerAlias: "cu",
  });
  assert.doesNotMatch(whereClause, /ilike/);
});

void test("customerAlias does not leak into other filters", () => {
  const { whereClause, params } = buildCaseListFilterPrefixed(
    { riskLevel: "high" },
    "cs.",
    { customerAlias: "cu" },
  );
  assert.match(whereClause, /cs\.risk_level = \$1/);
  assert.doesNotMatch(whereClause, /base_profile/);
  assert.deepEqual(params, ["high"]);
});
