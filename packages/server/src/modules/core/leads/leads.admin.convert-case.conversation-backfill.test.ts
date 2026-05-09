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

void describe("LeadsAdminService.convertCase — conversation backfill SQL contract", () => {
  const CUSTOMER_ID = "00000000-0000-4000-8000-c00000000001";
  const CASE_ID = "00000000-0000-4000-8000-ca5e00000001";

  /**
   * 走查发现：旧版 backfillConversationCustomer 只回填 customer_id，导致 lead → case
   * 转化后，与 lead 关联的 conversations 仍 case_id IS NULL，会话详情「关联案件」为空。
   * 修复后 backfillConversationLinks 同时使用 coalesce 写入 customer_id 与 case_id。
   * 这里固化 SQL 形态契约，避免回归。
   */
  void test("backfill SQL writes both customer_id and case_id with coalesce + correct param order", async () => {
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
      { caseTypeCode: "general", ownerUserId: USER_A },
    );

    const backfillCall = calls.find(
      (c) =>
        c.sql.includes("update conversations") && c.sql.includes("customer_id"),
    );
    assert.ok(backfillCall, "Must backfill conversation customer_id");
    assert.ok(
      backfillCall.sql.includes("case_id"),
      "Must also backfill conversation case_id (linked case empty bug)",
    );
    assert.deepEqual(
      backfillCall.params,
      [CUSTOMER_ID, CASE_ID, LEAD_ID],
      "Params must be [customerId, caseId, leadId]",
    );
    assert.ok(
      backfillCall.sql.includes("coalesce(customer_id"),
      "Must coalesce customer_id (no overwrite)",
    );
    assert.ok(
      backfillCall.sql.includes("coalesce(case_id"),
      "Must coalesce case_id (no overwrite)",
    );
  });
});
