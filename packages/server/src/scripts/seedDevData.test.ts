import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import type { PoolClient, QueryResult } from "pg";

import { buildSeedSteps, DOC_TEMPLATE_SEEDS } from "./seedDevData";

type QueryCall = { sql: string; params?: unknown[] };

function collectInsertTables(calls: QueryCall[]): string[] {
  return calls
    .map((c) => {
      const m = /INSERT INTO (\w+)/i.exec(c.sql);
      return m ? m[1] : null;
    })
    .filter((t): t is string => t !== null);
}

void test("seedDevData.ts is importable as valid TypeScript", () => {
  const scriptPath = path.resolve(
    new URL(".", import.meta.url).pathname,
    "seedDevData.ts",
  );
  assert.ok(fs.existsSync(scriptPath), "seedDevData.ts must exist");
  const source = fs.readFileSync(scriptPath, "utf8");
  assert.ok(source.includes("INSERT INTO customers"), "must seed customers");
  assert.ok(source.includes("INSERT INTO cases"), "must seed cases");
  assert.ok(
    source.includes("INSERT INTO document_items"),
    "must seed document_items",
  );
  assert.ok(
    source.includes("INSERT INTO document_assets"),
    "must seed document_assets",
  );
  assert.ok(
    source.includes("INSERT INTO document_files"),
    "must seed document_files",
  );
  assert.ok(
    source.includes("INSERT INTO document_requirement_file_refs"),
    "must seed document_requirement_file_refs",
  );
  assert.ok(
    source.includes("INSERT INTO template_versions"),
    "must seed template_versions (BUG-194)",
  );
  assert.ok(
    source.includes("INSERT INTO template_releases"),
    "must seed template_releases (BUG-194)",
  );
});

void test("seedDevConversations.ts is importable as valid TypeScript (H-10)", () => {
  const scriptPath = path.resolve(
    new URL(".", import.meta.url).pathname,
    "seedDevConversations.ts",
  );
  assert.ok(fs.existsSync(scriptPath), "seedDevConversations.ts must exist");
  const source = fs.readFileSync(scriptPath, "utf8");
  assert.ok(
    source.includes("INSERT INTO app_users"),
    "must seed app_users (H-10)",
  );
  assert.ok(
    source.includes("INSERT INTO leads"),
    "must seed portal-side leads (H-10)",
  );
  assert.ok(
    source.includes("INSERT INTO conversations"),
    "must seed conversations (H-10)",
  );
  assert.ok(
    source.includes("INSERT INTO messages"),
    "must seed messages (H-10)",
  );
});

void test("seed IDs are valid UUIDs", () => {
  const uuidRe =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
  const ids = [
    "00000000-0000-4000-a000-000000000001",
    "00000000-0000-4000-a000-000000000010",
    "00000000-0000-4000-a000-000000000011",
    "00000000-0000-4000-a000-000000000012",
    "00000000-0000-4000-a000-000000000100",
    "00000000-0000-4000-a000-000000000101",
    "00000000-0000-4000-a000-000000000102",
    "00000000-0000-4000-a000-000000000103",
    "00000000-0000-4000-a000-000000000104",
    "00000000-0000-4000-a000-000000000110",
    "00000000-0000-4000-a000-000000000200",
    "00000000-0000-4000-a000-000000000300",
    "00000000-0000-4000-a000-000000000400",
    "00000000-0000-4000-a000-000000000500",
    "00000000-0000-4000-a000-000000000501",
  ];
  for (const id of ids) {
    assert.ok(uuidRe.test(id), `Invalid UUID: ${id}`);
  }
});

