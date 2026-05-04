import test from "node:test";
import assert from "node:assert/strict";
import { DocumentRequirementFileRefsService } from "./documentRequirementFileRefs.service";
import {
  mapRefRow,
  mapCandidateRow,
} from "./documentRequirementFileRefs.shared";
const ORG_ID = "00000000-0000-4000-8000-000000000000";
const USER_ID = "00000000-0000-4000-8000-000000000001";
const REQ_ID = "00000000-0000-4000-8000-000000000010";
const FILE_ID = "00000000-0000-4000-8000-000000000020";
const REF_ID = "00000000-0000-4000-8000-000000000030";
const CASE_ID = "00000000-0000-4000-8000-000000000040";
function makeCtx(role = "staff") {
  return { orgId: ORG_ID, userId: USER_ID, role };
}
function makeRefRow(o = {}) {
  return {
    id: REF_ID,
    requirement_id: REQ_ID,
    file_version_id: FILE_ID,
    ref_mode: "cross_case_link",
    linked_from_requirement_id: null,
    created_by: USER_ID,
    created_at: "2026-01-01T00:00:00.000Z",
    ...o,
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
const EMPTY = { rows: [], rowCount: 0 };
const INFRA_PATTERNS = ["set_config", "begin", "commit", "rollback"];
function sqlRouter(matches) {
  return (sql, params) => {
    for (const p of INFRA_PATTERNS) {
      if (sql.includes(p)) return Promise.resolve(EMPTY);
    }
    for (const m of matches) {
      if (sql.includes(m.pattern)) {
        m.captureParams?.(params);
        return Promise.resolve(m.result);
      }
    }
    return Promise.resolve(EMPTY);
  };
}
function createService(queryFn) {
  const pool = {
    connect: () =>
      Promise.resolve({ query: queryFn, release: () => undefined }),
  };
  const timeline = makeTimeline();
  const svc = new DocumentRequirementFileRefsService(pool, timeline.service);
  return { svc, timeline };
}
const reqRow = (status) => ({
  rows: [{ id: REQ_ID, status, case_id: CASE_ID }],
  rowCount: 1,
});
const fileRow = { rows: [{ id: FILE_ID }], rowCount: 1 };
const refInsert = { rows: [makeRefRow()], rowCount: 1 };
const updated = { rows: [], rowCount: 1 };
// ── mapRefRow ──
void test("mapRefRow maps all fields correctly", () => {
  const ref = mapRefRow(makeRefRow());
  assert.equal(ref.id, REF_ID);
  assert.equal(ref.requirementId, REQ_ID);
  assert.equal(ref.fileVersionId, FILE_ID);
  assert.equal(ref.refMode, "cross_case_link");
  assert.equal(ref.linkedFromRequirementId, null);
  assert.equal(ref.createdBy, USER_ID);
});
void test("mapRefRow handles linked_from_requirement_id", () => {
  const lid = "00000000-0000-4000-8000-000000000099";
  assert.equal(
    mapRefRow(makeRefRow({ linked_from_requirement_id: lid }))
      .linkedFromRequirementId,
    lid,
  );
});
// ── mapCandidateRow ──
void test("mapCandidateRow maps all fields and fileKey", () => {
  const row = {
    id: FILE_ID,
    requirement_id: REQ_ID,
    file_name: "passport.pdf",
    file_url: null,
    file_type: "application/pdf",
    file_size: 12345,
    version_no: 2,
    uploaded_by: USER_ID,
    uploaded_at: "2026-01-01T00:00:00Z",
    storage_type: "local_server",
    relative_path: "cases/A/passport.pdf",
    review_status: "approved",
    expiry_date: "2027-06-30",
    source_case_id: CASE_ID,
    source_requirement_name: "パスポート",
  };
  const c = mapCandidateRow(row);
  assert.equal(c.fileId, FILE_ID);
  assert.equal(c.fileKey, "cases/A/passport.pdf");
  assert.equal(c.versionNo, 2);
  assert.equal(c.expiryDate, "2027-06-30");
});
void test("mapCandidateRow fileKey falls back to fileUrl then empty", () => {
  const base = {
    id: "f1",
    requirement_id: "r1",
    file_name: "t.pdf",
    file_url: "https://cdn/f.pdf",
    file_type: null,
    file_size: null,
    version_no: 1,
    uploaded_by: null,
    uploaded_at: "",
    storage_type: "s3",
    relative_path: null,
    review_status: "pending",
    expiry_date: null,
    source_case_id: "c1",
    source_requirement_name: "d",
  };
  assert.equal(mapCandidateRow(base).fileKey, "https://cdn/f.pdf");
  assert.equal(mapCandidateRow({ ...base, file_url: null }).fileKey, "");
});
// ── link ──
void test("link creates ref + transitions pending→uploaded_reviewing", async () => {
  let insertOk = false;
  let transOk = false;
  const { svc, timeline } = createService(
    sqlRouter([
      { pattern: "FOR UPDATE", result: reqRow("pending") },
      { pattern: "FROM document_files", result: fileRow },
      {
        pattern: "INSERT INTO document_requirement_file_refs",
        result: refInsert,
        captureParams: () => {
          insertOk = true;
        },
      },
      {
        pattern: "UPDATE document_items",
        result: updated,
        captureParams: () => {
          transOk = true;
        },
      },
    ]),
  );
  const ref = await svc.link(makeCtx(), {
    requirementId: REQ_ID,
    fileVersionId: FILE_ID,
  });
  assert.equal(insertOk, true);
  assert.equal(transOk, true);
  assert.equal(ref.id, REF_ID);
  assert.equal(ref.refMode, "cross_case_link");
  assert.equal(timeline.writes.length, 2);
  const [linked, trans] = timeline.writes;
  assert.equal(linked.action, "document_requirement_file_ref.linked");
  assert.equal(trans.action, "document_item.transitioned");
  const tp = trans.payload;
  assert.equal(tp.from, "pending");
  assert.equal(tp.to, "uploaded_reviewing");
  assert.equal(tp.trigger, "cross_case_link");
});
void test("link skips transition when status is approved", async () => {
  const { svc, timeline } = createService(
    sqlRouter([
      { pattern: "FOR UPDATE", result: reqRow("approved") },
      { pattern: "FROM document_files", result: fileRow },
      {
        pattern: "INSERT INTO document_requirement_file_refs",
        result: refInsert,
      },
    ]),
  );
  await svc.link(makeCtx(), { requirementId: REQ_ID, fileVersionId: FILE_ID });
  assert.equal(timeline.writes.length, 1);
  assert.equal(
    timeline.writes[0].action,
    "document_requirement_file_ref.linked",
  );
});
void test("link throws when requirement not found", async () => {
  const { svc } = createService(sqlRouter([]));
  await assert.rejects(
    svc.link(makeCtx(), { requirementId: REQ_ID, fileVersionId: FILE_ID }),
    { message: "Document requirement not found" },
  );
});
void test("link throws when file version not found", async () => {
  const { svc } = createService(
    sqlRouter([{ pattern: "FOR UPDATE", result: reqRow("pending") }]),
  );
  await assert.rejects(
    svc.link(makeCtx(), { requirementId: REQ_ID, fileVersionId: FILE_ID }),
    { message: "File version not found" },
  );
});
void test("link transitions revision_required→uploaded_reviewing", async () => {
  const { svc, timeline } = createService(
    sqlRouter([
      { pattern: "FOR UPDATE", result: reqRow("revision_required") },
      { pattern: "FROM document_files", result: fileRow },
      {
        pattern: "INSERT INTO document_requirement_file_refs",
        result: refInsert,
      },
      { pattern: "UPDATE document_items", result: updated },
    ]),
  );
  await svc.link(makeCtx(), { requirementId: REQ_ID, fileVersionId: FILE_ID });
  assert.equal(timeline.writes.length, 2);
  const tp = timeline.writes[1].payload;
  assert.equal(tp.from, "revision_required");
});
void test("link transitions waiting_upload→uploaded_reviewing", async () => {
  const { svc, timeline } = createService(
    sqlRouter([
      { pattern: "FOR UPDATE", result: reqRow("waiting_upload") },
      { pattern: "FROM document_files", result: fileRow },
      {
        pattern: "INSERT INTO document_requirement_file_refs",
        result: refInsert,
      },
      { pattern: "UPDATE document_items", result: updated },
    ]),
  );
  await svc.link(makeCtx(), { requirementId: REQ_ID, fileVersionId: FILE_ID });
  assert.equal(timeline.writes.length, 2);
  const tp = timeline.writes[1].payload;
  assert.equal(tp.from, "waiting_upload");
});
// ── unlink ──
void test("unlink deletes ref and writes timeline", async () => {
  let deleted = false;
  const { svc, timeline } = createService((sql) => {
    for (const p of INFRA_PATTERNS) {
      if (sql.includes(p)) return Promise.resolve(EMPTY);
    }
    if (sql.includes("DELETE FROM")) {
      deleted = true;
      return Promise.resolve({ rows: [], rowCount: 1 });
    }
    if (sql.includes("submission_package")) return Promise.resolve(EMPTY);
    if (sql.includes("document_requirement_file_refs")) {
      return Promise.resolve({ rows: [makeRefRow()], rowCount: 1 });
    }
    return Promise.resolve(EMPTY);
  });
  await svc.unlink(makeCtx(), REF_ID);
  assert.equal(deleted, true);
  assert.equal(timeline.writes.length, 1);
  const e = timeline.writes[0];
  assert.equal(e.action, "document_requirement_file_ref.unlinked");
  assert.equal(e.entityId, REQ_ID);
});
void test("unlink throws when ref not found", async () => {
  const { svc } = createService(sqlRouter([]));
  await assert.rejects(svc.unlink(makeCtx(), REF_ID), {
    message: "Reference not found",
  });
});
void test("unlink throws when locked in submission package", async () => {
  const { svc } = createService((sql) => {
    for (const p of INFRA_PATTERNS) {
      if (sql.includes(p)) return Promise.resolve(EMPTY);
    }
    if (sql.includes("submission_package")) {
      return Promise.resolve({ rows: [{ package_id: "p1" }], rowCount: 1 });
    }
    if (sql.includes("document_requirement_file_refs")) {
      return Promise.resolve({ rows: [makeRefRow()], rowCount: 1 });
    }
    return Promise.resolve(EMPTY);
  });
  await assert.rejects(svc.unlink(makeCtx(), REF_ID), {
    message:
      "File version is locked in a submission package and cannot be unlinked",
  });
});
// ── get ──
void test("get returns ref when found", async () => {
  const { svc } = createService(
    sqlRouter([
      {
        pattern: "FROM document_requirement_file_refs",
        result: { rows: [makeRefRow()], rowCount: 1 },
      },
    ]),
  );
  const ref = await svc.get(makeCtx(), REF_ID);
  assert.ok(ref);
  assert.equal(ref.id, REF_ID);
});
void test("get returns null when not found", async () => {
  const { svc } = createService(sqlRouter([]));
  assert.equal(await svc.get(makeCtx(), REF_ID), null);
});
// ── listByRequirement ──
void test("listByRequirement returns refs", async () => {
  const r1 = makeRefRow({ id: "ref-1" });
  const r2 = makeRefRow({ id: "ref-2" });
  const { svc } = createService(
    sqlRouter([
      {
        pattern: "FROM document_requirement_file_refs",
        result: { rows: [r1, r2], rowCount: 2 },
      },
    ]),
  );
  const refs = await svc.listByRequirement(makeCtx(), REQ_ID);
  assert.equal(refs.length, 2);
  assert.equal(refs[0].id, "ref-1");
});
// ── listCandidates ──
void test("listCandidates returns candidate rows", async () => {
  const row = {
    id: "file-99",
    requirement_id: "req-o",
    file_name: "passport_v2.pdf",
    file_url: null,
    file_type: "application/pdf",
    file_size: 5000,
    version_no: 2,
    uploaded_by: USER_ID,
    uploaded_at: "2026-02-01T00:00:00Z",
    storage_type: "local_server",
    relative_path: "o/passport_v2.pdf",
    review_status: "approved",
    expiry_date: "2028-01-01",
    source_case_id: "case-o",
    source_requirement_name: "パスポート（他）",
  };
  const { svc } = createService(
    sqlRouter([
      { pattern: "checklist_item_code", result: { rows: [row], rowCount: 1 } },
    ]),
  );
  const cs = await svc.listCandidates(makeCtx(), REQ_ID);
  assert.equal(cs.length, 1);
  assert.equal(cs[0].fileId, "file-99");
  assert.equal(cs[0].sourceCaseId, "case-o");
});
void test("listCandidates caps limit at 200", async () => {
  let captured;
  const { svc } = createService(
    sqlRouter([
      {
        pattern: "checklist_item_code",
        result: EMPTY,
        captureParams: (p) => {
          captured = p?.[1];
        },
      },
    ]),
  );
  await svc.listCandidates(makeCtx(), REQ_ID, 999);
  assert.equal(captured, 200);
});
//# sourceMappingURL=documentRequirementFileRefs.service.test.js.map
