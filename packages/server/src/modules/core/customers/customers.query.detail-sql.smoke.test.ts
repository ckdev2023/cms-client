/**
 * PG smoke test — customers.query buildCustomerDetailSelect / buildCustomerListSelect
 *
 * 验证：生成的 SQL 在真实 PG schema 上不出现解析期错误（column does not exist）。
 * 覆盖 case_names fallback 三种 fixture（与 C-1
 * CustomerAdapterCaseMapper 的 caseName → caseNumber → "" 链路对齐）：
 *   1. case_name 非空              → resolved_name = case_name
 *   2. case_name = '' & case_no    → resolved_name = case_no（不暴露 case_type_code）
 *   3. case_name = '' & case_no='' → resolved_name = ''（前端再走 "—" 占位）
 *
 * 运行方式：
 *   docker compose -f docker-compose.integration.yml up -d
 *   npm run test:integration-pg
 *
 * 当 PG 不可达时自动跳过，不阻塞 npm run test。
 */

import path from "node:path";
import test, { after, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { Pool } from "pg";

import {
  listMigrations,
  readSql,
  ensureMigrationsTable,
  applyMigration,
  getAppliedMigrationIds,
} from "../../../infra/db/runMigrationsLib";
import {
  buildCustomerDetailSelect,
  buildCustomerListSelect,
  buildCustomerListWhere,
} from "./customers.query";
import { createTenantDb } from "../tenancy/tenantDb";
import type { RequestContext } from "../tenancy/requestContext";

const DEFAULT_URL =
  process.env.TEST_DATABASE_URL ?? "postgres://localhost:5499/cms_test";
const MIGRATIONS_DIR = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  "../../../infra/db/migrations",
);

let pool: Pool | null = null;
let pgAvailable = false;

function getPool(): Pool {
  if (pool) return pool;
  pool = new Pool({
    connectionString: process.env.INTEGRATION_PG_URL ?? DEFAULT_URL,
    max: 3,
    idleTimeoutMillis: 5_000,
    statement_timeout: 30_000,
  });
  return pool;
}

async function migrateAll(): Promise<void> {
  const p = getPool();
  await ensureMigrationsTable(p);
  const applied = new Set(await getAppliedMigrationIds(p));
  const migrations = listMigrations(MIGRATIONS_DIR);
  for (const m of migrations) {
    if (applied.has(m.key)) continue;
    const sql = readSql(MIGRATIONS_DIR, m.upFile);
    await applyMigration(p, m.key, sql);
  }
}

async function truncateAll(): Promise<void> {
  const p = getPool();
  const result = await p.query<{ tablename: string }>(
    `select tablename from pg_tables
      where schemaname = 'public'
        and tablename <> 'schema_migrations'`,
  );
  const tables = result.rows.map((r) => `"${r.tablename}"`);
  if (tables.length > 0) {
    await p.query(`truncate ${tables.join(", ")} cascade`);
  }
}

before(async () => {
  try {
    const p = getPool();
    await p.query("select 1");
    await migrateAll();
    pgAvailable = true;
  } catch {
    pgAvailable = false;
  }
});

beforeEach(async () => {
  if (!pgAvailable) return;
  await truncateAll();
});

after(async () => {
  if (pool) {
    await pool.end();
    pool = null;
  }
});

const ORG_ID = "40000000-0000-4000-a000-000000000001";
const USER_ID = "40000000-0000-4000-a000-000000000010";
const ROLE_ID = "40000000-0000-4000-a000-00000000a001";
const CUSTOMER_ID = "40000000-0000-4000-a000-000000000c01";
const CUSTOMER_ID_NAMEJP = "40000000-0000-4000-a000-000000000c02";
const CASE_ID_1 = "40000000-0000-4000-a000-0000000ca001";
const CASE_ID_2 = "40000000-0000-4000-a000-0000000ca002";
const CASE_ID_3 = "40000000-0000-4000-a000-0000000ca003";
const CASE_ID_NAMEJP = "40000000-0000-4000-a000-0000000ca0a1";

const CTX: RequestContext = { orgId: ORG_ID, userId: USER_ID, role: "owner" };

