import test from "node:test";
import assert from "node:assert/strict";
import { BadRequestException } from "@nestjs/common";

import { parseLocalizedNames } from "./customers.controller-parsers";

void test("parseLocalizedNames returns undefined for undefined/null", () => {
  assert.equal(parseLocalizedNames(undefined), undefined);
  assert.equal(parseLocalizedNames(null), undefined);
});

void test("parseLocalizedNames throws for non-object", () => {
  assert.throws(() => parseLocalizedNames("str"), BadRequestException);
  assert.throws(() => parseLocalizedNames(123), BadRequestException);
  assert.throws(() => parseLocalizedNames([]), BadRequestException);
});

void test("parseLocalizedNames parses valid trilingual object", () => {
  const result = parseLocalizedNames({
    zh: "张三",
    ja: "チョウサン",
    en: "Zhang San",
  });
  assert.deepEqual(result, {
    zh: "张三",
    ja: "チョウサン",
    en: "Zhang San",
  });
});

void test("parseLocalizedNames handles null values for clearing", () => {
  const result = parseLocalizedNames({ zh: null, ja: "名前" });
  assert.deepEqual(result, { zh: null, ja: "名前" });
});

void test("parseLocalizedNames trims whitespace-only to null", () => {
  const result = parseLocalizedNames({ zh: "   ", en: "Name" });
  assert.deepEqual(result, { zh: null, en: "Name" });
});

void test("parseLocalizedNames throws for non-string locale value", () => {
  assert.throws(() => parseLocalizedNames({ zh: 123 }), BadRequestException);
});

void test("parseLocalizedNames parses defaultLocale", () => {
  const result = parseLocalizedNames({ zh: "张三", defaultLocale: "zh" });
  assert.deepEqual(result, { zh: "张三", defaultLocale: "zh" });
});

void test("parseLocalizedNames throws for invalid defaultLocale", () => {
  assert.throws(
    () => parseLocalizedNames({ defaultLocale: "fr" }),
    BadRequestException,
  );
  assert.throws(
    () => parseLocalizedNames({ defaultLocale: 123 }),
    BadRequestException,
  );
});

void test("parseLocalizedNames allows null defaultLocale", () => {
  const result = parseLocalizedNames({ defaultLocale: null });
  assert.deepEqual(result, { defaultLocale: null });
});

void test("parseLocalizedNames ignores unknown keys", () => {
  const result = parseLocalizedNames({ zh: "张三", fr: "Français" });
  assert.deepEqual(result, { zh: "张三" });
});

void test("parseLocalizedNames returns undefined for empty object", () => {
  assert.equal(parseLocalizedNames({}), undefined);
});
