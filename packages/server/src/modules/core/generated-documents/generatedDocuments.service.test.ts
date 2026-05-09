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
    template_version_no_snapshot: null,
    template_doc_type: null,
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

void test("update allows final → exporting", async () => {
  const svc = makeServiceWithExistingStatus("final");
  const dto = await svc.update(ctx(), GD_ID, { status: "exporting" });
  assert.ok(dto);
});

void test("update allows exporting → exported", async () => {
  const svc = makeServiceWithExistingStatus("exporting");
  const dto = await svc.update(ctx(), GD_ID, { status: "exported" });
  assert.ok(dto);
});

void test("update allows exporting → export_failed", async () => {
  const svc = makeServiceWithExistingStatus("exporting");
  const dto = await svc.update(ctx(), GD_ID, { status: "export_failed" });
  assert.ok(dto);
});

void test("update allows export_failed → exporting (retry)", async () => {
  const svc = makeServiceWithExistingStatus("export_failed");
  const dto = await svc.update(ctx(), GD_ID, { status: "exporting" });
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

void test("update rejects final → exported (must go through exporting)", async () => {
  const svc = makeServiceWithExistingStatus("final");
  await assert.rejects(
    () => svc.update(ctx(), GD_ID, { status: "exported" }),
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

// ─── Template validation on create ───────────────────────────────

const TPL_ID = "00000000-0000-4000-8000-000000000099";

function makeCreatePool(
  opts: {
    templateRow?: Record<string, unknown> | null;
    caseRow?: Record<string, unknown> | null;
  } = {},
) {
  return makePool((sql) => {
    if (sql.includes("from document_templates")) {
      return ok(opts.templateRow ? [opts.templateRow] : []);
    }
    if (sql.includes("case_type_code") && sql.includes("from cases")) {
      return ok(opts.caseRow ? [opts.caseRow] : []);
    }
    if (sql.includes("max(version_no)")) {
      return ok([{ max_ver: 0 }]);
    }
    if (sql.includes("insert into generated_documents")) {
      return ok([
        makeGdRow({
          template_id: TPL_ID,
          template_version_no_snapshot: 1,
          template_doc_type: "reason_statement",
        }),
      ]);
    }
    return ok([]);
  });
}

void test("create rejects when templateId not found (GD_TEMPLATE_NOT_FOUND)", async () => {
  const pool = makeCreatePool({ templateRow: null });
  const svc = new GeneratedDocumentsService(pool, makeTimeline());
  await assert.rejects(
    () =>
      svc.create(ctx(), {
        caseId: CASE_ID,
        templateId: TPL_ID,
        title: "申請書",
      }),
    (e) => {
      assert.ok(e instanceof BadRequestException);
      assert.ok(
        e.message.includes(
          GENERATED_DOCUMENT_ERROR_CODES.GD_TEMPLATE_NOT_FOUND,
        ),
      );
      return true;
    },
  );
});

void test("create rejects when template caseType mismatches case (GD_TEMPLATE_CASE_TYPE_MISMATCH)", async () => {
  const pool = makeCreatePool({
    templateRow: {
      case_type: "business_manager_visa",
      doc_type: "business_plan",
      version_no: 1,
    },
    caseRow: { case_type_code: "work" },
  });
  const svc = new GeneratedDocumentsService(pool, makeTimeline());
  await assert.rejects(
    () =>
      svc.create(ctx(), {
        caseId: CASE_ID,
        templateId: TPL_ID,
        title: "申請書",
      }),
    (e) => {
      assert.ok(e instanceof BadRequestException);
      assert.ok(
        e.message.includes(
          GENERATED_DOCUMENT_ERROR_CODES.GD_TEMPLATE_CASE_TYPE_MISMATCH,
        ),
      );
      return true;
    },
  );
});

void test("create writes template snapshot when templateId matches", async () => {
  let insertSql = "";
  let insertParams: unknown[] = [];
  const pool = makePool((sql, params) => {
    if (sql.includes("from document_templates")) {
      return ok([
        { case_type: "work", doc_type: "reason_statement", version_no: 3 },
      ]);
    }
    if (sql.includes("case_type_code") && sql.includes("from cases")) {
      return ok([{ case_type_code: "work" }]);
    }
    if (sql.includes("max(version_no)")) {
      return ok([{ max_ver: 0 }]);
    }
    if (sql.includes("insert into generated_documents")) {
      insertSql = sql;
      insertParams = params ?? [];
      return ok([
        makeGdRow({
          template_id: TPL_ID,
          template_version_no_snapshot: 3,
          template_doc_type: "reason_statement",
        }),
      ]);
    }
    return ok([]);
  });
  const svc = new GeneratedDocumentsService(pool, makeTimeline());
  const dto = await svc.create(ctx(), {
    caseId: CASE_ID,
    templateId: TPL_ID,
    title: "申請書",
  });
  assert.ok(insertSql.includes("template_version_no_snapshot"));
  assert.ok(insertSql.includes("template_doc_type"));
  assert.equal(insertParams[9], 3);
  assert.equal(insertParams[10], "reason_statement");
  assert.equal(dto.templateVersionNoSnapshot, 3);
  assert.equal(dto.templateDocType, "reason_statement");
});

void test("create without templateId skips template validation", async () => {
  const pool = makePool((sql) => {
    if (sql.includes("from document_templates")) {
      throw new Error("should not query document_templates");
    }
    if (sql.includes("max(version_no)")) {
      return ok([{ max_ver: 0 }]);
    }
    if (sql.includes("insert into generated_documents")) {
      return ok([makeGdRow()]);
    }
    return ok([]);
  });
  const svc = new GeneratedDocumentsService(pool, makeTimeline());
  const dto = await svc.create(ctx(), {
    caseId: CASE_ID,
    title: "フリータイトル",
  });
  assert.ok(dto);
  assert.equal(dto.templateVersionNoSnapshot, null);
  assert.equal(dto.templateDocType, null);
});
