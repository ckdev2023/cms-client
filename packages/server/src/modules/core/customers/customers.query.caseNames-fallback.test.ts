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
 * 链路；case_names 子查询不得引用 case_type_code / metadata.caseTypeLabel。
 *
 * 注意：case_titles（P1-9/10）可以包含 case_type_code（设计意图），
 * 此测试仅检查 case_names 子查询部分。
 */
void test("W-5: case_names expression falls back to case_no, never exposes case_type_code or metadata label", () => {
  const select = buildCustomerListSelect("c");
  const caseNamesEnd = select.indexOf("as case_names");
  assert.ok(caseNamesEnd >= 0, "expected case_names column in select");
  const caseNamesPortion = select.slice(
    0,
    caseNamesEnd + "as case_names".length,
  );
  assert.ok(
    caseNamesPortion.includes("coalesce("),
    `expected case_names to use coalesce for fallback`,
  );
  assert.ok(
    caseNamesPortion.includes("ca.case_name"),
    `expected fallback to reference ca.case_name as primary branch`,
  );
  assert.ok(
    caseNamesPortion.includes("ca.case_no"),
    `expected fallback to reference ca.case_no as secondary branch`,
  );
  assert.ok(
    !caseNamesPortion.includes("ca.case_type_code"),
    `expected case_names fallback to NOT reference ca.case_type_code (W-5 visa key leak guard)`,
  );
  assert.ok(
    !caseNamesPortion.includes("metadata->>'caseTypeLabel'"),
    `expected case_names fallback to NOT reference metadata->>'caseTypeLabel'`,
  );
  assert.ok(
    !caseNamesPortion.includes("case_type_label"),
    `expected case_names fallback to NOT reference non-existent column ca.case_type_label`,
  );
});

/**
 * W-5：fallback 链路顺序锁定 —— case_names 内 case_name 必须排在 case_no 之前。
 */
void test("W-5: case_names fallback orders case_name BEFORE case_no", () => {
  const select = buildCustomerListSelect("c");
  const caseNamesEnd = select.indexOf("as case_names");
  const caseNamesPortion = select.slice(
    0,
    caseNamesEnd + "as case_names".length,
  );
  const caseNameIdx = caseNamesPortion.indexOf("ca.case_name");
  const caseNoIdx = caseNamesPortion.indexOf("ca.case_no");
  assert.ok(caseNameIdx >= 0, "ca.case_name must appear in case_names portion");
  assert.ok(
    caseNoIdx > caseNameIdx,
    "ca.case_no must come after ca.case_name in case_names",
  );
});

/**
 * P1-9/10：case_titles 子查询不再引用 case_type_code（§5.1 口径：
 * 服务端只返回结构化字段，前端按 locale 拼装 fallback）。
 */
void test("P1-9/10: case_titles expression does NOT reference case_type_code (decoupled to caseTypeCodes)", () => {
  const select = buildCustomerListSelect("c");
  assert.ok(
    select.includes("as case_titles"),
    `expected list select to expose case_titles column`,
  );
  const caseNamesEnd = select.indexOf("as case_names");
  const caseTitlesEnd = select.indexOf("as case_titles");
  const caseTitlesExpr = select.slice(
    caseNamesEnd + "as case_names".length,
    caseTitlesEnd + "as case_titles".length,
  );
  assert.ok(
    !caseTitlesExpr.includes("ca.case_type_code"),
    `expected case_titles to NOT reference ca.case_type_code (decoupled to caseTypeCodes column)`,
  );
  assert.ok(
    caseTitlesExpr.includes("ca.case_name"),
    `expected case_titles to reference ca.case_name as primary branch`,
  );
});

/**
 * P1-9/10：caseTypeCodes 独立子查询暴露 case_type_code 数组，
 * 与 caseTitles 同序。
 */
void test("P1-9/10: case_type_codes subquery exposes independent column with case_type_code", () => {
  const select = buildCustomerListSelect("c");
  assert.ok(
    select.includes("as case_type_codes"),
    `expected list select to expose case_type_codes column`,
  );
  const caseTypeCodesEnd = select.indexOf("as case_type_codes");
  const caseTypeCodesStart = select.lastIndexOf("(select", caseTypeCodesEnd);
  const caseTypeCodesExpr = select.slice(
    caseTypeCodesStart,
    caseTypeCodesEnd + "as case_type_codes".length,
  );
  assert.ok(
    caseTypeCodesExpr.includes("ca.case_type_code"),
    `expected case_type_codes to reference ca.case_type_code`,
  );
  assert.ok(
    caseTypeCodesExpr.includes("order by created_at desc, id desc"),
    `expected case_type_codes to use same ordering as case_titles`,
  );
});
