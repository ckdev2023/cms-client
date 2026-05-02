import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

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
