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

  const todoItem = result.panels.todo[0];
  assert.equal(todoItem.statusLabelKey, "highPriority");
  assert.equal(todoItem.descKey, "todo.statusPriority");
  assert.deepEqual(todoItem.descParams, {
    status: "pending",
    priority: "high",
  });
  assert.equal(todoItem.actionKey, "viewCase");
  assert.deepEqual(todoItem.metaKeys, [
    { key: "case", params: { caseLabel: "CASE-001" } },
    { key: "assignee", params: { name: "Tanaka" } },
    { key: "due", params: { date: "2026-05-10" } },
  ]);

  const deadlineItem = result.panels.deadlines[0];
  assert.equal(deadlineItem.statusLabelKey, "daysLeft");
  assert.deepEqual(deadlineItem.statusLabelParams, { days: 3 });
  assert.equal(deadlineItem.descKey, "deadline.currentStage");
  assert.equal(deadlineItem.actionKey, "viewCase");

  const submissionItem = result.panels.submissions[0];
  assert.equal(submissionItem.statusLabelKey, "readyToSubmit");
  assert.equal(submissionItem.descKey, "submission.approvedReady");
  assert.equal(submissionItem.actionKey, "viewCase");

  const riskItem = result.panels.risks[0];
  assert.equal(riskItem.statusLabelKey, "billingRisk");
  assert.equal(riskItem.descKey, "risk.unpaidAmount");
  assert.deepEqual(riskItem.descParams, { amount: "¥12,000" });
  assert.equal(riskItem.actionKey, "viewBilling");
  assert.deepEqual(riskItem.metaKeys, [
    { key: "owner", params: { name: "Yamada" } },
    { key: "due", params: { date: "2026-05-08" } },
    { key: "unpaid", params: { amount: "¥12,000" } },
  ]);
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

void test("DashboardService.getSummary scope=group without groupId resolves primary group", async () => {
  const PRIMARY_GROUP_ID = "00000000-0000-4000-8000-000000000088";
  const calls: { sql: string; params?: unknown[] }[] = [];
  const service = new DashboardService(
    makePool((sql, params) => {
      calls.push({ sql, params });
      if (sql.includes("user_group_memberships") && sql.includes("order by")) {
        return Promise.resolve({
          rows: [{ group_id: PRIMARY_GROUP_ID }],
        });
      }
      return Promise.resolve({ rows: [{ count: "0" }] });
    }),
  );

  const result = await service.getSummary(makeCtx(), {
    scope: "group",
    timeWindow: 7,
  });

  assert.equal(result.scope, "group");
  assert.equal(result.effectiveGroupId, PRIMARY_GROUP_ID);
  const caseSqls = calls.filter(
    (call) =>
      call.sql.includes("from cases c") || call.sql.includes("from tasks t"),
  );
  for (const call of caseSqls) {
    assert.ok(call.sql.includes("group_id = $"));
    assert.ok(call.params?.includes(PRIMARY_GROUP_ID));
  }
});

void test("DashboardService.getSummary scope=group without groupId and no membership throws NO_PRIMARY_GROUP", async () => {
  const service = new DashboardService(
    makePool((sql) => {
      if (sql.includes("user_group_memberships")) {
        return Promise.resolve({ rows: [] });
      }
      return Promise.resolve({ rows: [{ count: "0" }] });
    }),
  );

  await assert.rejects(
    () => service.getSummary(makeCtx(), { scope: "group", timeWindow: 7 }),
    (err: Error) => {
      assert.ok(err instanceof Error);
      assert.ok(err.message.includes("NO_PRIMARY_GROUP"));
      return true;
    },
  );
});

void test("DashboardService.getSummary scope=group with groupId verifies membership and applies group filter", async () => {
  const GROUP_ID = "00000000-0000-4000-8000-000000000099";
  const calls: { sql: string; params?: unknown[] }[] = [];
  const service = new DashboardService(
    makePool((sql, params) => {
      calls.push({ sql, params });
      if (sql.includes("user_group_memberships") && sql.includes("exists")) {
        return Promise.resolve({ rows: [{ exists: true }] });
      }
      return Promise.resolve({ rows: [{ count: "0" }] });
    }),
  );

  const result = await service.getSummary(makeCtx(), {
    scope: "group",
    timeWindow: 7,
    groupId: GROUP_ID,
  });

  assert.equal(result.scope, "group");
  assert.equal(result.effectiveGroupId, GROUP_ID);
  const caseSqls = calls.filter(
    (call) =>
      call.sql.includes("from cases c") || call.sql.includes("from tasks t"),
  );
  for (const call of caseSqls) {
    assert.ok(call.sql.includes("group_id = $"));
    assert.ok(call.params?.includes(GROUP_ID));
  }
});