async function seedFixtures(p: Pool) {
  await p.query(
    `INSERT INTO organizations (id, name) VALUES ($1, 'smoke-test-org') ON CONFLICT DO NOTHING`,
    [ORG_ID],
  );
  await p.query(
    `INSERT INTO roles (id, org_id, code, name, is_system)
     VALUES ($1, $2, 'owner', 'Owner', true) ON CONFLICT DO NOTHING`,
    [ROLE_ID, ORG_ID],
  );
  await p.query(
    `INSERT INTO users (id, org_id, email, name, role_id)
     VALUES ($1, $2, 'smoke-customer-query@test.com', 'Smoke Tester', $3)
     ON CONFLICT DO NOTHING`,
    [USER_ID, ORG_ID, ROLE_ID],
  );
  await p.query(
    `INSERT INTO customers (id, org_id, type, base_profile)
     VALUES ($1, $2, 'individual', $3::jsonb) ON CONFLICT DO NOTHING`,
    [
      CUSTOMER_ID,
      ORG_ID,
      JSON.stringify({ displayName: "田中太郎", ownerUserId: USER_ID }),
    ],
  );

  // Fixture 1: case_name 非空 → fallback 走第一支 case_name
  await p.query(
    `INSERT INTO cases (id, org_id, customer_id, case_type_code, status, owner_user_id, business_phase, case_name, case_no, metadata)
     VALUES ($1, $2, $3, 'dependent_visa', 'open', $4, 'INTAKE', '家族滞在更新', 'CASE-202605-0001', '{}'::jsonb) ON CONFLICT DO NOTHING`,
    [CASE_ID_1, ORG_ID, CUSTOMER_ID, USER_ID],
  );

  // Fixture 2: case_name = '' + case_no 非空 → fallback 走 case_no
  await p.query(
    `INSERT INTO cases (id, org_id, customer_id, case_type_code, status, owner_user_id, business_phase, case_name, case_no, metadata)
     VALUES ($1, $2, $3, 'work', 'open', $4, 'INTAKE', '', 'CASE-202605-0002', '{}'::jsonb) ON CONFLICT DO NOTHING`,
    [CASE_ID_2, ORG_ID, CUSTOMER_ID, USER_ID],
  );

  // Fixture 3: case_name = '' + case_no IS NULL → fallback 走 ""（避免暴露 case_type_code）
  await p.query(
    `INSERT INTO cases (id, org_id, customer_id, case_type_code, status, owner_user_id, business_phase, case_name, case_no, metadata)
     VALUES ($1, $2, $3, 'business_manager_visa', 'open', $4, 'INTAKE', '', NULL, '{}'::jsonb) ON CONFLICT DO NOTHING`,
    [CASE_ID_3, ORG_ID, CUSTOMER_ID, USER_ID],
  );

  // W-5 fixture：客户仅有 name_jp / name_cn（convertLeadToCustomer 写入路径），
  // 案件 case_name 为 NULL，case_no='CASE-202605-9999'。
  // 期望 case_names fallback 直接走 case_no，而不是退化成 visa key
  // `dependent_visa`（与 C-1 caseName → caseNumber → "" 设计一致）。
  await p.query(
    `INSERT INTO customers (id, org_id, type, base_profile)
     VALUES ($1, $2, 'individual', $3::jsonb) ON CONFLICT DO NOTHING`,
    [
      CUSTOMER_ID_NAMEJP,
      ORG_ID,
      JSON.stringify({
        name_jp: "R-FLOW-05 山田太郎",
        name_cn: "R-FLOW-05 山田太郎",
        ownerUserId: USER_ID,
      }),
    ],
  );
  await p.query(
    `INSERT INTO cases (id, org_id, customer_id, case_type_code, status, owner_user_id, business_phase, case_name, case_no, metadata)
     VALUES ($1, $2, $3, 'dependent_visa', 'open', $4, 'INTAKE', NULL, 'CASE-202605-9999', '{}'::jsonb) ON CONFLICT DO NOTHING`,
    [CASE_ID_NAMEJP, ORG_ID, CUSTOMER_ID_NAMEJP, USER_ID],
  );
}

function parseCaseNames(row: Record<string, unknown>): string[] {
  const raw = row.case_names;
  if (Array.isArray(raw)) return raw as string[];
  if (typeof raw === "string") return JSON.parse(raw) as string[];
  return [];
}

// ── 1. getCustomerRowById: no parse error ──

void test("getCustomerRowById executes without SQL parse error on real PG", async (t) => {
  if (!pgAvailable) {
    t.skip("integration PG not reachable");
    return;
  }

  const p = getPool();
  await seedFixtures(p);

  const tenantDb = createTenantDb(p, ORG_ID, USER_ID);
  const sql = `select ${buildCustomerDetailSelect("c")} from customers c
     where c.id = $1 and c.org_id = '${ORG_ID}' limit 1`;

  const result = await tenantDb.query<Record<string, unknown>>(sql, [
    CUSTOMER_ID,
  ]);
  assert.equal(result.rows.length, 1, "expected exactly 1 customer row");
});

// ── 2. listCustomers: no parse error ──

void test("customer list query executes without SQL parse error on real PG", async (t) => {
  if (!pgAvailable) {
    t.skip("integration PG not reachable");
    return;
  }

  const p = getPool();
  await seedFixtures(p);

  const tenantDb = createTenantDb(p, ORG_ID, USER_ID);
  const { whereClause, params } = buildCustomerListWhere(CTX, {});
  const listSql = `
    select ${buildCustomerListSelect("c")}
    from customers c
    ${whereClause}
    order by created_at desc, id desc
    limit $${String(params.length + 1)} offset $${String(params.length + 2)}
  `;

  const result = await tenantDb.query<Record<string, unknown>>(listSql, [
    ...params,
    50,
    0,
  ]);
  assert.ok(result.rows.length >= 1, "expected at least 1 row from list");
});

// ── 3. case_names fallback: case_name 非空 → 直接使用 case_name ──

