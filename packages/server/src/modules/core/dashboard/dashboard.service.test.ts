import assert from "node:assert/strict";
import test from "node:test";
import type { Pool } from "pg";

import type { RequestContext } from "../tenancy/requestContext";
import { DashboardService } from "./dashboard.service";

const ORG_ID = "00000000-0000-4000-8000-000000000000";
const USER_ID = "00000000-0000-4000-8000-000000000001";

type QueryResult = { rows: unknown[]; rowCount?: number };
type QueryFn = (sql: string, params?: unknown[]) => Promise<QueryResult>;

function makeCtx(role: RequestContext["role"] = "viewer"): RequestContext {
  return { orgId: ORG_ID, userId: USER_ID, role };
}

function isTxSql(sql: string): boolean {
  return /^(begin|commit|rollback|select set_config)/i.test(sql.trim());
}

function makePool(queryFn: QueryFn): Pool {
  return {
    connect: () =>
      Promise.resolve({
        query: (sql: string, params?: unknown[]) =>
          isTxSql(sql)
            ? Promise.resolve({ rows: [], rowCount: 0 })
            : queryFn(sql, params),
        release: () => undefined,
      }),
  } as unknown as Pool;
}

void test("DashboardService.getSummary maps summary counts and panel items", async () => {
  const service = new DashboardService(
    makePool((sql) => {
      if (sql.includes("from tasks t") && sql.includes("count(*)::text")) {
        return Promise.resolve({ rows: [{ count: "2" }] });
      }
      if (
        sql.includes("from cases c") &&
        sql.includes("make_interval(days => $2::int)") &&
        sql.includes("count(*)::text")
      ) {
        return Promise.resolve({ rows: [{ count: "3" }] });
      }
      if (
        sql.includes("coalesce(c.stage, c.status) = 'S6'") &&
        sql.includes("count(*)::text")
      ) {
        return Promise.resolve({ rows: [{ count: "1" }] });
      }
      if (sql.includes("latest_validation") && sql.includes("count(*)::text")) {
        return Promise.resolve({ rows: [{ count: "4" }] });
      }
      if (sql.includes("select\n         t.id")) {
        return Promise.resolve({
          rows: [
            {
              id: "task-1",
              title: "Prepare submission",
              case_id: "case-1",
              case_no: "CASE-001",
              case_name: null,
              assignee_name: "Tanaka",
              due_at: "2026-05-10T00:00:00.000Z",
              priority: "high",
              status: "pending",
            },
          ],
        });
      }
      if (
        sql.includes(
          "ceil(extract(epoch from (c.due_at - now())) / 86400.0)::int",
        )
      ) {
        return Promise.resolve({
          rows: [
            {
              id: "case-2",
              case_no: "CASE-002",
              case_name: "续签案件",
              owner_name: "Suzuki",
              due_at: "2026-05-12T00:00:00.000Z",
              status: "S5",
              days_left: 3,
            },
          ],
        });
      }
      if (
        sql.includes("latest_review") &&
        sql.includes("coalesce(c.stage, c.status) = 'S6'")
      ) {
        return Promise.resolve({
          rows: [
            {
              id: "case-3",
              case_no: "CASE-003",
              case_name: null,
              owner_name: "Sato",
              due_at: "2026-05-20T00:00:00.000Z",
              validation_status: "passed",
              review_decision: "approved",
            },
          ],
        });
      }
      if (sql.includes("c.billing_unpaid_amount_cached as unpaid_amount")) {
        return Promise.resolve({
          rows: [
            {
              id: "case-4",
              case_no: "CASE-004",
              case_name: null,
              owner_name: "Yamada",
              due_at: "2026-05-08T00:00:00.000Z",
              risk_level: "high",
              validation_status: "failed",
              unpaid_amount: "12000",
            },
          ],
        });
      }
      return Promise.resolve({ rows: [] });
    }),
  );

  const result = await service.getSummary(makeCtx(), {
    scope: "mine",
    timeWindow: 7,
  });

  assert.deepEqual(result.summary, {
    todayTasks: 2,
    upcomingCases: 3,
    pendingSubmissions: 1,
    riskCases: 4,
  });
  assert.equal(result.panels.todo[0]?.route, "/cases/case-1");
  assert.equal(result.panels.todo[0]?.statusLabel, "高优先");
  assert.equal(result.panels.deadlines[0]?.daysLeft, 3);
  assert.equal(result.panels.submissions[0]?.statusLabel, "可提交");
  assert.equal(result.panels.risks[0]?.route, "/billing");
  assert.match(result.panels.risks[0]?.desc ?? "", /待收金额/);
});

void test("DashboardService.getSummary applies mine scope and time window params", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];
  const service = new DashboardService(
    makePool((sql, params) => {
      calls.push({ sql, params });
      return Promise.resolve({ rows: [{ count: "0" }] });
    }),
  );

  await service.getSummary(makeCtx(), {
    scope: "mine",
    timeWindow: 30,
  });

  const caseCount = calls.find(
    (call) =>
      call.sql.includes("from cases c") &&
      call.sql.includes("make_interval(days => $2::int)") &&
      call.sql.includes("count(*)::text"),
  );
  const taskCount = calls.find(
    (call) =>
      call.sql.includes("from tasks t") && call.sql.includes("count(*)::text"),
  );

  assert.ok(caseCount);
  assert.ok(caseCount.sql.includes("owner_user_id = $3"));
  assert.deepEqual(caseCount.params, [ORG_ID, 30, USER_ID]);
  assert.ok(taskCount);
  assert.ok(taskCount.sql.includes("assignee_user_id = $2"));
  assert.deepEqual(taskCount.params, [ORG_ID, USER_ID]);
});

void test("DashboardService.getSummary falls back group scope to all queries", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];
  const service = new DashboardService(
    makePool((sql, params) => {
      calls.push({ sql, params });
      return Promise.resolve({ rows: [{ count: "0" }] });
    }),
  );

  const result = await service.getSummary(makeCtx(), {
    scope: "group",
    timeWindow: 7,
  });

  assert.equal(result.scope, "group");
  const filteredSql = calls
    .filter(
      (call) =>
        call.sql.includes("from cases c") || call.sql.includes("from tasks t"),
    )
    .map((call) => call.sql)
    .join("\n");
  assert.equal(filteredSql.includes("owner_user_id = $"), false);
  assert.equal(filteredSql.includes("assignee_user_id = $"), false);
});
