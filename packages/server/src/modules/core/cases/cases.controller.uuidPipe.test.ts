import test from "node:test";
import assert from "node:assert/strict";
import { ParseUUIDPipe, NotFoundException } from "@nestjs/common";

import { PermissionsService } from "../auth/permissions.service";
import { CasesController } from "./cases.controller";
import { CasesService } from "./cases.service";

const pipe = new ParseUUIDPipe({ version: "4" });

const VALID_UUID_V4 = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";

const paramMeta = { type: "param" as const, metatype: String, data: "id" };

function makePermissions(): PermissionsService {
  return {
    canViewCase: () => true,
    canEditCase: () => true,
    canExportCase: () => true,
    canAuditCase: () => true,
    canCreateCase: () => true,
    canPerformCaseAction: () => true,
  } as unknown as PermissionsService;
}

const staffReq = {
  requestContext: {
    orgId: "org-1",
    userId: "user-1",
    role: "staff" as const,
  },
};

// ---------------------------------------------------------------------------
// ParseUUIDPipe v4 — rejects non-UUID → 400
// ---------------------------------------------------------------------------

void test("ParseUUIDPipe rejects plain string", async () => {
  await assert.rejects(
    () => pipe.transform("not-a-uuid", paramMeta),
    (err: Error) => {
      assert.ok("getStatus" in err);
      assert.equal((err as { getStatus(): number }).getStatus(), 400);
      return true;
    },
  );
});

void test("ParseUUIDPipe rejects numeric string", async () => {
  await assert.rejects(
    () => pipe.transform("12345", paramMeta),
    (err: Error) => {
      assert.ok("getStatus" in err);
      assert.equal((err as { getStatus(): number }).getStatus(), 400);
      return true;
    },
  );
});

void test("ParseUUIDPipe rejects empty string", async () => {
  await assert.rejects(
    () => pipe.transform("", paramMeta),
    (err: Error) => {
      assert.ok("getStatus" in err);
      assert.equal((err as { getStatus(): number }).getStatus(), 400);
      return true;
    },
  );
});

void test("ParseUUIDPipe rejects non-v4 UUID (nil UUID)", async () => {
  await assert.rejects(
    () => pipe.transform("00000000-0000-0000-0000-000000000000", paramMeta),
    (err: Error) => {
      assert.ok("getStatus" in err);
      assert.equal((err as { getStatus(): number }).getStatus(), 400);
      return true;
    },
  );
});

// ---------------------------------------------------------------------------
// ParseUUIDPipe v4 — accepts valid v4 UUID
// ---------------------------------------------------------------------------

void test("ParseUUIDPipe accepts valid v4 UUID", async () => {
  const result = await pipe.transform(VALID_UUID_V4, paramMeta);
  assert.equal(result, VALID_UUID_V4);
});

// ---------------------------------------------------------------------------
// Controller: valid UUID that does not exist → 404
// ---------------------------------------------------------------------------

void test("getAggregate: valid UUID not found → NotFoundException", async () => {
  const service = {
    getDetailAggregate: () => Promise.resolve(null),
  } as unknown as CasesService;

  const controller = new CasesController(service, makePermissions());

  await assert.rejects(
    () => controller.getAggregate(staffReq as never, VALID_UUID_V4),
    NotFoundException,
  );
});

void test("get: valid UUID not found → BadRequestException('Case not found')", async () => {
  const service = {
    get: () => Promise.resolve(null),
  } as unknown as CasesService;

  const controller = new CasesController(service, makePermissions());

  await assert.rejects(
    () => controller.get(staffReq as never, VALID_UUID_V4),
    (err: Error) => {
      assert.ok("getStatus" in err);
      assert.equal((err as { getStatus(): number }).getStatus(), 400);
      assert.ok(err.message.includes("Case not found"));
      return true;
    },
  );
});