void test("DashboardService.getSummary scope=group with groupId and non-member throws NO_GROUP_ACCESS", async () => {
  const GROUP_ID = "00000000-0000-4000-8000-000000000099";
  const service = new DashboardService(
    makePool((sql) => {
      if (sql.includes("user_group_memberships") && sql.includes("exists")) {
        return Promise.resolve({ rows: [{ exists: false }] });
      }
      return Promise.resolve({ rows: [{ count: "0" }] });
    }),
  );

  await assert.rejects(
    () =>
      service.getSummary(makeCtx(), {
        scope: "group",
        timeWindow: 7,
        groupId: GROUP_ID,
      }),
    (err: Error) => {
      assert.ok(err instanceof Error);
      assert.ok(err.message.includes("NO_GROUP_ACCESS"));
      return true;
    },
  );
});

void test("DashboardService.getSummary scope=mine ignores provided groupId", async () => {
  const GROUP_ID = "00000000-0000-4000-8000-000000000099";
  const calls: { sql: string; params?: unknown[] }[] = [];
  const service = new DashboardService(
    makePool((sql, params) => {
      calls.push({ sql, params });
      return Promise.resolve({ rows: [{ count: "0" }] });
    }),
  );

  const result = await service.getSummary(makeCtx(), {
    scope: "mine",
    timeWindow: 7,
    groupId: GROUP_ID,
  });

  assert.equal(result.scope, "mine");
  assert.equal(result.effectiveGroupId, undefined);
  const allSqls = calls.map((c) => c.sql).join("\n");
  assert.equal(allSqls.includes("user_group_memberships"), false);
  for (const call of calls) {
    if (call.params) {
      assert.equal(call.params.includes(GROUP_ID), false);
    }
  }
});

void test("DashboardService.getSummary scope=group excludes cases with group_id IS NULL via equality filter", async () => {
  const GROUP_ID = "00000000-0000-4000-8000-000000000099";
  const calls: { sql: string; params?: unknown[] }[] = [];
  const service = new DashboardService(
    makePool((sql, params) => {
      calls.push({ sql, params });
      if (sql.includes("user_group_memberships") && sql.includes("exists")) {
        return Promise.resolve({ rows: [{ exists: true }] });
      }
      return Promise.resolve({ rows: [{ count: "0" }] });
    }),
  );

  await service.getSummary(makeCtx(), {
    scope: "group",
    timeWindow: 7,
    groupId: GROUP_ID,
  });

  const dataQueries = calls.filter(
    (call) =>
      !isTxSql(call.sql) &&
      !call.sql.includes("exists(") &&
      (call.sql.includes("from cases c") || call.sql.includes("from tasks t")),
  );
  assert.ok(
    dataQueries.length >= 8,
    `expected >=8 data queries (4 counts + 4 panels), got ${String(dataQueries.length)}`,
  );
  for (const call of dataQueries) {
    assert.ok(
      call.sql.includes("group_id = $"),
      `data query missing strict group_id equality filter:\n${call.sql}`,
    );
    assert.ok(
      !call.sql.includes("IS NOT DISTINCT FROM"),
      "must use strict equality so rows with group_id IS NULL are excluded",
    );
    assert.ok(call.params?.includes(GROUP_ID));
  }
});

void test("DashboardService.getSummary scope=all ignores provided groupId", async () => {
  const GROUP_ID = "00000000-0000-4000-8000-000000000099";
  const calls: { sql: string; params?: unknown[] }[] = [];
  const service = new DashboardService(
    makePool((sql, params) => {
      calls.push({ sql, params });
      return Promise.resolve({ rows: [{ count: "0" }] });
    }),
  );

  const result = await service.getSummary(makeCtx(), {
    scope: "all",
    timeWindow: 7,
    groupId: GROUP_ID,
  });

  assert.equal(result.scope, "all");
  assert.equal(result.effectiveGroupId, undefined);
  const allSqls = calls.map((c) => c.sql).join("\n");
  assert.equal(allSqls.includes("user_group_memberships"), false);
  for (const call of calls) {
    if (call.params) {
      assert.equal(call.params.includes(GROUP_ID), false);
    }
  }
});
