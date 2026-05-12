import { test, describe } from "node:test";
import assert from "node:assert/strict";

import type { CasesService } from "../cases/cases.service";
import {
  LEAD_ID,
  USER_A,
  leadRow,
  makeCtx,
  makeCasesService,
  makePool,
  makeTimeline,
  svc,
} from "./leads.admin.service.test-support";

void describe("LeadsAdminService.convertCase quote forwarding", () => {
  const CUSTOMER_ID = "00000000-0000-4000-8000-c00000000001";
  const CASE_ID = "00000000-0000-4000-8000-ca5e00000001";

  void test("forwards lead quote_amount to CasesService.create as quotePrice", async () => {
    type CreateIn = Parameters<CasesService["create"]>[1];
    let createInput: CreateIn | undefined;
    const pool = makePool((sql) => {
      if (sql.includes("from leads") && sql.includes("limit 1")) {
        return Promise.resolve({
          rows: [
            leadRow({
              status: "following",
              converted_customer_id: CUSTOMER_ID,
              quote_amount: 155000,
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
              quote_amount: 155000,
            }),
          ],
          rowCount: 1,
        });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    });

    const casesService = makeCasesService({
      create: (
        _ctx: Parameters<CasesService["create"]>[0],
        input: CreateIn,
      ) => {
        createInput = input;
        return Promise.resolve({ id: CASE_ID });
      },
    });

    const timeline = makeTimeline();
    await svc(pool, timeline, undefined, casesService).convertCase(
      makeCtx(),
      LEAD_ID,
      {
        caseTypeCode: "dependent_visa",
        ownerUserId: USER_A,
      },
    );

    assert.equal(createInput?.quotePrice, 155000);
  });
});
