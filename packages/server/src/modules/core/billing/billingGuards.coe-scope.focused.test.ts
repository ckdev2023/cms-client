import assert from "node:assert/strict";
import test from "node:test";

import { checkFinalPaymentGuard } from "./billingGuards";
import type { TenantDbTx } from "../tenancy/tenantDb";

const CASE_ID = "00000000-0000-4000-8000-000000000099";
const BP_LUMP = "11111111-1111-4111-8111-111111111111";
const BP_FINAL = "22222222-2222-4222-8222-222222222222";
const BP_DEPOSIT = "33333333-3333-4333-8333-333333333333";

void test("checkFinalPaymentGuard: single non-keyword row is in scope (lump-sum)", async () => {
  const tx = {
    query(sql: string, params?: unknown[]) {
      type Row = {
        rows: Record<string, unknown>[];
        rowCount: number;
      };
      if (
        sql.includes("from billing_records") &&
        sql.includes("where case_id") &&
        !sql.includes("payment_records")
      ) {
        assert.ok(params !== undefined);
        assert.equal(params[0], CASE_ID);
        return Promise.resolve({
          rows: [
            {
              id: BP_LUMP,
              amount_due: "100000",
              status: "due",
              milestone_name: "case_fee",
              gate_effect_mode: "warn",
            },
          ],
          rowCount: 1,
        } satisfies Row);
      }
      if (sql.includes("payment_records") && sql.includes("any(")) {
        return Promise.resolve({
          rows: [{ total_received: "0" }],
          rowCount: 1,
        } satisfies Row);
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    },
  } as unknown as TenantDbTx;

  const r = await checkFinalPaymentGuard(tx, CASE_ID);
  if (r?.settled !== false) {
    assert.fail("expected unsettled guard");
  }
  assert.equal(r.unpaid, 100000);
  assert.equal(r.gateEffectMode, "warn");
});

void test("checkFinalPaymentGuard: keyword final row narrows scope when multiple plans exist", async () => {
  const tx = {
    query(sql: string, params?: unknown[]) {
      type Row = {
        rows: Record<string, unknown>[];
        rowCount: number;
      };
      if (
        sql.includes("from billing_records") &&
        sql.includes("where case_id") &&
        !sql.includes("payment_records")
      ) {
        return Promise.resolve({
          rows: [
            {
              id: BP_DEPOSIT,
              amount_due: "50000",
              status: "paid",
              milestone_name: "着手金",
              gate_effect_mode: "warn",
            },
            {
              id: BP_FINAL,
              amount_due: "100000",
              status: "due",
              milestone_name: "尾款",
              gate_effect_mode: "block",
            },
          ],
          rowCount: 2,
        } satisfies Row);
      }
      if (sql.includes("payment_records") && sql.includes("any(")) {
        assert.ok(Array.isArray(params) && params.length > 1);
        assert.deepEqual(params[1], [BP_FINAL]);
        return Promise.resolve({
          rows: [{ total_received: "0" }],
          rowCount: 1,
        } satisfies Row);
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    },
  } as unknown as TenantDbTx;

  const r = await checkFinalPaymentGuard(tx, CASE_ID);
  if (r?.settled !== false) {
    assert.fail("expected unsettled guard");
  }
  assert.equal(r.unpaid, 100000);
  assert.equal(r.gateEffectMode, "block");
});

void test("checkFinalPaymentGuard: returns null when scoped rows all have gate off", async () => {
  const tx = {
    query(sql: string) {
      type Row = {
        rows: Record<string, unknown>[];
        rowCount: number;
      };
      if (
        sql.includes("from billing_records") &&
        sql.includes("where case_id") &&
        !sql.includes("payment_records")
      ) {
        return Promise.resolve({
          rows: [
            {
              id: BP_LUMP,
              amount_due: "100000",
              status: "due",
              milestone_name: "case_fee",
              gate_effect_mode: "off",
            },
          ],
          rowCount: 1,
        } satisfies Row);
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    },
  } as unknown as TenantDbTx;

  const r = await checkFinalPaymentGuard(tx, CASE_ID);
  assert.equal(r, null);
});
