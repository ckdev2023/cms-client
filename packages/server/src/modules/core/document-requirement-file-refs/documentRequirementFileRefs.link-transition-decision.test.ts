import test from "node:test";
import assert from "node:assert/strict";
import type { Pool } from "pg";

import type { RequestContext } from "../tenancy/requestContext";
import { DocumentRequirementFileRefsService } from "./documentRequirementFileRefs.service";
import { type DocumentRequirementFileRefQueryRow } from "./documentRequirementFileRefs.shared";
import { DOCUMENT_ITEM_ALLOWED_TRANSITIONS } from "../documents.types";

const ORG_ID = "00000000-0000-4000-8000-000000000000";
const USER_ID = "00000000-0000-4000-8000-000000000001";
const REQ_ID = "00000000-0000-4000-8000-000000000010";
const FILE_ID = "00000000-0000-4000-8000-000000000020";
const REF_ID = "00000000-0000-4000-8000-000000000030";
const CASE_ID = "00000000-0000-4000-8000-000000000040";

type QR = { rows: unknown[]; rowCount?: number };
type QueryFn = (sql: string, params?: unknown[]) => Promise<QR>;

const EMPTY: QR = { rows: [], rowCount: 0 };
const INFRA_PATTERNS = ["set_config", "begin", "commit", "rollback"];

function makeCtx(): RequestContext {
  return { orgId: ORG_ID, userId: USER_ID, role: "staff" };
}

