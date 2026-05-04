import assert from "node:assert/strict";
import test from "node:test";
import { BadRequestException, UnauthorizedException } from "@nestjs/common";
import { SearchController } from "./search.controller";
const ctx = {
  orgId: "00000000-0000-4000-8000-000000000000",
  userId: "00000000-0000-4000-8000-000000000001",
  role: "viewer",
};
const req = { requestContext: ctx };
function stubService(override) {
  return {
    search: () => Promise.resolve({ query: "", hits: [], truncated: false }),
    ...override,
  };
}
void test("SearchController.search requires request context", async () => {
  const controller = new SearchController(stubService());
  await assert.rejects(
    () => controller.search({}, { q: "test" }),
    UnauthorizedException,
  );
});
void test("SearchController.search forwards trimmed q to service", async () => {
  let captured;
  const service = stubService({
    search: (_ctx, q) => {
      captured = { q };
      return Promise.resolve({ query: q, hits: [], truncated: false });
    },
  });
  const controller = new SearchController(service);
  await controller.search(req, { q: "  hello  " });
  assert.equal(captured?.q, "hello");
});
void test("SearchController.search passes request context to service", async () => {
  let capturedCtx;
  const service = stubService({
    search: (c) => {
      capturedCtx = c;
      return Promise.resolve({ query: "", hits: [], truncated: false });
    },
  });
  const controller = new SearchController(service);
  await controller.search(req, { q: "x" });
  assert.deepEqual(capturedCtx, ctx);
});
void test("SearchController.search returns empty hits for missing q", async () => {
  const service = stubService({
    search: (_ctx, q) =>
      Promise.resolve({ query: q, hits: [], truncated: false }),
  });
  const controller = new SearchController(service);
  const result = await controller.search(req, {});
  assert.equal(result.query, "");
  assert.deepEqual(result.hits, []);
});
void test("SearchController.search rejects q longer than 60 characters", async () => {
  const controller = new SearchController(stubService());
  const longQ = "a".repeat(61);
  await assert.rejects(
    () => controller.search(req, { q: longQ }),
    BadRequestException,
  );
});
void test("SearchController.search accepts q of exactly 60 characters", async () => {
  let captured;
  const service = stubService({
    search: (_ctx, q) => {
      captured = q;
      return Promise.resolve({ query: q, hits: [], truncated: false });
    },
  });
  const controller = new SearchController(service);
  const q60 = "a".repeat(60);
  await controller.search(req, { q: q60 });
  assert.equal(captured, q60);
});
void test("SearchController.search rejects non-string q", async () => {
  const controller = new SearchController(stubService());
  await assert.rejects(
    () => controller.search(req, { q: 123 }),
    BadRequestException,
  );
});
void test("SearchController.search returns empty for whitespace-only q", async () => {
  const service = stubService({
    search: (_ctx, q) =>
      Promise.resolve({ query: q, hits: [], truncated: false }),
  });
  const controller = new SearchController(service);
  const result = await controller.search(req, { q: "   " });
  assert.equal(result.query, "");
  assert.deepEqual(result.hits, []);
});
//# sourceMappingURL=search.controller.test.js.map
