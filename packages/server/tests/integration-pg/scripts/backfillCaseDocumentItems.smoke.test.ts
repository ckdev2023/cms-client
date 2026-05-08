/**
 * integration-pg — backfillCaseDocumentItems
 * 真 PG smoke: BACKFILL_QUERY + applyBackfill が document_items を
 * requirement_blueprint から正しく再構築することを検証。
 */

import test, { after, before, beforeEach } from "node:test";
import assert from "node:assert/strict";

import {
  getTestPool,
  closeTestPool,
  migrateAndSeed,
  truncateAllBusinessTables,
} from "../setup";

import {
  applyBackfill,
  BACKFILL_QUERY,
  type BackfillCaseRow,
} from "../../../src/scripts/backfillCaseDocumentItems";

before(async () => {
  await migrateAndSeed();
});

beforeEach(async () => {
  await truncateAllBusinessTables();
});

after(async () => {
  await closeTestPool();
});

const ORG_ID = "bf000000-0000-4000-a000-000000000001";
const USER_ID = "bf000000-0000-4000-a000-000000000010";
const ROLE_ID = "bf000000-0000-4000-a000-00000000a001";
const CUSTOMER_ID = "bf000000-0000-4000-a000-c00000000001";
const CASE_A = "bf000000-0000-4000-a000-ca5e00000001";
const CASE_B = "bf000000-0000-4000-a000-ca5e00000002";
const TEMPLATE_ID = "bf000000-0000-4000-a000-7e0100000001";

const WORK_BLUEPRINT = {
  version: 1,
  items: [
    {
      code: "passport_copy",
      name: "パスポートコピー",
      ownerSide: "applicant",
      category: "identity",
      requiredFlag: true,
    },
    {
      code: "resume",
      name: "履歴書",
      ownerSide: "applicant",
      category: "career",
      requiredFlag: true,
    },
    {
      code: "photo",
      name: "証明写真",
      ownerSide: "applicant",
      category: "identity",
      requiredFlag: true,
    },
    {
      code: "degree_cert",
      name: "卒業証明書",
      ownerSide: "applicant",
      category: "career",
      requiredFlag: true,
    },
    {
      code: "employment_contract",
      name: "雇用契約書",
      ownerSide: "company",
      category: "employment",
      requiredFlag: true,
    },
    {
      code: "company_registry",
      name: "登記簿謄本",
      ownerSide: "company",
      category: "company",
      requiredFlag: true,
    },
    {
      code: "tax_cert",
      name: "納税証明書",
      ownerSide: "company",
      category: "company",
      requiredFlag: true,
    },
    {
      code: "financial_statement",
      name: "決算報告書",
      ownerSide: "company",
      category: "company",
      requiredFlag: false,
    },
    {
      code: "floor_plan",
      name: "事務所の見取り図",
      ownerSide: "company",
      category: "office",
      requiredFlag: false,
    },
    {
      code: "reason_statement",
      name: "申請理由書",
      ownerSide: "applicant",
      category: "application",
      requiredFlag: true,
      providedByRole: "agent",
    },
    {
      code: "cover_letter",
      name: "送付状",
      ownerSide: "applicant",
      category: "application",
      requiredFlag: true,
      providedByRole: "agent",
    },
  ],
};

async function seedBase() {
  const pool = getTestPool();
  await pool.query(
    `INSERT INTO organizations (id, name) VALUES ($1, 'test-org-docitems') ON CONFLICT DO NOTHING`,
    [ORG_ID],
  );
  await pool.query(
    `INSERT INTO roles (id, org_id, code, name, is_system)
     VALUES ($1, $2, 'owner', 'Owner', true) ON CONFLICT DO NOTHING`,
    [ROLE_ID, ORG_ID],
  );
  await pool.query(
    `INSERT INTO users (id, org_id, email, name, role_id)
     VALUES ($1, $2, 'docitems@test.com', 'DocItems Tester', $3) ON CONFLICT DO NOTHING`,
    [USER_ID, ORG_ID, ROLE_ID],
  );
  await pool.query(
    `INSERT INTO customers (id, org_id, type, base_profile)
     VALUES ($1, $2, 'individual', '{}'::jsonb) ON CONFLICT DO NOTHING`,
    [CUSTOMER_ID, ORG_ID],
  );
}

async function insertCase(
  id: string,
  caseTypeCode: string,
  metadata: Record<string, unknown> = {},
) {
  const pool = getTestPool();
  await pool.query(
    `INSERT INTO cases (id, org_id, customer_id, case_type_code, status, owner_user_id, business_phase, metadata)
     VALUES ($1, $2, $3, $4, 'open', $5, 'WAITING_MATERIAL', $6::jsonb)
     ON CONFLICT DO NOTHING`,
    [id, ORG_ID, CUSTOMER_ID, caseTypeCode, USER_ID, JSON.stringify(metadata)],
  );
}

