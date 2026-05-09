import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { extractCustomerName } from "./customerName";

void describe("extractCustomerName", () => {
  void test("returns null for null/undefined/non-object", () => {
    assert.equal(extractCustomerName(null), null);
    assert.equal(extractCustomerName(undefined), null);
    assert.equal(extractCustomerName("string"), null);
    assert.equal(extractCustomerName(42), null);
  });

  void test("returns name when present", () => {
    assert.equal(extractCustomerName({ name: "田中太郎" }), "田中太郎");
  });

  void test("prefers name over familyName/givenName", () => {
    assert.equal(
      extractCustomerName({
        name: "Explicit",
        familyName: "Tanaka",
        givenName: "Taro",
      }),
      "Explicit",
    );
  });

  void test("falls back to familyName + givenName", () => {
    assert.equal(
      extractCustomerName({ familyName: "田中", givenName: "太郎" }),
      "田中 太郎",
    );
  });

  void test("familyName only (no givenName)", () => {
    assert.equal(extractCustomerName({ familyName: "田中" }), "田中");
  });

  void test("falls back to lastName + firstName when no familyName", () => {
    assert.equal(
      extractCustomerName({ lastName: "佐藤", firstName: "花子" }),
      "佐藤 花子",
    );
  });

  void test("lastName only (no firstName)", () => {
    assert.equal(extractCustomerName({ lastName: "佐藤" }), "佐藤");
  });

  void test("prefers familyName over lastName", () => {
    assert.equal(
      extractCustomerName({
        familyName: "Family",
        givenName: "Given",
        lastName: "Last",
        firstName: "First",
      }),
      "Family Given",
    );
  });

  void test("returns null for empty object", () => {
    assert.equal(extractCustomerName({}), null);
  });

  void test("falls back to fullName when no familyName/lastName", () => {
    assert.equal(extractCustomerName({ fullName: "山田 花子" }), "山田 花子");
  });

  void test("falls back to displayName when no fullName either", () => {
    assert.equal(
      extractCustomerName({ displayName: "Yamada Hanako" }),
      "Yamada Hanako",
    );
  });

  void test("prefers lastName over fullName", () => {
    assert.equal(
      extractCustomerName({
        lastName: "佐藤",
        firstName: "一郎",
        fullName: "Full Name",
      }),
      "佐藤 一郎",
    );
  });

  void test("prefers fullName over displayName", () => {
    assert.equal(
      extractCustomerName({ fullName: "Full", displayName: "Display" }),
      "Full",
    );
  });

  void test("ignores whitespace-only fullName and displayName", () => {
    assert.equal(
      extractCustomerName({ fullName: "  ", displayName: "  " }),
      null,
    );
  });

  void test("returns null for empty-string name", () => {
    assert.equal(extractCustomerName({ name: "" }), null);
    assert.equal(extractCustomerName({ name: "  " }), null);
  });

  void test("falls back to name_jp when no other name field is present", () => {
    assert.equal(
      extractCustomerName({ name_jp: "デモ依頼者 — 王 小明" }),
      "デモ依頼者 — 王 小明",
    );
  });

  void test("falls back to name_cn when name_jp is absent", () => {
    assert.equal(extractCustomerName({ name_cn: "王 小明" }), "王 小明");
  });

  void test("falls back to name_en when name_jp/name_cn are absent", () => {
    assert.equal(
      extractCustomerName({ name_en: "Wang Xiaoming" }),
      "Wang Xiaoming",
    );
  });

  void test("prefers name_jp over name_cn over name_en", () => {
    assert.equal(
      extractCustomerName({ name_jp: "JP", name_cn: "CN", name_en: "EN" }),
      "JP",
    );
  });

  void test("prefers displayName over localized name fields", () => {
    assert.equal(
      extractCustomerName({
        displayName: "Display",
        name_jp: "JP",
        name_cn: "CN",
      }),
      "Display",
    );
  });

  void test("ignores whitespace-only localized name fields", () => {
    assert.equal(
      extractCustomerName({ name_jp: "  ", name_cn: "  ", name_en: "  " }),
      null,
    );
  });
});
