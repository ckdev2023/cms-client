import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  LEAD_ID,
  USER_A,
  leadRow,
  makeCtx,
  makeCasesService,
  makePool,
  svc,
} from "./leads.admin.service.test-support";

const CUSTOMER_ID = "00000000-0000-4000-8000-c00000000001";
const CASE_ID = "00000000-0000-4000-8000-ca5e00000001";

void describe("LeadsAdminService.convertCase — auto-create primary case_party", () => {
  void test("inserts a primary applicant case_party with linked customer", async () => {
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
        caseTypeCode: "dependent_visa",
        ownerUserId: USER_A,
      },
    );

    const partyInsert = calls.find(
      (c) =>
        c.sql.includes("insert into case_parties") &&
        c.sql.includes("'applicant'") &&
        c.sql.includes("is_primary"),
    );
    assert.ok(
      partyInsert,
      "Must insert a primary applicant case_party on conversion",
    );
    assert.ok(
      partyInsert.params?.includes(CASE_ID),
      "case_party insert must reference the new case",
    );
    assert.ok(
      partyInsert.params?.includes(CUSTOMER_ID),
      "case_party insert must reference the linked customer",
    );
  });

  void test("idempotent: only inserts when no primary party exists", async () => {
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

    const partyInsert = calls.find(
      (c) =>
        c.sql.includes("insert into case_parties") &&
        c.sql.includes("'applicant'"),
    );
    assert.ok(partyInsert, "case_parties insert SQL must be issued");
    assert.match(
      partyInsert.sql,
      /where not exists[\s\S]*is_primary = true/,
      "insert must be guarded by NOT EXISTS to stay idempotent",
    );
  });
});
