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

void test("G-1: case_names expression uses coalesce fallback with displayName and case_type_label", () => {
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
    select.includes("case_type_label"),
    `expected fallback to reference case_type_label`,
  );
});
