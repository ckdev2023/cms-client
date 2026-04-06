import { test } from "node:test";
import assert from "node:assert/strict";
import type { Pool } from "pg";

import { handleExportJob, type ExportJobPayload } from "./exportJobHandler";
import type { QueueJob } from "../../../../infra/queue/redisQueue";
import { RedisQueue } from "../../../../infra/queue/redisQueue";
import type { StorageAdapter } from "../../../../infra/storage/storageAdapter";

/* ------------------------------------------------------------------ */
/*  常量                                                               */
/* ------------------------------------------------------------------ */

const ORG_ID = "00000000-0000-4000-8000-000000000000";
const USER_ID = "00000000-0000-4000-8000-000000000001";

/* ------------------------------------------------------------------ */
/*  Mock 工厂                                                          */
/* ------------------------------------------------------------------ */

type SqlCall = { sql: string; params?: unknown[] };

type PoolClientLike = {
  query: (
    sql: string,
    params?: unknown[],
  ) => Promise<{ rows: unknown[]; rowCount: number }>;
  release: () => void;
};

type PoolLike = { connect: () => Promise<PoolClientLike> };

function makePool(queryFn: PoolClientLike["query"]): PoolLike {
  return {
    connect: () =>
      Promise.resolve({ query: queryFn, release: () => undefined }),
  };
}

function makeJob(
  overrides: Partial<ExportJobPayload> = {},
): QueueJob<ExportJobPayload> {
  return {
    id: "export-job-1",
    name: "export",
    payload: {
      orgId: ORG_ID,
      userId: USER_ID,
      exportType: "cases",
      format: "csv",
      ...overrides,
    },
    createdAt: "2026-04-06T00:00:00.000Z",
  };
}

type UploadCall = { key: string; data: Buffer; contentType: string };

function makeMockStorage() {
  const uploadCalls: UploadCall[] = [];
  const adapter: StorageAdapter = {
    upload: (key, data, contentType) => {
      uploadCalls.push({ key, data, contentType });
      return Promise.resolve();
    },
    download: () => Promise.resolve(Buffer.alloc(0)),
    remove: () => Promise.resolve(),
    getSignedUrl: () => Promise.resolve("https://example.com/signed"),
  };
  return { adapter, uploadCalls };
}

type EnqueueCall = { queueName: string; job: unknown };

function makeMockQueue() {
  const enqueueCalls: EnqueueCall[] = [];
  const queue = {
    enqueue: (queueName: string, job: unknown) => {
      enqueueCalls.push({ queueName, job });
      return Promise.resolve();
    },
  } as unknown as RedisQueue;
  return { queue, enqueueCalls };
}

const TS = "2026-01-01T00:00:00.000Z";

function makeCaseRow(id = "case-1") {
  return {
    id,
    org_id: ORG_ID,
    customer_id: "cust-1",
    case_type_code: "immigration",
    status: "open",
    owner_user_id: USER_ID,
    opened_at: TS,
    due_at: null,
    created_at: TS,
    updated_at: TS,
  };
}

function makeCustomerRow(id = "cust-1") {
  return {
    id,
    org_id: ORG_ID,
    type: "individual",
    base_profile: { name: "John" },
    contacts: [{ email: "john@example.com" }],
    created_at: TS,
    updated_at: TS,
  };
}

function makeDocItemRow(id = "doc-1") {
  return {
    id,
    org_id: ORG_ID,
    case_id: "case-1",
    checklist_item_code: "passport",
    name: "Passport",
    status: "pending",
    requested_at: null,
    received_at: null,
    reviewed_at: null,
    due_at: null,
    owner_side: "client",
    last_follow_up_at: null,
    note: null,
    created_at: TS,
    updated_at: TS,
  };
}

