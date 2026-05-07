import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { BadRequestException } from "@nestjs/common";

import { LeadsAdminController } from "./leads.admin.controller";
import type { LeadsAdminService } from "./leads.admin.service";
import { CONVERT_CASE_REQUIRES_CUSTOMER_ERROR_CODE } from "./leads.admin.convert-case";

const ORG_ID = "00000000-0000-4000-8000-000000000001";
const USER_ID = "00000000-0000-4000-8000-00000000000a";
const GROUP_ID = "00000000-0000-4000-8000-000000000010";

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

void describe("LeadsAdminController — convertCase parsing", () => {
  void test("requires caseTypeCode field", async () => {
    const controller = new LeadsAdminController(stubService());
    await assert.rejects(
      () =>
        controller.convertCase(makeReq() as never, "lead-1", {
          ownerUserId: USER_ID,
        }),
      BadRequestException,
    );
  });

  void test("requires ownerUserId field", async () => {
    const controller = new LeadsAdminController(stubService());
    await assert.rejects(
      () =>
        controller.convertCase(makeReq() as never, "lead-1", {
          caseTypeCode: "business_manager_visa",
        }),
      BadRequestException,
    );
  });

  void test("forwards all convertCase fields to service", async () => {
    let calledWith: unknown;
    const service = stubService({
      convertCase: (_ctx: unknown, _id: unknown, input: unknown) => {
        calledWith = input;
        return Promise.resolve({ lead: {}, caseId: "case-1" });
      },
    });

    const controller = new LeadsAdminController(service);
    await controller.convertCase(makeReq() as never, "lead-1", {
      caseTypeCode: "business_manager_visa",
      ownerUserId: USER_ID,
      groupId: GROUP_ID,
    });

    const input = calledWith as Record<string, unknown>;
    assert.equal(input.caseTypeCode, "business_manager_visa");
    assert.equal(input.ownerUserId, USER_ID);
    assert.equal(input.groupId, GROUP_ID);
  });

  void test("R2-A-1: rejects catalog short-code ownerUserId with 400", async () => {
    const controller = new LeadsAdminController(stubService());
    await assert.rejects(
      () =>
        controller.convertCase(makeReq() as never, "lead-1", {
          caseTypeCode: "business_manager_visa",
          ownerUserId: "suzuki",
        }),
      (err: unknown) => {
        assert.ok(err instanceof BadRequestException);
        assert.ok(
          err.message.includes("ownerUserId"),
          "Error must mention ownerUserId for client debugging",
        );
        return true;
      },
    );
  });

  void test("R2-A-1: rejects catalog short-code groupId with 400", async () => {
    const controller = new LeadsAdminController(stubService());
    await assert.rejects(
      () =>
        controller.convertCase(makeReq() as never, "lead-1", {
          caseTypeCode: "business_manager_visa",
          ownerUserId: USER_ID,
          groupId: "tokyo-1",
        }),
      (err: unknown) => {
        assert.ok(err instanceof BadRequestException);
        assert.ok(
          err.message.includes("groupId"),
          "Error must mention groupId for client debugging",
        );
        return true;
      },
    );
  });

  void test("groupId defaults to undefined when not provided", async () => {
    let calledWith: unknown;
    const service = stubService({
      convertCase: (_ctx: unknown, _id: unknown, input: unknown) => {
        calledWith = input;
        return Promise.resolve({ lead: {}, caseId: "case-1" });
      },
    });

    const controller = new LeadsAdminController(service);
    await controller.convertCase(makeReq() as never, "lead-1", {
      caseTypeCode: "business_manager_visa",
      ownerUserId: USER_ID,
    });

    const input = calledWith as Record<string, unknown>;
    assert.equal(input.groupId, undefined);
  });

  void test("convert_case_without_customer_returns_structured_error (R3-C-2)", async () => {
    const service = stubService({
      convertCase: () => {
        throw new BadRequestException({
          code: CONVERT_CASE_REQUIRES_CUSTOMER_ERROR_CODE,
          message:
            "Lead must have converted_customer_id; run convert-customer first",
          blockers: [
            {
              code: "MISSING_CONVERTED_CUSTOMER",
              message: "Must convert to customer before creating case",
            },
          ],
        });
      },
    });

    const controller = new LeadsAdminController(service);
    await assert.rejects(
      () =>
        controller.convertCase(makeReq() as never, "lead-1", {
          caseTypeCode: "business_manager_visa",
          ownerUserId: USER_ID,
        }),
      (err: Error) => {
        assert.ok(err instanceof BadRequestException);
        const response = (
          err as unknown as {
            response?: {
              code?: string;
              blockers?: { code: string; message?: string }[];
            };
          }
        ).response;
        assert.ok(response, "should have structured error response");
        assert.equal(response.code, CONVERT_CASE_REQUIRES_CUSTOMER_ERROR_CODE);
        assert.ok(Array.isArray(response.blockers));
        assert.equal(response.blockers.length, 1);
        assert.equal(response.blockers[0].code, "MISSING_CONVERTED_CUSTOMER");
        return true;
      },
    );
  });
});
