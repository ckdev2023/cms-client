import test from "node:test";
import assert from "node:assert/strict";

import { PermissionsService } from "../auth/permissions.service";
import { CasesController } from "./cases.controller";
import { CasesService } from "./cases.service";
import type { CaseListInput } from "./cases.types";

const viewerCtxReq = {
  requestContext: {
    orgId: "org-1",
    userId: "user-1",
    role: "viewer" as const,
  },
};

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

void test("CasesController.list passes search param to service", async () => {
  let capturedInput: CaseListInput | undefined;
  const service = {
    list: (_ctx: unknown, input: CaseListInput) => {
      capturedInput = input;
      return Promise.resolve({ items: [], total: 0 });
    },
  } as unknown as CasesService;

  const controller = new CasesController(service, makePermissions());
  await controller.list(viewerCtxReq as never, { search: "VISA" });

  assert.equal(capturedInput?.search, "VISA");
});

void test("CasesController.list passes search to listSummary when view=summary", async () => {
  let capturedInput: CaseListInput | undefined;
  const service = {
    listSummary: (_ctx: unknown, input: CaseListInput) => {
      capturedInput = input;
      return Promise.resolve({ items: [], total: 0, page: 1, limit: 50 });
    },
  } as unknown as CasesService;

  const controller = new CasesController(service, makePermissions());
  await controller.list(viewerCtxReq as never, {
    search: "BMV",
    view: "summary",
  });

  assert.equal(capturedInput?.search, "BMV");
});

void test("CasesController.list omits search when not provided", async () => {
  let capturedInput: CaseListInput | undefined;
  const service = {
    list: (_ctx: unknown, input: CaseListInput) => {
      capturedInput = input;
      return Promise.resolve({ items: [], total: 0 });
    },
  } as unknown as CasesService;

  const controller = new CasesController(service, makePermissions());
  await controller.list(viewerCtxReq as never, {});

  assert.equal(capturedInput?.search, undefined);
});
