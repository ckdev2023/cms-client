import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { BadRequestException, ConflictException } from "@nestjs/common";
import {
  LEAD_ID,
  leadRow,
  makeCtx,
  makeCustomersService,
  makePool,
  makeTimeline,
  svc,
} from "./leads.admin.service.test-support";

void describe("LeadsAdminService.convertCustomer", () => {
  void test("happy-path: uses provided customerId, updates lead, writes audit", async () => {
    const CUSTOMER_ID = "00000000-0000-4000-8000-c00000000001";
    const calls: { sql: string; params?: unknown[] }[] = [];
    const pool = makePool((sql, params) => {
      calls.push({ sql, params });
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

    const timeline = makeTimeline();
    const result = await svc(pool, timeline).convertCustomer(
      makeCtx(),
      LEAD_ID,
      { customerId: CUSTOMER_ID, confirmDedup: true },
    );

    assert.equal(result.customerId, CUSTOMER_ID);
    assert.equal(result.lead.convertedCustomerId, CUSTOMER_ID);

    const updateCall = calls.find((c) =>
      c.sql.includes("update leads set converted_customer_id"),
    );
    assert.ok(updateCall, "Must update lead's converted_customer_id");
    assert.ok(updateCall.params?.includes(CUSTOMER_ID));

    const auditCall = timeline.calls.find(
      (c) => c.action === "lead.converted_customer",
    );
    assert.ok(auditCall, "Must write converted_customer audit");
  });

  void test("creates customer via CustomersService when customerId not provided", async () => {
    let createCalledWith: unknown;
    const customersService = makeCustomersService({
      create: (_ctx: unknown, input: unknown) => {
        createCalledWith = input;
        return Promise.resolve({
          id: "cust-auto-001",
          type: "individual",
        });
      },
    });

    const pool = makePool((sql) => {
      if (sql.includes("from leads") && sql.includes("limit 1")) {
        return Promise.resolve({
          rows: [
            leadRow({
              status: "signed",
              name: "Tanaka",
              phone: "090-1111",
              email: "t@e.com",
              language: "ja",
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
              converted_customer_id: "cust-auto-001",
            }),
          ],
          rowCount: 1,
        });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    });

    const result = await svc(pool, undefined, customersService).convertCustomer(
      makeCtx(),
      LEAD_ID,
      { confirmDedup: true },
    );

    assert.equal(result.customerId, "cust-auto-001");
    assert.ok(createCalledWith, "Must call CustomersService.create");
    const input = createCalledWith as Record<string, unknown>;
    assert.equal(input.type, "individual");
    const names = input.localizedNames as Record<string, unknown>;
    assert.equal(names.ja, "Tanaka");
    assert.equal(names.defaultLocale, "ja");
  });

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
});
