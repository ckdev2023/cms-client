import { test, describe } from "node:test";
import assert from "node:assert/strict";

import type { RequestContext } from "../tenancy/requestContext";

import { ensureAtLeastOneBillingRecordForCase } from "./cases.service.timeline";

const ORG_ID = "00000000-0000-4000-8000-0000000000aa";
const USER_ID = "00000000-0000-4000-8000-0000000000bb";
const CASE_ID = "00000000-0000-4000-c000-000000000099";

function makeCtx(): RequestContext {
  return { orgId: ORG_ID, userId: USER_ID, role: "staff" };
}

void describe("ensureAtLeastOneBillingRecordForCase (lead convert fallback)", () => {
  void test("inserts case_fee row when none exist and quote is null", async () => {
    let insertBillingCalls = 0;
    const tx = {
      query(sql: string): Promise<{ rows: unknown[] }> {
        if (sql.includes("from billing_records where case_id = $1 limit 1")) {
          return Promise.resolve({ rows: [] });
        }
        if (sql.includes("insert into billing_records")) {
          insertBillingCalls += 1;
          return Promise.resolve({ rows: [{ id: "bp-new" }] });
        }
        if (sql.includes("insert into timeline_logs")) {
          return Promise.resolve({ rows: [] });
        }
        if (
          sql.includes("from billing_records where case_id = $1") &&
          !sql.includes("limit 1")
        ) {
          return Promise.resolve({
            rows: [
              {
                amount_due: 0,
                status: "due",
                milestone_name: "case_fee",
                gate_effect_mode: "warn",
              },
            ],
          });
        }
        if (sql.includes("from payment_records")) {
          return Promise.resolve({ rows: [{ total_received: 0 }] });
        }
        if (sql.includes("update cases set")) {
          return Promise.resolve({ rows: [] });
        }
        assert.fail(`unexpected sql: ${sql}`);
      },
    };

    await ensureAtLeastOneBillingRecordForCase(
      tx as never,
      makeCtx(),
      CASE_ID,
      null,
    );
    assert.equal(insertBillingCalls, 1);
  });

  void test("uses positive quoteAmount as amount_due", async () => {
    let amountParam: unknown;
    const tx = {
      query(sql: string, params?: unknown[]): Promise<{ rows: unknown[] }> {
        if (sql.includes("from billing_records where case_id = $1 limit 1")) {
          return Promise.resolve({ rows: [] });
        }
        if (sql.includes("insert into billing_records")) {
          amountParam = params?.[3];
          return Promise.resolve({ rows: [{ id: "bp-new" }] });
        }
        if (sql.includes("insert into timeline_logs")) {
          return Promise.resolve({ rows: [] });
        }
        if (
          sql.includes("from billing_records where case_id = $1") &&
          !sql.includes("limit 1")
        ) {
          return Promise.resolve({
            rows: [
              {
                amount_due: 180000,
                status: "due",
                milestone_name: "case_fee",
                gate_effect_mode: "warn",
              },
            ],
          });
        }
        if (sql.includes("from payment_records")) {
          return Promise.resolve({ rows: [{ total_received: 0 }] });
        }
        if (sql.includes("update cases set")) {
          return Promise.resolve({ rows: [] });
        }
        assert.fail(`unexpected sql: ${sql}`);
      },
    };

    await ensureAtLeastOneBillingRecordForCase(
      tx as never,
      makeCtx(),
      CASE_ID,
      180000,
    );
    assert.equal(amountParam, 180000);
  });

  void test("no insert when billing_records already exist", async () => {
    let callsAfterPresenceCheck = 0;
    const tx = {
      query(sql: string): Promise<{ rows: unknown[] }> {
        if (sql.includes("from billing_records where case_id = $1 limit 1")) {
          return Promise.resolve({ rows: [{ id: "existing" }] });
        }
        callsAfterPresenceCheck += 1;
        return Promise.resolve({ rows: [] });
      },
    };

    await ensureAtLeastOneBillingRecordForCase(
      tx as never,
      makeCtx(),
      CASE_ID,
      null,
    );
    assert.equal(callsAfterPresenceCheck, 0);
  });
});
