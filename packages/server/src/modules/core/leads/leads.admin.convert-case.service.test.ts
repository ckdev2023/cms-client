import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { BadRequestException } from "@nestjs/common";
import {
  LEAD_ID,
  USER_A,
  GROUP_A,
  leadRow,
  makeCtx,
  makeCasesService,
  makePool,
  makeTimeline,
  svc,
} from "./leads.admin.service.test-support";

void describe("LeadsAdminService.convertCase", () => {
  const CUSTOMER_ID = "00000000-0000-4000-8000-c00000000001";
  const CASE_ID = "00000000-0000-4000-8000-ca5e00000001";

  void test("happy-path: creates case, updates lead status and converted_case_id, writes audit", async () => {
    const calls: { sql: string; params?: unknown[] }[] = [];
    const pool = makePool((sql, params) => {
      calls.push({ sql, params });
      if (sql.includes("from leads") && sql.includes("limit 1")) {
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
      if (sql.includes("update leads set status = 'converted_case'")) {
        return Promise.resolve({
          rows: [
            leadRow({
              status: "converted_case",
              converted_customer_id: CUSTOMER_ID,
              converted_case_id: CASE_ID,
            }),
          ],
          rowCount: 1,
        });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    });

    const casesService = makeCasesService({
      create: () => Promise.resolve({ id: CASE_ID }),
    });

    const timeline = makeTimeline();
    const result = await svc(
      pool,
      timeline,
      undefined,
      casesService,
    ).convertCase(makeCtx(), LEAD_ID, {
      caseTypeCode: "business_manager_visa",
      ownerUserId: USER_A,
    });

    assert.equal(result.caseId, CASE_ID);
    assert.equal(result.lead.status, "converted_case");
    assert.equal(result.lead.convertedCaseId, CASE_ID);

    const updateCall = calls.find((c) =>
      c.sql.includes("update leads set status = 'converted_case'"),
    );
    assert.ok(updateCall, "Must update lead status to converted_case");
    assert.ok(updateCall.params?.includes(CASE_ID));

    const auditCall = timeline.calls.find(
      (c) => c.action === "lead.converted_case",
    );
    assert.ok(auditCall, "Must write converted_case audit");
    const payload = auditCall.payload as Record<string, unknown>;
    assert.equal(payload.caseId, CASE_ID);
    assert.equal(payload.caseTypeCode, "business_manager_visa");
    assert.equal(payload.isBmv, true);
  });

  void test("rejects when converted_customer_id is null (convert-customer not run)", async () => {
    const pool = makePool((sql) => {
      if (sql.includes("from leads") && sql.includes("limit 1")) {
        return Promise.resolve({
          rows: [leadRow({ status: "following", converted_customer_id: null })],
          rowCount: 1,
        });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    });

    await assert.rejects(
      () =>
        svc(pool).convertCase(makeCtx(), LEAD_ID, {
          caseTypeCode: "general",
          ownerUserId: USER_A,
        }),
      (err: Error) => {
        assert.ok(err instanceof BadRequestException);
        assert.ok(err.message.includes("converted_customer_id"));
        return true;
      },
    );
  });

  void test("rejects when lead status is already converted_case (idempotent guard)", async () => {
    const pool = makePool((sql) => {
      if (sql.includes("from leads") && sql.includes("limit 1")) {
        return Promise.resolve({
          rows: [
            leadRow({
              status: "converted_case",
              converted_customer_id: CUSTOMER_ID,
              converted_case_id: "existing-case",
            }),
          ],
          rowCount: 1,
        });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    });

    await assert.rejects(
      () =>
        svc(pool).convertCase(makeCtx(), LEAD_ID, {
          caseTypeCode: "general",
          ownerUserId: USER_A,
        }),
      (err: Error) => {
        assert.ok(err instanceof BadRequestException);
        assert.ok(err.message.includes("already converted"));
        return true;
      },
    );
  });

  void test("BMV path triggers initializeBmvProfile", async () => {
    const calls: { sql: string; params?: unknown[] }[] = [];
    const pool = makePool((sql, params) => {
      calls.push({ sql, params });
      if (sql.includes("from leads") && sql.includes("limit 1")) {
        return Promise.resolve({
          rows: [
            leadRow({
              status: "signed",
              converted_customer_id: CUSTOMER_ID,
            }),
          ],
          rowCount: 1,
        });
      }
      if (sql.includes("update leads set status = 'converted_case'")) {
        return Promise.resolve({
          rows: [
            leadRow({
              status: "converted_case",
              converted_customer_id: CUSTOMER_ID,
              converted_case_id: CASE_ID,
            }),
          ],
          rowCount: 1,
        });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    });

    const casesService = makeCasesService({
      create: () => Promise.resolve({ id: CASE_ID }),
    });

    await svc(pool, undefined, undefined, casesService).convertCase(
      makeCtx(),
      LEAD_ID,
      {
        caseTypeCode: "business_manager_visa",
        ownerUserId: USER_A,
      },
    );

    const bmvCall = calls.find(
      (c) => c.sql.includes("update customers") && c.sql.includes("bmvProfile"),
    );
    assert.ok(bmvCall, "BMV case must trigger initializeBmvProfile");
  });

  void test("non-BMV path does not trigger initializeBmvProfile", async () => {
    const calls: { sql: string; params?: unknown[] }[] = [];
    const pool = makePool((sql, params) => {
      calls.push({ sql, params });
      if (sql.includes("from leads") && sql.includes("limit 1")) {
        return Promise.resolve({
          rows: [
            leadRow({
              status: "signed",
              converted_customer_id: CUSTOMER_ID,
            }),
          ],
          rowCount: 1,
        });
      }
      if (sql.includes("update leads set status = 'converted_case'")) {
        return Promise.resolve({
          rows: [
            leadRow({
              status: "converted_case",
              converted_customer_id: CUSTOMER_ID,
              converted_case_id: CASE_ID,
            }),
          ],
          rowCount: 1,
        });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    });

    const casesService = makeCasesService({
      create: () => Promise.resolve({ id: CASE_ID }),
    });

    await svc(pool, undefined, undefined, casesService).convertCase(
      makeCtx(),
      LEAD_ID,
      {
        caseTypeCode: "general",
        ownerUserId: USER_A,
      },
    );

    const bmvCall = calls.find(
      (c) => c.sql.includes("update customers") && c.sql.includes("bmvProfile"),
    );
    assert.ok(!bmvCall, "Non-BMV case must NOT trigger initializeBmvProfile");
  });

  void test("conversation backfill runs for all case types", async () => {
    const calls: { sql: string; params?: unknown[] }[] = [];
    const pool = makePool((sql, params) => {
      calls.push({ sql, params });
      if (sql.includes("from leads") && sql.includes("limit 1")) {
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
      if (sql.includes("update leads set status = 'converted_case'")) {
        return Promise.resolve({
          rows: [
            leadRow({
              status: "converted_case",
              converted_customer_id: CUSTOMER_ID,
              converted_case_id: CASE_ID,
            }),
          ],
          rowCount: 1,
        });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    });

    const casesService = makeCasesService({
      create: () => Promise.resolve({ id: CASE_ID }),
    });

    await svc(pool, undefined, undefined, casesService).convertCase(
      makeCtx(),
      LEAD_ID,
      {
        caseTypeCode: "general",
        ownerUserId: USER_A,
      },
    );

    const backfillCall = calls.find(
      (c) =>
        c.sql.includes("update conversations") && c.sql.includes("customer_id"),
    );
    assert.ok(backfillCall, "Must backfill conversation customer_id");
  });

  void test("uses lead.groupId as fallback when groupId not provided", async () => {
    let caseCreateInput: Record<string, unknown> | undefined;
    const pool = makePool((sql) => {
      if (sql.includes("from leads") && sql.includes("limit 1")) {
        return Promise.resolve({
          rows: [
            leadRow({
              status: "following",
              converted_customer_id: CUSTOMER_ID,
              group_id: GROUP_A,
            }),
          ],
          rowCount: 1,
        });
      }
      if (sql.includes("update leads set status = 'converted_case'")) {
        return Promise.resolve({
          rows: [
            leadRow({
              status: "converted_case",
              converted_customer_id: CUSTOMER_ID,
              converted_case_id: CASE_ID,
            }),
          ],
          rowCount: 1,
        });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    });

    const casesService = makeCasesService({
      create: (_ctx: unknown, input: Record<string, unknown>) => {
        caseCreateInput = input;
        return Promise.resolve({ id: CASE_ID });
      },
    });

    await svc(pool, undefined, undefined, casesService).convertCase(
      makeCtx(),
      LEAD_ID,
      {
        caseTypeCode: "general",
        ownerUserId: USER_A,
      },
    );

    assert.ok(caseCreateInput, "Must call CasesService.create");
    assert.equal(caseCreateInput.groupId, GROUP_A);
  });
});
