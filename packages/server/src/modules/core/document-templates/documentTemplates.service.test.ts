import test from "node:test";
import assert from "node:assert/strict";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import type { Pool } from "pg";

import { DocumentTemplatesService } from "./documentTemplates.service";
import { DOCUMENT_TEMPLATE_ERROR_CODES } from "./documentTemplates.types";

const ORG_ID = "00000000-0000-4000-8000-000000000000";
const USER_ID = "00000000-0000-4000-8000-000000000001";
const DT_ID = "00000000-0000-4000-8000-000000000010";

const isTxSql = (s: string) =>
  /^(begin|commit|rollback|select set_config)/.test(s.trim().toLowerCase());

function makeDtRow(overrides: Record<string, unknown> = {}) {
  return {
    id: DT_ID,
    org_id: ORG_ID,
    template_name: "申請理由書",
    case_type: "family_stay",
    doc_type: "reason_statement",
    language: "ja",
    version_no: 1,
    content_body: "",
    variables_schema: {},
    active_flag: true,
    created_by: USER_ID,
    updated_by: USER_ID,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
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

function ctx(role: "viewer" | "staff" | "manager" | "owner" = "staff") {
  return { orgId: ORG_ID, userId: USER_ID, role };
}

// ─── list ────────────────────────────────────────────────────────

void test("list defaults to active_flag=true filter", async () => {
  let capturedSql = "";
  const pool = makePool((sql) => {
    capturedSql = sql;
    return ok([makeDtRow()]);
  });
  const svc = new DocumentTemplatesService(pool);
  const result = await svc.list(ctx(), {});

  assert.equal(result.items.length, 1);
  assert.ok(
    capturedSql.includes("active_flag = true"),
    "list without includeInactive must filter by active_flag",
  );
});

void test("list with includeInactive omits active_flag filter", async () => {
  let capturedSql = "";
  const pool = makePool((sql) => {
    capturedSql = sql;
    return ok([makeDtRow(), makeDtRow({ active_flag: false })]);
  });
  const svc = new DocumentTemplatesService(pool);
  const result = await svc.list(ctx(), { includeInactive: true });

  assert.equal(result.items.length, 2);
  assert.ok(
    !capturedSql.includes("active_flag = true"),
    "list with includeInactive must not filter by active_flag",
  );
});

void test("list filters by caseType", async () => {
  let capturedParams: unknown[] | undefined;
  const pool = makePool((sql, params) => {
    capturedParams = params;
    return ok([makeDtRow()]);
  });
  const svc = new DocumentTemplatesService(pool);
  await svc.list(ctx(), { caseType: "family_stay" });

  assert.ok(capturedParams?.includes("family_stay"));
});

void test("list filters by language", async () => {
  let capturedSql = "";
  let capturedParams: unknown[] | undefined;
  const pool = makePool((sql, params) => {
    capturedSql = sql;
    capturedParams = params;
    return ok([makeDtRow()]);
  });
  const svc = new DocumentTemplatesService(pool);
  await svc.list(ctx(), { language: "ja" });

  assert.ok(
    capturedSql.includes("language"),
    "list with language must filter by language column",
  );
  assert.ok(capturedParams?.includes("ja"));
});

void test("list filters by language", async () => {
  let capturedSql = "";
  let capturedParams: unknown[] | undefined;
  const pool = makePool((sql, params) => {
    capturedSql = sql;
    capturedParams = params;
    return ok([makeDtRow()]);
  });
  const svc = new DocumentTemplatesService(pool);
  await svc.list(ctx(), { language: "ja" });

  assert.ok(
    capturedSql.includes("language"),
    "list with language must include language in WHERE",
  );
  assert.ok(capturedParams?.includes("ja"));
});

void test("list combines caseType and language filters", async () => {
  let capturedSql = "";
  let capturedParams: unknown[] | undefined;
  const pool = makePool((sql, params) => {
    capturedSql = sql;
    capturedParams = params;
    return ok([makeDtRow()]);
  });
  const svc = new DocumentTemplatesService(pool);
  await svc.list(ctx(), { caseType: "family_stay", language: "en" });

  assert.ok(capturedSql.includes("case_type"));
  assert.ok(capturedSql.includes("language"));
  assert.ok(capturedParams?.includes("family_stay"));
  assert.ok(capturedParams?.includes("en"));
});

void test("list without language does not include language in WHERE", async () => {
  let capturedSql = "";
  const pool = makePool((sql) => {
    capturedSql = sql;
    return ok([]);
  });
  const svc = new DocumentTemplatesService(pool);
  await svc.list(ctx(), { caseType: "family_stay" });

  assert.ok(
    !capturedSql.includes("language ="),
    "list without language input must not filter by language",
  );
});

void test("list orders by case_type, template_name asc, version_no desc", async () => {
  let capturedSql = "";
  const pool = makePool((sql) => {
    capturedSql = sql;
    return ok([]);
  });
  const svc = new DocumentTemplatesService(pool);
  await svc.list(ctx(), {});

  assert.ok(capturedSql.includes("case_type asc"));
  assert.ok(capturedSql.includes("template_name asc"));
  assert.ok(capturedSql.includes("version_no desc"));
});

void test("list does not paginate (no limit/offset in SQL)", async () => {
  let capturedSql = "";
  const pool = makePool((sql) => {
    capturedSql = sql;
    return ok([]);
  });
  const svc = new DocumentTemplatesService(pool);
  await svc.list(ctx(), {});

  assert.ok(!capturedSql.includes("limit"), "P0 list must not paginate");
  assert.ok(!capturedSql.includes("offset"), "P0 list must not paginate");
});

// ─── get ─────────────────────────────────────────────────────────

void test("get returns dto when found", async () => {
  const pool = makePool(() => ok([makeDtRow()]));
  const svc = new DocumentTemplatesService(pool);
  const dto = await svc.get(ctx(), DT_ID);
  assert.ok(dto);
  assert.equal(dto.id, DT_ID);
  assert.equal(dto.templateName, "申請理由書");
});

void test("get returns null when not found", async () => {
  const pool = makePool(() => ok([]));
  const svc = new DocumentTemplatesService(pool);
  const dto = await svc.get(ctx(), DT_ID);
  assert.equal(dto, null);
});

// ─── create ──────────────────────────────────────────────────────

void test("create validates required fields", async () => {
  const pool = makePool(() => ok([]));
  const svc = new DocumentTemplatesService(pool);

  await assert.rejects(
    () =>
      svc.create(ctx(), {
        templateName: "",
        caseType: "family_stay",
        docType: "reason_statement",
      }),
    (e) => {
      assert.ok(e instanceof BadRequestException);
      assert.ok(
        e.message.includes(DOCUMENT_TEMPLATE_ERROR_CODES.DT_INVALID_PAYLOAD),
      );
      return true;
    },
  );

  await assert.rejects(
    () =>
      svc.create(ctx(), {
        templateName: "X",
        caseType: "",
        docType: "reason_statement",
      }),
    (e) => {
      assert.ok(e instanceof BadRequestException);
      assert.ok(e.message.includes("caseType"));
      return true;
    },
  );

  await assert.rejects(
    () =>
      svc.create(ctx(), {
        templateName: "X",
        caseType: "family_stay",
        docType: "",
      }),
    (e) => {
      assert.ok(e instanceof BadRequestException);
      assert.ok(e.message.includes("docType"));
      return true;
    },
  );
});

void test("create inserts and returns dto", async () => {
  const pool = makePool((sql) => {
    if (sql.includes("insert into document_templates"))
      return ok([makeDtRow()]);
    return ok([]);
  });
  const svc = new DocumentTemplatesService(pool);
  const dto = await svc.create(ctx(), {
    templateName: "申請理由書",
    caseType: "family_stay",
    docType: "reason_statement",
  });
  assert.equal(dto.id, DT_ID);
  assert.equal(dto.templateName, "申請理由書");
  assert.equal(dto.activeFlag, true);
});

void test("create defaults language to ja", async () => {
  let capturedParams: unknown[] | undefined;
  const pool = makePool((sql, params) => {
    if (sql.includes("insert into document_templates")) {
      capturedParams = params;
      return ok([makeDtRow()]);
    }
    return ok([]);
  });
  const svc = new DocumentTemplatesService(pool);
  await svc.create(ctx(), {
    templateName: "X",
    caseType: "family_stay",
    docType: "reason_statement",
  });
  assert.ok(capturedParams?.includes("ja"));
});

// ─── update ──────────────────────────────────────────────────────

void test("update throws NotFoundException when template missing", async () => {
  const pool = makePool(() => ok([]));
  const svc = new DocumentTemplatesService(pool);
  await assert.rejects(
    () => svc.update(ctx(), DT_ID, { templateName: "X" }),
    (e) => {
      assert.ok(e instanceof NotFoundException);
      assert.ok(e.message.includes(DOCUMENT_TEMPLATE_ERROR_CODES.DT_NOT_FOUND));
      return true;
    },
  );
});

void test("update with empty templateName throws", async () => {
  const pool = makePool(() => ok([makeDtRow()]));
  const svc = new DocumentTemplatesService(pool);
  await assert.rejects(
    () => svc.update(ctx(), DT_ID, { templateName: "  " }),
    (e) => {
      assert.ok(e instanceof BadRequestException);
      assert.ok(e.message.includes("templateName"));
      return true;
    },
  );
});

void test("update with no changes returns existing dto", async () => {
  const pool = makePool(() => ok([makeDtRow()]));
  const svc = new DocumentTemplatesService(pool);
  const dto = await svc.update(ctx(), DT_ID, {});
  assert.equal(dto.id, DT_ID);
});

void test("update sets updated_by", async () => {
  let capturedSql = "";
  let capturedParams: unknown[] | undefined;
  const pool = makePool((sql, params) => {
    if (sql.includes("update document_templates")) {
      capturedSql = sql;
      capturedParams = params;
      return ok([], 1);
    }
    return ok([makeDtRow()]);
  });
  const svc = new DocumentTemplatesService(pool);
  await svc.update(ctx(), DT_ID, { activeFlag: false });

  assert.ok(capturedSql.includes("updated_by"));
  assert.ok(capturedParams?.includes(USER_ID));
});

// ─── archive ─────────────────────────────────────────────────────

void test("archive sets active_flag to false", async () => {
  let capturedSql = "";
  const pool = makePool((sql) => {
    if (sql.includes("update document_templates")) {
      capturedSql = sql;
      return ok([], 1);
    }
    return ok([makeDtRow()]);
  });
  const svc = new DocumentTemplatesService(pool);
  await svc.archive(ctx(), DT_ID);

  assert.ok(capturedSql.includes("active_flag"));
});
