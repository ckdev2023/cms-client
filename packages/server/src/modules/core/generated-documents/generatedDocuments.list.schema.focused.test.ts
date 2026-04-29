import test from "node:test";
import assert from "node:assert/strict";
import type { Pool } from "pg";

import { GeneratedDocumentsService } from "./generatedDocuments.service";
import type { TimelineService } from "../timeline/timeline.service";

const ORG_ID = "00000000-0000-4000-8000-000000000000";
const USER_ID = "00000000-0000-4000-8000-000000000001";
const CASE_ID = "00000000-0000-4000-8000-000000000002";
const GD_ID = "00000000-0000-4000-8000-000000000005";

const isTxSql = (s: string) =>
  /^(begin|commit|rollback|select set_config)/.test(s.trim().toLowerCase());

function makeGdRow(overrides: Record<string, unknown> = {}) {
  return {
    id: GD_ID,
    org_id: ORG_ID,
    case_id: CASE_ID,
    template_id: null,
    title: "申請書",
    version_no: 1,
    output_format: "pdf",
    file_url: null,
    status: "draft",
    generated_by: USER_ID,
    approved_by: null,
    generated_at: "2026-01-01T00:00:00.000Z",
    approved_at: null,
    generated_by_display_name: "Admin User",
    approved_by_display_name: null,
    ...overrides,
  };
}

type QueryFn = (
  sql: string,
  params?: unknown[],
) => Promise<{ rows: unknown[]; rowCount: number }>;

const ok = (rows: unknown[] = [], rowCount = rows.length) =>
  Promise.resolve({ rows, rowCount });

function makePool(qf: QueryFn) {
  return {
    connect: () =>
      Promise.resolve({
        query: (s: string, p?: unknown[]) => (isTxSql(s) ? ok() : qf(s, p)),
        release: () => undefined,
      }),
  } as unknown as Pool;
}

function makeTimeline(): TimelineService {
  return { write: () => Promise.resolve() } as unknown as TimelineService;
}

function ctx() {
  return { orgId: ORG_ID, userId: USER_ID, role: "staff" as const };
}

// ─── list SQL schema assertions ─────────────────────────────────

void test("list SQL selects gen_u.name and apr_u.name, not display_name", async () => {
  const captured: { sql: string; params?: unknown[] }[] = [];

  const pool = makePool((sql, params) => {
    captured.push({ sql, params });
    if (sql.includes("count(*)")) return ok([{ count: "1" }]);
    if (sql.includes("gen_u.name")) return ok([makeGdRow()]);
    return ok([]);
  });

  const svc = new GeneratedDocumentsService(pool, makeTimeline());
  await svc.list(ctx(), { caseId: CASE_ID });

  const selectCall = captured.find(
    (c) => c.sql.includes("gen_u.") && !c.sql.includes("count(*)"),
  );
  assert.ok(selectCall, "list must emit a SELECT with user join aliases");

  assert.ok(
    selectCall.sql.includes("gen_u.name"),
    "SELECT must reference gen_u.name (not gen_u.display_name)",
  );
  assert.ok(
    selectCall.sql.includes("apr_u.name"),
    "SELECT must reference apr_u.name (not apr_u.display_name)",
  );
  assert.ok(
    !selectCall.sql.includes("gen_u.display_name"),
    "SELECT must NOT reference gen_u.display_name",
  );
  assert.ok(
    !selectCall.sql.includes("apr_u.display_name"),
    "SELECT must NOT reference apr_u.display_name",
  );
});

void test("getDto SQL selects gen_u.name, not display_name", async () => {
  const captured: { sql: string; params?: unknown[] }[] = [];

  const pool = makePool((sql, params) => {
    captured.push({ sql, params });
    if (sql.includes("gen_u.name")) return ok([makeGdRow()]);
    return ok([]);
  });

  const svc = new GeneratedDocumentsService(pool, makeTimeline());
  await svc.getDto(ctx(), GD_ID);

  const selectCall = captured.find((c) => c.sql.includes("gen_u."));
  assert.ok(selectCall, "getDto must emit a SELECT with user join aliases");

  assert.ok(
    selectCall.sql.includes("gen_u.name"),
    "getDto SELECT must reference gen_u.name",
  );
  assert.ok(
    !selectCall.sql.includes("gen_u.display_name"),
    "getDto SELECT must NOT reference gen_u.display_name",
  );
});

void test("insertAndReturn (via create) selects u.name, not u.display_name", async () => {
  const captured: { sql: string; params?: unknown[] }[] = [];

  const pool = makePool((sql, params) => {
    captured.push({ sql, params });
    if (sql.includes("max(version_no)")) return ok([{ max_ver: 0 }]);
    if (sql.includes("insert into generated_documents"))
      return ok([makeGdRow()]);
    if (sql.includes("insert into timeline_events")) return ok([]);
    return ok([]);
  });

  const svc = new GeneratedDocumentsService(pool, makeTimeline());
  await svc.create(ctx(), {
    caseId: CASE_ID,
    title: "テスト文書",
    outputFormat: "pdf",
  });

  const insertCall = captured.find((c) =>
    c.sql.includes("insert into generated_documents"),
  );
  assert.ok(insertCall, "create must emit an INSERT");

  assert.ok(
    insertCall.sql.includes("u.name"),
    "INSERT CTE must reference u.name (not u.display_name)",
  );
  assert.ok(
    !insertCall.sql.includes("u.display_name"),
    "INSERT CTE must NOT reference u.display_name",
  );
});
