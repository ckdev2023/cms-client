import test from "node:test";
import assert from "node:assert/strict";

import { isTimelineEntityType } from "./coreEntities";

void test("isTimelineEntityType returns true for known entity types", () => {
  assert.equal(isTimelineEntityType("organization"), true);
  assert.equal(isTimelineEntityType("user"), true);
  assert.equal(isTimelineEntityType("customer"), true);
  assert.equal(isTimelineEntityType("case"), true);
  assert.equal(isTimelineEntityType("document_item"), true);
  assert.equal(isTimelineEntityType("reminder"), true);
  assert.equal(isTimelineEntityType("company"), true);
  assert.equal(isTimelineEntityType("contact_person"), true);
  assert.equal(isTimelineEntityType("case_party"), true);
  assert.equal(isTimelineEntityType("document_file"), true);
  assert.equal(isTimelineEntityType("communication_log"), true);
  assert.equal(isTimelineEntityType("task"), true);
  assert.equal(isTimelineEntityType("generated_document"), true);
  assert.equal(isTimelineEntityType("billing_record"), true);
  assert.equal(isTimelineEntityType("payment_record"), true);
});

void test("isTimelineEntityType returns false for unknown entity types", () => {
  assert.equal(isTimelineEntityType("documentItem"), false);
  assert.equal(isTimelineEntityType("timeline_log"), false);
  assert.equal(isTimelineEntityType("unknown"), false);
  assert.equal(isTimelineEntityType("foobar"), false);
  assert.equal(isTimelineEntityType(""), false);
  assert.equal(isTimelineEntityType(null), false);
  assert.equal(isTimelineEntityType(undefined), false);
  assert.equal(isTimelineEntityType(123), false);
});
