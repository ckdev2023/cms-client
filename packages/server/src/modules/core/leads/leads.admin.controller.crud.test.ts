import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { BadRequestException } from "@nestjs/common";

import { LeadsAdminController } from "./leads.admin.controller";
import type { LeadsAdminService } from "./leads.admin.service";

const ORG_ID = "00000000-0000-4000-8000-000000000001";
const USER_ID = "00000000-0000-4000-8000-00000000000a";

function makeReq(ctx?: Record<string, unknown>) {
  return {
    requestContext: ctx ?? {
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

void describe("LeadsAdminController — create body parsing", () => {
  void test("requires name field (missing or blank)", async () => {
    const c = new LeadsAdminController(stubService());
    await assert.rejects(
      () => c.create(makeReq() as never, { phone: "090" }),
      BadRequestException,
    );
    await assert.rejects(
      () => c.create(makeReq() as never, { name: "  " }),
      BadRequestException,
    );
  });

  void test("forwards all create fields to service", async () => {
    let calledWith: unknown;
    const service = stubService({
      create: (_ctx: unknown, input: unknown) => {
        calledWith = input;
        return Promise.resolve({});
      },
    });

    const controller = new LeadsAdminController(service);
    await controller.create(makeReq() as never, {
      name: "Tanaka Taro",
      phone: "090-1111-2222",
      email: "tanaka@example.com",
      sourceChannel: "web",
      referrer: "Google",
      intendedCaseType: "business_manager_visa",
      ownerUserId: USER_ID,
      note: "VIP lead",
      language: "ja",
    });

    const input = calledWith as Record<string, unknown>;
    assert.equal(input.name, "Tanaka Taro");
    assert.equal(input.phone, "090-1111-2222");
    assert.equal(input.email, "tanaka@example.com");
    assert.equal(input.sourceChannel, "web");
    assert.equal(input.referrer, "Google");
    assert.equal(input.intendedCaseType, "business_manager_visa");
    assert.equal(input.ownerUserId, USER_ID);
    assert.equal(input.note, "VIP lead");
    assert.equal(input.language, "ja");
  });

  void test("optional fields default to undefined", async () => {
    let calledWith: unknown;
    const service = stubService({
      create: (_ctx: unknown, input: unknown) => {
        calledWith = input;
        return Promise.resolve({});
      },
    });

    const controller = new LeadsAdminController(service);
    await controller.create(makeReq() as never, { name: "Minimal Lead" });

    const input = calledWith as Record<string, unknown>;
    assert.equal(input.name, "Minimal Lead");
    assert.equal(input.phone, undefined);
    assert.equal(input.email, undefined);
    assert.equal(input.ownerUserId, undefined);
  });
});

void describe("LeadsAdminController — update body parsing", () => {
  void test("forwards updatable fields to service", async () => {
    let calledWith: unknown;
    const service = stubService({
      update: (_ctx: unknown, _id: unknown, input: unknown) => {
        calledWith = input;
        return Promise.resolve({});
      },
    });

    const controller = new LeadsAdminController(service);
    await controller.update(makeReq() as never, "lead-1", {
      name: "New Name",
      phone: "080-9999-0000",
      quoteAmount: 150000,
    });

    const input = calledWith as Record<string, unknown>;
    assert.equal(input.name, "New Name");
    assert.equal(input.phone, "080-9999-0000");
    assert.equal(input.quoteAmount, 150000);
  });

  void test("rejects non-string field for string inputs", async () => {
    const controller = new LeadsAdminController(stubService());
    await assert.rejects(
      () =>
        controller.update(makeReq() as never, "lead-1", {
          name: 12345 as unknown,
        }),
      BadRequestException,
    );
  });
});

void describe("LeadsAdminController — getDetail convertedCustomer", () => {
  void test("getDetail_returnsConvertedCustomer_withCustomerNoAndGroup", async () => {
    const expectedCustomer = {
      id: "00000000-0000-4000-8000-cust00000001",
      customerNo: "CUS-202605-0001",
      displayName: "田中太郎",
      group: { id: "grp-001", name: "東京オフィス" },
      convertedAt: "2026-05-07T10:00:00.000Z",
    };
    const service = stubService({
      getDetail: () =>
        Promise.resolve({
          lead: { id: "lead-1", status: "signed" },
          followups: [],
          logs: [],
          dedupHints: { leads: [], customers: [] },
          convertedCustomer: expectedCustomer,
          convertedCase: null,
        }),
    });

    const controller = new LeadsAdminController(service);
    const result = (await controller.getDetail(
      makeReq() as never,
      "lead-1",
    )) as Record<string, unknown>;

    const cc = result.convertedCustomer as Record<string, unknown>;
    assert.equal(cc.id, expectedCustomer.id);
    assert.equal(cc.customerNo, "CUS-202605-0001");
    assert.equal(cc.displayName, "田中太郎");

    const group = cc.group as { id: string; name: string };
    assert.equal(group.id, "grp-001");
    assert.equal(group.name, "東京オフィス");

    assert.equal(cc.convertedAt, "2026-05-07T10:00:00.000Z");
  });

  void test("getDetail_returnsNullConvertedCustomer_whenNotConverted", async () => {
    const service = stubService({
      getDetail: () =>
        Promise.resolve({
          lead: { id: "lead-2", status: "new" },
          followups: [],
          logs: [],
          dedupHints: { leads: [], customers: [] },
          convertedCustomer: null,
          convertedCase: null,
        }),
    });

    const controller = new LeadsAdminController(service);
    const result = (await controller.getDetail(
      makeReq() as never,
      "lead-2",
    )) as Record<string, unknown>;

    assert.equal(result.convertedCustomer, null);
  });
});
