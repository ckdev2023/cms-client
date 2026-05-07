/**
 * PG smoke test — customers.query buildCustomerDetailSelect / buildCustomerListSelect
 *
 * 验证：生成的 SQL 在真实 PG schema 上不出现解析期错误（column does not exist）。
 * 覆盖三种 case_names fallback fixture：
 *   1. case_name = null → resolved_name = 'displayName · caseTypeLabel'
 *   2. case_name = '' & metadata.caseTypeLabel = 'X' → resolved_name = 'displayName · X'
 *   3. case_name = '' & metadata 无 caseTypeLabel → resolved_name = 'displayName · case_type_code'
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
const CASE_ID_1 = "40000000-0000-4000-a000-0000000ca001";
const CASE_ID_2 = "40000000-0000-4000-a000-0000000ca002";
const CASE_ID_3 = "40000000-0000-4000-a000-0000000ca003";

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

  // Fixture 1: case_name = NULL → fallback to "田中太郎 · 家族滞在"
  await p.query(
    `INSERT INTO cases (id, org_id, customer_id, case_type_code, status, owner_user_id, business_phase, case_name, metadata)
     VALUES ($1, $2, $3, 'dependent_visa', 'open', $4, 'INTAKE', NULL, $5::jsonb) ON CONFLICT DO NOTHING`,
    [
      CASE_ID_1,
      ORG_ID,
      CUSTOMER_ID,
      USER_ID,
      JSON.stringify({ caseTypeLabel: "家族滞在" }),
    ],
  );

  // Fixture 2: case_name = '' + metadata.caseTypeLabel = '技術・人文知識・国際業務'
  await p.query(
    `INSERT INTO cases (id, org_id, customer_id, case_type_code, status, owner_user_id, business_phase, case_name, metadata)
     VALUES ($1, $2, $3, 'work', 'open', $4, 'INTAKE', '', $5::jsonb) ON CONFLICT DO NOTHING`,
    [
      CASE_ID_2,
      ORG_ID,
      CUSTOMER_ID,
      USER_ID,
      JSON.stringify({ caseTypeLabel: "技術・人文知識・国際業務" }),
    ],
  );

  // Fixture 3: case_name = '' + no metadata caseTypeLabel → fallback to case_type_code
  await p.query(
    `INSERT INTO cases (id, org_id, customer_id, case_type_code, status, owner_user_id, business_phase, case_name, metadata)
     VALUES ($1, $2, $3, 'business_manager_visa', 'open', $4, 'INTAKE', '', '{}'::jsonb) ON CONFLICT DO NOTHING`,
    [CASE_ID_3, ORG_ID, CUSTOMER_ID, USER_ID],
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

// ── 3. case_names fallback: null case_name → 'displayName · caseTypeLabel' ──

void test("case_names fallback: null case_name resolves to 'displayName · caseTypeLabel'", async (t) => {
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
    `expected 3 case_names, got ${String(caseNames.length)}`,
  );

  const hasMetadataLabel = caseNames.some((n) => n.includes("家族滞在"));
  assert.ok(
    hasMetadataLabel,
    `expected one name to contain '家族滞在' (metadata fallback), got: ${JSON.stringify(caseNames)}`,
  );
});

// ── 4. case_names fallback: empty case_name + metadata.caseTypeLabel ──

void test("case_names fallback: empty case_name with metadata.caseTypeLabel uses label", async (t) => {
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
  const hasWorkLabel = caseNames.some((n) =>
    n.includes("技術・人文知識・国際業務"),
  );
  assert.ok(
    hasWorkLabel,
    `expected one name to contain '技術・人文知識・国際業務' (metadata caseTypeLabel), got: ${JSON.stringify(caseNames)}`,
  );
});

// ── 5. case_names fallback: empty case_name + no metadata → case_type_code ──

void test("case_names fallback: empty case_name without metadata.caseTypeLabel falls back to case_type_code", async (t) => {
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
  const hasCaseTypeCode = caseNames.some((n) =>
    n.includes("business_manager_visa"),
  );
  assert.ok(
    hasCaseTypeCode,
    `expected one name to contain 'business_manager_visa' (case_type_code fallback), got: ${JSON.stringify(caseNames)}`,
  );
});
