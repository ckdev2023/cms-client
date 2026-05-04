import test from "node:test";
import assert from "node:assert/strict";
import { BadRequestException } from "@nestjs/common";
import { parseTimelineListQuery } from "./timeline.controller";
void test("parseTimelineListQuery accepts whitelisted parameters", () => {
  const parsed = parseTimelineListQuery({
    entityType: "case",
    entityId: "11111111-1111-1111-1111-111111111111",
    limit: "20",
  });
  assert.equal(parsed.entityType, "case");
  assert.equal(parsed.entityId, "11111111-1111-1111-1111-111111111111");
  assert.equal(parsed.limit, 20);
});
void test("parseTimelineListQuery rejects caseId alias with hint", () => {
  assert.throws(
    () =>
      parseTimelineListQuery({
        caseId: "11111111-1111-1111-1111-111111111111",
      }),
    (err) => {
      assert.ok(err instanceof BadRequestException);
      const message = err.message;
      assert.match(message, /Unknown query parameter: caseId/u);
      assert.match(message, /entityType=case&entityId=/u);
      return true;
    },
  );
});
void test("parseTimelineListQuery rejects unknown parameter without hint", () => {
  assert.throws(
    () => parseTimelineListQuery({ foo: "bar" }),
    (err) => {
      assert.ok(err instanceof BadRequestException);
      assert.match(err.message, /Unknown query parameter: foo/u);
      return true;
    },
  );
});
void test("parseTimelineListQuery rejects invalid entityType", () => {
  assert.throws(() => parseTimelineListQuery({ entityType: "not-a-type" }), {
    message: /Invalid entityType/u,
  });
});
void test("parseTimelineListQuery rejects invalid limit", () => {
  assert.throws(() => parseTimelineListQuery({ limit: "0" }), {
    message: /Invalid limit/u,
  });
});
void test("parseTimelineListQuery accepts empty query", () => {
  const parsed = parseTimelineListQuery({});
  assert.equal(parsed.entityType, undefined);
  assert.equal(parsed.entityId, undefined);
  assert.equal(parsed.limit, undefined);
});
//# sourceMappingURL=timeline.controller.test.js.map
