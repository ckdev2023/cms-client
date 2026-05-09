import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { BadRequestException, UnauthorizedException } from "@nestjs/common";

import { SearchController } from "./search.controller";
import { SearchService } from "./search.service";

const ctx = {
  orgId: "00000000-0000-4000-8000-000000000000",
  userId: "00000000-0000-4000-8000-000000000001",
  role: "viewer" as const,
};
const req = { requestContext: ctx };

function stubService(override?: Partial<SearchService>): SearchService {
  return {
    search: () => Promise.resolve({ query: "", hits: [], truncated: false }),
    ...override,
  } as unknown as SearchService;
}

void test('SearchController class uses @Controller("admin/search") to align with admin route prefix', () => {
  const src = fs.readFileSync(
    path.resolve(import.meta.dirname, "search.controller.ts"),
    "utf-8",
  );
  assert.ok(
    src.includes('@Controller("admin/search")'),
    'SearchController must be mounted at "admin/search" so the admin frontend can hit /api/admin/search?q=...',
  );
});

void test("SearchController.search requires request context", async () => {
  const controller = new SearchController(stubService());

  await assert.rejects(
    () => controller.search({} as never, { q: "test" }),
    UnauthorizedException,
  );
});

void test("SearchController.search forwards trimmed q to service", async () => {
  let captured: { q: string } | undefined;
  const service = stubService({
    search: (_ctx, q) => {
      captured = { q };
      return Promise.resolve({ query: q, hits: [], truncated: false });
    },
  });

  const controller = new SearchController(service);
  await controller.search(req as never, { q: "  hello  " });

  assert.equal(captured?.q, "hello");
});

void test("SearchController.search passes request context to service", async () => {
  let capturedCtx: unknown;
  const service = stubService({
    search: (c) => {
      capturedCtx = c;
      return Promise.resolve({ query: "", hits: [], truncated: false });
    },
  });

  const controller = new SearchController(service);
  await controller.search(req as never, { q: "x" });

  assert.deepEqual(capturedCtx, ctx);
});

void test("SearchController.search returns empty hits for missing q", async () => {
  const service = stubService({
    search: (_ctx, q) =>
      Promise.resolve({ query: q, hits: [], truncated: false }),
  });
  const controller = new SearchController(service);
  const result = await controller.search(req as never, {});

  assert.equal(result.query, "");
  assert.deepEqual(result.hits, []);
});

void test("SearchController.search rejects q longer than 60 characters", async () => {
  const controller = new SearchController(stubService());
  const longQ = "a".repeat(61);

  await assert.rejects(
    () => controller.search(req as never, { q: longQ }),
    BadRequestException,
  );
});

void test("SearchController.search accepts q of exactly 60 characters", async () => {
  let captured: string | undefined;
  const service = stubService({
    search: (_ctx, q) => {
      captured = q;
      return Promise.resolve({ query: q, hits: [], truncated: false });
    },
  });
  const controller = new SearchController(service);
  const q60 = "a".repeat(60);
  await controller.search(req as never, { q: q60 });

  assert.equal(captured, q60);
});

void test("SearchController.search rejects non-string q", async () => {
  const controller = new SearchController(stubService());

  await assert.rejects(
    () => controller.search(req as never, { q: 123 }),
    BadRequestException,
  );
});

void test("SearchController.search returns empty for whitespace-only q", async () => {
  const service = stubService({
    search: (_ctx, q) =>
      Promise.resolve({ query: q, hits: [], truncated: false }),
  });
  const controller = new SearchController(service);
  const result = await controller.search(req as never, { q: "   " });

  assert.equal(result.query, "");
  assert.deepEqual(result.hits, []);
});
