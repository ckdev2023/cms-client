import test from "node:test";
import assert from "node:assert/strict";
import type { Pool } from "pg";

import type { StorageAdapter } from "../../../infra/storage/storageAdapter";
import type { RequestContext } from "../tenancy/requestContext";
import { DocumentFilesService } from "./documentFiles.service";

const ORG_ID = "00000000-0000-4000-8000-000000000000";
const USER_ID = "00000000-0000-4000-8000-000000000001";
const FILE_ID = "file-1";
const REQUIREMENT_ID = "00000000-0000-4000-8000-000000000010";

type QueryResult = { rows: unknown[]; rowCount?: number };
type QueryFn = (sql: string, params?: unknown[]) => Promise<QueryResult>;
type PoolLike = {
  connect: () => Promise<{
    query: QueryFn;
    release: () => void;
  }>;
};

function makeCtx(role: RequestContext["role"] = "staff"): RequestContext {
  return { orgId: ORG_ID, userId: USER_ID, role };
}

function makeFileRow(overrides: Record<string, unknown> = {}) {
  return {
    id: FILE_ID,
    org_id: ORG_ID,
    requirement_id: REQUIREMENT_ID,
    file_name: "passport.pdf",
    file_url: "document-files/req/passport.pdf",
    file_type: "application/pdf",
    file_size: 12,
    version_no: 1,
    uploaded_by: USER_ID,
    uploaded_at: "2026-01-01T00:00:00.000Z",
    review_status: "pending",
    review_by: null,
    review_at: null,
    expiry_date: null,
    hash_value:
      "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
    created_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makePool(queryFn: QueryFn): PoolLike {
  return {
    connect: () =>
      Promise.resolve({
        query: queryFn,
        release: () => undefined,
      }),
  };
}

function makeTimeline() {
  const writes: unknown[] = [];
  return {
    service: {
      write: (_ctx: unknown, input: unknown) => {
        writes.push(input);
        return Promise.resolve();
      },
    },
    writes,
  };
}

function makeStorage() {
  const uploadCalls: { key: string; contentType: string; data: Buffer }[] = [];
  const removeCalls: string[] = [];
  const adapter: StorageAdapter = {
    upload: (key, data, contentType) => {
      uploadCalls.push({ key, data, contentType });
      return Promise.resolve();
    },
    download: () => Promise.resolve(Buffer.alloc(0)),
    remove: (key) => {
      removeCalls.push(key);
      return Promise.resolve();
    },
    getSignedUrl: () => Promise.resolve("https://example.com/file"),
  };
  return { adapter, uploadCalls, removeCalls };
}

function createService(queryFn: QueryFn) {
  const pool = makePool(queryFn);
  const timeline = makeTimeline();
  const storage = makeStorage();
  const svc = new DocumentFilesService(
    pool as unknown as Pool,
    timeline.service as never,
    storage.adapter,
  );
  return { svc, timeline, storage };
}

void test("DocumentFilesService.upload uploads, auto-increments version and writes timeline", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];
  const { svc, timeline, storage } = createService((sql, params) => {
    calls.push({ sql, params });
    if (sql.includes("from document_items") && sql.includes("for update")) {
      return Promise.resolve({ rows: [{ id: REQUIREMENT_ID }], rowCount: 1 });
    }
    if (
      sql.includes("select coalesce(max(version_no), 0) + 1 as next_version")
    ) {
      return Promise.resolve({ rows: [{ next_version: "3" }], rowCount: 1 });
    }
    if (sql.includes("insert into document_files")) {
      return Promise.resolve({
        rows: [makeFileRow({ version_no: 3 })],
        rowCount: 1,
      });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  const result = await svc.upload(makeCtx(), {
    requirementId: REQUIREMENT_ID,
    fileName: "passport.pdf",
    data: Buffer.from("hello"),
    contentType: "application/pdf",
  });

  assert.equal(result.versionNo, 3);
  assert.equal(storage.uploadCalls.length, 1);
  assert.ok(
    storage.uploadCalls[0]?.key.includes(`document-files/${REQUIREMENT_ID}/`),
  );
  assert.equal(timeline.writes.length, 1);
  assert.equal(
    (timeline.writes[0] as { action: string }).action,
    "document_file.uploaded",
  );
  const insertCall = calls.find((call) =>
    call.sql.includes("insert into document_files"),
  );
  assert.equal(insertCall?.params?.[6], 3);
});

void test("DocumentFilesService.upload removes uploaded file when DB insert flow fails", async () => {
  const { svc, storage } = createService((sql) => {
    if (sql.includes("from document_items") && sql.includes("for update")) {
      return Promise.resolve({ rows: [], rowCount: 0 });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  await assert.rejects(
    () =>
      svc.upload(makeCtx(), {
        requirementId: REQUIREMENT_ID,
        fileName: "passport.pdf",
        data: Buffer.from("hello"),
        contentType: "application/pdf",
      }),
    /Document requirement not found/,
  );

  assert.equal(storage.uploadCalls.length, 1);
  assert.equal(storage.removeCalls.length, 1);
});

void test("DocumentFilesService.list filters by requirementId", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];
  const { svc } = createService((sql, params) => {
    calls.push({ sql, params });
    if (sql.includes("count(*)::text")) {
      return Promise.resolve({ rows: [{ count: "1" }], rowCount: 1 });
    }
    return Promise.resolve({ rows: [makeFileRow()], rowCount: 1 });
  });

  const result = await svc.list(makeCtx("viewer"), {
    requirementId: REQUIREMENT_ID,
  });
  assert.equal(result.total, 1);
  assert.equal(result.items.length, 1);
  const countCall = calls.find((call) => call.sql.includes("count(*)::text"));
  const listCall = calls.find(
    (call) =>
      call.sql.includes("from document_files") &&
      call.sql.includes("order by version_no desc"),
  );
  assert.equal(countCall?.params?.[0], REQUIREMENT_ID);
  assert.equal(listCall?.params?.[0], REQUIREMENT_ID);
});

void test("DocumentFilesService.get returns item or null", async () => {
  const { svc } = createService((sql, params) => {
    if (sql.includes("from document_files") && params?.[0] === FILE_ID) {
      return Promise.resolve({ rows: [makeFileRow()], rowCount: 1 });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  const item = await svc.get(makeCtx("viewer"), FILE_ID);
  assert.ok(item);
  assert.equal(item.id, FILE_ID);
  assert.equal(await svc.get(makeCtx("viewer"), "missing"), null);
});

void test("DocumentFilesService.review updates pending file and writes timeline", async () => {
  const { svc, timeline } = createService((sql, params) => {
    if (
      sql.includes("select id, org_id, requirement_id") &&
      params?.[0] === FILE_ID
    ) {
      return Promise.resolve({ rows: [makeFileRow()], rowCount: 1 });
    }
    if (sql.includes("update document_files")) {
      return Promise.resolve({
        rows: [
          makeFileRow({
            review_status: "approved",
            review_by: USER_ID,
            review_at: "2026-01-02T00:00:00.000Z",
          }),
        ],
        rowCount: 1,
      });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  const result = await svc.review(makeCtx("manager"), FILE_ID, {
    decision: "approve",
  });
  assert.equal(result.reviewStatus, "approved");
  assert.equal(result.reviewBy, USER_ID);
  assert.equal(timeline.writes.length, 1);
  assert.equal(
    (timeline.writes[0] as { action: string }).action,
    "document_file.reviewed",
  );
});

void test("DocumentFilesService.review rejects non-pending status", async () => {
  const { svc } = createService((sql, params) => {
    if (sql.includes("from document_files") && params?.[0] === FILE_ID) {
      return Promise.resolve({
        rows: [makeFileRow({ review_status: "approved" })],
        rowCount: 1,
      });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  await assert.rejects(
    () => svc.review(makeCtx("manager"), FILE_ID, { decision: "reject" }),
    /Only pending document files can be reviewed/,
  );
});

void test("DocumentFilesService.remove deletes DB row, removes storage and writes timeline", async () => {
  const { svc, storage, timeline } = createService((sql, params) => {
    if (sql.includes("from document_files") && params?.[0] === FILE_ID) {
      return Promise.resolve({ rows: [makeFileRow()], rowCount: 1 });
    }
    if (sql.includes("delete from document_files")) {
      return Promise.resolve({ rows: [], rowCount: 1 });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  await svc.remove(makeCtx("manager"), FILE_ID);
  assert.equal(storage.removeCalls.length, 1);
  assert.equal(storage.removeCalls[0], "document-files/req/passport.pdf");
  assert.equal(timeline.writes.length, 1);
  assert.equal(
    (timeline.writes[0] as { action: string }).action,
    "document_file.deleted",
  );
});

void test("DocumentFilesService enforces tenant isolation through tenantDb", async () => {
  const calls: string[] = [];
  const { svc } = createService((sql, params) => {
    calls.push(sql.trim());
    if (sql === "begin" || sql === "commit" || sql === "rollback") {
      return Promise.resolve({ rows: [], rowCount: 0 });
    }
    if (sql.includes("set_config('app.org_id'")) {
      assert.equal(params?.[0], ORG_ID);
      return Promise.resolve({ rows: [], rowCount: 1 });
    }
    if (sql.includes("set_config('app.actor_user_id'")) {
      assert.equal(params?.[0], USER_ID);
      return Promise.resolve({ rows: [], rowCount: 1 });
    }
    if (sql.includes("select count(*)::text as count")) {
      return Promise.resolve({ rows: [{ count: "0" }], rowCount: 1 });
    }
    if (sql.includes("from document_files")) {
      return Promise.resolve({ rows: [], rowCount: 0 });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  const result = await svc.list(makeCtx("viewer"), {
    requirementId: REQUIREMENT_ID,
  });
  assert.equal(result.total, 0);
  assert.ok(calls.some((sql) => sql.includes("set_config('app.org_id'")));
  assert.ok(
    calls.some((sql) => sql.includes("set_config('app.actor_user_id'")),
  );
});
