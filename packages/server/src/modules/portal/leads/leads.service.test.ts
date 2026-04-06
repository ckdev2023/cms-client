import test from "node:test";
import assert from "node:assert/strict";
import type { Pool } from "pg";

import { LeadsService } from "./leads.service";

type QueryFn = (
  sql: string,
  params?: unknown[],
) => Promise<{ rows: unknown[] }>;

function makePool(qf: QueryFn) {
  return { query: qf } as unknown as Pool;
}

const SAMPLE_LEAD_ROW = {
  id: "lead-1",
  org_id: null,
  app_user_id: "au-1",
  source: "web",
  language: "en",
  status: "new",
  assigned_org_id: null,
  assigned_user_id: null,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

// ── create ──

void test("LeadsService.create inserts lead with null org_id", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];
  const pool = makePool((sql, params) => {
    calls.push({ sql, params });
    return Promise.resolve({ rows: [SAMPLE_LEAD_ROW] });
  });
  const svc = new LeadsService(pool);
  const result = await svc.create({ appUserId: "au-1" });
  assert.equal(result.id, "lead-1");
  assert.equal(result.orgId, null);
  assert.equal(result.appUserId, "au-1");
  assert.ok(calls.some((c) => c.sql.includes("insert into leads")));
});

// ── get ──

void test("LeadsService.get returns lead by id", async () => {
  const pool = makePool(() => Promise.resolve({ rows: [SAMPLE_LEAD_ROW] }));
  const svc = new LeadsService(pool);
  const result = await svc.get("lead-1");
  assert.ok(result);
  assert.equal(result.id, "lead-1");
});

void test("LeadsService.get returns null for missing lead", async () => {
  const pool = makePool(() => Promise.resolve({ rows: [] }));
  const svc = new LeadsService(pool);
  const result = await svc.get("missing");
  assert.equal(result, null);
});

// ── list ──

void test("LeadsService.list returns items and total", async () => {
  const pool = makePool((sql) => {
    if (sql.includes("count(*)"))
      return Promise.resolve({ rows: [{ count: "1" }] });
    return Promise.resolve({ rows: [SAMPLE_LEAD_ROW] });
  });
  const svc = new LeadsService(pool);
  const result = await svc.list({ appUserId: "au-1" });
  assert.equal(result.total, 1);
  assert.equal(result.items.length, 1);
});

// ── update ──

void test("LeadsService.update updates lead status", async () => {
  const updatedRow = { ...SAMPLE_LEAD_ROW, status: "contacted" };
  const pool = makePool(() => Promise.resolve({ rows: [updatedRow] }));
  const svc = new LeadsService(pool);
  const result = await svc.update("lead-1", { status: "contacted" });
  assert.equal(result.status, "contacted");
});

// ── assign ──

void test("LeadsService.assign sets assigned_org_id and assigned_user_id", async () => {
  const assignedRow = {
    ...SAMPLE_LEAD_ROW,
    org_id: "org-1",
    assigned_org_id: "org-1",
    assigned_user_id: "user-1",
  };
  const calls: { sql: string; params?: unknown[] }[] = [];
  const pool = makePool((sql, params) => {
    calls.push({ sql, params });
    return Promise.resolve({ rows: [assignedRow] });
  });
  const svc = new LeadsService(pool);
  const result = await svc.assign("lead-1", {
    assignedOrgId: "org-1",
    assignedUserId: "user-1",
  });
  assert.equal(result.assignedOrgId, "org-1");
  assert.equal(result.assignedUserId, "user-1");
  assert.equal(result.orgId, "org-1");
});

// ── convert ──

type PoolClientLike = {
  query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }>;
  release: () => void;
};

function makePoolWithClient(qf: QueryFn) {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  const client: PoolClientLike = { query: qf, release: () => {} };
  return {
    query: qf,
    connect: () => Promise.resolve(client),
  } as unknown as Pool;
}

void test("LeadsService.convert creates case and updates status in transaction", async () => {
  const pool = makePoolWithClient((sql) => {
    if (sql === "BEGIN" || sql === "COMMIT" || sql === "ROLLBACK")
      return Promise.resolve({ rows: [] });
    if (sql.includes("select") && sql.includes("from leads")) {
      return Promise.resolve({ rows: [SAMPLE_LEAD_ROW] });
    }
    if (sql.includes("insert into cases")) {
      return Promise.resolve({ rows: [{ id: "case-1" }] });
    }
    // update leads
    return Promise.resolve({
      rows: [{ ...SAMPLE_LEAD_ROW, status: "converted" }],
    });
  });
  const svc = new LeadsService(pool);
  const result = await svc.convert("lead-1", {
    customerId: "cust-1",
    caseTypeCode: "immigration",
    ownerUserId: "user-1",
    orgId: "org-1",
  });
  assert.equal(result.lead.status, "converted");
  assert.equal(result.caseId, "case-1");
});

void test("LeadsService.convert rejects already converted lead", async () => {
  const convertedRow = { ...SAMPLE_LEAD_ROW, status: "converted" };
  const pool = makePool(() => Promise.resolve({ rows: [convertedRow] }));
  const svc = new LeadsService(pool);
  await assert.rejects(
    () =>
      svc.convert("lead-1", {
        customerId: "cust-1",
        caseTypeCode: "immigration",
        ownerUserId: "user-1",
        orgId: "org-1",
      }),
    /already converted/,
  );
});

