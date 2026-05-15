import assert from "node:assert/strict";
import test from "node:test";
import type { Pool } from "pg";

import { BillingSummaryService } from "./billingSummary.service";
import type { RequestContext } from "../tenancy/requestContext";

const ORG_A = "00000000-0000-4000-8000-000000000001";
const ORG_B = "00000000-0000-4000-8000-000000000002";
const USER_ID = "00000000-0000-4000-8000-000000000010";

function makeCtx(
  orgId = ORG_A,
  role: RequestContext["role"] = "viewer",
): RequestContext {
  return { orgId, userId: USER_ID, role };
}

type PoolClientLike = {
  query: (
    sql: string,
    params?: unknown[],
  ) => Promise<{ rows: unknown[]; rowCount: number }>;
  release: () => void;
};

function makePool(queryFn: PoolClientLike["query"]): Pool {
  const client: PoolClientLike = { query: queryFn, release: () => undefined };
  return { connect: () => Promise.resolve(client) } as unknown as Pool;
}

function svc(pool: Pool): BillingSummaryService {
  return new BillingSummaryService(pool);
}

function summaryRow(overrides: Record<string, unknown> = {}) {
  return {
    total_due: "10000",
    total_received: "3000",
    overdue_amount: "2000",
    ...overrides,
  };
}

void test("getSummary returns four indicators with correct computation", async () => {
  const pool = makePool((sql) => {
    if (sql.includes("set_config")) {
      return Promise.resolve({ rows: [], rowCount: 0 });
    }
    return Promise.resolve({
      rows: [summaryRow()],
      rowCount: 1,
    });
  });

  const result = await svc(pool).getSummary(makeCtx());

  assert.equal(result.totalDue, 10000);
  assert.equal(result.totalReceived, 3000);
  assert.equal(result.totalOutstanding, 7000);
  assert.equal(result.overdueAmount, 2000);
});

void test("totalOutstanding clamps to zero when received exceeds due", async () => {
  const pool = makePool((sql) => {
    if (sql.includes("set_config")) {
      return Promise.resolve({ rows: [], rowCount: 0 });
    }
    return Promise.resolve({
      rows: [summaryRow({ total_due: "1000", total_received: "1500" })],
      rowCount: 1,
    });
  });

  const result = await svc(pool).getSummary(makeCtx());

  assert.equal(result.totalDue, 1000);
  assert.equal(result.totalReceived, 1500);
  assert.equal(result.totalOutstanding, 0);
});

void test("overdueAmount clamps to zero when negative", async () => {
  const pool = makePool((sql) => {
    if (sql.includes("set_config")) {
      return Promise.resolve({ rows: [], rowCount: 0 });
    }
    return Promise.resolve({
      rows: [summaryRow({ overdue_amount: "-100" })],
      rowCount: 1,
    });
  });

  const result = await svc(pool).getSummary(makeCtx());
  assert.equal(result.overdueAmount, 0);
});

void test("getSummary returns zeros when no billing records exist", async () => {
  const pool = makePool((sql) => {
    if (sql.includes("set_config")) {
      return Promise.resolve({ rows: [], rowCount: 0 });
    }
    return Promise.resolve({
      rows: [{ total_due: "0", total_received: "0", overdue_amount: "0" }],
      rowCount: 1,
    });
  });

  const result = await svc(pool).getSummary(makeCtx());

  assert.equal(result.totalDue, 0);
  assert.equal(result.totalReceived, 0);
  assert.equal(result.totalOutstanding, 0);
  assert.equal(result.overdueAmount, 0);
});

void test("getSummary JOIN cases excludes soft-deleted cases", async () => {
  const captured: { sql: string; params?: unknown[] }[] = [];
  const pool = makePool((sql, params) => {
    captured.push({ sql, params });
    if (sql.includes("set_config")) {
      return Promise.resolve({ rows: [], rowCount: 0 });
    }
    return Promise.resolve({ rows: [summaryRow()], rowCount: 1 });
  });

  await svc(pool).getSummary(makeCtx());

  const main = captured.find((c) => c.sql.includes("total_due"));
  assert.ok(main);
  assert.ok(
    main.sql.includes(
      "coalesce(c.metadata->>'_status', '') is distinct from 'deleted'",
    ),
    "summary JOIN cases must filter out soft-deleted cases",
  );
  assert.ok(
    main.sql.includes("coalesce(br.amount_due, 0) > 0") &&
      main.sql.includes("else coalesce(bp.paid, 0)"),
    "total_due falls back to per-row paid when amount_due is zero",
  );
});

