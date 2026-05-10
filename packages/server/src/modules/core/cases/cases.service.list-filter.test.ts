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

// ─── riskBucket：与 dashboard 风险并集口径对齐 ─────────────────────

void test("riskBucket=any 生成与 dashboard.loadRiskCasesCount 一致的 OR 条件", () => {
  const { whereClause, params } = buildCaseListFilterPrefixed(
    { riskBucket: "any" },
    "cs.",
  );
  assert.match(whereClause, /cs\.risk_level = 'high'/);
  assert.match(
    whereClause,
    /coalesce\(cs\.billing_unpaid_amount_cached::numeric, 0\) > 0/,
  );
  assert.match(whereClause, /from validation_runs vr/);
  assert.match(whereClause, /vr\.case_id = cs\.id/);
  assert.match(whereClause, /vr\.org_id = cs\.org_id/);
  assert.match(whereClause, /'failed'/);
  assert.deepEqual(params, []);
});

void test("riskBucket=high 仅产生 risk_level='high' 子句", () => {
  const { whereClause, params } = buildCaseListFilterPrefixed(
    { riskBucket: "high" },
    "cs.",
  );
  assert.match(whereClause, /cs\.risk_level = 'high'/);
  assert.doesNotMatch(whereClause, /billing_unpaid_amount_cached/);
  assert.doesNotMatch(whereClause, /validation_runs/);
  assert.deepEqual(params, []);
});

void test("riskBucket=billing 仅产生 unpaid > 0 子句", () => {
  const { whereClause } = buildCaseListFilterPrefixed(
    { riskBucket: "billing" },
    "cs.",
  );
  assert.match(
    whereClause,
    /coalesce\(cs\.billing_unpaid_amount_cached::numeric, 0\) > 0/,
  );
  assert.doesNotMatch(whereClause, /risk_level/);
  assert.doesNotMatch(whereClause, /validation_runs/);
});

void test("riskBucket=validation 仅产生最新 validation_run failed 子句", () => {
  const { whereClause } = buildCaseListFilterPrefixed(
    { riskBucket: "validation" },
    "cs.",
  );
  assert.match(whereClause, /from validation_runs vr/);
  assert.match(whereClause, /'failed'/);
  assert.doesNotMatch(whereClause, /risk_level/);
  assert.doesNotMatch(whereClause, /billing_unpaid_amount_cached/);
});

void test("riskBucket 与 riskLevel 可叠加（AND）", () => {
  const { whereClause, params } = buildCaseListFilterPrefixed(
    { riskBucket: "billing", riskLevel: "high" },
    "cs.",
  );
  assert.match(whereClause, /cs\.risk_level = \$1/);
  assert.match(
    whereClause,
    /coalesce\(cs\.billing_unpaid_amount_cached::numeric, 0\) > 0/,
  );
  assert.deepEqual(params, ["high"]);
});

void test("riskBucket 在无前缀（list 路径）下使用裸列名", () => {
  const { whereClause } = buildCaseListFilter({ riskBucket: "any" });
  assert.match(whereClause, /risk_level = 'high'/);
  assert.match(
    whereClause,
    /coalesce\(billing_unpaid_amount_cached::numeric, 0\) > 0/,
  );
  assert.match(whereClause, /vr\.case_id = id/);
  assert.match(whereClause, /vr\.org_id = org_id/);
});

void test("未提供 riskBucket 时不附加任何风险子句", () => {
  const { whereClause } = buildCaseListFilterPrefixed({}, "cs.");
  assert.doesNotMatch(whereClause, /risk_level = 'high'/);
  assert.doesNotMatch(whereClause, /billing_unpaid_amount_cached/);
  assert.doesNotMatch(whereClause, /validation_runs/);
});
