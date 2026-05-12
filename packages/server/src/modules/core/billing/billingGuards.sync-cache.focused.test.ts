import assert from "node:assert/strict";
import { test } from "node:test";

import type { TenantDbTx } from "../tenancy/tenantDb";
import { syncBillingCacheForCase } from "./billingGuards";

void test("syncBillingCacheForCase: no final-milestone rows ⇒ final_payment_paid_cached false (案件報酬 only)", async () => {
  let updateParams: unknown[] | null = null;
  const tx = {
    query(sql: string, params?: unknown[]) {
      if (sql.includes("from billing_records where case_id")) {
        return Promise.resolve({
          rows: [
            {
              amount_due: 0,
              status: "due",
              milestone_name: "案件報酬",
              gate_effect_mode: "warn",
            },
          ],
        });
      }
      if (sql.includes("from payment_records")) {
        return Promise.resolve({
          rows: [{ total_received: 0 }],
        });
      }
      if (sql.includes("update cases set")) {
        updateParams = params ?? null;
        return Promise.resolve({ rows: [] });
      }
      return Promise.resolve({ rows: [] });
    },
  } as unknown as TenantDbTx;

  await syncBillingCacheForCase(tx, "00000000-0000-4000-8000-000000000099");
  assert.ok(Array.isArray(updateParams));
  assert.equal(updateParams[2], false, "final_payment_paid_cached");
});

void test("syncBillingCacheForCase: final-milestone rows all paid ⇒ final_payment_paid_cached true", async () => {
  let updateParams: unknown[] | null = null;
  const tx = {
    query(sql: string, params?: unknown[]) {
      if (sql.includes("from billing_records where case_id")) {
        return Promise.resolve({
          rows: [
            {
              amount_due: 50000,
              status: "paid",
              milestone_name: "尾款",
              gate_effect_mode: "block",
            },
          ],
        });
      }
      if (sql.includes("from payment_records")) {
        return Promise.resolve({
          rows: [{ total_received: 50000 }],
        });
      }
      if (sql.includes("update cases set")) {
        updateParams = params ?? null;
        return Promise.resolve({ rows: [] });
      }
      return Promise.resolve({ rows: [] });
    },
  } as unknown as TenantDbTx;

  await syncBillingCacheForCase(tx, "00000000-0000-4000-8000-000000000088");
  assert.ok(Array.isArray(updateParams));
  assert.equal(updateParams[2], true, "final_payment_paid_cached");
});
