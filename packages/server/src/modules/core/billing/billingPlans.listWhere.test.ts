import assert from "node:assert/strict";
import test from "node:test";

import { buildBillingPlanListWhere } from "./billingPlans.listWhere";

const ORG = "00000000-0000-4000-8000-000000000000";

void test("buildBillingPlanListWhere q matches case id text equality", () => {
  const uuid = "8a1ea4d3-0bcb-40c0-b736-663fbdccbb56";
  const { whereClause, params } = buildBillingPlanListWhere(ORG, { q: uuid });
  assert.ok(whereClause.includes("lower(c.id::text) = lower($2)"));
  assert.equal(params[0], ORG);
  assert.equal(params[1], uuid);
});