void test("getSummary applies status filter in SQL", async () => {
  const captured: { sql: string; params?: unknown[] }[] = [];
  const pool = makePool((sql, params) => {
    captured.push({ sql, params });
    if (sql.includes("set_config")) {
      return Promise.resolve({ rows: [], rowCount: 0 });
    }
    return Promise.resolve({
      rows: [summaryRow()],
      rowCount: 1,
    });
  });

  await svc(pool).getSummary(makeCtx(), { status: "overdue" });

  const main = captured.find((c) => c.sql.includes("total_due"));
  assert.ok(main, "summary SQL was executed");
  assert.ok(main.sql.includes("br.status = $"), "status filter applied");
  assert.ok(main.params?.includes("overdue"), "status param passed");
});

void test("getSummary applies groupId filter", async () => {
  const captured: { sql: string; params?: unknown[] }[] = [];
  const pool = makePool((sql, params) => {
    captured.push({ sql, params });
    if (sql.includes("set_config")) {
      return Promise.resolve({ rows: [], rowCount: 0 });
    }
    return Promise.resolve({
      rows: [summaryRow()],
      rowCount: 1,
    });
  });

  await svc(pool).getSummary(makeCtx(), { groupId: "g-1" });

  const main = captured.find((c) => c.sql.includes("total_due"));
  assert.ok(main);
  assert.ok(main.sql.includes("c.group_id = $"), "groupId filter applied");
  assert.ok(main.params?.includes("g-1"));
});

void test("getSummary applies ownerId filter", async () => {
  const captured: { sql: string; params?: unknown[] }[] = [];
  const pool = makePool((sql, params) => {
    captured.push({ sql, params });
    if (sql.includes("set_config")) {
      return Promise.resolve({ rows: [], rowCount: 0 });
    }
    return Promise.resolve({ rows: [summaryRow()], rowCount: 1 });
  });

  await svc(pool).getSummary(makeCtx(), { ownerId: "owner-1" });

  const main = captured.find((c) => c.sql.includes("total_due"));
  assert.ok(main);
  assert.ok(main.sql.includes("c.owner_user_id = $"), "ownerId filter applied");
  assert.ok(main.params?.includes("owner-1"));
});

void test("getSummary applies q search filter across D3 columns", async () => {
  const captured: { sql: string; params?: unknown[] }[] = [];
  const pool = makePool((sql, params) => {
    captured.push({ sql, params });
    if (sql.includes("set_config")) {
      return Promise.resolve({ rows: [], rowCount: 0 });
    }
    return Promise.resolve({ rows: [summaryRow()], rowCount: 1 });
  });

  await svc(pool).getSummary(makeCtx(), { q: "tanaka" });

  const main = captured.find((c) => c.sql.includes("total_due"));
  assert.ok(main);
  assert.ok(main.sql.includes("lower(c.case_no)"), "q searches case_no");
  assert.ok(main.sql.includes("lower(c.case_name)"), "q searches case_name");
  assert.ok(
    main.sql.includes("lower(cu.base_profile->>'displayName')"),
    "q searches customer name",
  );
  assert.ok(
    main.sql.includes("lower(br.milestone_name)"),
    "q searches milestone_name",
  );
  assert.ok(main.params?.includes("tanaka"), "q includes exact id match param");
  assert.ok(
    main.params?.includes("%tanaka%"),
    "q param lowercased with wildcards",
  );
});

void test("getSummary q filter matches case id like billing-plans list", async () => {
  const captured: { sql: string; params?: unknown[] }[] = [];
  const pool = makePool((sql, params) => {
    captured.push({ sql, params });
    if (sql.includes("set_config")) {
      return Promise.resolve({ rows: [], rowCount: 0 });
    }
    return Promise.resolve({ rows: [summaryRow()], rowCount: 1 });
  });

  const caseId = "9d35f392-fc7b-481d-9844-ba2972161f6e";
  await svc(pool).getSummary(makeCtx(), { q: caseId });

  const main = captured.find((c) => c.sql.includes("total_due"));
  assert.ok(main);
  assert.ok(
    main.sql.includes("lower(c.id::text)"),
    "q includes case id equality for UUID deep-link parity",
  );
  assert.ok(main.params?.includes(caseId.toLowerCase()));
});

void test("getSummary applies from/to date range filters", async () => {
  const captured: { sql: string; params?: unknown[] }[] = [];
  const pool = makePool((sql, params) => {
    captured.push({ sql, params });
    if (sql.includes("set_config")) {
      return Promise.resolve({ rows: [], rowCount: 0 });
    }
    return Promise.resolve({ rows: [summaryRow()], rowCount: 1 });
  });

  await svc(pool).getSummary(makeCtx(), {
    from: "2026-01-01",
    to: "2026-12-31",
  });

  const main = captured.find((c) => c.sql.includes("total_due"));
  assert.ok(main);
  assert.ok(main.sql.includes("br.due_date >= $"), "from filter applied");
  assert.ok(main.sql.includes("br.due_date <= $"), "to filter applied");
});

