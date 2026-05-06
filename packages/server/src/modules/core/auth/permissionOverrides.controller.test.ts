import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { BadRequestException, UnauthorizedException } from "@nestjs/common";

import { PermissionOverridesController } from "./permissionOverrides.controller";
import type { PermissionOverridesService } from "./permissionOverrides.service";
import type { PermissionOverrideDto } from "./rolesAdmin.types";

const ORG_ID = "00000000-0000-4000-8000-000000000001";
const ACTOR_ID = "00000000-0000-4000-8000-00000000000a";
const TARGET_USER_ID = "00000000-0000-4000-8000-00000000000b";

function makeReq(overrides?: Record<string, unknown>) {
  return {
    requestContext: {
      orgId: ORG_ID,
      userId: ACTOR_ID,
      role: "owner" as const,
      ...overrides,
    },
  };
}

const STUB_OVERRIDE: PermissionOverrideDto = {
  userId: TARGET_USER_ID,
  permission: "case.export",
  effect: "deny",
  reason: "Temporary restriction",
  grantedBy: ACTOR_ID,
  grantedAt: "2026-01-01T00:00:00.000Z",
  expiresAt: null,
};

function stubService(
  overrides?: Record<string, unknown>,
): PermissionOverridesService {
  return {
    listOverrides: () => Promise.resolve({ items: [STUB_OVERRIDE] }),
    setOverrides: () => Promise.resolve({ items: [STUB_OVERRIDE] }),
    deleteOverride: () => Promise.resolve(undefined),
    ...overrides,
  } as unknown as PermissionOverridesService;
}

// ── Missing request context ──

void describe("PermissionOverridesController — missing context", () => {
  const controller = new PermissionOverridesController(stubService());

  void test("list throws UnauthorizedException", async () => {
    await assert.rejects(
      () => controller.list({} as never, TARGET_USER_ID),
      UnauthorizedException,
    );
  });

  void test("set throws UnauthorizedException", async () => {
    await assert.rejects(
      () => controller.set({} as never, TARGET_USER_ID, { overrides: [] }),
      UnauthorizedException,
    );
  });

  void test("remove throws UnauthorizedException", async () => {
    await assert.rejects(
      () => controller.remove({} as never, TARGET_USER_ID, "case.export"),
      UnauthorizedException,
    );
  });
});

// ── Parameter validation: set ──

void describe("PermissionOverridesController — set validation", () => {
  const controller = new PermissionOverridesController(stubService());
  const req = makeReq();

  void test("rejects non-array overrides", async () => {
    await assert.rejects(
      () =>
        controller.set(req as never, TARGET_USER_ID, {
          overrides: "not-array",
        }),
      BadRequestException,
    );
  });

  void test("rejects missing permission in override item", async () => {
    await assert.rejects(
      () =>
        controller.set(req as never, TARGET_USER_ID, {
          overrides: [{ effect: "deny", reason: "test reason" }],
        }),
      BadRequestException,
    );
  });

  void test("rejects invalid permission code", async () => {
    await assert.rejects(
      () =>
        controller.set(req as never, TARGET_USER_ID, {
          overrides: [
            {
              permission: "invalid.code",
              effect: "deny",
              reason: "test reason",
            },
          ],
        }),
      BadRequestException,
    );
  });

  void test("rejects invalid effect", async () => {
    await assert.rejects(
      () =>
        controller.set(req as never, TARGET_USER_ID, {
          overrides: [
            {
              permission: "case.export",
              effect: "revoke",
              reason: "test reason",
            },
          ],
        }),
      BadRequestException,
    );
  });

  void test("rejects missing reason", async () => {
    await assert.rejects(
      () =>
        controller.set(req as never, TARGET_USER_ID, {
          overrides: [
            {
              permission: "case.export",
              effect: "deny",
            },
          ],
        }),
      BadRequestException,
    );
  });
});

// ── Happy paths ──

void describe("PermissionOverridesController — happy paths", () => {
  const req = makeReq();

  void test("list returns overrides", async () => {
    const ctrl = new PermissionOverridesController(stubService());
    const result = await ctrl.list(req as never, TARGET_USER_ID);
    assert.deepEqual(result, { items: [STUB_OVERRIDE] });
  });

  void test("set forwards validated input", async () => {
    let capturedInput: unknown;
    const svc = stubService({
      setOverrides: (_ctx: unknown, _userId: unknown, input: unknown) => {
        capturedInput = input;
        return Promise.resolve({ items: [] });
      },
    });
    const ctrl = new PermissionOverridesController(svc);
    await ctrl.set(req as never, TARGET_USER_ID, {
      overrides: [
        {
          permission: "case.export",
          effect: "deny",
          reason: "Temp restriction",
        },
      ],
    });
    assert.deepEqual(capturedInput, {
      overrides: [
        {
          permission: "case.export",
          effect: "deny",
          reason: "Temp restriction",
          expiresAt: undefined,
        },
      ],
    });
  });

  void test("set with expiresAt forwards date", async () => {
    let capturedInput: unknown;
    const svc = stubService({
      setOverrides: (_ctx: unknown, _userId: unknown, input: unknown) => {
        capturedInput = input;
        return Promise.resolve({ items: [] });
      },
    });
    const ctrl = new PermissionOverridesController(svc);
    await ctrl.set(req as never, TARGET_USER_ID, {
      overrides: [
        {
          permission: "case.export",
          effect: "grant",
          reason: "Temporary access",
          expiresAt: "2026-12-31T23:59:59Z",
        },
      ],
    });
    const input = capturedInput as {
      overrides: { expiresAt: string }[];
    };
    assert.equal(input.overrides[0].expiresAt, "2026-12-31T23:59:59Z");
  });

  void test("set accepts empty overrides array", async () => {
    let capturedInput: unknown;
    const svc = stubService({
      setOverrides: (_ctx: unknown, _userId: unknown, input: unknown) => {
        capturedInput = input;
        return Promise.resolve({ items: [] });
      },
    });
    const ctrl = new PermissionOverridesController(svc);
    await ctrl.set(req as never, TARGET_USER_ID, {
      overrides: [],
    });
    const input = capturedInput as { overrides: unknown[] };
    assert.deepEqual(input.overrides, []);
  });

  void test("remove returns ok", async () => {
    const ctrl = new PermissionOverridesController(stubService());
    const result = await ctrl.remove(
      req as never,
      TARGET_USER_ID,
      "case.export",
    );
    assert.deepEqual(result, { ok: true });
  });
});