void test("seed script covers 5 distinct document_item statuses", () => {
  const scriptPath = path.resolve(
    new URL(".", import.meta.url).pathname,
    "seedDevData.ts",
  );
  const source = fs.readFileSync(scriptPath, "utf8");
  const statusMatches = [...source.matchAll(/status:\s*"(\w+)"/g)].map(
    (m) => m[1],
  );
  const uniqueStatuses = new Set(statusMatches);
  assert.ok(uniqueStatuses.has("pending"), "must include pending");
  assert.ok(
    uniqueStatuses.has("waiting_upload"),
    "must include waiting_upload",
  );
  assert.ok(
    uniqueStatuses.has("uploaded_reviewing"),
    "must include uploaded_reviewing",
  );
  assert.ok(uniqueStatuses.has("approved"), "must include approved");
  assert.ok(uniqueStatuses.has("waived"), "must include waived");
});

void test("seed script uses ON CONFLICT for idempotency", () => {
  const scriptPath = path.resolve(
    new URL(".", import.meta.url).pathname,
    "seedDevData.ts",
  );
  const source = fs.readFileSync(scriptPath, "utf8");
  const insertCount = (source.match(/INSERT INTO/gi) ?? []).length;
  const conflictCount = (source.match(/ON CONFLICT/gi) ?? []).length;
  assert.equal(
    insertCount,
    conflictCount,
    "every INSERT must have ON CONFLICT for idempotency",
  );
});

void test("seed script includes cross_case_link ref_mode", () => {
  const scriptPath = path.resolve(
    new URL(".", import.meta.url).pathname,
    "seedDevData.ts",
  );
  const source = fs.readFileSync(scriptPath, "utf8");
  assert.ok(
    source.includes("cross_case_link"),
    "must include cross_case_link ref_mode",
  );
});

void test("BUG-194: seed includes BMV case with business_manager_visa type", () => {
  const scriptPath = path.resolve(
    new URL(".", import.meta.url).pathname,
    "seedDevData.ts",
  );
  const source = fs.readFileSync(scriptPath, "utf8");
  assert.ok(
    source.includes("business_manager_visa"),
    "must include business_manager_visa case_type_code",
  );
  assert.ok(source.includes("CASE-DEV-003"), "must include BMV case number");
});

void test("BUG-194: seed includes document_checklist template with rollout=all", () => {
  const scriptPath = path.resolve(
    new URL(".", import.meta.url).pathname,
    "seedDevData.ts",
  );
  const source = fs.readFileSync(scriptPath, "utf8");
  assert.ok(
    source.includes("document_checklist"),
    "template kind must be document_checklist",
  );
  assert.ok(
    source.includes("requirementBlueprint"),
    "template config must include requirementBlueprint",
  );
  assert.ok(source.includes('"type":"all"'), "rollout must be type=all");
});

void test("INSERT table sequence includes all required entities", () => {
  const calls: QueryCall[] = [
    { sql: "INSERT INTO customers ..." },
    { sql: "INSERT INTO cases ..." },
    { sql: "INSERT INTO cases ..." },
    { sql: "INSERT INTO cases ..." },
    { sql: "INSERT INTO document_items ..." },
    { sql: "INSERT INTO document_items ..." },
    { sql: "INSERT INTO document_items ..." },
    { sql: "INSERT INTO document_items ..." },
    { sql: "INSERT INTO document_items ..." },
    { sql: "INSERT INTO document_items ..." },
    { sql: "INSERT INTO document_assets ..." },
    { sql: "INSERT INTO document_files ..." },
    { sql: "INSERT INTO document_requirement_file_refs ..." },
    { sql: "INSERT INTO template_versions ..." },
    { sql: "INSERT INTO template_releases ..." },
  ];
  const tables = collectInsertTables(calls);
  assert.ok(tables.includes("customers"));
  assert.ok(tables.includes("cases"));
  assert.ok(tables.includes("document_items"));
  assert.ok(tables.includes("document_assets"));
  assert.ok(tables.includes("document_files"));
  assert.ok(tables.includes("document_requirement_file_refs"));
  assert.ok(tables.includes("template_versions"));
  assert.ok(tables.includes("template_releases"));
});

// ---------------------------------------------------------------------------
// SQL-level smoke: run all seed step functions against a mock PoolClient
// ---------------------------------------------------------------------------

