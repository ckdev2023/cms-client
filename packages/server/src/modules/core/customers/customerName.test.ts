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

  void test("returns null for empty-string name", () => {
    assert.equal(extractCustomerName({ name: "" }), null);
    assert.equal(extractCustomerName({ name: "  " }), null);
  });
});
