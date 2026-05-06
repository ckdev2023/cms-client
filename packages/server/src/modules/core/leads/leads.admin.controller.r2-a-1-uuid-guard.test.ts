import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { BadRequestException } from "@nestjs/common";

import { LeadsAdminController } from "./leads.admin.controller";
import type { LeadsAdminService } from "./leads.admin.service";

const ORG_ID = "00000000-0000-4000-8000-000000000001";
const USER_ID = "00000000-0000-4000-8000-00000000000a";
const LEAD_ID = "00000000-0000-4000-8000-000000000099";

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

void describe("LeadsAdminController — R2-A-1 UUID guard on write paths", () => {
  void describe("POST /admin/leads (create)", () => {
    void test("rejects catalog short-code ownerUserId with 400", async () => {
      const controller = new LeadsAdminController(stubService());
      await assert.rejects(
        () =>
          controller.create(makeReq() as never, {
            name: "Lead with bad owner",
            ownerUserId: "suzuki",
          }),
        (err: unknown) => assertBadRequestMentions(err, "ownerUserId"),
      );
    });

    void test("rejects catalog short-code groupId with 400", async () => {
      const controller = new LeadsAdminController(stubService());
      await assert.rejects(
        () =>
          controller.create(makeReq() as never, {
            name: "Lead with bad group",
            groupId: "tokyo-1",
          }),
        (err: unknown) => assertBadRequestMentions(err, "groupId"),
      );
    });

    void test("accepts real UUID values", async () => {
      let received: Record<string, unknown> = {};
      const service = stubService();
      service.create = (_ctx, input) => {
        received = input as Record<string, unknown>;
        return Promise.resolve({} as never);
      };

      const controller = new LeadsAdminController(service);
      await controller.create(makeReq() as never, {
        name: "Valid Lead",
        ownerUserId: USER_ID,
        groupId: ORG_ID,
      });
      assert.equal(received.ownerUserId, USER_ID);
      assert.equal(received.groupId, ORG_ID);
    });
  });

  void describe("PATCH /admin/leads/:id (update)", () => {
    void test("rejects catalog short-code ownerUserId with 400", async () => {
      const controller = new LeadsAdminController(stubService());
      await assert.rejects(
        () =>
          controller.update(makeReq() as never, LEAD_ID, {
            ownerUserId: "tanaka",
          }),
        (err: unknown) => assertBadRequestMentions(err, "ownerUserId"),
      );
    });

    void test("rejects catalog short-code groupId with 400", async () => {
      const controller = new LeadsAdminController(stubService());
      await assert.rejects(
        () =>
          controller.update(makeReq() as never, LEAD_ID, {
            groupId: "tokyo-2",
          }),
        (err: unknown) => assertBadRequestMentions(err, "groupId"),
      );
    });
  });

  void describe("POST /admin/leads/bulk/assign", () => {
    void test("rejects catalog short-code ownerUserId with 400", async () => {
      const controller = new LeadsAdminController(stubService());
      await assert.rejects(
        () =>
          controller.bulkAssign(makeReq() as never, {
            leadIds: [LEAD_ID],
            ownerUserId: "suzuki",
          }),
        (err: unknown) => assertBadRequestMentions(err, "ownerUserId"),
      );
    });

    void test("requires ownerUserId to be present", async () => {
      const controller = new LeadsAdminController(stubService());
      await assert.rejects(
        () =>
          controller.bulkAssign(makeReq() as never, {
            leadIds: [LEAD_ID],
          }),
        (err: unknown) => assertBadRequestMentions(err, "ownerUserId"),
      );
    });
  });

  void describe("POST /admin/leads/:id/convert-customer", () => {
    void test("rejects non-UUID customerId with 400", async () => {
      const controller = new LeadsAdminController(stubService());
      await assert.rejects(
        () =>
          controller.convertCustomer(makeReq() as never, LEAD_ID, {
            customerId: "cust-shortcode",
          }),
        (err: unknown) => assertBadRequestMentions(err, "customerId"),
      );
    });
  });
});