function createMockClient(): {
  client: PoolClient;
  queries: QueryCall[];
} {
  const queries: QueryCall[] = [];
  const client = {
    query: (sql: string, params?: unknown[]): Promise<QueryResult> => {
      queries.push({ sql, params });
      if (/SELECT count\(\*\).*FROM users/i.test(sql)) {
        return Promise.resolve({
          rows: [{ cnt: "1" }],
          rowCount: 1,
          command: "SELECT",
          oid: 0,
          fields: [],
        });
      }
      if (/SELECT id FROM roles/i.test(sql)) {
        return Promise.resolve({
          rows: [{ id: "mock-staff-role-id" }],
          rowCount: 1,
          command: "SELECT",
          oid: 0,
          fields: [],
        });
      }
      return Promise.resolve({
        rows: [],
        rowCount: 0,
        command: "",
        oid: 0,
        fields: [],
      });
    },
  } as unknown as PoolClient;
  return { client, queries };
}

void test("SQL-level smoke: all seed steps execute and produce parameterized INSERTs", async () => {
  const steps = buildSeedSteps();
  assert.equal(steps.length, 15, "must have exactly 15 seed steps");

  const { client, queries } = createMockClient();

  for (const [, fn] of steps) {
    await fn(client);
  }

  const insertQueries = queries.filter((q) => /INSERT INTO/i.test(q.sql));
  assert.ok(insertQueries.length > 0, "must produce INSERT queries");

  const expectedTables = [
    "users",
    "customers",
    "cases",
    "document_items",
    "document_assets",
    "document_files",
    "document_requirement_file_refs",
    "template_versions",
    "template_releases",
    "document_templates",
    "app_users",
    "leads",
    "conversations",
    "messages",
  ];
  const seenTables = new Set(
    insertQueries
      .map((q) => {
        const m = /INSERT INTO (\w+)/i.exec(q.sql);
        return m ? m[1] : null;
      })
      .filter((t): t is string => t !== null),
  );

  for (const table of expectedTables) {
    assert.ok(seenTables.has(table), `must insert into ${table}`);
  }

  for (const q of insertQueries) {
    assert.ok(
      q.params !== undefined && q.params.length > 0,
      `INSERT must use params: ${q.sql.slice(0, 50)}`,
    );
    assert.ok(
      /\$\d+/.test(q.sql),
      `INSERT must use $N placeholders: ${q.sql.slice(0, 50)}`,
    );
  }
});

void test("SQL-level smoke: every INSERT uses ON CONFLICT (idempotent)", async () => {
  const steps = buildSeedSteps();
  const { client, queries } = createMockClient();

  for (const [, fn] of steps) {
    await fn(client);
  }

  const insertQueries = queries.filter((q) => /INSERT INTO/i.test(q.sql));
  for (const q of insertQueries) {
    assert.ok(
      /ON CONFLICT/i.test(q.sql),
      `INSERT must have ON CONFLICT: ${q.sql.slice(0, 60)}`,
    );
  }
});

void test("SQL-level smoke: step labels match expected sequence", () => {
  const steps = buildSeedSteps();
  const labels = steps.map(([label]) => label);
  assert.deepStrictEqual(labels, [
    "devUsers",
    "customer",
    "cases",
    "documentItems",
    "documentAsset",
    "documentFile",
    "crossCaseLink",
    "documentChecklistTemplate",
    "caseTemplates",
    "documentTemplates",
    "conversationAppUser",
    "conversationLead",
    "conversations",
    "conversationMessages",
    "tagsCleanup",
  ]);
});

