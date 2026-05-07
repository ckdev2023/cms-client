import { test, describe } from "node:test";
import assert from "node:assert/strict";

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

// ── Dedup query parsing ──

void describe("LeadsAdminController — dedup query parsing", () => {
  void test("forwards phone and email to service", async () => {
    let calledWith: unknown;
    const service = stubService({
      dedup: (_ctx: unknown, input: unknown) => {
        calledWith = input;
        return Promise.resolve({ leads: [], customers: [] });
      },
    });

    const controller = new LeadsAdminController(service);
    await controller.dedup(makeReq() as never, {
      phone: "090-1234-5678",
      email: "test@example.com",
    });

    const input = calledWith as Record<string, unknown>;
    assert.equal(input.phone, "090-1234-5678");
    assert.equal(input.email, "test@example.com");
  });

  void test("forwards leadId to service when provided", async () => {
    const LEAD_UUID = "00000000-0000-4000-8000-1ead00000099";
    let calledWith: unknown;
    const service = stubService({
      dedup: (_ctx: unknown, input: unknown) => {
        calledWith = input;
        return Promise.resolve({ leads: [], customers: [] });
      },
    });

    const controller = new LeadsAdminController(service);
    await controller.dedup(makeReq() as never, {
      phone: "090-1234-5678",
      leadId: LEAD_UUID,
    });

    const input = calledWith as Record<string, unknown>;
    assert.equal(input.leadId, LEAD_UUID);
  });
});
