import test from "node:test";
import assert from "node:assert/strict";

import { customerNameExpr } from "./customerNameExpr";

/**
 * 回归守护：customerNameExpr 与 CUSTOMER_NAME_FIELDS（customers.utils.ts）/
 * resolveDisplayName（customers.dto-mappers.ts）的字段顺序保持一致，避免
 * SQL 聚合（buildCaseNamesExpr 等）和 TS DTO 在「客户仅有 name_jp / name_cn」
 * 场景下回读双源漂移。
 */
void test("customerNameExpr 默认 alias 覆盖 displayName / legalName / name_* 全链路", () => {
  const expr = customerNameExpr();
  for (const field of [
    "displayName",
    "display_name",
    "legalName",
    "legal_name",
    "name",
    "name_cn",
    "name_en",
    "name_jp",
  ]) {
    assert.ok(
      expr.includes(`cu.base_profile->>'${field}'`),
      `expected customerNameExpr 包含 cu.base_profile->>'${field}'`,
    );
  }
});

void test("customerNameExpr 自定义 alias 时所有字段都使用该别名", () => {
  const expr = customerNameExpr("c");
  assert.ok(
    !expr.includes("cu.base_profile"),
    "expected customerNameExpr 不再使用默认 cu 别名",
  );
  assert.ok(
    expr.includes("c.base_profile->>'name_jp'"),
    "expected customerNameExpr 使用传入的 c 别名",
  );
});

/**
 * W-5 守护：避免回退到只查 displayName / legalName 的旧实现，
 * 必须命中 name_jp / name_cn —— 这是 convertLeadToCustomer
 * 唯一写入的客户名字段。
 */
void test("customerNameExpr 必须先 displayName / legal_name 再回落到 name_jp / name_cn", () => {
  const expr = customerNameExpr("c");
  const displayNameIdx = expr.indexOf("'displayName'");
  const legalNameIdx = expr.indexOf("'legalName'");
  const nameJpIdx = expr.indexOf("'name_jp'");
  assert.ok(displayNameIdx >= 0, "displayName 必须出现");
  assert.ok(
    legalNameIdx > displayNameIdx,
    "legalName 必须排在 displayName 之后",
  );
  assert.ok(
    nameJpIdx > legalNameIdx,
    "name_jp 必须排在 legalName 之后作为多语言回退",
  );
});
