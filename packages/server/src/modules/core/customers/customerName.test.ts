import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  extractCustomerName,
  resolveCustomerDisplayName,
} from "./customerName";

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

void describe("resolveCustomerDisplayName", () => {
  void test("returns null for null/non-object", () => {
    assert.equal(resolveCustomerDisplayName(null), null);
    assert.equal(resolveCustomerDisplayName(undefined), null);
    assert.equal(resolveCustomerDisplayName(42), null);
  });

  void test("respects name_default_locale=zh", () => {
    assert.equal(
      resolveCustomerDisplayName({
        name_cn: "走查客户",
        name_jp: "ウォークスルー",
        name_en: "Audit",
        name_default_locale: "zh",
      }),
      "走查客户",
    );
  });

  void test("respects name_default_locale=ja", () => {
    assert.equal(
      resolveCustomerDisplayName({
        name_cn: "走查客户",
        name_jp: "ウォークスルー",
        name_en: "Audit",
        name_default_locale: "ja",
      }),
      "ウォークスルー",
    );
  });

  void test("respects name_default_locale=en", () => {
    assert.equal(
      resolveCustomerDisplayName({
        name_cn: "走查客户",
        name_jp: "ウォークスルー",
        name_en: "Audit",
        name_default_locale: "en",
      }),
      "Audit",
    );
  });

  void test("prefers displayName over localized names", () => {
    assert.equal(
      resolveCustomerDisplayName({
        displayName: "Display",
        name_cn: "中文",
        name_jp: "日本語",
        name_default_locale: "ja",
      }),
      "Display",
    );
  });

  void test("prefers legalName over localized names when displayName absent", () => {
    assert.equal(
      resolveCustomerDisplayName({
        legalName: "法人名称",
        name_jp: "日本語",
        name_default_locale: "ja",
      }),
      "法人名称",
    );
  });

  void test("falls back to canonical priority (name_cn → name_en → name_jp) without locale", () => {
    assert.equal(
      resolveCustomerDisplayName({
        name_cn: "中文",
        name_jp: "日本語",
        name_en: "English",
      }),
      "中文",
    );
  });

  void test("falls back to name_en when name_cn absent and locale missing", () => {
    assert.equal(
      resolveCustomerDisplayName({ name_jp: "日本語", name_en: "English" }),
      "English",
    );
  });

  void test("falls back to name_jp when only name_jp present", () => {
    assert.equal(resolveCustomerDisplayName({ name_jp: "日本語" }), "日本語");
  });

  void test("falls back to next localized when default-locale field is empty", () => {
    assert.equal(
      resolveCustomerDisplayName({
        name_cn: "  ",
        name_jp: "山田",
        name_default_locale: "zh",
      }),
      "山田",
    );
  });

  void test("ignores invalid name_default_locale values", () => {
    assert.equal(
      resolveCustomerDisplayName({
        name_cn: "中文",
        name_jp: "日本語",
        name_default_locale: "fr",
      }),
      "中文",
    );
  });

  void test("returns null when no name field is present", () => {
    assert.equal(resolveCustomerDisplayName({ phone: "0" }), null);
  });
});