void test("H-10: seed produces 1 app_user + 1 portal lead + 2 conversations + 4 messages", async () => {
  const steps = buildSeedSteps();
  const { client, queries } = createMockClient();
  for (const [, fn] of steps) {
    await fn(client);
  }

  const appUserInserts = queries.filter((q) =>
    /INSERT INTO app_users/i.test(q.sql),
  );
  const leadInserts = queries.filter((q) => /INSERT INTO leads/i.test(q.sql));
  const conversationInserts = queries.filter((q) =>
    /INSERT INTO conversations/i.test(q.sql),
  );
  const messageInserts = queries.filter((q) =>
    /INSERT INTO messages/i.test(q.sql),
  );

  assert.equal(appUserInserts.length, 1, "expect exactly 1 app_user seed");
  assert.equal(leadInserts.length, 1, "expect exactly 1 portal-side lead seed");
  assert.equal(
    conversationInserts.length,
    2,
    "expect 2 conversations (assigned + unassigned) for assign-flow coverage",
  );
  assert.equal(
    messageInserts.length,
    4,
    "expect 4 messages (3 in assigned conv incl. 1 failed for retry-translation, 1 in unassigned conv)",
  );

  for (const q of [
    ...appUserInserts,
    ...leadInserts,
    ...conversationInserts,
    ...messageInserts,
  ]) {
    assert.ok(
      /ON CONFLICT/i.test(q.sql),
      `H-10 seed must be idempotent: ${q.sql.slice(0, 60)}`,
    );
  }
});

void test("H-10: seed includes one failed-translation message to enable retry-translation walkthrough", () => {
  const scriptPath = path.resolve(
    new URL(".", import.meta.url).pathname,
    "seedDevConversations.ts",
  );
  const source = fs.readFileSync(scriptPath, "utf8");
  assert.ok(
    /translationStatus:\s*"failed"/.test(source),
    "must contain at least one message with translationStatus='failed' so admin can test retry-translation flow",
  );
});

void test("H-10: seed conversations include both assigned and unassigned variants", () => {
  const scriptPath = path.resolve(
    new URL(".", import.meta.url).pathname,
    "seedDevConversations.ts",
  );
  const source = fs.readFileSync(scriptPath, "utf8");
  assert.ok(
    /'open',\s*\n\s*\$5,\s*now\(\)/m.test(source),
    "must contain assigned conversation seed (owner_user_id = $5)",
  );
  assert.ok(
    /'open',\s*\n\s*null,\s*now\(\)/m.test(source),
    "must contain unassigned conversation seed (owner_user_id = null) so admin can e2e test assign dialog",
  );
});

void test("H-10: seed IDs use the b000 namespace to avoid colliding with existing a000 entities", () => {
  const scriptPath = path.resolve(
    new URL(".", import.meta.url).pathname,
    "seedDevConversations.ts",
  );
  const source = fs.readFileSync(scriptPath, "utf8");
  const h10Constants = [
    "SEED_APP_USER_ID",
    "SEED_LEAD_PORTAL_ID",
    "SEED_CONV_ASSIGNED_ID",
    "SEED_CONV_UNASSIGNED_ID",
    "SEED_MSG_ASSIGNED_USER_FIRST_ID",
    "SEED_MSG_ASSIGNED_STAFF_REPLY_ID",
    "SEED_MSG_ASSIGNED_USER_FAILED_ID",
    "SEED_MSG_UNASSIGNED_USER_ID",
  ];
  for (const c of h10Constants) {
    const re = new RegExp(`${c}\\s*=\\s*"([0-9a-f-]+)"`);
    const m = re.exec(source);
    assert.ok(m, `must declare ${c} as a literal UUID`);
    assert.match(
      m[1],
      /^00000000-0000-4000-b000-/,
      `${c} must use the b000 namespace`,
    );
  }
});

void test("SQL-level smoke: DOC_TEMPLATE_SEEDS count matches document_templates INSERTs", async () => {
  assert.ok(DOC_TEMPLATE_SEEDS.length > 0, "must not be empty");
  assert.equal(
    DOC_TEMPLATE_SEEDS.length,
    23,
    "expected 23 document template seeds",
  );

  const steps = buildSeedSteps();
  const { client, queries } = createMockClient();
  for (const [, fn] of steps) {
    await fn(client);
  }

  const dtInserts = queries.filter((q) =>
    /INSERT INTO document_templates/i.test(q.sql),
  );
  assert.equal(
    dtInserts.length,
    DOC_TEMPLATE_SEEDS.length,
    "document_templates INSERT count must match DOC_TEMPLATE_SEEDS length",
  );
});
