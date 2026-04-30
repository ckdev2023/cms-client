import test from "node:test";
import assert from "node:assert/strict";

import {
  buildCustomerDetailSelect,
  buildCustomerListSelect,
} from "./customers.query";
import { mapCustomerAggregates } from "./customers.row-aggregates";
import type { CustomerQueryRow } from "./customers.types";

/**
 * BUG-146（BUG-089 R4 闭环回退）：customers 列表 / 详情 owner 列全空。
 *
 * 走查现象：admin 7 行 customers 表第六列（负责人）`textContent` 全为 ""，
 * 但相同客户在 cases 列表 owner 列正常显示 `Local Admin`。
 *
 * 根因：customers `select` 缺少 `users.name` join → row 没有 `owner_name` 列；
 * `mapCustomerAggregates` 也未把 `owner_name` 接到 `CustomerDtoAggregates.ownerName`，
 * 导致 `mapCustomerToSummaryDto.resolveOwnerSummary` 永远 fallback 到 `""`。
 *
 * 回归门槛：列表 / 详情 select 都必须包含 `owner_name` 子查询，且
 * `mapCustomerAggregates` 必须把字符串值串到 `ownerName` 字段。
 */
void test("BUG-146: customer list select expression includes owner_name", () => {
  const select = buildCustomerListSelect("c");
  assert.ok(
    select.includes("as owner_name"),
    `expected list select to expose owner_name, got: ${select}`,
  );
  assert.ok(
    select.includes("from users u"),
    `expected list select to join users for owner name, got: ${select}`,
  );
  assert.ok(
    select.includes("u.id::text = c.base_profile->>'owner_user_id'"),
    `expected owner JOIN to match owner_user_id from base_profile`,
  );
  assert.ok(
    select.includes("u.id::text = c.base_profile->>'ownerUserId'"),
    `expected owner JOIN to also match ownerUserId fallback`,
  );
  assert.ok(
    select.includes("u.org_id = c.org_id"),
    `expected owner JOIN to be tenant-scoped via org_id`,
  );
});

void test("BUG-146: customer detail select reuses owner_name expression", () => {
  const detailSelect = buildCustomerDetailSelect("c");
  assert.ok(
    detailSelect.includes("as owner_name"),
    `expected detail select to expose owner_name`,
  );
});

void test("BUG-146: mapCustomerAggregates surfaces owner_name as ownerName", () => {
  const row: CustomerQueryRow = {
    id: "c1",
    org_id: "00000000-0000-4000-8000-000000000000",
    type: "individual",
    base_profile: { owner_user_id: "user-1" },
    contacts: [],
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    owner_name: "Local Admin",
  };

  const aggregates = mapCustomerAggregates(row);
  assert.equal(aggregates.ownerName, "Local Admin");
});

void test("BUG-146: mapCustomerAggregates returns null ownerName when no joined user", () => {
  const row: CustomerQueryRow = {
    id: "c1",
    org_id: "00000000-0000-4000-8000-000000000000",
    type: "individual",
    base_profile: {},
    contacts: [],
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    owner_name: null,
  };

  const aggregates = mapCustomerAggregates(row);
  assert.equal(aggregates.ownerName, null);
});

void test("BUG-146: mapCustomerAggregates trims whitespace-only owner_name to null", () => {
  const row: CustomerQueryRow = {
    id: "c1",
    org_id: "00000000-0000-4000-8000-000000000000",
    type: "individual",
    base_profile: {},
    contacts: [],
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    owner_name: "   ",
  };

  const aggregates = mapCustomerAggregates(row);
  assert.equal(aggregates.ownerName, null);
});
