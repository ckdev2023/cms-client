import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { BadRequestException } from "@nestjs/common";

import { LeadsAdminController } from "./leads.admin.controller";
import type { LeadsAdminService } from "./leads.admin.service";

const ORG_ID = "00000000-0000-4000-8000-000000000001";
const USER_ID = "00000000-0000-4000-8000-00000000000a";

function makeReq() {
  return {
    requestContext: {
      orgId: ORG_ID,
      userId: USER_ID,
      role: "staff" as const,
    },
  };
}

function stubService(overrides?: Record<string, unknown>): LeadsAdminService {
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
    ...overrides,
  } as unknown as LeadsAdminService;
}

void describe("LeadsAdminController — list tags query parsing", () => {
  void test("forwards comma-separated tags to service", async () => {
    let calledWith: unknown;
    const service = stubService({
      list: (_ctx: unknown, input: unknown) => {
        calledWith = input;
        return Promise.resolve({ items: [], total: 0 });
      },
    });

    const controller = new LeadsAdminController(service);
    await controller.list(makeReq() as never, { tags: "VIP,urgent" });

    const input = calledWith as Record<string, unknown>;
    assert.deepEqual(input.tags, ["VIP", "urgent"]);
  });

  void test("forwards array tags to service", async () => {
    let calledWith: unknown;
    const service = stubService({
      list: (_ctx: unknown, input: unknown) => {
        calledWith = input;
        return Promise.resolve({ items: [], total: 0 });
      },
    });

    const controller = new LeadsAdminController(service);
    await controller.list(makeReq() as never, { tags: ["VIP", "urgent"] });

    const input = calledWith as Record<string, unknown>;
    assert.deepEqual(input.tags, ["VIP", "urgent"]);
  });

  void test("undefined tags results in undefined", async () => {
    let calledWith: unknown;
    const service = stubService({
      list: (_ctx: unknown, input: unknown) => {
        calledWith = input;
        return Promise.resolve({ items: [], total: 0 });
      },
    });

    const controller = new LeadsAdminController(service);
    await controller.list(makeReq() as never, {});

    const input = calledWith as Record<string, unknown>;
    assert.equal(input.tags, undefined);
  });

  void test("empty string tags results in undefined", async () => {
    let calledWith: unknown;
    const service = stubService({
      list: (_ctx: unknown, input: unknown) => {
        calledWith = input;
        return Promise.resolve({ items: [], total: 0 });
      },
    });

    const controller = new LeadsAdminController(service);
    await controller.list(makeReq() as never, { tags: "" });

    const input = calledWith as Record<string, unknown>;
    assert.equal(input.tags, undefined);
  });

  void test("rejects non-string items in tags array", async () => {
    const controller = new LeadsAdminController(stubService());
    await assert.rejects(
      () => controller.list(makeReq() as never, { tags: [123] }),
      BadRequestException,
    );
  });

  void test("deduplicates tags", async () => {
    let calledWith: unknown;
    const service = stubService({
      list: (_ctx: unknown, input: unknown) => {
        calledWith = input;
        return Promise.resolve({ items: [], total: 0 });
      },
    });

    const controller = new LeadsAdminController(service);
    await controller.list(makeReq() as never, { tags: "VIP,VIP,urgent" });

    const input = calledWith as Record<string, unknown>;
    assert.deepEqual(input.tags, ["VIP", "urgent"]);
  });
});