void test("case_names fallback: non-empty case_name resolves to case_name itself", async (t) => {
  if (!pgAvailable) {
    t.skip("integration PG not reachable");
    return;
  }

  const p = getPool();
  await seedFixtures(p);

  const tenantDb = createTenantDb(p, ORG_ID, USER_ID);
  const result = await tenantDb.query<Record<string, unknown>>(
    `select ${buildCustomerDetailSelect("c")} from customers c
     where c.id = $1 and c.org_id = '${ORG_ID}' limit 1`,
    [CUSTOMER_ID],
  );

  const row = result.rows[0];
  assert.ok(row, "expected row");

  const caseNames = parseCaseNames(row);
  assert.equal(
    caseNames.length,
    3,
    `expected 3 case_names (one per fixture case), got ${String(caseNames.length)}`,
  );

  const hasCaseName = caseNames.some((n) => n === "家族滞在更新");
  assert.ok(
    hasCaseName,
    `expected one resolved name to equal '家族滞在更新' (case_name primary branch), got: ${JSON.stringify(caseNames)}`,
  );
});

// ── 4. case_names fallback: empty case_name + non-empty case_no → case_no ──

void test("case_names fallback: empty case_name with non-empty case_no resolves to case_no", async (t) => {
  if (!pgAvailable) {
    t.skip("integration PG not reachable");
    return;
  }

  const p = getPool();
  await seedFixtures(p);

  const tenantDb = createTenantDb(p, ORG_ID, USER_ID);
  const result = await tenantDb.query<Record<string, unknown>>(
    `select ${buildCustomerDetailSelect("c")} from customers c
     where c.id = $1 and c.org_id = '${ORG_ID}' limit 1`,
    [CUSTOMER_ID],
  );

  const row = result.rows[0];
  assert.ok(row, "expected row");

  const caseNames = parseCaseNames(row);
  const hasCaseNo = caseNames.some((n) => n === "CASE-202605-0002");
  assert.ok(
    hasCaseNo,
    `expected one resolved name to equal 'CASE-202605-0002' (case_no fallback), got: ${JSON.stringify(caseNames)}`,
  );
  const exposesVisaKey = caseNames.some((n) =>
    n.toLowerCase().includes("work"),
  );
  assert.ok(
    !exposesVisaKey,
    `expected case_names to NOT expose case_type_code 'work' visa key (W-5 guard), got: ${JSON.stringify(caseNames)}`,
  );
});

// ── 5. case_names fallback: empty case_name + null case_no → "" ──

void test("case_names fallback: empty case_name and null case_no resolves to empty string (no visa key leak)", async (t) => {
  if (!pgAvailable) {
    t.skip("integration PG not reachable");
    return;
  }

  const p = getPool();
  await seedFixtures(p);

  const tenantDb = createTenantDb(p, ORG_ID, USER_ID);
  const result = await tenantDb.query<Record<string, unknown>>(
    `select ${buildCustomerDetailSelect("c")} from customers c
     where c.id = $1 and c.org_id = '${ORG_ID}' limit 1`,
    [CUSTOMER_ID],
  );

  const row = result.rows[0];
  assert.ok(row, "expected row");

  const caseNames = parseCaseNames(row);
  const exposesVisaKey = caseNames.some((n) =>
    n.includes("business_manager_visa"),
  );
  assert.ok(
    !exposesVisaKey,
    `expected case_names to NOT expose case_type_code 'business_manager_visa' visa key (W-5 guard), got: ${JSON.stringify(caseNames)}`,
  );
  const hasEmpty = caseNames.includes("");
  assert.ok(
    hasEmpty,
    `expected one resolved name to be empty string when both case_name and case_no are empty, got: ${JSON.stringify(caseNames)}`,
  );
});

// ── 6. W-5 case_names fallback: customer with only name_jp/name_cn ──

void test("W-5: case_names falls back to case_no instead of bare visa key when customer only has name_jp/name_cn", async (t) => {
  if (!pgAvailable) {
    t.skip("integration PG not reachable");
    return;
  }

  const p = getPool();
  await seedFixtures(p);

  const tenantDb = createTenantDb(p, ORG_ID, USER_ID);
  const result = await tenantDb.query<Record<string, unknown>>(
    `select ${buildCustomerDetailSelect("c")} from customers c
     where c.id = $1 and c.org_id = '${ORG_ID}' limit 1`,
    [CUSTOMER_ID_NAMEJP],
  );

  const row = result.rows[0];
  assert.ok(row, "expected customer row");

  const caseNames = parseCaseNames(row);
  assert.equal(
    caseNames.length,
    1,
    `expected exactly 1 case_name, got ${String(caseNames.length)}`,
  );

  const resolved = caseNames[0] ?? "";
  assert.equal(
    resolved,
    "CASE-202605-9999",
    `expected resolved name to equal case_no 'CASE-202605-9999' (caseName→caseNumber→"" chain), got: ${resolved}`,
  );
  assert.ok(
    !resolved.includes("dependent_visa"),
    `expected resolved name to NOT contain visa key 'dependent_visa' (W-5 visa key leak guard), got: ${resolved}`,
  );
});