void test("LeadsService.convert rejects mismatched orgId", async () => {
  const assignedRow = {
    ...SAMPLE_LEAD_ROW,
    assigned_org_id: "org-correct",
  };
  const pool = makePool(() => Promise.resolve({ rows: [assignedRow] }));
  const svc = new LeadsService(pool);
  await assert.rejects(
    () =>
      svc.convert("lead-1", {
        customerId: "cust-1",
        caseTypeCode: "immigration",
        ownerUserId: "user-1",
        orgId: "org-wrong",
      }),
    /orgId does not match/,
  );
});

// ── Edge cases: create ──

void test("LeadsService.create uses default source='web' and language='en'", async () => {
  const calls: { sql: string; params: unknown[] }[] = [];
  const pool = makePool((sql, params) => {
    calls.push({ sql, params: params ?? [] });
    return Promise.resolve({ rows: [SAMPLE_LEAD_ROW] });
  });
  const svc = new LeadsService(pool);
  await svc.create({ appUserId: "au-1" });
  const insertCall = calls.find((c) => c.sql.includes("insert"));
  assert.ok(insertCall);
  assert.equal(insertCall.params[1], "web");
  assert.equal(insertCall.params[2], "en");
});

void test("LeadsService.create throws if insert returns no rows", async () => {
  const pool = makePool(() => Promise.resolve({ rows: [] }));
  const svc = new LeadsService(pool);
  await assert.rejects(
    () => svc.create({ appUserId: "au-1" }),
    /Failed to create lead/,
  );
});

// ── Edge cases: list ──

void test("LeadsService.list defaults to page=1, limit=50", async () => {
  const calls: { sql: string; params: unknown[] }[] = [];
  const pool = makePool((sql, params) => {
    calls.push({ sql, params: params ?? [] });
    if (sql.includes("count(*)"))
      return Promise.resolve({ rows: [{ count: "0" }] });
    return Promise.resolve({ rows: [] });
  });
  const svc = new LeadsService(pool);
  await svc.list();
  const dataCall = calls.find((c) => c.sql.includes("order by"));
  assert.ok(dataCall);
  assert.equal(dataCall.params[0], 50); // limit
  assert.equal(dataCall.params[1], 0); // offset
});

void test("LeadsService.list clamps limit to max 200", async () => {
  const calls: { sql: string; params: unknown[] }[] = [];
  const pool = makePool((sql, params) => {
    calls.push({ sql, params: params ?? [] });
    if (sql.includes("count(*)"))
      return Promise.resolve({ rows: [{ count: "0" }] });
    return Promise.resolve({ rows: [] });
  });
  const svc = new LeadsService(pool);
  await svc.list({ limit: 999 });
  const dataCall = calls.find((c) => c.sql.includes("order by"));
  assert.ok(dataCall);
  assert.equal(dataCall.params[0], 200);
});

void test("LeadsService.list with page=2 applies correct offset", async () => {
  const calls: { sql: string; params: unknown[] }[] = [];
  const pool = makePool((sql, params) => {
    calls.push({ sql, params: params ?? [] });
    if (sql.includes("count(*)"))
      return Promise.resolve({ rows: [{ count: "0" }] });
    return Promise.resolve({ rows: [] });
  });
  const svc = new LeadsService(pool);
  await svc.list({ page: 2, limit: 10 });
  const dataCall = calls.find((c) => c.sql.includes("order by"));
  assert.ok(dataCall);
  assert.equal(dataCall.params[0], 10); // limit
  assert.equal(dataCall.params[1], 10); // offset = (2-1)*10
});

// ── Edge cases: update ──

void test("LeadsService.update with empty input returns existing lead", async () => {
  const pool = makePool(() => Promise.resolve({ rows: [SAMPLE_LEAD_ROW] }));
  const svc = new LeadsService(pool);
  const result = await svc.update("lead-1", {});
  assert.equal(result.id, "lead-1");
});

void test("LeadsService.update throws if lead not found", async () => {
  const pool = makePool(() => Promise.resolve({ rows: [] }));
  const svc = new LeadsService(pool);
  await assert.rejects(
    () => svc.update("missing", { status: "contacted" }),
    /Lead not found/,
  );
});

// ── Edge cases: assign ──

void test("LeadsService.assign throws if lead not found", async () => {
  const pool = makePool(() => Promise.resolve({ rows: [] }));
  const svc = new LeadsService(pool);
  await assert.rejects(
    () =>
      svc.assign("missing", {
        assignedOrgId: "org-1",
        assignedUserId: "user-1",
      }),
    /Lead not found/,
  );
});

// ── Edge cases: convert ──

void test("LeadsService.convert throws if lead not found", async () => {
  const pool = makePool(() => Promise.resolve({ rows: [] }));
  const svc = new LeadsService(pool);
  await assert.rejects(
    () =>
      svc.convert("missing", {
        customerId: "cust-1",
        caseTypeCode: "immigration",
        ownerUserId: "user-1",
        orgId: "org-1",
      }),
    /Lead not found/,
  );
});
