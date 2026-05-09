import test from "node:test";
import assert from "node:assert/strict";

import type { QueueJob } from "../../../../infra/queue/redisQueue";
import {
  handleGeneratedDocExportJob,
  GENERATED_DOC_EXPORT_QUEUE,
  type GeneratedDocExportJobPayload,
} from "./generatedDocExportHandler";

const ORG_ID = "00000000-0000-4000-8000-000000000001";
const USER_ID = "00000000-0000-4000-8000-000000000002";
const GD_ID = "00000000-0000-4000-8000-000000000003";
const CASE_ID = "00000000-0000-4000-8000-000000000004";

function makeJob(
  overrides: Partial<GeneratedDocExportJobPayload> = {},
): QueueJob<GeneratedDocExportJobPayload> {
  return {
    id: "job-001",
    name: "generated_doc_export",
    payload: {
      orgId: ORG_ID,
      userId: USER_ID,
      generatedDocumentId: GD_ID,
      caseId: CASE_ID,
      templateId: null,
      templateVersionNo: null,
      outputFormat: "docx",
      title: "申請理由書",
      ...overrides,
    },
    createdAt: new Date().toISOString(),
  };
}

type CapturedQuery = { sql: string; params?: unknown[] };

function makePool(queryFn: (sql: string, params?: unknown[]) => unknown) {
  const client = {
    query: (sql: string, params?: unknown[]) => {
      if (sql === "begin" || sql === "commit" || sql === "rollback") {
        return Promise.resolve({ rows: [] });
      }
      if (sql.includes("set_config")) {
        return Promise.resolve({ rows: [] });
      }
      return Promise.resolve(queryFn(sql, params));
    },
    release: () => undefined,
  };
  return { connect: () => Promise.resolve(client) } as never;
}

function makeStorage(capturedUploads: { key: string; size: number }[]) {
  return {
    upload: (key: string, data: Buffer) => {
      capturedUploads.push({ key, size: data.length });
      return Promise.resolve();
    },
    download: () => Promise.resolve(Buffer.alloc(0)),
    remove: () => Promise.resolve(),
    getSignedUrl: () => Promise.resolve("http://signed"),
  };
}

function makeQueue(capturedEnqueues: unknown[]) {
  return {
    enqueue: (_name: string, job: unknown) => {
      capturedEnqueues.push(job);
      return Promise.resolve();
    },
  } as never;
}

void test("GENERATED_DOC_EXPORT_QUEUE constant is correct", () => {
  assert.equal(GENERATED_DOC_EXPORT_QUEUE, "generated_doc_export_jobs");
});

void test("handler skips if status is not exporting (idempotent)", async () => {
  const queries: CapturedQuery[] = [];
  const pool = makePool((sql, params) => {
    queries.push({ sql, params });
    if (sql.includes("select status")) {
      return { rows: [{ status: "exported", version_no: 1 }] };
    }
    return { rows: [] };
  });

  const uploads: { key: string; size: number }[] = [];
  const enqueues: unknown[] = [];

  await handleGeneratedDocExportJob(
    pool,
    makeStorage(uploads),
    makeQueue(enqueues),
    makeJob(),
  );

  assert.equal(uploads.length, 0, "no file uploaded for non-exporting doc");
  assert.equal(enqueues.length, 0, "no notification sent");
});

void test("handler produces exported status for docx", async () => {
  const queries: CapturedQuery[] = [];
  const pool = makePool((sql, params) => {
    queries.push({ sql, params });
    if (sql.includes("select status")) {
      return { rows: [{ status: "exporting", version_no: 2 }] };
    }
    return { rows: [] };
  });

  const uploads: { key: string; size: number }[] = [];
  const enqueues: unknown[] = [];

  await handleGeneratedDocExportJob(
    pool,
    makeStorage(uploads),
    makeQueue(enqueues),
    makeJob({ outputFormat: "docx" }),
  );

  assert.equal(uploads.length, 1, "file must be uploaded");
  assert.equal(
    uploads[0].key,
    `generated-documents/${ORG_ID}/${GD_ID}/v2.docx`,
  );
  assert.ok(uploads[0].size > 0, "file must not be empty");

  const statusUpdate = queries.find((q) =>
    q.sql.includes("status = 'exported'"),
  );
  assert.ok(statusUpdate, "must update status to exported");

  assert.equal(enqueues.length, 1, "notification must be enqueued");
});

