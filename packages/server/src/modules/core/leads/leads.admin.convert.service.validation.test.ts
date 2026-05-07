import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { BadRequestException, ConflictException } from "@nestjs/common";
import {
  LEAD_ID,
  leadRow,
  makeCtx,
  makeCustomersService,
  makePool,
  svc,
} from "./leads.admin.service.test-support";
import { mapIntendedCaseTypeToCustomerVisaType } from "./leads.admin.convert";

void describe("LeadsAdminService.convertCustomer – validation & visa", () => {
  void test("rejects when lead status is lost", async () => {
    const pool = makePool((sql) => {
      if (sql.includes("from leads") && sql.includes("limit 1")) {
        return Promise.resolve({
          rows: [leadRow({ status: "lost" })],
          rowCount: 1,
        });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    });

    await assert.rejects(
      () =>
        svc(pool).convertCustomer(makeCtx(), LEAD_ID, {
          confirmDedup: true,
        }),
      (err: Error) => {
        assert.ok(err instanceof BadRequestException);
        assert.ok(err.message.includes("not convertible"));
        return true;
      },
    );
  });

  void test("rejects when lead already has converted_customer_id with CUSTOMER_ALREADY_CONVERTED code", async () => {
    const pool = makePool((sql) => {
      if (sql.includes("from leads") && sql.includes("limit 1")) {
        return Promise.resolve({
          rows: [
            leadRow({
              status: "following",
              converted_customer_id: "existing-cust",
            }),
          ],
          rowCount: 1,
        });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    });

    await assert.rejects(
      () =>
        svc(pool).convertCustomer(makeCtx(), LEAD_ID, {
          confirmDedup: true,
        }),
      (err: Error) => {
        assert.ok(err instanceof BadRequestException);
        assert.ok(err.message.includes("already has a converted customer"));
        const body = err.getResponse() as Record<string, unknown>;
        assert.equal(body.code, "CUSTOMER_ALREADY_CONVERTED");
        return true;
      },
    );
  });

  void test("dedup hit without confirmDedup throws 409 ConflictException", async () => {
    const queryFn = (sql: string) => {
      if (sql.includes("from leads") && sql.includes("limit 1")) {
        return Promise.resolve({
          rows: [leadRow({ status: "following" })],
          rowCount: 1,
        });
      }
      if (sql.includes("from customers") && sql.includes("org_id")) {
        return Promise.resolve({
          rows: [
            {
              id: "dup-cust-1",
              base_profile: { name: "Dup", phone: "090-1234-5678" },
            },
          ],
          rowCount: 1,
        });
      }
      if (sql.includes("from contact_persons")) {
        return Promise.resolve({ rows: [], rowCount: 0 });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    };
    const pool = makePool(queryFn);
    (pool as unknown as Record<string, unknown>).query = queryFn;

    await assert.rejects(
      () => svc(pool).convertCustomer(makeCtx(), LEAD_ID, {}),
      (err: Error) => {
        assert.ok(err instanceof ConflictException);
        return true;
      },
    );
  });

  void test("dedup hit with confirmDedup=true proceeds", async () => {
    const CUSTOMER_ID = "00000000-0000-4000-8000-c00000000002";
    const pool = makePool((sql) => {
      if (sql.includes("from leads") && sql.includes("limit 1")) {
        return Promise.resolve({
          rows: [leadRow({ status: "following" })],
          rowCount: 1,
        });
      }
      if (sql.includes("update leads set converted_customer_id")) {
        return Promise.resolve({
          rows: [
            leadRow({
              status: "following",
              converted_customer_id: CUSTOMER_ID,
            }),
          ],
          rowCount: 1,
        });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    });

    const result = await svc(pool).convertCustomer(makeCtx(), LEAD_ID, {
      customerId: CUSTOMER_ID,
      confirmDedup: true,
    });
    assert.equal(result.customerId, CUSTOMER_ID);
  });

  void test("convert writes visaType=business_manager when intendedCaseType is business_manager_visa", async () => {
    let createCalledWith: unknown;
    const customersService = makeCustomersService({
      create: (_ctx: unknown, input: unknown) => {
        createCalledWith = input;
        return Promise.resolve({ id: "cust-visa-001", type: "individual" });
      },
    });

    const pool = makePool((sql) => {
      if (sql.includes("from leads") && sql.includes("limit 1")) {
        return Promise.resolve({
          rows: [
            leadRow({
              status: "signed",
              name: "BMV Lead",
              intended_case_type: "business_manager_visa",
            }),
          ],
          rowCount: 1,
        });
      }
      if (
        sql.includes("from customers") ||
        sql.includes("from contact_persons")
      ) {
        return Promise.resolve({ rows: [], rowCount: 0 });
      }
      if (sql.includes("update leads set converted_customer_id")) {
        return Promise.resolve({
          rows: [
            leadRow({
              status: "signed",
              converted_customer_id: "cust-visa-001",
            }),
          ],
          rowCount: 1,
        });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    });

    await svc(pool, undefined, customersService).convertCustomer(
      makeCtx(),
      LEAD_ID,
      { confirmDedup: true },
    );

    assert.ok(createCalledWith, "Must call CustomersService.create");
    const input = createCalledWith as Record<string, unknown>;
    const bp = input.baseProfile as Record<string, unknown>;
    assert.equal(bp.visaType, "business_manager");
  });

  void test("convert omits visaType when intendedCaseType has no mapping", async () => {
    let createCalledWith: unknown;
    const customersService = makeCustomersService({
      create: (_ctx: unknown, input: unknown) => {
        createCalledWith = input;
        return Promise.resolve({ id: "cust-visa-002", type: "individual" });
      },
    });

    const pool = makePool((sql) => {
      if (sql.includes("from leads") && sql.includes("limit 1")) {
        return Promise.resolve({
          rows: [
            leadRow({
              status: "signed",
              name: "Unknown Type Lead",
              intended_case_type: "unknown_visa_xyz",
            }),
          ],
          rowCount: 1,
        });
      }
      if (
        sql.includes("from customers") ||
        sql.includes("from contact_persons")
      ) {
        return Promise.resolve({ rows: [], rowCount: 0 });
      }
      if (sql.includes("update leads set converted_customer_id")) {
        return Promise.resolve({
          rows: [
            leadRow({
              status: "signed",
              converted_customer_id: "cust-visa-002",
            }),
          ],
          rowCount: 1,
        });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    });

    await svc(pool, undefined, customersService).convertCustomer(
      makeCtx(),
      LEAD_ID,
      { confirmDedup: true },
    );

    assert.ok(createCalledWith, "Must call CustomersService.create");
    const input = createCalledWith as Record<string, unknown>;
    const bp = input.baseProfile as Record<string, unknown>;
    assert.equal("visaType" in bp, false);
  });

  void test("convert omits visaType when intendedCaseType is null", async () => {
    let createCalledWith: unknown;
    const customersService = makeCustomersService({
      create: (_ctx: unknown, input: unknown) => {
        createCalledWith = input;
        return Promise.resolve({ id: "cust-visa-003", type: "individual" });
      },
    });

    const pool = makePool((sql) => {
      if (sql.includes("from leads") && sql.includes("limit 1")) {
        return Promise.resolve({
          rows: [
            leadRow({
              status: "signed",
              name: "No Case Type",
              intended_case_type: null,
            }),
          ],
          rowCount: 1,
        });
      }
      if (
        sql.includes("from customers") ||
        sql.includes("from contact_persons")
      ) {
        return Promise.resolve({ rows: [], rowCount: 0 });
      }
      if (sql.includes("update leads set converted_customer_id")) {
        return Promise.resolve({
          rows: [
            leadRow({
              status: "signed",
              converted_customer_id: "cust-visa-003",
            }),
          ],
          rowCount: 1,
        });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    });

    await svc(pool, undefined, customersService).convertCustomer(
      makeCtx(),
      LEAD_ID,
      { confirmDedup: true },
    );

    assert.ok(createCalledWith, "Must call CustomersService.create");
    const input = createCalledWith as Record<string, unknown>;
    const bp = input.baseProfile as Record<string, unknown>;
    assert.equal("visaType" in bp, false);
  });
});

void describe("mapIntendedCaseTypeToCustomerVisaType", () => {
  void test("business_manager_visa → business_manager", () => {
    assert.equal(
      mapIntendedCaseTypeToCustomerVisaType("business_manager_visa"),
      "business_manager",
    );
  });

  void test("business-management-visa → business_manager", () => {
    assert.equal(
      mapIntendedCaseTypeToCustomerVisaType("business-management-visa"),
      "business_manager",
    );
  });

  void test("biz_mgmt prefix → business_manager", () => {
    assert.equal(
      mapIntendedCaseTypeToCustomerVisaType("biz_mgmt_4m"),
      "business_manager",
    );
    assert.equal(
      mapIntendedCaseTypeToCustomerVisaType("biz_mgmt_1y"),
      "business_manager",
    );
    assert.equal(
      mapIntendedCaseTypeToCustomerVisaType("biz_mgmt_renewal"),
      "business_manager",
    );
  });

  void test("work → engineer_specialist", () => {
    assert.equal(
      mapIntendedCaseTypeToCustomerVisaType("work"),
      "engineer_specialist",
    );
  });

  void test("work-visa → engineer_specialist", () => {
    assert.equal(
      mapIntendedCaseTypeToCustomerVisaType("work-visa"),
      "engineer_specialist",
    );
  });

  void test("dependent_visa → dependent", () => {
    assert.equal(
      mapIntendedCaseTypeToCustomerVisaType("dependent_visa"),
      "dependent",
    );
  });

  void test("family-stay → dependent", () => {
    assert.equal(
      mapIntendedCaseTypeToCustomerVisaType("family-stay"),
      "dependent",
    );
  });

  void test("permanent → permanent_resident", () => {
    assert.equal(
      mapIntendedCaseTypeToCustomerVisaType("permanent"),
      "permanent_resident",
    );
  });

  void test("unknown value → undefined", () => {
    assert.equal(
      mapIntendedCaseTypeToCustomerVisaType("something_unknown"),
      undefined,
    );
  });
});
