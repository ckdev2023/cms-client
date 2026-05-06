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
import type { GroupMembersService } from "./groupMembers.service";
import type { GroupsService } from "./groups.service";
import type { GroupDetailDto, GroupListResultDto } from "./groups.types";

const ORG_ID = "00000000-0000-4000-8000-000000000001";
const USER_ID = "00000000-0000-4000-8000-00000000000a";
const GROUP_ID = "00000000-0000-4000-8000-00000000000b";

function makeReq(ctx?: Record<string, unknown>) {
  return {
    requestContext: ctx ?? {
      orgId: ORG_ID,
      userId: USER_ID,
      role: "manager" as const,
    },
  };
}

const STUB_LIST_RESULT: GroupListResultDto = { items: [], total: 0 };

const STUB_DETAIL: GroupDetailDto = {
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

function stubService(overrides?: Record<string, unknown>): GroupsService {
  return {
    listGroups: () => Promise.resolve(STUB_LIST_RESULT),
    getGroupDetail: () => Promise.resolve(STUB_DETAIL),
    createGroup: () => Promise.resolve(STUB_DETAIL),
    renameGroup: () => Promise.resolve(STUB_DETAIL),
    disableGroup: () => Promise.resolve(STUB_DETAIL),
    countReferences: () => Promise.resolve({ customerCount: 0, caseCount: 0 }),
    ...overrides,
  } as unknown as GroupsService;
}

function stubMembersService(
  overrides?: Record<string, unknown>,
): GroupMembersService {
  return {
    addGroupMember: () => Promise.resolve({}),
    removeGroupMember: () => Promise.resolve(),
    ...overrides,
  } as unknown as GroupMembersService;
}

function readControllerSource(): string {
  return fs.readFileSync(
    path.resolve(import.meta.dirname, "groups.controller.ts"),
    "utf-8",
  );
}

// ── Permission decorators ──

void describe("GroupsController — permission decorators", () => {
  void test("controller is mounted at groups", () => {
    const src = readControllerSource();
    assert.ok(
      src.includes('@Controller("groups")'),
      'Controller must be at "groups" path',
    );
  });

  const VIEW_ROUTES = ["list", "detail"];
  const MANAGE_ROUTES = [
    "create",
    "rename",
    "disable",
    "addMember",
    "removeMember",
  ];

  for (const method of VIEW_ROUTES) {
    void test(`${method}() has @RequirePermission(PERMISSION_CODES.GROUP_VIEW)`, () => {
      const src = readControllerSource();
      const methodIdx = src.indexOf(`async ${method}(`);
      assert.ok(methodIdx > 0, `Method ${method} must exist`);
      const decoratorRegion = src.slice(
        Math.max(0, methodIdx - 300),
        methodIdx,
      );
      assert.ok(
        decoratorRegion.includes(
          "@RequirePermission(PERMISSION_CODES.GROUP_VIEW)",
        ),
        `${method}() must have @RequirePermission(PERMISSION_CODES.GROUP_VIEW)`,
      );
    });
  }

  for (const method of MANAGE_ROUTES) {
    void test(`${method}() has @RequirePermission(PERMISSION_CODES.GROUP_MANAGE)`, () => {
      const src = readControllerSource();
      const methodIdx = src.indexOf(`async ${method}(`);
      assert.ok(methodIdx > 0, `Method ${method} must exist`);
      const decoratorRegion = src.slice(
        Math.max(0, methodIdx - 300),
        methodIdx,
      );
      assert.ok(
        decoratorRegion.includes(
          "@RequirePermission(PERMISSION_CODES.GROUP_MANAGE)",
        ),
        `${method}() must have @RequirePermission(PERMISSION_CODES.GROUP_MANAGE)`,
      );
    });
  }
});

// ── Missing request context ──

void describe("GroupsController — missing context", () => {
  const controller = new GroupsController(stubService(), stubMembersService());

  void test("list throws UnauthorizedException without requestContext", async () => {
    await assert.rejects(
      () => controller.list({} as never, {}),
      UnauthorizedException,
    );
  });

  void test("detail throws UnauthorizedException without requestContext", async () => {
    await assert.rejects(
      () => controller.detail({} as never, GROUP_ID),
      UnauthorizedException,
    );
  });

  void test("create throws UnauthorizedException without requestContext", async () => {
    await assert.rejects(
      () => controller.create({} as never, { name: "X" }),
      UnauthorizedException,
    );
  });

  void test("rename throws UnauthorizedException without requestContext", async () => {
    await assert.rejects(
      () => controller.rename({} as never, GROUP_ID, { name: "X" }),
      UnauthorizedException,
    );
  });

  void test("disable throws UnauthorizedException without requestContext", async () => {
    await assert.rejects(
      () => controller.disable({} as never, GROUP_ID, {}),
      UnauthorizedException,
    );
  });
});

// ── Parameter validation ──

void describe("GroupsController — parameter validation", () => {
  const controller = new GroupsController(stubService(), stubMembersService());
  const req = makeReq();

  void test("list rejects invalid status filter", async () => {
    await assert.rejects(
      () => controller.list(req as never, { status: "bogus" }),
      (err) => {
        assert.ok(err instanceof BadRequestException);
        return true;
      },
    );
  });

  void test("list accepts status=active", async () => {
    let capturedInput: unknown;
    const svc = stubService({
      listGroups: (_ctx: unknown, input: unknown) => {
        capturedInput = input;
        return Promise.resolve(STUB_LIST_RESULT);
      },
    });
    const ctrl = new GroupsController(svc, stubMembersService());
    await ctrl.list(req as never, { status: "active" });
    assert.deepEqual(capturedInput, { status: "active" });
  });

  void test("list accepts status=disabled", async () => {
    let capturedInput: unknown;
    const svc = stubService({
      listGroups: (_ctx: unknown, input: unknown) => {
        capturedInput = input;
        return Promise.resolve(STUB_LIST_RESULT);
      },
    });
    const ctrl = new GroupsController(svc, stubMembersService());
    await ctrl.list(req as never, { status: "disabled" });
    assert.deepEqual(capturedInput, { status: "disabled" });
  });

  void test("list accepts empty status (returns all)", async () => {
    let capturedInput: unknown;
    const svc = stubService({
      listGroups: (_ctx: unknown, input: unknown) => {
        capturedInput = input;
        return Promise.resolve(STUB_LIST_RESULT);
      },
    });
    const ctrl = new GroupsController(svc, stubMembersService());
    await ctrl.list(req as never, {});
    assert.deepEqual(capturedInput, { status: undefined });
  });

  void test("create rejects missing name", async () => {
    await assert.rejects(
      () => controller.create(req as never, {}),
      (err) => {
        assert.ok(err instanceof BadRequestException);
        assert.ok((err as Error).message.includes("name"));
        return true;
      },
    );
  });

  void test("create rejects empty string name", async () => {
    await assert.rejects(
      () => controller.create(req as never, { name: "" }),
      (err) => {
        assert.ok(err instanceof BadRequestException);
        return true;
      },
    );
  });

  void test("create rejects whitespace-only name", async () => {
    await assert.rejects(
      () => controller.create(req as never, { name: "   " }),
      (err) => {
        assert.ok(err instanceof BadRequestException);
        return true;
      },
    );
  });

  void test("create rejects non-string name", async () => {
    await assert.rejects(
      () => controller.create(req as never, { name: 123 }),
      (err) => {
        assert.ok(err instanceof BadRequestException);
        return true;
      },
    );
  });

  void test("create rejects invalid description type", async () => {
    await assert.rejects(
      () => controller.create(req as never, { name: "OK", description: 123 }),
      (err) => {
        assert.ok(err instanceof BadRequestException);
        return true;
      },
    );
  });

  void test("rename rejects missing name", async () => {
    await assert.rejects(
      () => controller.rename(req as never, GROUP_ID, {}),
      (err) => {
        assert.ok(err instanceof BadRequestException);
        return true;
      },
    );
  });

  void test("rename rejects empty string name", async () => {
    await assert.rejects(
      () => controller.rename(req as never, GROUP_ID, { name: "" }),
      (err) => {
        assert.ok(err instanceof BadRequestException);
        return true;
      },
    );
  });

  void test("disable rejects invalid reason type", async () => {
    await assert.rejects(
      () => controller.disable(req as never, GROUP_ID, { reason: 42 }),
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
    const expected: GroupListResultDto = {
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
    const ctrl = new GroupsController(svc, stubMembersService());
    const result = await ctrl.list(req as never, { status: "active" });
    assert.deepEqual(result, expected);
  });

  void test("detail returns group detail", async () => {
    const svc = stubService({
      getGroupDetail: () => Promise.resolve(STUB_DETAIL),
    });
    const ctrl = new GroupsController(svc, stubMembersService());
    const result = await ctrl.detail(req as never, GROUP_ID);
    assert.deepEqual(result, STUB_DETAIL);
  });

  void test("detail throws NotFoundException when service returns null", async () => {
    const svc = stubService({
      getGroupDetail: () => Promise.resolve(null),
    });
    const ctrl = new GroupsController(svc, stubMembersService());
    await assert.rejects(
      () => ctrl.detail(req as never, GROUP_ID),
      NotFoundException,
    );
  });

  void test("create trims name and forwards to service", async () => {
    let capturedInput: unknown;
    const svc = stubService({
      createGroup: (_ctx: unknown, input: unknown) => {
        capturedInput = input;
        return Promise.resolve(STUB_DETAIL);
      },
    });
    const ctrl = new GroupsController(svc, stubMembersService());
    const result = await ctrl.create(req as never, {
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
    let capturedInput: unknown;
    const svc = stubService({
      createGroup: (_ctx: unknown, input: unknown) => {
        capturedInput = input;
        return Promise.resolve(STUB_DETAIL);
      },
    });
    const ctrl = new GroupsController(svc, stubMembersService());
    await ctrl.create(req as never, { name: "G", description: null });
    assert.deepEqual(capturedInput, { name: "G", description: null });
  });

  void test("create accepts undefined description", async () => {
    let capturedInput: unknown;
    const svc = stubService({
      createGroup: (_ctx: unknown, input: unknown) => {
        capturedInput = input;
        return Promise.resolve(STUB_DETAIL);
      },
    });
    const ctrl = new GroupsController(svc, stubMembersService());
    await ctrl.create(req as never, { name: "G" });
    assert.deepEqual(capturedInput, { name: "G", description: undefined });
  });

  void test("rename trims name and forwards to service", async () => {
    let capturedId: unknown;
    let capturedInput: unknown;
    const svc = stubService({
      renameGroup: (_ctx: unknown, id: unknown, input: unknown) => {
        capturedId = id;
        capturedInput = input;
        return Promise.resolve(STUB_DETAIL);
      },
    });
    const ctrl = new GroupsController(svc, stubMembersService());
    const result = await ctrl.rename(req as never, GROUP_ID, {
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
    const ctrl = new GroupsController(svc, stubMembersService());
    await assert.rejects(
      () => ctrl.rename(req as never, GROUP_ID, { name: "X" }),
      NotFoundException,
    );
  });

  void test("disable forwards id and reason to service", async () => {
    let capturedId: unknown;
    let capturedInput: unknown;
    const svc = stubService({
      disableGroup: (_ctx: unknown, id: unknown, input: unknown) => {
        capturedId = id;
        capturedInput = input;
        return Promise.resolve(STUB_DETAIL);
      },
    });
    const ctrl = new GroupsController(svc, stubMembersService());
    const result = await ctrl.disable(req as never, GROUP_ID, {
      reason: "不要了",
    });
    assert.equal(result.id, GROUP_ID);
    assert.equal(capturedId, GROUP_ID);
    assert.deepEqual(capturedInput, { reason: "不要了" });
  });

  void test("disable works without reason", async () => {
    let capturedInput: unknown;
    const svc = stubService({
      disableGroup: (_ctx: unknown, _id: unknown, input: unknown) => {
        capturedInput = input;
        return Promise.resolve(STUB_DETAIL);
      },
    });
    const ctrl = new GroupsController(svc, stubMembersService());
    await ctrl.disable(req as never, GROUP_ID, {});
    assert.deepEqual(capturedInput, { reason: undefined });
  });

  void test("disable throws NotFoundException when service returns null", async () => {
    const svc = stubService({
      disableGroup: () => Promise.resolve(null),
    });
    const ctrl = new GroupsController(svc, stubMembersService());
    await assert.rejects(
      () => ctrl.disable(req as never, GROUP_ID, {}),
      NotFoundException,
    );
  });
});
