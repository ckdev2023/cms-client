import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { GroupsController } from "./groups.controller";
const ORG_ID = "00000000-0000-4000-8000-000000000001";
const USER_ID = "00000000-0000-4000-8000-00000000000a";
const GROUP_ID = "00000000-0000-4000-8000-00000000000b";
function makeReq(ctx) {
  return {
    requestContext: ctx ?? {
      orgId: ORG_ID,
      userId: USER_ID,
      role: "manager",
    },
  };
}
const STUB_LIST_RESULT = { items: [], total: 0 };
const STUB_DETAIL = {
  id: GROUP_ID,
  orgId: ORG_ID,
  groupNo: "GRP-001",
  name: "東京一組",
  description: null,
  activeFlag: true,
  createdBy: USER_ID,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedBy: USER_ID,
  updatedAt: "2026-01-01T00:00:00.000Z",
  members: [],
  references: { customerCount: 0, caseCount: 0 },
};
function stubService(overrides) {
  return {
    listGroups: () => Promise.resolve(STUB_LIST_RESULT),
    getGroupDetail: () => Promise.resolve(STUB_DETAIL),
    createGroup: () => Promise.resolve(STUB_DETAIL),
    renameGroup: () => Promise.resolve(STUB_DETAIL),
    disableGroup: () => Promise.resolve(STUB_DETAIL),
    countReferences: () => Promise.resolve({ customerCount: 0, caseCount: 0 }),
    ...overrides,
  };
}
function readControllerSource() {
  return fs.readFileSync(
    path.resolve(import.meta.dirname, "groups.controller.ts"),
    "utf-8",
  );
}
// ── RBAC: every route requires @RequireRoles("manager") ──
void describe("GroupsController — RBAC decorators", () => {
  void test("controller is mounted at groups", () => {
    const src = readControllerSource();
    assert.ok(
      src.includes('@Controller("groups")'),
      'Controller must be at "groups" path',
    );
  });
  const ROUTE_METHODS = ["list", "detail", "create", "rename", "disable"];
  for (const method of ROUTE_METHODS) {
    void test(`${method}() has @RequireRoles("manager") decorator`, () => {
      const src = readControllerSource();
      const methodIdx = src.indexOf(`async ${method}(`);
      assert.ok(methodIdx > 0, `Method ${method} must exist`);
      const decoratorRegion = src.slice(
        Math.max(0, methodIdx - 200),
        methodIdx,
      );
      assert.ok(
        decoratorRegion.includes('@RequireRoles("manager")'),
        `${method}() must have @RequireRoles("manager")`,
      );
    });
  }
});
// ── Missing request context ──
void describe("GroupsController — missing context", () => {
  const controller = new GroupsController(stubService());
  void test("list throws UnauthorizedException without requestContext", async () => {
    await assert.rejects(() => controller.list({}, {}), UnauthorizedException);
  });
  void test("detail throws UnauthorizedException without requestContext", async () => {
    await assert.rejects(
      () => controller.detail({}, GROUP_ID),
      UnauthorizedException,
    );
  });
  void test("create throws UnauthorizedException without requestContext", async () => {
    await assert.rejects(
      () => controller.create({}, { name: "X" }),
      UnauthorizedException,
    );
  });
  void test("rename throws UnauthorizedException without requestContext", async () => {
    await assert.rejects(
      () => controller.rename({}, GROUP_ID, { name: "X" }),
      UnauthorizedException,
    );
  });
  void test("disable throws UnauthorizedException without requestContext", async () => {
    await assert.rejects(
      () => controller.disable({}, GROUP_ID, {}),
      UnauthorizedException,
    );
  });
});
// ── Parameter validation ──
void describe("GroupsController — parameter validation", () => {
  const controller = new GroupsController(stubService());
  const req = makeReq();
  void test("list rejects invalid status filter", async () => {
    await assert.rejects(
      () => controller.list(req, { status: "bogus" }),
      (err) => {
        assert.ok(err instanceof BadRequestException);
        return true;
      },
    );
  });
  void test("list accepts status=active", async () => {
    let capturedInput;
    const svc = stubService({
      listGroups: (_ctx, input) => {
        capturedInput = input;
        return Promise.resolve(STUB_LIST_RESULT);
      },
    });
    const ctrl = new GroupsController(svc);
    await ctrl.list(req, { status: "active" });
    assert.deepEqual(capturedInput, { status: "active" });
  });
  void test("list accepts status=disabled", async () => {
    let capturedInput;
    const svc = stubService({
      listGroups: (_ctx, input) => {
        capturedInput = input;
        return Promise.resolve(STUB_LIST_RESULT);
      },
    });
    const ctrl = new GroupsController(svc);
    await ctrl.list(req, { status: "disabled" });
    assert.deepEqual(capturedInput, { status: "disabled" });
  });
  void test("list accepts empty status (returns all)", async () => {
    let capturedInput;
    const svc = stubService({
      listGroups: (_ctx, input) => {
        capturedInput = input;
        return Promise.resolve(STUB_LIST_RESULT);
      },
    });
    const ctrl = new GroupsController(svc);
    await ctrl.list(req, {});
    assert.deepEqual(capturedInput, { status: undefined });
  });
  void test("create rejects missing name", async () => {
    await assert.rejects(
      () => controller.create(req, {}),
      (err) => {
        assert.ok(err instanceof BadRequestException);
        assert.ok(err.message.includes("name"));
        return true;
      },
    );
  });
  void test("create rejects empty string name", async () => {
    await assert.rejects(
      () => controller.create(req, { name: "" }),
      (err) => {
        assert.ok(err instanceof BadRequestException);
        return true;
      },
    );
  });
  void test("create rejects whitespace-only name", async () => {
    await assert.rejects(
      () => controller.create(req, { name: "   " }),
      (err) => {
        assert.ok(err instanceof BadRequestException);
        return true;
      },
    );
  });
  void test("create rejects non-string name", async () => {
    await assert.rejects(
      () => controller.create(req, { name: 123 }),
      (err) => {
        assert.ok(err instanceof BadRequestException);
        return true;
      },
    );
  });
  void test("create rejects invalid description type", async () => {
    await assert.rejects(
      () => controller.create(req, { name: "OK", description: 123 }),
      (err) => {
        assert.ok(err instanceof BadRequestException);
        return true;
      },
    );
  });
  void test("rename rejects missing name", async () => {
    await assert.rejects(
      () => controller.rename(req, GROUP_ID, {}),
      (err) => {
        assert.ok(err instanceof BadRequestException);
        return true;
      },
    );
  });
  void test("rename rejects empty string name", async () => {
    await assert.rejects(
      () => controller.rename(req, GROUP_ID, { name: "" }),
      (err) => {
        assert.ok(err instanceof BadRequestException);
        return true;
      },
    );
  });
  void test("disable rejects invalid reason type", async () => {
    await assert.rejects(
      () => controller.disable(req, GROUP_ID, { reason: 42 }),
      (err) => {
        assert.ok(err instanceof BadRequestException);
        return true;
      },
    );
  });
});
// ── Happy paths ──
void describe("GroupsController — happy paths", () => {
  const req = makeReq();
  void test("list forwards status and returns result", async () => {
    const expected = {
      items: [
        {
          id: GROUP_ID,
          orgId: ORG_ID,
          groupNo: "GRP-001",
          name: "東京一組",
          description: null,
          activeFlag: true,
          createdAt: "2026-01-01",
          activeCaseCount: 3,
          memberCount: 2,
        },
      ],
      total: 1,
    };
    const svc = stubService({
      listGroups: () => Promise.resolve(expected),
    });
    const ctrl = new GroupsController(svc);
    const result = await ctrl.list(req, { status: "active" });
    assert.deepEqual(result, expected);
  });
  void test("detail returns group detail", async () => {
    const svc = stubService({
      getGroupDetail: () => Promise.resolve(STUB_DETAIL),
    });
    const ctrl = new GroupsController(svc);
    const result = await ctrl.detail(req, GROUP_ID);
    assert.deepEqual(result, STUB_DETAIL);
  });
  void test("detail throws NotFoundException when service returns null", async () => {
    const svc = stubService({
      getGroupDetail: () => Promise.resolve(null),
    });
    const ctrl = new GroupsController(svc);
    await assert.rejects(() => ctrl.detail(req, GROUP_ID), NotFoundException);
  });
  void test("create trims name and forwards to service", async () => {
    let capturedInput;
    const svc = stubService({
      createGroup: (_ctx, input) => {
        capturedInput = input;
        return Promise.resolve(STUB_DETAIL);
      },
    });
    const ctrl = new GroupsController(svc);
    const result = await ctrl.create(req, {
      name: "  新グループ  ",
      description: "説明",
    });
    assert.equal(result.id, GROUP_ID);
    assert.deepEqual(capturedInput, {
      name: "新グループ",
      description: "説明",
    });
  });
  void test("create accepts null description", async () => {
    let capturedInput;
    const svc = stubService({
      createGroup: (_ctx, input) => {
        capturedInput = input;
        return Promise.resolve(STUB_DETAIL);
      },
    });
    const ctrl = new GroupsController(svc);
    await ctrl.create(req, { name: "G", description: null });
    assert.deepEqual(capturedInput, { name: "G", description: null });
  });
  void test("create accepts undefined description", async () => {
    let capturedInput;
    const svc = stubService({
      createGroup: (_ctx, input) => {
        capturedInput = input;
        return Promise.resolve(STUB_DETAIL);
      },
    });
    const ctrl = new GroupsController(svc);
    await ctrl.create(req, { name: "G" });
    assert.deepEqual(capturedInput, { name: "G", description: undefined });
  });
  void test("rename trims name and forwards to service", async () => {
    let capturedId;
    let capturedInput;
    const svc = stubService({
      renameGroup: (_ctx, id, input) => {
        capturedId = id;
        capturedInput = input;
        return Promise.resolve(STUB_DETAIL);
      },
    });
    const ctrl = new GroupsController(svc);
    const result = await ctrl.rename(req, GROUP_ID, {
      name: " 改名後 ",
    });
    assert.equal(result.id, GROUP_ID);
    assert.equal(capturedId, GROUP_ID);
    assert.deepEqual(capturedInput, { name: "改名後" });
  });
  void test("rename throws NotFoundException when service returns null", async () => {
    const svc = stubService({
      renameGroup: () => Promise.resolve(null),
    });
    const ctrl = new GroupsController(svc);
    await assert.rejects(
      () => ctrl.rename(req, GROUP_ID, { name: "X" }),
      NotFoundException,
    );
  });
  void test("disable forwards id and reason to service", async () => {
    let capturedId;
    let capturedInput;
    const svc = stubService({
      disableGroup: (_ctx, id, input) => {
        capturedId = id;
        capturedInput = input;
        return Promise.resolve(STUB_DETAIL);
      },
    });
    const ctrl = new GroupsController(svc);
    const result = await ctrl.disable(req, GROUP_ID, {
      reason: "不要了",
    });
    assert.equal(result.id, GROUP_ID);
    assert.equal(capturedId, GROUP_ID);
    assert.deepEqual(capturedInput, { reason: "不要了" });
  });
  void test("disable works without reason", async () => {
    let capturedInput;
    const svc = stubService({
      disableGroup: (_ctx, _id, input) => {
        capturedInput = input;
        return Promise.resolve(STUB_DETAIL);
      },
    });
    const ctrl = new GroupsController(svc);
    await ctrl.disable(req, GROUP_ID, {});
    assert.deepEqual(capturedInput, { reason: undefined });
  });
  void test("disable throws NotFoundException when service returns null", async () => {
    const svc = stubService({
      disableGroup: () => Promise.resolve(null),
    });
    const ctrl = new GroupsController(svc);
    await assert.rejects(
      () => ctrl.disable(req, GROUP_ID, {}),
      NotFoundException,
    );
  });
});
//# sourceMappingURL=groups.controller.test.js.map
