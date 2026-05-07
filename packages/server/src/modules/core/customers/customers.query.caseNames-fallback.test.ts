import test from "node:test";
import assert from "node:assert/strict";

import { buildCustomerListSelect } from "./customers.query";

/**
 * G-1: case_names 子查询不再过滤 case_name 为空的案件，而是使用
 * coalesce 回退到「客户名 · 签证类型标签」合成名称。
 */
void test("G-1: case_names expression no longer excludes null case_name rows", () => {
  const select = buildCustomerListSelect("c");
  assert.ok(
    select.includes("as case_names"),
    `expected list select to expose case_names column`,
  );
  assert.ok(
    !select.includes(
      "and nullif(trim(coalesce(ca.case_name, '')), '') is not null",
    ),
    `expected case_names subquery to NOT filter out null case_name (should use coalesce fallback instead)`,
  );
});

/**
 * R-FLOW5-A-2 / R-FLOW2-A-1 永久守护：cases 表实际只有 `case_type_code`
 * 列，从未存在 `case_type_label`。一旦该列被塞回 SQL，列表与详情会
 * 全部抛 `column ca.case_type_label does not exist` 5xx。
 *
 * G-1 fallback 必须严格走 `metadata->>'caseTypeLabel'` → `case_type_code`
 * 这条链路；任何对 `case_type_label` 的引用都视为回归。
 */
void test("G-1: case_names expression uses coalesce fallback with displayName + metadata + case_type_code", () => {
  const select = buildCustomerListSelect("c");
  assert.ok(
    select.includes("coalesce("),
    `expected case_names to use coalesce for fallback`,
  );
  assert.ok(
    select.includes("displayName"),
    `expected fallback to reference displayName from base_profile`,
  );
  assert.ok(
    !select.includes("case_type_label"),
    `expected fallback to NOT reference non-existent column ca.case_type_label (R-FLOW5-A-2 regression guard)`,
  );
  assert.ok(
    select.includes("metadata->>'caseTypeLabel'"),
    `expected fallback to reference metadata->>'caseTypeLabel'`,
  );
  assert.ok(
    select.includes("ca.case_type_code"),
    `expected fallback to reference ca.case_type_code as final coalesce branch`,
  );
});
