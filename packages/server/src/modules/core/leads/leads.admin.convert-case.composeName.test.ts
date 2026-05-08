import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { composeCaseName } from "./leads.admin.convert-case";

void describe("composeCaseName", () => {
  void test("applicant + known caseTypeCode → joined with ' · '", () => {
    const result = composeCaseName(
      { name: "田中太郎" },
      "business_manager_visa",
    );
    assert.equal(result, "田中太郎 · 経営・管理");
  });

  void test("applicant + unknown caseTypeCode → applicant only", () => {
    const result = composeCaseName({ name: "佐藤花子" }, "unknown_type_xyz");
    assert.equal(result, "佐藤花子");
  });

  void test("null name + known caseTypeCode → type label only", () => {
    const result = composeCaseName({ name: null }, "dependent_visa");
    assert.equal(result, "家族滞在");
  });

  void test("whitespace-only name treated as empty", () => {
    const result = composeCaseName({ name: "   " }, "work");
    assert.equal(result, "技術・人文知識・国際業務");
  });

  void test("both empty → null", () => {
    const result = composeCaseName({ name: null }, "unknown_type");
    assert.equal(result, null);
  });

  void test("applicant with leading/trailing spaces is trimmed", () => {
    const result = composeCaseName({ name: "  山田  " }, "permanent");
    assert.equal(result, "山田 · 永住");
  });

  void test("work caseTypeCode resolves to 技術・人文知識・国際業務", () => {
    const result = composeCaseName({ name: "Test" }, "work");
    assert.equal(result, "Test · 技術・人文知識・国際業務");
  });

  void test("general caseTypeCode resolves to 一般", () => {
    const result = composeCaseName({ name: "Test" }, "general");
    assert.equal(result, "Test · 一般");
  });
});