void test("getSummary applies combined filters", async () => {
  const captured: { sql: string; params?: unknown[] }[] = [];
  const pool = makePool((sql, params) => {
    captured.push({ sql, params });
    if (sql.includes("set_config")) {
      return Promise.resolve({ rows: [], rowCount: 0 });
    }
    return Promise.resolve({ rows: [summaryRow()], rowCount: 1 });
  });

  await svc(pool).getSummary(makeCtx(), {
    status: "due",
    groupId: "g-2",
    ownerId: "owner-2",
    q: "test",
  });

  const main = captured.find((c) => c.sql.includes("total_due"));
  assert.ok(main);
  assert.ok(main.sql.includes("br.status = $"));
  assert.ok(main.sql.includes("c.group_id = $"));
  assert.ok(main.sql.includes("c.owner_user_id = $"));
  assert.ok(main.sql.includes("lower(c.case_no)"));
});

void test("getSummary uses nowOverride for overdue calculation", async () => {
  const captured: { sql: string; params?: unknown[] }[] = [];
  const pool = makePool((sql, params) => {
    captured.push({ sql, params });
    if (sql.includes("set_config")) {
      return Promise.resolve({ rows: [], rowCount: 0 });
    }
    return Promise.resolve({
      rows: [summaryRow({ overdue_amount: "500" })],
      rowCount: 1,
    });
  });

  const result = await svc(pool).getSummary(
    makeCtx(),
    {},
    "2026-06-15T00:00:00Z",
  );

  assert.equal(result.overdueAmount, 500);

  const main = captured.find((c) => c.sql.includes("total_due"));
  assert.ok(main);
  assert.ok(
    main.sql.includes("::timestamptz"),
    "nowOverride parameter injected",
  );
  assert.ok(
    main.params?.includes("2026-06-15T00:00:00Z"),
    "nowOverride value passed",
  );
});

void test("getSummary uses now() when nowOverride is not provided", async () => {
  const captured: { sql: string; params?: unknown[] }[] = [];
  const pool = makePool((sql, params) => {
    captured.push({ sql, params });
    if (sql.includes("set_config")) {
      return Promise.resolve({ rows: [], rowCount: 0 });
    }
    return Promise.resolve({ rows: [summaryRow()], rowCount: 1 });
  });

  await svc(pool).getSummary(makeCtx());

  const main = captured.find((c) => c.sql.includes("total_due"));
  assert.ok(main);
  assert.ok(
    !main.sql.includes("::timestamptz"),
    "no timestamptz cast without override",
  );
});

void test("cross-org isolation: different orgId produces separate set_config", async () => {
  const configs: string[] = [];
  const pool = makePool((sql, params) => {
    if (sql.includes("set_config") && sql.includes("app.org_id")) {
      configs.push(String(params?.[0]));
    }
    if (sql.includes("total_due")) {
      return Promise.resolve({ rows: [summaryRow()], rowCount: 1 });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  const service = svc(pool);
  await service.getSummary(makeCtx(ORG_A));
  await service.getSummary(makeCtx(ORG_B));

  assert.ok(configs.includes(ORG_A), "org A config set");
  assert.ok(configs.includes(ORG_B), "org B config set");
  assert.equal(configs.length, 2, "two separate org configs");
});

void test("SQL uses LATERAL join for paid subquery", async () => {
  const captured: { sql: string }[] = [];
  const pool = makePool((sql) => {
    captured.push({ sql });
    if (sql.includes("set_config")) {
      return Promise.resolve({ rows: [], rowCount: 0 });
    }
    return Promise.resolve({ rows: [summaryRow()], rowCount: 1 });
  });

  await svc(pool).getSummary(makeCtx());

  const main = captured.find((c) => c.sql.includes("total_due"));
  assert.ok(main);
  assert.ok(
    main.sql.includes("left join lateral"),
    "uses LATERAL join for paid subquery",
  );
  assert.ok(
    main.sql.includes("record_status = 'valid'"),
    "only counts valid payment records",
  );
});

void test("overdue SQL filters by due_date < now and overdue-eligible statuses", async () => {
  const captured: { sql: string }[] = [];
  const pool = makePool((sql) => {
    captured.push({ sql });
    if (sql.includes("set_config")) {
      return Promise.resolve({ rows: [], rowCount: 0 });
    }
    return Promise.resolve({ rows: [summaryRow()], rowCount: 1 });
  });

  await svc(pool).getSummary(makeCtx());

  const main = captured.find((c) => c.sql.includes("total_due"));
  assert.ok(main);
  assert.ok(main.sql.includes("br.due_date < now()"));
  assert.ok(main.sql.includes("'due', 'partial', 'overdue'"));
});
