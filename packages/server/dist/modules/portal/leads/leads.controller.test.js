import test from "node:test";
import assert from "node:assert/strict";
import { UnauthorizedException } from "@nestjs/common";
import { LeadsController } from "./leads.controller";
function stubPortalService(overrides = {}) {
  return {
    list: () => Promise.resolve({ items: [], total: 0 }),
    create: () => Promise.resolve({}),
    get: () => Promise.resolve(null),
    update: () => Promise.resolve({}),
    assign: () => Promise.resolve({}),
    convert: () => Promise.resolve({}),
    ...overrides,
  };
}
function stubAdminService(overrides = {}) {
  return {
    list: () => Promise.resolve({ items: [], total: 0 }),
    ...overrides,
  };
}
void test("LeadsController.list forwards app user requests to portal service", async () => {
  let calledWith;
  const controller = new LeadsController(
    stubPortalService({
      list: (input) => {
        calledWith = input;
        return Promise.resolve({ items: [], total: 0 });
      },
    }),
    stubAdminService(),
  );
  await controller.list(
    { appUserContext: { appUserId: "au-1" } },
    {
      status: "new",
      assignedOrgId: "org-1",
      page: "2",
      limit: "10",
    },
  );
  assert.deepEqual(calledWith, {
    appUserId: "au-1",
    status: "new",
    assignedOrgId: "org-1",
    page: 2,
    limit: 10,
  });
});
void test("LeadsController.list forwards admin requests to admin service", async () => {
  let calledCtx;
  let calledInput;
  const req = {
    requestContext: {
      orgId: "00000000-0000-4000-8000-000000000000",
      userId: "00000000-0000-4000-8000-000000000001",
      role: "staff",
    },
  };
  const controller = new LeadsController(
    stubPortalService(),
    stubAdminService({
      list: (ctx, input) => {
        calledCtx = ctx;
        calledInput = input;
        return Promise.resolve({ items: [], total: 0 });
      },
    }),
  );
  await controller.list(req, {
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
  await assert.rejects(() => controller.list({}, {}), UnauthorizedException);
});
//# sourceMappingURL=leads.controller.test.js.map
