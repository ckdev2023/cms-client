import test from "node:test";
import assert from "node:assert/strict";
import { DocumentFilesService } from "./documentFiles.service";
const ORG_ID = "00000000-0000-4000-8000-000000000000";
const USER_ID = "00000000-0000-4000-8000-000000000001";
const FILE_ID = "file-1";
const REQUIREMENT_ID = "00000000-0000-4000-8000-000000000010";
const CUSTOMER_ID = "00000000-0000-4000-8000-000000000030";
const ASSET_ID = "00000000-0000-4000-8000-000000000040";
function makeCtx(role = "staff") {
  return { orgId: ORG_ID, userId: USER_ID, role };
}
function makeFileRow(overrides = {}) {
  return {
    id: FILE_ID,
    org_id: ORG_ID,
    requirement_id: REQUIREMENT_ID,
    file_name: "passport.pdf",
    file_url: null,
    file_type: null,
    file_size: null,
    version_no: 1,
    uploaded_by: USER_ID,
    uploaded_at: "2026-01-01T00:00:00.000Z",
    storage_type: "local_server",
    relative_path: "archive/passport.pdf",
    review_status: "pending",
    review_by: null,
    review_at: null,
    expiry_date: null,
    hash_value: null,
    created_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}
function makePool(queryFn) {
  return {
    connect: () =>
      Promise.resolve({
        query: queryFn,
        release: () => undefined,
      }),
  };
}
function makeTimeline() {
  const writes = [];
  return {
    service: {
      write: (_ctx, input) => {
        writes.push(input);
        return Promise.resolve();
      },
    },
    writes,
  };
}
function makeStorage() {
  const adapter = {
    upload: () => Promise.resolve(),
    download: () => Promise.resolve(Buffer.alloc(0)),
    remove: () => Promise.resolve(),
    getSignedUrl: () => Promise.resolve("https://example.com/file"),
  };
  return { adapter };
}
function createService(queryFn) {
  const pool = makePool(queryFn);
  const timeline = makeTimeline();
  const storage = makeStorage();
  const svc = new DocumentFilesService(pool, timeline.service, storage.adapter);
  return { svc, timeline };
}
function handleD3Queries(sql) {
  if (sql.includes("customer_id from cases")) {
    return { rows: [{ customer_id: CUSTOMER_ID }], rowCount: 1 };
  }
  if (sql.includes("INSERT INTO document_assets")) {
    return { rows: [{ id: ASSET_ID }], rowCount: 1 };
  }
  if (sql.includes("document_requirement_file_refs")) {
    return { rows: [], rowCount: 1 };
  }
  return null;
}
void test("upload transitions item from pending to uploaded_reviewing", async () => {
  const calls = [];
  const { svc, timeline } = createService((sql, params) => {
    calls.push({ sql, params });
    if (sql.includes("from document_items") && sql.includes("for update")) {
      return Promise.resolve({
        rows: [
          {
            id: REQUIREMENT_ID,
            status: "pending",
            case_id: "case-1",
            checklist_item_code: "passport",
          },
        ],
        rowCount: 1,
      });
    }
    if (
      sql.includes("select coalesce(max(version_no), 0) + 1 as next_version")
    ) {
      return Promise.resolve({ rows: [{ next_version: "1" }], rowCount: 1 });
    }
    const d3 = handleD3Queries(sql);
    if (d3) return Promise.resolve(d3);
    if (sql.includes("insert into document_files")) {
      return Promise.resolve({ rows: [makeFileRow()], rowCount: 1 });
    }
    if (sql.includes("update document_items") && sql.includes("received_at")) {
      return Promise.resolve({ rows: [], rowCount: 1 });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });
  await svc.upload(makeCtx(), {
    requirementId: REQUIREMENT_ID,
    fileName: "passport.pdf",
    relativePath: "archive/passport.pdf",
  });
  const transitionCall = calls.find(
    (c) =>
      c.sql.includes("update document_items") && c.sql.includes("received_at"),
  );
  assert.ok(transitionCall, "should update document_items status");
  assert.ok(transitionCall.params);
  assert.equal(transitionCall.params[1], "uploaded_reviewing");
  assert.equal(transitionCall.params[2], "pending");
  assert.equal(timeline.writes.length, 2);
  assert.equal(timeline.writes[1].action, "document_item.transitioned");
  const payload = timeline.writes[1].payload;
  assert.equal(payload.from, "pending");
  assert.equal(payload.to, "uploaded_reviewing");
  assert.equal(payload.trigger, "file_upload");
});
void test("upload transitions item from revision_required to uploaded_reviewing", async () => {
  const calls = [];
  const { svc, timeline } = createService((sql, params) => {
    calls.push({ sql, params });
    if (sql.includes("from document_items") && sql.includes("for update")) {
      return Promise.resolve({
        rows: [
          {
            id: REQUIREMENT_ID,
            status: "revision_required",
            case_id: "c-1",
            checklist_item_code: "passport",
          },
        ],
        rowCount: 1,
      });
    }
    if (
      sql.includes("select coalesce(max(version_no), 0) + 1 as next_version")
    ) {
      return Promise.resolve({ rows: [{ next_version: "2" }], rowCount: 1 });
    }
    const d3 = handleD3Queries(sql);
    if (d3) return Promise.resolve(d3);
    if (sql.includes("insert into document_files")) {
      return Promise.resolve({
        rows: [makeFileRow({ version_no: 2 })],
        rowCount: 1,
      });
    }
    if (sql.includes("update document_items") && sql.includes("received_at")) {
      return Promise.resolve({ rows: [], rowCount: 1 });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });
  await svc.upload(makeCtx(), {
    requirementId: REQUIREMENT_ID,
    fileName: "passport.pdf",
    relativePath: "archive/passport-v2.pdf",
  });
  const transitionCall = calls.find(
    (c) =>
      c.sql.includes("update document_items") && c.sql.includes("received_at"),
  );
  assert.ok(transitionCall, "should update document_items status");
  assert.ok(transitionCall.params);
  assert.equal(transitionCall.params[2], "revision_required");
  assert.equal(timeline.writes.length, 2);
  assert.equal(timeline.writes[1].action, "document_item.transitioned");
});
void test("upload transitions item from waiting_upload to uploaded_reviewing", async () => {
  const calls = [];
  const { svc, timeline } = createService((sql, params) => {
    calls.push({ sql, params });
    if (sql.includes("from document_items") && sql.includes("for update")) {
      return Promise.resolve({
        rows: [
          {
            id: REQUIREMENT_ID,
            status: "waiting_upload",
            case_id: "c-1",
            checklist_item_code: "passport",
          },
        ],
        rowCount: 1,
      });
    }
    if (
      sql.includes("select coalesce(max(version_no), 0) + 1 as next_version")
    ) {
      return Promise.resolve({ rows: [{ next_version: "1" }], rowCount: 1 });
    }
    const d3 = handleD3Queries(sql);
    if (d3) return Promise.resolve(d3);
    if (sql.includes("insert into document_files")) {
      return Promise.resolve({ rows: [makeFileRow()], rowCount: 1 });
    }
    if (sql.includes("update document_items") && sql.includes("received_at")) {
      return Promise.resolve({ rows: [], rowCount: 1 });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });
  await svc.upload(makeCtx(), {
    requirementId: REQUIREMENT_ID,
    fileName: "passport.pdf",
    relativePath: "archive/passport.pdf",
  });
  const transitionCall = calls.find(
    (c) =>
      c.sql.includes("update document_items") && c.sql.includes("received_at"),
  );
  assert.ok(transitionCall, "should update document_items status");
  assert.ok(transitionCall.params);
  assert.equal(transitionCall.params[2], "waiting_upload");
  assert.equal(timeline.writes.length, 2);
});
void test("upload does NOT transition item from approved status", async () => {
  const calls = [];
  const { svc, timeline } = createService((sql, params) => {
    calls.push({ sql, params });
    if (sql.includes("from document_items") && sql.includes("for update")) {
      return Promise.resolve({
        rows: [
          {
            id: REQUIREMENT_ID,
            status: "approved",
            case_id: "c-1",
            checklist_item_code: "passport",
          },
        ],
        rowCount: 1,
      });
    }
    if (
      sql.includes("select coalesce(max(version_no), 0) + 1 as next_version")
    ) {
      return Promise.resolve({ rows: [{ next_version: "3" }], rowCount: 1 });
    }
    const d3 = handleD3Queries(sql);
    if (d3) return Promise.resolve(d3);
    if (sql.includes("insert into document_files")) {
      return Promise.resolve({
        rows: [makeFileRow({ version_no: 3 })],
        rowCount: 1,
      });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });
  await svc.upload(makeCtx(), {
    requirementId: REQUIREMENT_ID,
    fileName: "passport.pdf",
    relativePath: "archive/passport.pdf",
  });
  const transitionCall = calls.find(
    (c) =>
      c.sql.includes("update document_items") && c.sql.includes("received_at"),
  );
  assert.ok(!transitionCall, "should NOT transition approved status");
  assert.equal(timeline.writes.length, 1);
  assert.equal(timeline.writes[0].action, "document_file.uploaded");
});
//# sourceMappingURL=documentFiles.upload-transition.test.js.map
