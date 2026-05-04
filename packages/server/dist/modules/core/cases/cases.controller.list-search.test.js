import test from "node:test";
import assert from "node:assert/strict";
import { CasesController } from "./cases.controller";
const viewerCtxReq = {
  requestContext: {
    orgId: "org-1",
    userId: "user-1",
    role: "viewer",
  },
};
function makePermissions() {
  return {
    canViewCase: () => true,
    canEditCase: () => true,
    canExportCase: () => true,
    canAuditCase: () => true,
    canCreateCase: () => true,
    canPerformCaseAction: () => true,
  };
}
void test("CasesController.list passes search param to service", async () => {
  let capturedInput;
  const service = {
    list: (_ctx, input) => {
      capturedInput = input;
      return Promise.resolve({ items: [], total: 0 });
    },
  };
  const controller = new CasesController(service, makePermissions());
  await controller.list(viewerCtxReq, { search: "VISA" });
  assert.equal(capturedInput?.search, "VISA");
});
void test("CasesController.list passes search to listSummary when view=summary", async () => {
  let capturedInput;
  const service = {
    listSummary: (_ctx, input) => {
      capturedInput = input;
      return Promise.resolve({ items: [], total: 0, page: 1, limit: 50 });
    },
  };
  const controller = new CasesController(service, makePermissions());
  await controller.list(viewerCtxReq, {
    search: "BMV",
    view: "summary",
  });
  assert.equal(capturedInput?.search, "BMV");
});
void test("CasesController.list omits search when not provided", async () => {
  let capturedInput;
  const service = {
    list: (_ctx, input) => {
      capturedInput = input;
      return Promise.resolve({ items: [], total: 0 });
    },
  };
  const controller = new CasesController(service, makePermissions());
  await controller.list(viewerCtxReq, {});
  assert.equal(capturedInput?.search, undefined);
});
//# sourceMappingURL=cases.controller.list-search.test.js.map
