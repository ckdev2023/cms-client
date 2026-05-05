import test from "node:test";
import assert from "node:assert/strict";
import { BadRequestException } from "@nestjs/common";
import type { Pool } from "pg";

import { GeneratedDocumentsService } from "./generatedDocuments.service";
import type { TimelineService } from "../timeline/timeline.service";
import { GENERATED_DOCUMENT_ERROR_CODES } from "../cases/cases.types-generated-docs";

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

function makeServiceWithExistingStatus(existingStatus: string) {
  const pool = makePool((sql) => {
    if (sql.includes("from generated_documents") && sql.includes("limit 1")) {
      return ok([makeGdRow({ status: existingStatus })]);
    }
    if (sql.includes("gen_u.name")) {
      return ok([makeGdRow({ status: existingStatus })]);
    }
    if (sql.includes("update generated_documents")) {
      return ok([], 1);
    }
    return ok([]);
  });
  return new GeneratedDocumentsService(pool, makeTimeline());
}

// ─── Status transition whitelist: allowed transitions ────────────

void test("update allows draft → draft", async () => {
  const svc = makeServiceWithExistingStatus("draft");
  const dto = await svc.update(ctx(), GD_ID, { status: "draft" });
  assert.equal(dto.status, "draft");
});

void test("update allows draft → final", async () => {
  const svc = makeServiceWithExistingStatus("draft");
  const dto = await svc.update(ctx(), GD_ID, { status: "final" });
  assert.ok(dto);
});

void test("update allows final → final", async () => {
  const svc = makeServiceWithExistingStatus("final");
  const dto = await svc.update(ctx(), GD_ID, { status: "final" });
  assert.ok(dto);
});

void test("update allows final → exported", async () => {
  const svc = makeServiceWithExistingStatus("final");
  const dto = await svc.update(ctx(), GD_ID, { status: "exported" });
  assert.ok(dto);
});

void test("update allows exported → exported", async () => {
  const svc = makeServiceWithExistingStatus("exported");
  const dto = await svc.update(ctx(), GD_ID, { status: "exported" });
  assert.ok(dto);
});

// ─── Status transition whitelist: rejected transitions ───────────

void test("update rejects draft → exported (skip not allowed)", async () => {
  const svc = makeServiceWithExistingStatus("draft");
  await assert.rejects(
    () => svc.update(ctx(), GD_ID, { status: "exported" }),
    (e) => {
      assert.ok(e instanceof BadRequestException);
      assert.ok(
        e.message.includes(
          GENERATED_DOCUMENT_ERROR_CODES.GD_INVALID_TRANSITION,
        ),
      );
      assert.ok(e.message.includes("draft"));
      assert.ok(e.message.includes("exported"));
      return true;
    },
  );
});

void test("update rejects final → draft (rollback not allowed)", async () => {
  const svc = makeServiceWithExistingStatus("final");
  await assert.rejects(
    () => svc.update(ctx(), GD_ID, { status: "draft" }),
    (e) => {
      assert.ok(e instanceof BadRequestException);
      assert.ok(
        e.message.includes(
          GENERATED_DOCUMENT_ERROR_CODES.GD_INVALID_TRANSITION,
        ),
      );
      return true;
    },
  );
});

void test("update rejects exported → draft (rollback not allowed)", async () => {
  const svc = makeServiceWithExistingStatus("exported");
  await assert.rejects(
    () => svc.update(ctx(), GD_ID, { status: "draft" }),
    (e) => {
      assert.ok(e instanceof BadRequestException);
      assert.ok(
        e.message.includes(
          GENERATED_DOCUMENT_ERROR_CODES.GD_INVALID_TRANSITION,
        ),
      );
      return true;
    },
  );
});

void test("update rejects exported → final (rollback not allowed)", async () => {
  const svc = makeServiceWithExistingStatus("exported");
  await assert.rejects(
    () => svc.update(ctx(), GD_ID, { status: "final" }),
    (e) => {
      assert.ok(e instanceof BadRequestException);
      assert.ok(
        e.message.includes(
          GENERATED_DOCUMENT_ERROR_CODES.GD_INVALID_TRANSITION,
        ),
      );
      return true;
    },
  );
});
