import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { BadRequestException } from "@nestjs/common";

import { LeadsAdminController } from "./leads.admin.controller";
import type { LeadsAdminService } from "./leads.admin.service";

const ORG_ID = "00000000-0000-4000-8000-000000000001";
const USER_ID = "00000000-0000-4000-8000-00000000000a";
const OWNER_UUID = "00000000-0000-4000-8000-000000000020";
const GROUP_UUID = "00000000-0000-4000-8000-000000000030";

function makeReq() {
  return {
    requestContext: {
      orgId: ORG_ID,
      userId: USER_ID,
      role: "staff" as const,
    },
  };
}

function stubService(): LeadsAdminService {
  return {
    create: () => Promise.resolve({}),
    list: () => Promise.resolve({ items: [], total: 0 }),
    getDetail: () => Promise.resolve({ lead: {} }),
    update: () => Promise.resolve({}),
    transitionStatus: () => Promise.resolve({}),
    addFollowup: () => Promise.resolve({}),
    listFollowups: () => Promise.resolve([]),
    listLogs: () => Promise.resolve([]),
    convertCustomer: () => Promise.resolve({ lead: {}, customerId: "cust-1" }),
    convertCase: () => Promise.resolve({ lead: {}, caseId: "case-1" }),
    bulkAssign: () => Promise.resolve({ updatedCount: 0 }),
    bulkFollowup: () => Promise.resolve({ updatedCount: 0 }),
    bulkStatus: () => Promise.resolve({ updatedCount: 0, errors: [] }),
    bulkTags: () => Promise.resolve({ updatedCount: 0 }),
    bulkExport: () => Promise.resolve([]),
    dedup: () => Promise.resolve({ leads: [], customers: [] }),
  } as unknown as LeadsAdminService;
}

function assertBadRequestMentions(err: unknown, field: string) {
  assert.ok(err instanceof BadRequestException);
  assert.ok(
    err.message.includes(field),
    `Error must mention ${field} for client debugging`,
  );
  return true;
}

void describe("LeadsAdminController — R3-A-1 UUID guard on list filters", () => {
  void test("passes valid UUID ownerUserId and groupId through to service", async () => {
    let received: Record<string, unknown> = {};
    const service = stubService();
    service.list = (_ctx, input) => {
      received = input as Record<string, unknown>;
      return Promise.resolve({ items: [], total: 0 } as never);
    };

    const controller = new LeadsAdminController(service);
    await controller.list(
      makeReq() as never,
      {
        ownerUserId: OWNER_UUID,
        groupId: GROUP_UUID,
      } as never,
    );

    assert.equal(received.ownerUserId, OWNER_UUID);
    assert.equal(received.groupId, GROUP_UUID);
  });

  void test("empty string ownerUserId/groupId are treated as undefined (no filter)", async () => {
    let received: Record<string, unknown> = {};
    const service = stubService();
    service.list = (_ctx, input) => {
      received = input as Record<string, unknown>;
      return Promise.resolve({ items: [], total: 0 } as never);
    };

    const controller = new LeadsAdminController(service);
    await controller.list(
      makeReq() as never,
      {
        ownerUserId: "",
        groupId: "",
      } as never,
    );

    assert.equal(received.ownerUserId, undefined);
    assert.equal(received.groupId, undefined);
  });

  void test("rejects catalog short-code ownerUserId/groupId with 400", async () => {
    const controller = new LeadsAdminController(stubService());

    await assert.rejects(
      () =>
        controller.list(
          makeReq() as never,
          {
            ownerUserId: "suzuki",
          } as never,
        ),
      (err: unknown) => assertBadRequestMentions(err, "ownerUserId"),
    );

    await assert.rejects(
      () =>
        controller.list(
          makeReq() as never,
          {
            groupId: "tokyo-1",
          } as never,
        ),
      (err: unknown) => assertBadRequestMentions(err, "groupId"),
    );
  });

  void test("undefined ownerUserId/groupId are passed as undefined (no filter)", async () => {
    let received: Record<string, unknown> = {};
    const service = stubService();
    service.list = (_ctx, input) => {
      received = input as Record<string, unknown>;
      return Promise.resolve({ items: [], total: 0 } as never);
    };

    const controller = new LeadsAdminController(service);
    await controller.list(makeReq() as never, {} as never);

    assert.equal(received.ownerUserId, undefined);
    assert.equal(received.groupId, undefined);
  });
});
