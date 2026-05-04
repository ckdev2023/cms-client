import test from "node:test";
import assert from "node:assert/strict";
import {
  mergeLocalizedNamesIntoProfile,
  resolveLocalizedNamesFromProfile,
} from "./customers.localized-names";
void test("resolveLocalizedNamesFromProfile reads only from JSONB keys, not DB columns", () => {
  const baseProfile = {
    name_cn: "张三",
    name_jp: "チョウサン",
    name_en: "Zhang San",
    name_default_locale: "zh",
  };
  const result = resolveLocalizedNamesFromProfile(baseProfile);
  assert.deepEqual(result, {
    zh: "张三",
    ja: "チョウサン",
    en: "Zhang San",
    defaultLocale: "zh",
  });
});
void test("resolveLocalizedNamesFromProfile gracefully handles empty baseProfile", () => {
  const result = resolveLocalizedNamesFromProfile({});
  assert.deepEqual(result, {
    zh: null,
    ja: null,
    en: null,
    defaultLocale: null,
  });
});
void test("mergeLocalizedNamesIntoProfile writes into JSONB keys only", () => {
  const merged = mergeLocalizedNamesIntoProfile(
    { gender: "male" },
    { zh: "李四", ja: "リシ", en: "Li Si", defaultLocale: "ja" },
  );
  assert.equal(merged.name_cn, "李四");
  assert.equal(merged.name_jp, "リシ");
  assert.equal(merged.name_en, "Li Si");
  assert.equal(merged.name_default_locale, "ja");
  assert.equal(merged.gender, "male");
  assert.equal(Object.prototype.hasOwnProperty.call(merged, "name_zh"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(merged, "name_ja"), false);
});
void test("round-trip: merge then resolve preserves trilingual names", () => {
  const input = {
    zh: "王五",
    ja: "オウゴ",
    en: "Wang Wu",
    defaultLocale: "en",
  };
  const merged = mergeLocalizedNamesIntoProfile({}, input);
  const resolved = resolveLocalizedNamesFromProfile(merged);
  assert.deepEqual(resolved, {
    zh: "王五",
    ja: "オウゴ",
    en: "Wang Wu",
    defaultLocale: "en",
  });
});
//# sourceMappingURL=customers.localized-names.base-profile-only.test.js.map
