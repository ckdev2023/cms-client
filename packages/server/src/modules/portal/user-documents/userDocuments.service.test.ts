import test from "node:test";
import assert from "node:assert/strict";
import type { Pool } from "pg";

import { UserDocumentsService } from "./userDocuments.service";
import {
  STORAGE_ADAPTER,
  type StorageAdapter,
} from "../../../infra/storage/storageAdapter";

// Suppress unused import warning
void STORAGE_ADAPTER;

type QueryFn = (
  sql: string,
  params?: unknown[],
) => Promise<{ rows: unknown[] }>;

function makePool(qf: QueryFn) {
  return { query: qf } as unknown as Pool;
}

const SAMPLE_DOC_ROW = {
  id: "doc-1",
  app_user_id: "au-1",
  org_id: null,
  lead_id: null,
  case_id: null,
  file_key: "user-docs/au-1/123_test.pdf",
  file_name: "test.pdf",
  doc_type: "general",
  status: "active",
  uploaded_at: "2026-01-01T00:00:00.000Z",
};

type UploadCall = { key: string; data: Buffer; contentType: string };
type RemoveCall = string;

function makeMockStorage() {
  const uploadCalls: UploadCall[] = [];
  const removeCalls: RemoveCall[] = [];
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
    getSignedUrl: () => Promise.resolve("https://example.com/signed"),
  };
  return { adapter, uploadCalls, removeCalls };
}

function createService(poolFn: QueryFn) {
  const pool = makePool(poolFn);
  const mock = makeMockStorage();
  const svc = new (UserDocumentsService as unknown as new (
    pool: Pool,
    storage: StorageAdapter,
  ) => UserDocumentsService)(pool, mock.adapter);
  return { svc, ...mock };
}

// ── upload ──

void test("UserDocumentsService.upload calls StorageAdapter.upload and inserts row", async () => {
  const { svc, uploadCalls } = createService(() =>
    Promise.resolve({ rows: [SAMPLE_DOC_ROW] }),
  );
  const result = await svc.upload({
    appUserId: "au-1",
    fileName: "test.pdf",
    data: Buffer.from("hello"),
    contentType: "application/pdf",
  });
  assert.equal(result.id, "doc-1");
  assert.equal(uploadCalls.length, 1);
  assert.ok(uploadCalls[0].key.includes("user-docs/au-1/"));
});

void test("UserDocumentsService.upload removes uploaded object when DB insert fails", async () => {
  const { svc, uploadCalls, removeCalls } = createService(() =>
    Promise.resolve({ rows: [] }),
  );

  await assert.rejects(
    () =>
      svc.upload({
        appUserId: "au-1",
        fileName: "test.pdf",
        data: Buffer.from("hello"),
        contentType: "application/pdf",
      }),
    /Failed to upload document/,
  );

  assert.equal(uploadCalls.length, 1);
  assert.equal(removeCalls.length, 1);
});

// ── get ──

void test("UserDocumentsService.get returns document", async () => {
  const { svc } = createService(() =>
    Promise.resolve({ rows: [SAMPLE_DOC_ROW] }),
  );
  const result = await svc.get("doc-1");
  assert.ok(result);
  assert.equal(result.id, "doc-1");
});

// ── list ──

void test("UserDocumentsService.list filters by appUserId", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];
  const { svc } = createService((sql, params) => {
    calls.push({ sql, params });
    if (sql.includes("count(*)"))
      return Promise.resolve({ rows: [{ count: "1" }] });
    return Promise.resolve({ rows: [SAMPLE_DOC_ROW] });
  });
  const result = await svc.list({ appUserId: "au-1" });
  assert.equal(result.total, 1);
  assert.equal(result.items.length, 1);
});

// ── downloadUrl ──

void test("UserDocumentsService.getDownloadUrl returns signed url", async () => {
  const { svc } = createService(() =>
    Promise.resolve({ rows: [SAMPLE_DOC_ROW] }),
  );
  const url = await svc.getDownloadUrl("doc-1");
  assert.equal(url, "https://example.com/signed");
});

// ── remove ──

void test("UserDocumentsService.remove calls StorageAdapter.remove and deletes row", async () => {
  const calls: string[] = [];
  const { svc, removeCalls } = createService((sql) => {
    calls.push(sql);
    return Promise.resolve({ rows: [SAMPLE_DOC_ROW] });
  });
  await svc.remove("doc-1");
  assert.equal(removeCalls.length, 1);
  assert.ok(calls.some((s) => s.includes("delete from user_documents")));
});
