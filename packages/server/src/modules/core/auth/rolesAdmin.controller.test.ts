import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";

import { RolesAdminController } from "./rolesAdmin.controller";
import type { RolesAdminService } from "./rolesAdmin.service";
import type { RoleDetailDto, RoleDto } from "./rolesAdmin.types";

const ORG_ID = "00000000-0000-4000-8000-000000000001";
const USER_ID = "00000000-0000-4000-8000-00000000000a";
const ROLE_ID = "00000000-0000-4000-8000-00000000000c";

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

const STUB_ROLE: RoleDto = {
  id: ROLE_ID,
  orgId: ORG_ID,
  code: "custom_role",
  name: "Custom Role",
  description: null,
  isSystem: false,
  memberCount: 0,
  createdBy: USER_ID,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const STUB_DETAIL: RoleDetailDto = {
  ...STUB_ROLE,
  permissions: ["case.view", "case.edit"],
};

function stubService(overrides?: Record<string, unknown>): RolesAdminService {
  return {
    listRoles: () => Promise.resolve({ items: [STUB_ROLE] }),
    getRoleDetail: () => Promise.resolve(STUB_DETAIL),
    createRole: () => Promise.resolve(STUB_DETAIL),
    updateRole: () => Promise.resolve(STUB_DETAIL),
    setRolePermissions: () => Promise.resolve(STUB_DETAIL),
    deleteRole: () => Promise.resolve(undefined),
    ...overrides,
  } as unknown as RolesAdminService;
}

// ── Missing request context ──

void describe("RolesAdminController — missing context", () => {
  const controller = new RolesAdminController(stubService());

  void test("list throws UnauthorizedException", async () => {
    await assert.rejects(
      () => controller.list({} as never),
      UnauthorizedException,
    );
  });

  void test("detail throws UnauthorizedException", async () => {
    await assert.rejects(
      () => controller.detail({} as never, ROLE_ID),
      UnauthorizedException,
    );
  });

  void test("create throws UnauthorizedException", async () => {
    await assert.rejects(
      () =>
        controller.create({} as never, {
          code: "x",
          name: "X",
          permissions: [],
        }),
      UnauthorizedException,
    );
  });

  void test("update throws UnauthorizedException", async () => {
    await assert.rejects(
      () => controller.update({} as never, ROLE_ID, { name: "X" }),
      UnauthorizedException,
    );
  });

  void test("setPermissions throws UnauthorizedException", async () => {
    await assert.rejects(
      () =>
        controller.setPermissions({} as never, ROLE_ID, {
          permissions: [],
        }),
      UnauthorizedException,
    );
  });

  void test("remove throws UnauthorizedException", async () => {
    await assert.rejects(
      () => controller.remove({} as never, ROLE_ID),
      UnauthorizedException,
    );
  });
});

// ── Parameter validation: create ──

void describe("RolesAdminController — create validation", () => {
  const controller = new RolesAdminController(stubService());
  const req = makeReq();

  void test("rejects missing code", async () => {
    await assert.rejects(
      () =>
        controller.create(req as never, {
          name: "X",
          permissions: [],
        }),
      BadRequestException,
    );
  });

  void test("rejects missing name", async () => {
    await assert.rejects(
      () =>
        controller.create(req as never, {
          code: "x",
          permissions: [],
        }),
      BadRequestException,
    );
  });

  void test("rejects invalid permission code in array", async () => {
    await assert.rejects(
      () =>
        controller.create(req as never, {
          code: "x",
          name: "X",
          permissions: ["invalid.code"],
        }),
      BadRequestException,
    );
  });

  void test("rejects non-array permissions", async () => {
    await assert.rejects(
      () =>
        controller.create(req as never, {
          code: "x",
          name: "X",
          permissions: "case.view",
        }),
      BadRequestException,
    );
  });
});

// ── Parameter validation: update ──

void describe("RolesAdminController — update validation", () => {
  const controller = new RolesAdminController(stubService());
  const req = makeReq();

  void test("rejects when no fields provided", async () => {
    await assert.rejects(
      () => controller.update(req as never, ROLE_ID, {}),
      BadRequestException,
    );
  });
});

// ── Parameter validation: setPermissions ──

void describe("RolesAdminController — setPermissions validation", () => {
  const controller = new RolesAdminController(stubService());
  const req = makeReq();

  void test("rejects missing permissions", async () => {
    await assert.rejects(
      () => controller.setPermissions(req as never, ROLE_ID, {}),
      BadRequestException,
    );
  });

  void test("rejects invalid permission code", async () => {
    await assert.rejects(
      () =>
        controller.setPermissions(req as never, ROLE_ID, {
          permissions: ["not.valid"],
        }),
      BadRequestException,
    );
  });
});

// ── Happy paths ──

void describe("RolesAdminController — happy paths", () => {
  const req = makeReq();

  void test("list returns roles from service", async () => {
    const ctrl = new RolesAdminController(stubService());
    const result = await ctrl.list(req as never);
    assert.deepEqual(result, { items: [STUB_ROLE] });
  });

  void test("detail returns role detail", async () => {
    const ctrl = new RolesAdminController(stubService());
    const result = await ctrl.detail(req as never, ROLE_ID);
    assert.deepEqual(result, STUB_DETAIL);
  });

  void test("detail throws NotFoundException when not found", async () => {
    const svc = stubService({
      getRoleDetail: () => Promise.resolve(null),
    });
    const ctrl = new RolesAdminController(svc);
    await assert.rejects(
      () => ctrl.detail(req as never, ROLE_ID),
      NotFoundException,
    );
  });

  void test("create forwards validated input to service", async () => {
    let capturedInput: unknown;
    const svc = stubService({
      createRole: (_ctx: unknown, input: unknown) => {
        capturedInput = input;
        return Promise.resolve(STUB_DETAIL);
      },
    });
    const ctrl = new RolesAdminController(svc);
    await ctrl.create(req as never, {
      code: " audit_only ",
      name: " Audit Only ",
      description: " desc ",
      permissions: ["case.view", "case.audit"],
    });
    assert.deepEqual(capturedInput, {
      code: "audit_only",
      name: "Audit Only",
      description: "desc",
      permissions: ["case.view", "case.audit"],
    });
  });

  void test("create defaults permissions to empty array", async () => {
    let capturedInput: unknown;
    const svc = stubService({
      createRole: (_ctx: unknown, input: unknown) => {
        capturedInput = input;
        return Promise.resolve(STUB_DETAIL);
      },
    });
    const ctrl = new RolesAdminController(svc);
    await ctrl.create(req as never, {
      code: "empty",
      name: "Empty",
    });
    const input = capturedInput as { permissions: unknown[] };
    assert.deepEqual(input.permissions, []);
  });

  void test("update forwards name", async () => {
    let capturedInput: unknown;
    const svc = stubService({
      updateRole: (_ctx: unknown, _id: unknown, input: unknown) => {
        capturedInput = input;
        return Promise.resolve(STUB_DETAIL);
      },
    });
    const ctrl = new RolesAdminController(svc);
    await ctrl.update(req as never, ROLE_ID, { name: " New Name " });
    assert.deepEqual(capturedInput, {
      name: "New Name",
      description: undefined,
    });
  });

  void test("update throws NotFoundException when not found", async () => {
    const svc = stubService({
      updateRole: () => Promise.resolve(null),
    });
    const ctrl = new RolesAdminController(svc);
    await assert.rejects(
      () => ctrl.update(req as never, ROLE_ID, { name: "X" }),
      NotFoundException,
    );
  });

  void test("setPermissions forwards valid codes", async () => {
    let capturedInput: unknown;
    const svc = stubService({
      setRolePermissions: (_ctx: unknown, _id: unknown, input: unknown) => {
        capturedInput = input;
        return Promise.resolve(STUB_DETAIL);
      },
    });
    const ctrl = new RolesAdminController(svc);
    await ctrl.setPermissions(req as never, ROLE_ID, {
      permissions: ["case.view", "case.edit"],
    });
    assert.deepEqual(capturedInput, {
      permissions: ["case.view", "case.edit"],
    });
  });

  void test("setPermissions throws NotFoundException when not found", async () => {
    const svc = stubService({
      setRolePermissions: () => Promise.resolve(null),
    });
    const ctrl = new RolesAdminController(svc);
    await assert.rejects(
      () =>
        ctrl.setPermissions(req as never, ROLE_ID, {
          permissions: ["case.view"],
        }),
      NotFoundException,
    );
  });

  void test("remove returns ok", async () => {
    const ctrl = new RolesAdminController(stubService());
    const result = await ctrl.remove(req as never, ROLE_ID);
    assert.deepEqual(result, { ok: true });
  });
});
