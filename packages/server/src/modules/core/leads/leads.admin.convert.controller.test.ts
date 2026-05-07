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

void describe("LeadsAdminController — convertCustomer parsing", () => {
  void test("forwards customerId and confirmDedup to service", async () => {
    let calledWith: unknown;
    const service = stubService({
      convertCustomer: (_ctx: unknown, _id: unknown, input: unknown) => {
        calledWith = input;
        return Promise.resolve({ lead: {}, customerId: "cust-1" });
      },
    });

    const CUSTOMER_ID = "00000000-0000-4000-8000-0000000000c1";
    const controller = new LeadsAdminController(service);
    await controller.convertCustomer(makeReq() as never, "lead-1", {
      customerId: CUSTOMER_ID,
      confirmDedup: true,
    });

    const input = calledWith as Record<string, unknown>;
    assert.equal(input.customerId, CUSTOMER_ID);
    assert.equal(input.confirmDedup, true);
  });

  void test("forwards localizedNames to service", async () => {
    let calledWith: unknown;
    const service = stubService({
      convertCustomer: (_ctx: unknown, _id: unknown, input: unknown) => {
        calledWith = input;
        return Promise.resolve({ lead: {}, customerId: "cust-1" });
      },
    });

    const controller = new LeadsAdminController(service);
    await controller.convertCustomer(makeReq() as never, "lead-1", {
      localizedNames: { zh: "田中", ja: "タナカ", defaultLocale: "ja" },
    });

    const input = calledWith as Record<string, unknown>;
    const names = input.localizedNames as Record<string, unknown>;
    assert.equal(names.zh, "田中");
    assert.equal(names.ja, "タナカ");
    assert.equal(names.defaultLocale, "ja");
  });

  void test("accepts empty body (all optional)", async () => {
    let calledWith: unknown;
    const service = stubService({
      convertCustomer: (_ctx: unknown, _id: unknown, input: unknown) => {
        calledWith = input;
        return Promise.resolve({ lead: {}, customerId: "cust-1" });
      },
    });

    const controller = new LeadsAdminController(service);
    await controller.convertCustomer(makeReq() as never, "lead-1", {});

    const input = calledWith as Record<string, unknown>;
    assert.equal(input.customerId, undefined);
    assert.equal(input.confirmDedup, undefined);
    assert.equal(input.localizedNames, undefined);
  });

  void test("rejects invalid confirmDedup type", async () => {
    const controller = new LeadsAdminController(stubService());
    await assert.rejects(
      () =>
        controller.convertCustomer(makeReq() as never, "lead-1", {
          confirmDedup: "yes",
        }),
      BadRequestException,
    );
  });

  void test("rejects invalid localizedNames.defaultLocale", async () => {
    const controller = new LeadsAdminController(stubService());
    await assert.rejects(
      () =>
        controller.convertCustomer(makeReq() as never, "lead-1", {
          localizedNames: { defaultLocale: "fr" },
        }),
      BadRequestException,
    );
  });

  void test("convertCustomer_returns_CUSTOMER_ALREADY_CONVERTED_code_when_already_converted", async () => {
    const service = stubService({
      convertCustomer: () =>
        Promise.reject(
          new BadRequestException({
            statusCode: 400,
            message: "Lead already has a converted customer",
            code: "CUSTOMER_ALREADY_CONVERTED",
          }),
        ),
    });

    const controller = new LeadsAdminController(service);
    await assert.rejects(
      () =>
        controller.convertCustomer(makeReq() as never, "lead-1", {
          confirmDedup: true,
        }),
      (err: Error) => {
        assert.ok(err instanceof BadRequestException);
        const body = err.getResponse() as Record<string, unknown>;
        assert.equal(body.code, "CUSTOMER_ALREADY_CONVERTED");
        assert.equal(body.statusCode, 400);
        return true;
      },
    );
  });
});
