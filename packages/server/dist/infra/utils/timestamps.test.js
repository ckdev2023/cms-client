import assert from "node:assert/strict";
import test from "node:test";
import { toIsoTimestampString, toIsoTimestampStringOrNull } from "./timestamps";
void test("toIsoTimestampStringOrNull serializes Date and number values to ISO", () => {
  assert.equal(
    toIsoTimestampStringOrNull(new Date("2026-04-29T02:15:16.000Z")),
    "2026-04-29T02:15:16.000Z",
  );
  assert.equal(
    toIsoTimestampStringOrNull(Date.parse("2026-04-29T02:15:16.000Z")),
    "2026-04-29T02:15:16.000Z",
  );
});
void test("toIsoTimestampStringOrNull normalizes parseable strings and preserves invalid raw strings", () => {
  assert.equal(
    toIsoTimestampStringOrNull("2026-04-29T11:15:16+09:00"),
    "2026-04-29T02:15:16.000Z",
  );
  assert.equal(
    toIsoTimestampStringOrNull("not-a-timestamp"),
    "not-a-timestamp",
  );
});
void test("toIsoTimestampString returns empty string for nullish values", () => {
  assert.equal(toIsoTimestampStringOrNull(null), null);
  assert.equal(toIsoTimestampStringOrNull(undefined), null);
  assert.equal(toIsoTimestampString(null), "");
});
void test("toIsoTimestampStringOrNull normalizes Date.toString() output to ISO 8601", () => {
  const original = new Date("2026-04-29T02:15:16.000Z");
  const dateToString = original.toString();
  assert.equal(
    toIsoTimestampStringOrNull(dateToString),
    "2026-04-29T02:15:16.000Z",
  );
});
void test("toIsoTimestampStringOrNull treats empty string as null", () => {
  assert.equal(toIsoTimestampStringOrNull(""), null);
  assert.equal(toIsoTimestampStringOrNull("   "), null);
});
//# sourceMappingURL=timestamps.test.js.map
