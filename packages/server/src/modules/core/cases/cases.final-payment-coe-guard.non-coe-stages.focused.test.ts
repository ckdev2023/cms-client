import { describe, test } from "node:test";
import assert from "node:assert/strict";

import {
  CASE_ID,
  makeCaseRow,
  makeCtx,
  makePool,
  makeTemplates,
  ok,
  svc,
} from "./cases.final-payment-coe-guard.focused.test-support";

void describe("post-approval: non-coe_sent bypasses guard", () => {
  for (const stage of [
    "waiting_final_payment",
    "overseas_visa_applying",
    "entry_success",
  ]) {
    void test(`${stage} bypasses billing guard even with unpaid balance`, async () => {
      const pool = makePool((sql, p) => {
        if (sql.includes("update cases") && sql.includes("metadata"))
          return ok([
            makeCaseRow({
              post_approval_stage: stage,
              metadata: { post_approval_stage: stage },
              ...(stage === "overseas_visa_applying"
                ? { overseas_visa_start_at: "2026-04-01T00:00:00.000Z" }
                : {}),
              ...(stage === "entry_success"
                ? { entry_confirmed_at: "2026-04-15T00:00:00.000Z" }
                : {}),
            }),
          ]);
        if (sql.includes("from cases") && p?.[0] === CASE_ID)
          return ok([makeCaseRow()]);
        return ok();
      });

      const c = await svc(pool, makeTemplates()).updatePostApprovalStage(
        makeCtx(),
        CASE_ID,
        { stage },
      );
      assert.equal(c.postApprovalStage, stage);
    });
  }
});
