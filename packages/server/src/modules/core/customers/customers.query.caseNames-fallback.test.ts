import test from "node:test";
import assert from "node:assert/strict";

import { buildCustomerListSelect } from "./customers.query";

/**
 * G-1: case_names 子查询不再过滤 case_name 为空的案件，
 * 而是通过 coalesce 回退到 case_no（再到 ""）。
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
    `expected case_names subquery to NOT filter out null case_name (should fall back to case_no instead)`,
  );
});

/**
 * W-5：案件摘要卡 case_names fallback 必须与 C-1
 * （CustomerAdapterCaseMapper）保持一致的 caseName → caseNumber → ""
 * 链路；任何对 case_type_code / metadata.caseTypeLabel 的引用都视为
 * visa key 泄漏回归（admin 不应看到 `dependent_visa` 这种 internal code）。
 */
void test("W-5: case_names expression falls back to case_no, never exposes case_type_code or metadata label", () => {
  const select = buildCustomerListSelect("c");
  assert.ok(
    select.includes("coalesce("),
    `expected case_names to use coalesce for fallback`,
  );
  assert.ok(
    select.includes("ca.case_name"),
    `expected fallback to reference ca.case_name as primary branch`,
  );
  assert.ok(
    select.includes("ca.case_no"),
    `expected fallback to reference ca.case_no as secondary branch`,
  );
  assert.ok(
    !select.includes("ca.case_type_code"),
    `expected fallback to NOT reference ca.case_type_code (W-5 visa key leak guard)`,
  );
  assert.ok(
    !select.includes("metadata->>'caseTypeLabel'"),
    `expected fallback to NOT reference metadata->>'caseTypeLabel' (W-5 keep parity with C-1 caseName→caseNumber→"" chain)`,
  );
  assert.ok(
    !select.includes("case_type_label"),
    `expected fallback to NOT reference non-existent column ca.case_type_label (R-FLOW5-A-2 regression guard)`,
  );
});

/**
 * W-5：fallback 链路顺序锁定 —— case_name 必须排在 case_no 之前，
 * 避免「客户最后联系编号覆盖案件名」这种漂移。
 */
void test("W-5: case_names fallback orders case_name BEFORE case_no", () => {
  const select = buildCustomerListSelect("c");
  const caseNameIdx = select.indexOf("ca.case_name");
  const caseNoIdx = select.indexOf("ca.case_no");
  assert.ok(caseNameIdx >= 0, "ca.case_name must appear in select");
  assert.ok(caseNoIdx > caseNameIdx, "ca.case_no must come after ca.case_name");
});
