import assert from "node:assert/strict";
import test from "node:test";

import { syncBillingCacheForCase } from "./billingGuards";
import type { TenantDbTx } from "../tenancy/tenantDb";

const CASE_ID = "00000000-0000-4000-8000-000000000099";
const BP_LUMP = "11111111-1111-4111-8111-111111111111";

void test("syncBillingCache: final_payment_paid_cached aligns with scoped payments (zero due, stale partial)", async () => {
  let billingUpdateParams: unknown[] | undefined;

  const tx = {
    query(sql: string, params?: unknown[]) {
      type Row = { rows: Record<string, unknown>[]; rowCount: number };
      if (
        sql.includes("from billing_records") &&
        sql.includes("where case_id") &&
        !sql.includes("payment_records")
      ) {
        assert.equal(params?.[0], CASE_ID);
        return Promise.resolve({
          rows: [
            {
              id: BP_LUMP,
              amount_due: "0",
              status: "partial",
              milestone_name: "case_fee",
              gate_effect_mode: "block",
            },
          ],
          rowCount: 1,
        } satisfies Row);
      }
      if (
        sql.includes("from payment_records") &&
        sql.includes("record_status = 'valid'") &&
        !sql.includes("billing_record_id = any")
      ) {
        return Promise.resolve({
          rows: [{ total_received: "550000" }],
          rowCount: 1,
        } satisfies Row);
      }
      if (sql.includes("billing_record_id = any")) {
        return Promise.resolve({
          rows: [{ total_received: "550000" }],
          rowCount: 1,
        } satisfies Row);
      }
      if (sql.includes("update cases set")) {
        billingUpdateParams = [...(params ?? [])];
        return Promise.resolve({ rows: [], rowCount: 1 });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    },
  } as unknown as TenantDbTx;

  await syncBillingCacheForCase(tx, CASE_ID);
  assert.ok(billingUpdateParams);
  assert.equal(billingUpdateParams[0], CASE_ID);
  assert.equal(billingUpdateParams[2], true, "final_payment_paid_cached");
});