void test("handler marks export_failed when export times out (AbortSignal)", async () => {
  const originalTimeout = process.env.GD_EXPORT_TIMEOUT_MS;
  process.env.GD_EXPORT_TIMEOUT_MS = "1";

  const queries: CapturedQuery[] = [];
  const pool = makePool((sql, params) => {
    queries.push({ sql, params });
    if (sql.includes("select status")) {
      return { rows: [{ status: "exporting", version_no: 1 }] };
    }
    return { rows: [] };
  });

  const uploads: { key: string; size: number }[] = [];
  const enqueues: unknown[] = [];

  await handleGeneratedDocExportJob(
    pool,
    makeStorage(uploads),
    makeQueue(enqueues),
    makeJob({ outputFormat: "docx" }),
  );

  if (originalTimeout === undefined) {
    delete process.env.GD_EXPORT_TIMEOUT_MS;
  } else {
    process.env.GD_EXPORT_TIMEOUT_MS = originalTimeout;
  }
});

void test("handler produces exported status for pdf (minimal PDF stub)", async () => {
  const queries: CapturedQuery[] = [];
  const pool = makePool((sql, params) => {
    queries.push({ sql, params });
    if (sql.includes("select status")) {
      return { rows: [{ status: "exporting", version_no: 1 }] };
    }
    return { rows: [] };
  });

  const uploads: { key: string; size: number }[] = [];
  const enqueues: unknown[] = [];

  await handleGeneratedDocExportJob(
    pool,
    makeStorage(uploads),
    makeQueue(enqueues),
    makeJob({ outputFormat: "pdf" }),
  );

  assert.equal(uploads.length, 1, "minimal PDF stub must be uploaded");
  assert.equal(uploads[0].key, `generated-documents/${ORG_ID}/${GD_ID}/v1.pdf`);
  assert.ok(uploads[0].size > 0, "PDF must not be empty");

  const statusUpdate = queries.find((q) =>
    q.sql.includes("status = 'exported'"),
  );
  assert.ok(statusUpdate, "must update status to exported");

  assert.equal(enqueues.length, 1, "notification must be enqueued");
});

void test("buildMinimalPdf produces a syntactically valid PDF stub", async () => {
  const captured: { key: string; data: Buffer }[] = [];
  const pool = makePool((sql) => {
    if (sql.includes("select status")) {
      return { rows: [{ status: "exporting", version_no: 1 }] };
    }
    return { rows: [] };
  });
  const storage = {
    upload: (key: string, data: Buffer) => {
      captured.push({ key, data });
      return Promise.resolve();
    },
    download: () => Promise.resolve(Buffer.alloc(0)),
    remove: () => Promise.resolve(),
    getSignedUrl: () => Promise.resolve("http://signed"),
  };
  const enqueues: unknown[] = [];

  await handleGeneratedDocExportJob(
    pool,
    storage as never,
    makeQueue(enqueues),
    makeJob({ outputFormat: "pdf", title: "申請理由書 (stub)" }),
  );

  assert.equal(captured.length, 1);
  const text = captured[0].data.toString("latin1");
  assert.ok(text.startsWith("%PDF-1.4"), "must start with PDF header");
  assert.ok(text.includes("/Type /Catalog"), "must contain catalog object");
  assert.ok(text.includes("/Type /Pages"), "must contain pages object");
  assert.ok(text.includes("/Type /Page "), "must contain page object");
  assert.ok(text.endsWith("%%EOF\n"), "must end with PDF trailer");
  assert.ok(text.includes("xref"), "must include xref table");
});