async function insertTemplate(
  id: string,
  caseType: string,
  blueprint: unknown,
) {
  const pool = getTestPool();
  await pool.query(
    `INSERT INTO case_templates (id, org_id, template_name, case_type, requirement_blueprint, active_flag)
     VALUES ($1, $2, $3, $4, $5::jsonb, true)
     ON CONFLICT DO NOTHING`,
    [id, ORG_ID, `${caseType} template`, caseType, JSON.stringify(blueprint)],
  );
}

async function insertDocumentItem(caseId: string, code: string, name: string) {
  const pool = getTestPool();
  await pool.query(
    `INSERT INTO document_items (org_id, case_id, checklist_item_code, name, status, owner_side)
     VALUES ($1, $2, $3, $4, 'pending', 'applicant')`,
    [ORG_ID, caseId, code, name],
  );
}

async function getDocCount(caseId: string): Promise<number> {
  const pool = getTestPool();
  const { rows } = await pool.query<{ count: string }>(
    `SELECT count(*)::text AS count FROM document_items WHERE case_id = $1`,
    [caseId],
  );
  return Number(rows[0].count);
}

// ── 1. seed work case + work template (11 items) → applyBackfill → doc_count=11 ──

void test("applyBackfill creates 11 document_items from work template blueprint", async () => {
  const pool = getTestPool();
  await seedBase();
  await insertCase(CASE_A, "work");
  await insertTemplate(TEMPLATE_ID, "work", WORK_BLUEPRINT);

  const { rows } = await pool.query<BackfillCaseRow>(BACKFILL_QUERY);
  assert.ok(rows.length >= 1, "BACKFILL_QUERY returns at least one row");

  const target = rows.find((r) => r.case_id === CASE_A);
  assert.ok(target, "Should include CASE_A");

  await applyBackfill(pool, rows, false);

  const docCount = await getDocCount(CASE_A);
  assert.equal(docCount, 11, "doc_count should be 11 after backfill");
});

// ── 2. DRY_RUN=1 → updated=1 但 doc_count 仍 0 + stdout 含 [dry-run] case=... ──

void test("applyBackfill dry-run does not write document_items to DB", async () => {
  const pool = getTestPool();
  await seedBase();
  await insertCase(CASE_A, "work");
  await insertTemplate(TEMPLATE_ID, "work", WORK_BLUEPRINT);

  const { rows } = await pool.query<BackfillCaseRow>(BACKFILL_QUERY);

  const stdoutChunks: string[] = [];
  const originalWrite = process.stdout.write.bind(process.stdout);
  process.stdout.write = ((chunk: string | Uint8Array) => {
    stdoutChunks.push(String(chunk));
    return true;
  }) as typeof process.stdout.write;

  try {
    const { updated, skipped } = await applyBackfill(pool, rows, true);
    assert.equal(updated, 1, "dry-run reports 1 would-be update");
    assert.equal(skipped, 0, "nothing skipped");
  } finally {
    process.stdout.write = originalWrite;
  }

  const output = stdoutChunks.join("");
  assert.ok(
    output.includes(`[dry-run] case=${CASE_A}`),
    `stdout should contain [dry-run] case=${CASE_A}, got: ${output}`,
  );

  const docCount = await getDocCount(CASE_A);
  assert.equal(docCount, 0, "doc_count should still be 0 after dry-run");
});

// ── 3. case already has doc_items → BACKFILL_QUERY NOT EXISTS 過濾 → 不重複挿入 ──

void test("BACKFILL_QUERY excludes cases that already have document_items (idempotent)", async () => {
  const pool = getTestPool();
  await seedBase();
  await insertCase(CASE_B, "work");
  await insertTemplate(TEMPLATE_ID, "work", WORK_BLUEPRINT);

  await insertDocumentItem(CASE_B, "passport_copy", "パスポートコピー");
  await insertDocumentItem(CASE_B, "resume", "履歴書");
  await insertDocumentItem(CASE_B, "photo", "証明写真");
  await insertDocumentItem(CASE_B, "degree_cert", "卒業証明書");
  await insertDocumentItem(CASE_B, "employment_contract", "雇用契約書");

  const { rows } = await pool.query<BackfillCaseRow>(BACKFILL_QUERY);
  const match = rows.find((r) => r.case_id === CASE_B);
  assert.equal(
    match,
    undefined,
    "CASE_B should NOT appear in BACKFILL_QUERY results",
  );

  await applyBackfill(pool, rows, false);

  const docCount = await getDocCount(CASE_B);
  assert.equal(
    docCount,
    5,
    "doc_count should remain 5 (no duplicates inserted)",
  );
});
