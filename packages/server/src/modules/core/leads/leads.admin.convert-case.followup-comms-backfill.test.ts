import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  LEAD_ID,
  ORG_A,
  USER_A,
  leadRow,
  makeCtx,
  makeCasesService,
  makePool,
  svc,
} from "./leads.admin.service.test-support";

void describe("LeadsAdminService.convertCase — lead followups → communication_logs", () => {
  const CUSTOMER_ID = "00000000-0000-4000-8000-c00000000001";
  const CASE_ID = "00000000-0000-4000-8000-ca5e00000001";

  void test("backfills communication_logs from lead_followups after convert", async () => {
    const calls: { sql: string; params?: unknown[] }[] = [];
    const createdAt = "2026-05-12T09:35:00.000Z";
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
      if (
        sql.includes("from lead_followups") &&
        sql.includes("where lead_id = $1")
      ) {
        return Promise.resolve({
          rows: [
            {
              channel: "phone",
              summary: "初回电话说明",
              conclusion: "客户理解要件",
              next_action: "补资料",
              next_follow_up_at: null,
              created_by: USER_A,
              created_at: createdAt,
            },
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
      { caseTypeCode: "family_stay", ownerUserId: USER_A },
    );

    const insertCall = calls.find(
      (c) =>
        c.sql.includes("insert into communication_logs") &&
        c.sql.includes("content_summary"),
    );
    assert.ok(insertCall, "Must insert communication_logs for lead followups");
    assert.ok(insertCall.params);
    const params = insertCall.params;
    assert.equal(params[0], ORG_A);
    assert.equal(params[1], CASE_ID);
    assert.equal(params[2], CUSTOMER_ID);
    assert.equal(params[3], "phone");
    assert.equal(params[4], "初回电话说明");
    assert.equal(params[5], "结论：客户理解要件\n下一步：补资料");
    assert.equal(params[6], USER_A);
    assert.equal(params[7], true);
    assert.equal(params[8], null);
    assert.equal(params[9], createdAt);
  });

  void test("maps onsite followup channel to meeting in communication_logs", async () => {
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
      if (sql.includes("from lead_followups")) {
        return Promise.resolve({
          rows: [
            {
              channel: "onsite",
              summary: "面谈",
              conclusion: null,
              next_action: null,
              next_follow_up_at: null,
              created_by: USER_A,
              created_at: "2026-05-12T10:00:00.000Z",
            },
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
      { caseTypeCode: "family_stay", ownerUserId: USER_A },
    );

    const insertCall = calls.find((c) =>
      c.sql.includes("insert into communication_logs"),
    );
    assert.ok(insertCall);
    assert.ok(insertCall.params);
    assert.equal(insertCall.params[3], "meeting");
  });
});
