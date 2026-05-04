import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { UnauthorizedException } from "@nestjs/common";
import { UsersController } from "./users.controller";
const ORG_ID = "00000000-0000-4000-8000-000000000001";
const USER_ID = "00000000-0000-4000-8000-00000000000a";
function makeReq(ctx) {
  return {
    requestContext: ctx ?? {
      orgId: ORG_ID,
      userId: USER_ID,
      role: "staff",
    },
  };
}
const STUB_RESULT = {
  items: [
    {
      id: USER_ID,
      displayName: "Local Admin",
      role: "manager",
      status: "active",
    },
    {
      id: "00000000-0000-4000-8000-00000000000b",
      displayName: "Test Staff",
      role: "staff",
      status: "active",
    },
  ],
};
function stubService(overrides) {
  return {
    listOrgUsers: () => Promise.resolve(STUB_RESULT),
    ...overrides,
  };
}
function readControllerSource() {
  return fs.readFileSync(
    path.resolve(import.meta.dirname, "users.controller.ts"),
    "utf-8",
  );
}
void describe("UsersController — RBAC decorators", () => {
  void test('controller is mounted at "users"', () => {
    const src = readControllerSource();
    assert.ok(
      src.includes('@Controller("users")'),
      'Controller must be at "users" path',
    );
  });
  void test('list() has @RequireRoles("staff") decorator', () => {
    const src = readControllerSource();
    const methodIdx = src.indexOf("async list(");
    assert.ok(methodIdx > 0, "Method list must exist");
    const decoratorRegion = src.slice(Math.max(0, methodIdx - 200), methodIdx);
    assert.ok(
      decoratorRegion.includes('@RequireRoles("staff")'),
      'list() must have @RequireRoles("staff")',
    );
  });
});
void describe("UsersController — missing context", () => {
  const controller = new UsersController(stubService());
  void test("list throws UnauthorizedException without requestContext", async () => {
    await assert.rejects(() => controller.list({}), UnauthorizedException);
  });
});
void describe("UsersController — list", () => {
  void test("list returns items from service", async () => {
    const controller = new UsersController(stubService());
    const result = await controller.list(makeReq());
    assert.deepStrictEqual(result, STUB_RESULT);
  });
  void test("list forwards requestContext to service", async () => {
    let capturedCtx = null;
    const controller = new UsersController(
      stubService({
        listOrgUsers: (ctx) => {
          capturedCtx = ctx;
          return Promise.resolve(STUB_RESULT);
        },
      }),
    );
    const req = makeReq();
    await controller.list(req);
    assert.deepStrictEqual(capturedCtx, req.requestContext);
  });
});
//# sourceMappingURL=users.controller.test.js.map
