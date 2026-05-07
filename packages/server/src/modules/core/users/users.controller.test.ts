import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";

import { UsersController } from "./users.controller";
import type { UsersService } from "./users.service";
import type { EffectivePermissionsService } from "../auth/effective-permissions.service";
import type { UserDetailDto, ResetPasswordResultDto } from "./users.types";

const ORG_ID = "00000000-0000-4000-8000-000000000001";
const USER_ID = "00000000-0000-4000-8000-00000000000a";
const TARGET_ID = "00000000-0000-4000-8000-00000000000b";

function makeReq(overrides?: Record<string, unknown>) {
  return {
    requestContext: {
      orgId: ORG_ID,
      userId: USER_ID,
      role: "owner" as const,
      ...overrides,
    },
  };
}

const STUB_DETAIL: UserDetailDto = {
  id: TARGET_ID,
  name: "田中太郎",
  email: "tanaka@example.com",
  role: "staff",
  roleId: "00000000-0000-4000-8000-0000000000r1",
  status: "active",
  createdBy: USER_ID,
  disabledAt: null,
  passwordSetAt: "2026-01-01T00:00:00.000Z",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const STUB_LIST = {
  items: [
    {
      id: TARGET_ID,
      displayName: "田中太郎",
      email: "tanaka@example.com",
      role: "staff",
      roleId: "00000000-0000-4000-8000-0000000000r1",
      status: "active",
      createdAt: "2026-01-01T00:00:00.000Z",
      disabledAt: null,
    },
  ],
};

function stubService(overrides?: Record<string, unknown>): UsersService {
  return {
    listOrgUsers: () => Promise.resolve(STUB_LIST),
    getUserById: () => Promise.resolve(STUB_DETAIL),
    createUser: () => Promise.resolve(STUB_DETAIL),
    updateUser: () => Promise.resolve(STUB_DETAIL),
    updateUserRole: () => Promise.resolve(STUB_DETAIL),
    disableUser: () => Promise.resolve(STUB_DETAIL),
    activateUser: () => Promise.resolve(STUB_DETAIL),
    resetPassword: () =>
      Promise.resolve({
        temporaryPassword: "abc123",
      } satisfies ResetPasswordResultDto),
    ...overrides,
  } as unknown as UsersService;
}

function stubEP(perms: string[] = []): EffectivePermissionsService {
  return {
    resolve: () => Promise.resolve(new Set(perms)),
    invalidate: () => undefined,
    invalidateAll: () => undefined,
  } as unknown as EffectivePermissionsService;
}

function readControllerSource(): string {
  return fs.readFileSync(
    path.resolve(import.meta.dirname, "users.controller.ts"),
    "utf-8",
  );
}

void describe("UsersController — permission decorators", () => {
  const src = readControllerSource();

  void test('controller is mounted at "users"', () => {
    assert.ok(
      src.includes('@Controller("users")'),
      'Controller must be at "users" path',
    );
  });

  function assertDecorator(method: string, decorator: string) {
    const idx = src.indexOf(`async ${method}(`);
    assert.ok(idx > 0, `Method ${method} must exist`);
    const region = src.slice(Math.max(0, idx - 300), idx);
    assert.ok(region.includes(decorator), `${method}() must have ${decorator}`);
  }

  void test("list() has USER_VIEW", () => {
    assertDecorator("list", "@RequirePermission(PERMISSION_CODES.USER_VIEW)");
  });
  void test("updateRole() has ROLE_ASSIGN", () => {
    assertDecorator(
      "updateRole",
      "@RequirePermission(PERMISSION_CODES.ROLE_ASSIGN)",
    );
  });

  for (const m of [
    "create",
    "update",
    "disable",
    "activate",
    "resetPassword",
  ]) {
    void test(`${m}() has USER_MANAGE`, () => {
      assertDecorator(m, "@RequirePermission(PERMISSION_CODES.USER_MANAGE)");
    });
  }
});

void describe("UsersController — missing context", () => {
  const controller = new UsersController(stubService(), stubEP());

  void test("list throws UnauthorizedException", async () => {
    await assert.rejects(
      () => controller.list({} as never),
      UnauthorizedException,
    );
  });

  void test("create throws UnauthorizedException", async () => {
    await assert.rejects(
      () =>
        controller.create({} as never, {
          name: "X",
          email: "x@example.com",
          role: "staff",
          initialPassword: "pass",
        }),
      UnauthorizedException,
    );
  });

  void test("updateRole throws UnauthorizedException", async () => {
    await assert.rejects(
      () => controller.updateRole({} as never, TARGET_ID, { role: "staff" }),
      UnauthorizedException,
    );
  });

  void test("update throws UnauthorizedException", async () => {
    await assert.rejects(
      () => controller.update({} as never, TARGET_ID, { name: "X" }),
      UnauthorizedException,
    );
  });

  void test("disable throws UnauthorizedException", async () => {
    await assert.rejects(
      () => controller.disable({} as never, TARGET_ID),
      UnauthorizedException,
    );
  });

  void test("activate throws UnauthorizedException", async () => {
    await assert.rejects(
      () => controller.activate({} as never, TARGET_ID),
      UnauthorizedException,
    );
  });

  void test("resetPassword throws UnauthorizedException", async () => {
    await assert.rejects(
      () => controller.resetPassword({} as never, TARGET_ID),
      UnauthorizedException,
    );
  });
});

void describe("UsersController — create validation", () => {
  const controller = new UsersController(stubService(), stubEP());
  const req = makeReq();

  void test("rejects missing name", async () => {
    await assert.rejects(
      () =>
        controller.create(req as never, {
          email: "x@example.com",
          role: "staff",
          initialPassword: "pass",
        }),
      BadRequestException,
    );
  });

  void test("rejects empty name", async () => {
    await assert.rejects(
      () =>
        controller.create(req as never, {
          name: "",
          email: "x@example.com",
          role: "staff",
          initialPassword: "pass",
        }),
      BadRequestException,
    );
  });

  void test("rejects missing email", async () => {
    await assert.rejects(
      () =>
        controller.create(req as never, {
          name: "X",
          role: "staff",
          initialPassword: "pass",
        }),
      BadRequestException,
    );
  });

  void test("rejects missing role", async () => {
    await assert.rejects(
      () =>
        controller.create(req as never, {
          name: "X",
          email: "x@example.com",
          initialPassword: "pass",
        }),
      BadRequestException,
    );
  });

  void test("rejects invalid role value", async () => {
    await assert.rejects(
      () =>
        controller.create(req as never, {
          name: "X",
          email: "x@example.com",
          role: "superadmin",
          initialPassword: "pass",
        }),
      BadRequestException,
    );
  });

  void test("rejects missing initialPassword", async () => {
    await assert.rejects(
      () =>
        controller.create(req as never, {
          name: "X",
          email: "x@example.com",
          role: "staff",
        }),
      BadRequestException,
    );
  });
});

void describe("UsersController — updateRole validation", () => {
  const controller = new UsersController(stubService(), stubEP());
  const req = makeReq();

  void test("rejects missing role", async () => {
    await assert.rejects(
      () => controller.updateRole(req as never, TARGET_ID, {}),
      BadRequestException,
    );
  });

  void test("rejects invalid role", async () => {
    await assert.rejects(
      () =>
        controller.updateRole(req as never, TARGET_ID, { role: "superadmin" }),
      BadRequestException,
    );
  });
});

void describe("UsersController — update validation", () => {
  const controller = new UsersController(stubService(), stubEP());
  const req = makeReq();

  void test("rejects when no fields provided", async () => {
    await assert.rejects(
      () => controller.update(req as never, TARGET_ID, {}),
      BadRequestException,
    );
  });

  void test("rejects empty name string", async () => {
    await assert.rejects(
      () => controller.update(req as never, TARGET_ID, { name: "" }),
      BadRequestException,
    );
  });
});

void describe("UsersController — happy paths", () => {
  const req = makeReq();

  void test("list returns items from service", async () => {
    const ctrl = new UsersController(stubService(), stubEP());
    const result = await ctrl.list(req as never);
    assert.deepEqual(result, STUB_LIST);
  });

  void test("create forwards validated input to service", async () => {
    let capturedInput: unknown;
    const svc = stubService({
      createUser: (_ctx: unknown, input: unknown) => {
        capturedInput = input;
        return Promise.resolve(STUB_DETAIL);
      },
    });
    const ctrl = new UsersController(svc, stubEP());
    const result = await ctrl.create(req as never, {
      name: "  田中太郎  ",
      email: "  tanaka@example.com  ",
      role: "staff",
      initialPassword: "pw1",
      primaryGroupId: "  g1  ",
    });
    assert.equal(result.id, TARGET_ID);
    assert.deepEqual(capturedInput, {
      name: "田中太郎",
      email: "tanaka@example.com",
      role: "staff",
      initialPassword: "pw1",
      primaryGroupId: "g1",
    });
  });

  void test("create ignores blank primaryGroupId", async () => {
    let capturedInput: unknown;
    const svc = stubService({
      createUser: (_ctx: unknown, input: unknown) => {
        capturedInput = input;
        return Promise.resolve(STUB_DETAIL);
      },
    });
    const ctrl = new UsersController(svc, stubEP());
    await ctrl.create(req as never, {
      name: "X",
      email: "x@example.com",
      role: "viewer",
      initialPassword: "secret",
      primaryGroupId: "   ",
    });
    const input = capturedInput as { primaryGroupId?: string };
    assert.equal(input.primaryGroupId, undefined);
  });

  void test("updateRole forwards validated role", async () => {
    let capturedInput: unknown;
    const svc = stubService({
      updateUserRole: (_ctx: unknown, _id: unknown, input: unknown) => {
        capturedInput = input;
        return Promise.resolve(STUB_DETAIL);
      },
    });
    const ctrl = new UsersController(svc, stubEP());
    const result = await ctrl.updateRole(req as never, TARGET_ID, {
      role: "manager",
    });
    assert.equal(result.id, TARGET_ID);
    assert.deepEqual(capturedInput, { role: "manager" });
  });

  void test("updateRole throws NotFoundException when user not found", async () => {
    const svc = stubService({
      updateUserRole: () => Promise.resolve(null),
    });
    const ctrl = new UsersController(svc, stubEP());
    await assert.rejects(
      () => ctrl.updateRole(req as never, TARGET_ID, { role: "staff" }),
      NotFoundException,
    );
  });

  void test("update forwards name and email", async () => {
    let capturedInput: unknown;
    const svc = stubService({
      updateUser: (_ctx: unknown, _id: unknown, input: unknown) => {
        capturedInput = input;
        return Promise.resolve(STUB_DETAIL);
      },
    });
    const ctrl = new UsersController(svc, stubEP());
    const result = await ctrl.update(req as never, TARGET_ID, {
      name: " 新名前 ",
      email: " new@example.com ",
    });
    assert.equal(result.id, TARGET_ID);
    assert.deepEqual(capturedInput, {
      name: "新名前",
      email: "new@example.com",
    });
  });

  void test("update throws NotFoundException when user not found", async () => {
    const svc = stubService({
      updateUser: () => Promise.resolve(null),
    });
    const ctrl = new UsersController(svc, stubEP());
    await assert.rejects(
      () => ctrl.update(req as never, TARGET_ID, { name: "X" }),
      NotFoundException,
    );
  });

  void test("disable returns updated user", async () => {
    const svc = stubService({
      disableUser: () => Promise.resolve(STUB_DETAIL),
    });
    const ctrl = new UsersController(svc, stubEP());
    const result = await ctrl.disable(req as never, TARGET_ID);
    assert.equal(result.id, TARGET_ID);
  });

  void test("disable throws NotFoundException when user not found", async () => {
    const svc = stubService({
      disableUser: () => Promise.resolve(null),
    });
    const ctrl = new UsersController(svc, stubEP());
    await assert.rejects(
      () => ctrl.disable(req as never, TARGET_ID),
      NotFoundException,
    );
  });

  void test("activate returns updated user", async () => {
    const svc = stubService({
      activateUser: () => Promise.resolve(STUB_DETAIL),
    });
    const ctrl = new UsersController(svc, stubEP());
    const result = await ctrl.activate(req as never, TARGET_ID);
    assert.equal(result.id, TARGET_ID);
  });

  void test("activate throws NotFoundException when user not found", async () => {
    const svc = stubService({
      activateUser: () => Promise.resolve(null),
    });
    const ctrl = new UsersController(svc, stubEP());
    await assert.rejects(
      () => ctrl.activate(req as never, TARGET_ID),
      NotFoundException,
    );
  });

  void test("resetPassword returns temporary password", async () => {
    const svc = stubService({
      resetPassword: () => Promise.resolve({ temporaryPassword: "t1" }),
    });
    const ctrl = new UsersController(svc, stubEP());
    const result = await ctrl.resetPassword(req as never, TARGET_ID);
    assert.deepEqual(result, { temporaryPassword: "t1" });
  });
});

void describe("UsersController — myPermissions", () => {
  const req = makeReq();

  void test("returns permissions array and role from EffectivePermissionsService", async () => {
    const epSvc = stubEP(["case.view", "case.edit"]);
    const ctrl = new UsersController(stubService(), epSvc);
    const result = await ctrl.myPermissions(req as never);
    assert.deepEqual(result, {
      permissions: ["case.view", "case.edit"],
      role: "owner",
      userId: USER_ID,
    });
  });

  void test("returns empty array when user has no permissions", async () => {
    const epSvc = stubEP([]);
    const ctrl = new UsersController(stubService(), epSvc);
    const result = await ctrl.myPermissions(req as never);
    assert.deepEqual(result.permissions, []);
  });

  void test("throws UnauthorizedException without context", async () => {
    const ctrl = new UsersController(stubService(), stubEP());
    await assert.rejects(
      () => ctrl.myPermissions({} as never),
      UnauthorizedException,
    );
  });
});