function makeDefaultPool(rows: unknown[] = [makeCaseRow()]) {
  const calls: SqlCall[] = [];
  const pool = makePool((sql, params) => {
    calls.push({ sql: sql.trim(), params });
    if (
      sql.includes("from cases") ||
      sql.includes("from customers") ||
      sql.includes("from document_items")
    ) {
      return Promise.resolve({ rows, rowCount: rows.length });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });
  return { pool, calls };
}

/* 1. CSV 导出 cases */
void test("exports cases as CSV: queries data, uploads file, enqueues notification, writes timeline", async () => {
  const { pool, calls } = makeDefaultPool([
    makeCaseRow("c-1"),
    makeCaseRow("c-2"),
  ]);
  const { adapter, uploadCalls } = makeMockStorage();
  const { queue, enqueueCalls } = makeMockQueue();

  await handleExportJob(pool as unknown as Pool, adapter, queue, makeJob());

  // 验证查询了 cases 表
  const selectCall = calls.find((c) => c.sql.includes("from cases"));
  assert.ok(selectCall, "should query cases table");
  assert.equal(selectCall.params?.[0], 10_000, "should limit to 10000 rows");

  // 验证上传
  assert.equal(uploadCalls.length, 1);
  assert.ok(
    uploadCalls[0]?.key.startsWith("exports/"),
    "key should start with exports/",
  );
  assert.ok(uploadCalls[0]?.key.includes(ORG_ID), "key should include orgId");
  assert.ok(uploadCalls[0]?.key.endsWith(".csv"), "key should end with .csv");
  assert.equal(uploadCalls[0]?.contentType, "text/csv");

  // 验证 CSV 内容
  const csvContent = uploadCalls[0]?.data.toString("utf-8") ?? "";
  const csvLines = csvContent.split("\n");
  assert.equal(csvLines.length, 3, "header + 2 data rows");
  assert.ok(csvLines[0]?.includes("id"), "header should include id column");
  assert.ok(csvLines[1]?.includes("c-1"), "first data row should have c-1");
  assert.ok(csvLines[2]?.includes("c-2"), "second data row should have c-2");

  // 验证入队 notification_job
  assert.equal(enqueueCalls.length, 1);
  assert.equal(enqueueCalls[0]?.queueName, "notification_jobs");
  const notifJob = enqueueCalls[0]?.job as QueueJob<Record<string, unknown>>;
  assert.equal(notifJob.name, "export_ready");
  const p = notifJob.payload;
  assert.equal(p.orgId, ORG_ID);
  assert.equal(p.to, USER_ID);
  assert.equal(p.channel, "in_app");
  assert.ok(
    (p.body as string).includes("cases"),
    "body should mention export type",
  );
  const meta = p.metadata as Record<string, unknown>;
  assert.equal(meta.exportType, "cases");
  assert.equal(meta.rowCount, 2);

  // 验证 Timeline 写入
  const timelineCall = calls.find((c) =>
    c.sql.includes("insert into timeline_logs"),
  );
  assert.ok(timelineCall, "should write timeline");
  const tlParams = timelineCall.params ?? [];
  assert.equal(tlParams[0], ORG_ID);
  assert.equal(tlParams[3], "export_completed");
  assert.equal(tlParams[4], USER_ID);
});

/* 2. 导出 customers */
void test("exports customers as CSV correctly", async () => {
  const { pool } = makeDefaultPool([makeCustomerRow("cust-1")]);
  const { adapter, uploadCalls } = makeMockStorage();
  const { queue, enqueueCalls } = makeMockQueue();

  await handleExportJob(
    pool as unknown as Pool,
    adapter,
    queue,
    makeJob({ exportType: "customers" }),
  );

  assert.equal(uploadCalls.length, 1);
  assert.ok(
    uploadCalls[0]?.key.includes("customers"),
    "key should include customers",
  );
  const csv = uploadCalls[0]?.data.toString("utf-8") ?? "";
  assert.ok(csv.includes("cust-1"), "CSV should contain customer id");

  const notifPayload = (
    enqueueCalls[0]?.job as QueueJob<Record<string, unknown>>
  ).payload;
  assert.equal(notifPayload.entityType, "customer");
});

/* 3. 导出 document_items */
void test("exports document_items as CSV correctly", async () => {
  const { pool } = makeDefaultPool([makeDocItemRow("doc-1")]);
  const { adapter, uploadCalls } = makeMockStorage();
  const { queue, enqueueCalls } = makeMockQueue();

  await handleExportJob(
    pool as unknown as Pool,
    adapter,
    queue,
    makeJob({ exportType: "document_items" }),
  );

  assert.equal(uploadCalls.length, 1);
  assert.ok(
    uploadCalls[0]?.key.includes("document_items"),
    "key should include document_items",
  );
  const csv = uploadCalls[0]?.data.toString("utf-8") ?? "";
  assert.ok(csv.includes("doc-1"), "CSV should contain document item id");

  const notifPayload = (
    enqueueCalls[0]?.job as QueueJob<Record<string, unknown>>
  ).payload;
  assert.equal(notifPayload.entityType, "document_item");
});

/* 4. 空结果 */
void test("handles empty result set: uploads empty file, still notifies", async () => {
  const { pool } = makeDefaultPool([]);
  const { adapter, uploadCalls } = makeMockStorage();
  const { queue, enqueueCalls } = makeMockQueue();

  await handleExportJob(pool as unknown as Pool, adapter, queue, makeJob());

  assert.equal(uploadCalls.length, 1);
  assert.equal(uploadCalls[0]?.data.toString("utf-8"), "", "empty CSV");
  assert.equal(enqueueCalls.length, 1, "should still notify user");
  const meta = (enqueueCalls[0]?.job as QueueJob<Record<string, unknown>>)
    .payload.metadata as Record<string, unknown>;
  assert.equal(meta.rowCount, 0);
});

/* 5. CSV 特殊字符转义 */
void test("CSV escapes commas, quotes, and newlines in field values", async () => {
  const row = {
    id: "c-1",
    name: 'He said "hello"',
    description: "line1\nline2",
    tags: "a,b,c",
  };
  const { pool } = makeDefaultPool([row]);
  const { adapter, uploadCalls } = makeMockStorage();
  const { queue } = makeMockQueue();

  await handleExportJob(pool as unknown as Pool, adapter, queue, makeJob());

  const csv = uploadCalls[0]?.data.toString("utf-8") ?? "";
  // quotes should be doubled
  assert.ok(csv.includes('""hello""'), "double quotes should be escaped");
  // field with commas or newlines should be wrapped in quotes
  assert.ok(csv.includes('"a,b,c"'), "comma field should be quoted");
  assert.ok(csv.includes('"line1\nline2"'), "newline field should be quoted");
});

/* 6. null/undefined */
void test("CSV handles null and undefined values as empty strings", async () => {
  const row = { id: "c-1", name: null, note: undefined };
  const { pool } = makeDefaultPool([row]);
  const { adapter, uploadCalls } = makeMockStorage();
  const { queue } = makeMockQueue();

  await handleExportJob(pool as unknown as Pool, adapter, queue, makeJob());

  const csv = uploadCalls[0]?.data.toString("utf-8") ?? "";
  const dataLine = csv.split("\n")[1] ?? "";
  // null and undefined should produce empty fields
  assert.ok(
    dataLine.includes("c-1,,"),
    "null/undefined should produce empty fields",
  );
});

/* 7. JSON 序列化 */
void test("CSV serializes object values as JSON", async () => {
  const row = { id: "c-1", profile: { name: "John", age: 30 } };
  const { pool } = makeDefaultPool([row]);
  const { adapter, uploadCalls } = makeMockStorage();
  const { queue } = makeMockQueue();

  await handleExportJob(pool as unknown as Pool, adapter, queue, makeJob());

  const csv = uploadCalls[0]?.data.toString("utf-8") ?? "";
  assert.ok(csv.includes("John"), "object value should be serialized as JSON");
});

/* 8. storage upload 失败 */
void test("propagates storage upload error", async () => {
  const { pool } = makeDefaultPool([makeCaseRow()]);
  const adapter: StorageAdapter = {
    upload: () => Promise.reject(new Error("Storage unavailable")),
    download: () => Promise.resolve(Buffer.alloc(0)),
    remove: () => Promise.resolve(),
    getSignedUrl: () => Promise.resolve(""),
  };
  const { queue } = makeMockQueue();

  await assert.rejects(
    () => handleExportJob(pool as unknown as Pool, adapter, queue, makeJob()),
    /Storage unavailable/,
  );
});

/* 9. queue enqueue 失败 */
void test("propagates queue enqueue error", async () => {
  const { pool } = makeDefaultPool([makeCaseRow()]);
  const { adapter } = makeMockStorage();
  const queue = {
    enqueue: () => Promise.reject(new Error("Redis down")),
  } as unknown as RedisQueue;

  await assert.rejects(
    () => handleExportJob(pool as unknown as Pool, adapter, queue, makeJob()),
    /Redis down/,
  );
});

/* 10. DB 查询失败 */
void test("propagates database query error", async () => {
  const pool = makePool(() => Promise.reject(new Error("Connection refused")));
  const { adapter } = makeMockStorage();
  const { queue } = makeMockQueue();

  await assert.rejects(
    () => handleExportJob(pool as unknown as Pool, adapter, queue, makeJob()),
    /Connection refused/,
  );
});

/* 11. Tenant 隔离 */
void test("sets tenant org_id via set_config for RLS isolation", async () => {
  const { pool, calls } = makeDefaultPool([makeCaseRow()]);
  const { adapter } = makeMockStorage();
  const { queue } = makeMockQueue();

  await handleExportJob(pool as unknown as Pool, adapter, queue, makeJob());

  const setConfigCall = calls.find((c) =>
    c.sql.includes("set_config('app.org_id'"),
  );
  assert.ok(setConfigCall, "should set org_id for tenant isolation");
  assert.equal(setConfigCall.params?.[0], ORG_ID);
});

/* 12. 文件 key 格式 */
void test("file key follows format: exports/{orgId}/{timestamp}_{exportType}.{ext}", async () => {
  const { pool } = makeDefaultPool([makeCaseRow()]);
  const { adapter, uploadCalls } = makeMockStorage();
  const { queue } = makeMockQueue();

  await handleExportJob(pool as unknown as Pool, adapter, queue, makeJob());

  const key = uploadCalls[0]?.key ?? "";
  const pattern = new RegExp(`^exports/${ORG_ID}/[0-9]+_cases\\.csv$`);
  assert.match(key, pattern, `key "${key}" should match expected pattern`);
});

/* 13. Excel 回退 */
void test("excel format falls back to CSV (TODO placeholder)", async () => {
  const { pool } = makeDefaultPool([makeCaseRow()]);
  const { adapter, uploadCalls } = makeMockStorage();
  const { queue } = makeMockQueue();

  await handleExportJob(
    pool as unknown as Pool,
    adapter,
    queue,
    makeJob({ format: "excel" }),
  );

  assert.equal(uploadCalls.length, 1);
  // 暂时回退为 CSV
  assert.equal(uploadCalls[0]?.contentType, "text/csv");
});

/* 14. 查询上限 */
void test("query limits all export types to 10000 rows", async () => {
  const { pool, calls } = makeDefaultPool([]);
  const { adapter } = makeMockStorage();
  const { queue } = makeMockQueue();

  for (const et of ["cases", "customers", "document_items"] as const) {
    calls.length = 0;
    await handleExportJob(
      pool as unknown as Pool,
      adapter,
      queue,
      makeJob({ exportType: et }),
    );
    const sel = calls.find((c) => c.sql.includes(`from ${et}`));
    assert.ok(sel, "should query for " + et);
    assert.equal(sel.params?.[0], 10_000, et + " should limit to 10000");
  }
});

/* 15. Timeline payload */
void test("timeline payload includes exportType, format, fileKey, rowCount", async () => {
  const { pool, calls } = makeDefaultPool([makeCaseRow()]);
  const { adapter } = makeMockStorage();
  const { queue } = makeMockQueue();
  await handleExportJob(pool as unknown as Pool, adapter, queue, makeJob());
  const tl = calls.find((c) => c.sql.includes("insert into timeline_logs"));
  assert.ok(tl);
  const parsed = JSON.parse(tl.params?.[5] as string) as Record<
    string,
    unknown
  >;
  assert.equal(parsed.exportType, "cases");
  assert.equal(parsed.format, "csv");
  assert.ok(typeof parsed.fileKey === "string");
  assert.equal(parsed.rowCount, 1);
});

/* 16. notification job 结构 + 17. 大批量 + 18. 参数化 */
void test("notification job has required structure", async () => {
  const { pool } = makeDefaultPool([makeCaseRow()]);
  const { adapter } = makeMockStorage();
  const { queue, enqueueCalls } = makeMockQueue();
  await handleExportJob(pool as unknown as Pool, adapter, queue, makeJob());
  const nj = enqueueCalls[0]?.job as QueueJob<Record<string, unknown>>;
  assert.ok(nj.id);
  assert.equal(nj.name, "export_ready");
  assert.ok(nj.createdAt);
  assert.ok(nj.payload);
});

void test("handles large batch (100 rows) correctly", async () => {
  const rows = Array.from({ length: 100 }, (_, i) =>
    makeCaseRow("case-" + String(i)),
  );
  const { pool } = makeDefaultPool(rows);
  const { adapter, uploadCalls } = makeMockStorage();
  const { queue } = makeMockQueue();
  await handleExportJob(pool as unknown as Pool, adapter, queue, makeJob());
  const csvLines = (uploadCalls[0]?.data.toString("utf-8") ?? "").split("\n");
  assert.equal(csvLines.length, 101, "header + 100 data rows");
});

void test("query uses parameterized limit", async () => {
  const { pool, calls } = makeDefaultPool([]);
  const { adapter } = makeMockStorage();
  const { queue } = makeMockQueue();
  await handleExportJob(pool as unknown as Pool, adapter, queue, makeJob());
  const sel = calls.find((c) => c.sql.includes("from cases"));
  assert.ok(sel);
  assert.ok(sel.sql.includes("$1"), "limit should be parameterized");
  assert.equal(sel.params?.[0], 10_000);
});
