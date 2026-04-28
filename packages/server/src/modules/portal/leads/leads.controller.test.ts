import test from "node:test";
import assert from "node:assert/strict";

import { UnauthorizedException } from "@nestjs/common";

import { LeadsController } from "./leads.controller";
import type { LeadsService } from "./leads.service";
import type { LeadsAdminService } from "../../core/leads/leads.admin.service";

function stubPortalService(
  overrides: Record<string, unknown> = {},
): LeadsService {
  return {
    list: () => Promise.resolve({ items: [], total: 0 }),
    create: () => Promise.resolve({}),
    get: () => Promise.resolve(null),
    update: () => Promise.resolve({}),
    assign: () => Promise.resolve({}),
    convert: () => Promise.resolve({}),
    ...overrides,
  } as unknown as LeadsService;
}

function stubAdminService(
  overrides: Record<string, unknown> = {},
): LeadsAdminService {
  return {
    list: () => Promise.resolve({ items: [], total: 0 }),
    ...overrides,
  } as unknown as LeadsAdminService;
}

void test("LeadsController.list forwards app user requests to portal service", async () => {
  let calledWith: unknown;
  const controller = new LeadsController(
    stubPortalService({
      list: (input: unknown) => {
        calledWith = input;
        return Promise.resolve({ items: [], total: 0 });
      },
    }),
    stubAdminService(),
  );

  await controller.list({ appUserContext: { appUserId: "au-1" } } as never, {
    status: "new",
    assignedOrgId: "org-1",
    page: "2",
    limit: "10",
  });

  assert.deepEqual(calledWith, {
    appUserId: "au-1",
    status: "new",
    assignedOrgId: "org-1",
    page: 2,
    limit: 10,
  });
});

void test("LeadsController.list forwards admin requests to admin service", async () => {
  let calledCtx: unknown;
  let calledInput: unknown;
  const req = {
    requestContext: {
      orgId: "00000000-0000-4000-8000-000000000000",
      userId: "00000000-0000-4000-8000-000000000001",
      role: "staff" as const,
    },
  };
  const controller = new LeadsController(
    stubPortalService(),
    stubAdminService({
      list: (ctx: unknown, input: unknown) => {
        calledCtx = ctx;
        calledInput = input;
        return Promise.resolve({ items: [], total: 0 });
      },
    }),
  );

  await controller.list(req as never, {
    scope: "all",
    search: "tanaka",
    ownerUserId: "user-2",
    groupId: "group-1",
    businessType: "bmv",
    dateFrom: "2026-01-01",
    dateTo: "2026-01-31",
    page: "3",
    limit: "25",
  });

  assert.deepEqual(calledCtx, req.requestContext);
  assert.deepEqual(calledInput, {
    scope: "all",
    search: "tanaka",
    status: undefined,
    ownerUserId: "user-2",
    groupId: "group-1",
    businessType: "bmv",
    dateFrom: "2026-01-01",
    dateTo: "2026-01-31",
    page: 3,
    limit: 25,
  });
});

void test("LeadsController.list rejects when neither app user nor admin context exists", async () => {
  const controller = new LeadsController(
    stubPortalService(),
    stubAdminService(),
  );
  await assert.rejects(
    () => controller.list({} as never, {}),
    UnauthorizedException,
  );
});