function makeRefRow(): DocumentRequirementFileRefQueryRow {
  return {
    id: REF_ID,
    requirement_id: REQ_ID,
    file_version_id: FILE_ID,
    ref_mode: "cross_case_link",
    linked_from_requirement_id: null,
    created_by: USER_ID,
    created_at: "2026-01-01T00:00:00.000Z",
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

function createServiceWithStatus(initialStatus: string) {
  let transitionSql: { sql: string; params?: unknown[] } | undefined;
  const timeline = makeTimeline();

  const queryFn: QueryFn = (sql, params) => {
    for (const p of INFRA_PATTERNS) {
      if (sql.includes(p)) return Promise.resolve(EMPTY);
    }
    if (sql.includes("FOR UPDATE")) {
      return Promise.resolve({
        rows: [{ id: REQ_ID, status: initialStatus, case_id: CASE_ID }],
        rowCount: 1,
      });
    }
    if (sql.includes("FROM document_files")) {
      return Promise.resolve({ rows: [{ id: FILE_ID }], rowCount: 1 });
    }
    if (sql.includes("INSERT INTO document_requirement_file_refs")) {
      return Promise.resolve({ rows: [makeRefRow()], rowCount: 1 });
    }
    if (sql.includes("UPDATE document_items")) {
      transitionSql = { sql, params: params ? [...params] : undefined };
      return Promise.resolve({ rows: [], rowCount: 1 });
    }
    return Promise.resolve(EMPTY);
  };

  const pool = {
    connect: () =>
      Promise.resolve({ query: queryFn, release: () => undefined }),
  };

  const svc = new DocumentRequirementFileRefsService(
    pool as unknown as Pool,
    timeline.service as never,
  );

  return { svc, timeline, getTransitionSql: () => transitionSql };
}

// ── E1 Product Decision: link triggers item status transition ──
// Per plan §D2: link → status transition aligned with A3 semantics
//
// Statuses that should trigger transition to uploaded_reviewing:
//   pending, waiting_upload, revision_required
//   (these are exactly the statuses listed in DOCUMENT_ITEM_ALLOWED_TRANSITIONS
//    that have uploaded_reviewing as a valid target)
//
// Statuses that should NOT trigger transition:
//   approved, waived, expired, uploaded_reviewing, deleted

void test("E1 decision: ALLOWED_TRANSITIONS includes uploaded_reviewing for pending", () => {
  const targets = DOCUMENT_ITEM_ALLOWED_TRANSITIONS.pending;
  assert.ok(targets);
  assert.ok(targets.includes("uploaded_reviewing"));
});

void test("E1 decision: ALLOWED_TRANSITIONS includes uploaded_reviewing for waiting_upload", () => {
  const targets = DOCUMENT_ITEM_ALLOWED_TRANSITIONS.waiting_upload;
  assert.ok(targets);
  assert.ok(targets.includes("uploaded_reviewing"));
});

void test("E1 decision: ALLOWED_TRANSITIONS includes uploaded_reviewing for revision_required", () => {
  const targets = DOCUMENT_ITEM_ALLOWED_TRANSITIONS.revision_required;
  assert.ok(targets);
  assert.ok(targets.includes("uploaded_reviewing"));
});

void test("E1 decision: ALLOWED_TRANSITIONS does NOT include uploaded_reviewing for approved", () => {
  const targets = DOCUMENT_ITEM_ALLOWED_TRANSITIONS.approved;
  if (targets) {
    assert.ok(!targets.includes("uploaded_reviewing"));
  }
});

void test("E1 decision: ALLOWED_TRANSITIONS does NOT include uploaded_reviewing for waived", () => {
  const targets = DOCUMENT_ITEM_ALLOWED_TRANSITIONS.waived;
  if (targets) {
    assert.ok(!targets.includes("uploaded_reviewing"));
  }
});

void test("E1 decision: ALLOWED_TRANSITIONS does NOT include uploaded_reviewing for expired", () => {
  const targets = DOCUMENT_ITEM_ALLOWED_TRANSITIONS.expired;
  if (targets) {
    assert.ok(!targets.includes("uploaded_reviewing"));
  }
});

// ── Integration: link from pending triggers transition ──

void test("E1 link: pending→uploaded_reviewing transition fires and writes timeline", async () => {
  const { svc, timeline, getTransitionSql } =
    createServiceWithStatus("pending");
  await svc.link(makeCtx(), { requirementId: REQ_ID, fileVersionId: FILE_ID });

  assert.ok(getTransitionSql(), "should execute UPDATE for transition");
  assert.equal(timeline.writes.length, 2);

  const transitionTimeline = timeline.writes[1] as Record<string, unknown>;
  assert.equal(transitionTimeline.action, "document_item.transitioned");
  const payload = transitionTimeline.payload as Record<string, unknown>;
  assert.equal(payload.from, "pending");
  assert.equal(payload.to, "uploaded_reviewing");
  assert.equal(payload.trigger, "cross_case_link");
});

void test("E1 link: waiting_upload→uploaded_reviewing transition fires", async () => {
  const { svc, timeline, getTransitionSql } =
    createServiceWithStatus("waiting_upload");
  await svc.link(makeCtx(), { requirementId: REQ_ID, fileVersionId: FILE_ID });

  assert.ok(getTransitionSql());
  assert.equal(timeline.writes.length, 2);
  const payload = (timeline.writes[1] as Record<string, unknown>)
    .payload as Record<string, unknown>;
  assert.equal(payload.from, "waiting_upload");
  assert.equal(payload.to, "uploaded_reviewing");
});

void test("E1 link: revision_required→uploaded_reviewing transition fires", async () => {
  const { svc, timeline, getTransitionSql } =
    createServiceWithStatus("revision_required");
  await svc.link(makeCtx(), { requirementId: REQ_ID, fileVersionId: FILE_ID });

  assert.ok(getTransitionSql());
  assert.equal(timeline.writes.length, 2);
  const payload = (timeline.writes[1] as Record<string, unknown>)
    .payload as Record<string, unknown>;
  assert.equal(payload.from, "revision_required");
  assert.equal(payload.to, "uploaded_reviewing");
});

// ── Integration: link from non-eligible statuses skips transition ──

void test("E1 link: approved status does NOT trigger transition", async () => {
  const { svc, timeline, getTransitionSql } =
    createServiceWithStatus("approved");
  await svc.link(makeCtx(), { requirementId: REQ_ID, fileVersionId: FILE_ID });

  assert.equal(getTransitionSql(), undefined, "no UPDATE should fire");
  assert.equal(
    timeline.writes.length,
    1,
    "only linked timeline, no transition",
  );
  assert.equal(
    (timeline.writes[0] as Record<string, unknown>).action,
    "document_requirement_file_ref.linked",
  );
});

void test("E1 link: uploaded_reviewing status does NOT trigger transition", async () => {
  const { svc, timeline, getTransitionSql } =
    createServiceWithStatus("uploaded_reviewing");
  await svc.link(makeCtx(), { requirementId: REQ_ID, fileVersionId: FILE_ID });

  assert.equal(getTransitionSql(), undefined);
  assert.equal(timeline.writes.length, 1);
});

void test("E1 link: waived status does NOT trigger transition", async () => {
  const { svc, timeline, getTransitionSql } = createServiceWithStatus("waived");
  await svc.link(makeCtx(), { requirementId: REQ_ID, fileVersionId: FILE_ID });

  assert.equal(getTransitionSql(), undefined);
  assert.equal(timeline.writes.length, 1);
});

void test("E1 link: expired status does NOT trigger transition", async () => {
  const { svc, timeline, getTransitionSql } =
    createServiceWithStatus("expired");
  await svc.link(makeCtx(), { requirementId: REQ_ID, fileVersionId: FILE_ID });

  assert.equal(getTransitionSql(), undefined);
  assert.equal(timeline.writes.length, 1);
});

// ── E1: link always writes the "linked" timeline entry ──

void test("E1 link: linked timeline always contains ref metadata", async () => {
  const { svc, timeline } = createServiceWithStatus("approved");
  await svc.link(makeCtx(), { requirementId: REQ_ID, fileVersionId: FILE_ID });

  const linked = timeline.writes[0] as Record<string, unknown>;
  assert.equal(linked.action, "document_requirement_file_ref.linked");
  assert.equal(linked.entityType, "document_item");
  assert.equal(linked.entityId, REQ_ID);
  const payload = linked.payload as Record<string, unknown>;
  assert.equal(payload.refId, REF_ID);
  assert.equal(payload.fileVersionId, FILE_ID);
  assert.equal(payload.refMode, "cross_case_link");
});

// ── E1: transition alignment with upload (A3) ──

void test("E1 alignment: link eligible statuses match upload eligible statuses", () => {
  const uploadEligible = ["pending", "waiting_upload", "revision_required"];
  const linkEligible = (
    Object.entries(DOCUMENT_ITEM_ALLOWED_TRANSITIONS) as [
      string,
      readonly string[],
    ][]
  )
    .filter(([, targets]) => targets.includes("uploaded_reviewing"))
    .map(([from]) => from);

  assert.deepEqual(
    linkEligible.sort(),
    uploadEligible.sort(),
    "link and upload should have the same eligible statuses for transition to uploaded_reviewing",
  );
});
