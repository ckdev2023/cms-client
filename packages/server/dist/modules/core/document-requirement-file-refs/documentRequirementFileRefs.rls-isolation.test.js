import test from "node:test";
import assert from "node:assert/strict";
import { DocumentRequirementFileRefsService } from "./documentRequirementFileRefs.service";
const ORG_A = "00000000-0000-4000-8000-aaaaaaaaaaaa";
const ORG_B = "00000000-0000-4000-8000-bbbbbbbbbbbb";
const USER_A = "00000000-0000-4000-8000-000000000001";
const USER_B = "00000000-0000-4000-8000-000000000002";
const REQ_ID = "00000000-0000-4000-8000-000000000010";
const FILE_ID = "00000000-0000-4000-8000-000000000020";
const REF_ID = "00000000-0000-4000-8000-000000000030";
const CASE_ID = "00000000-0000-4000-8000-000000000040";
const EMPTY = { rows: [], rowCount: 0 };
const INFRA_PATTERNS = ["begin", "commit", "rollback"];
function makeTimeline() {
  return {
    service: {
      write: () => Promise.resolve(),
    },
  };
}
function makeRefRow() {
  return {
    id: REF_ID,
    requirement_id: REQ_ID,
    file_version_id: FILE_ID,
    ref_mode: "cross_case_link",
    linked_from_requirement_id: null,
    created_by: USER_A,
    created_at: "2026-01-01T00:00:00.000Z",
  };
}
function ctxA() {
  return { orgId: ORG_A, userId: USER_A, role: "staff" };
}
function ctxB() {
  return { orgId: ORG_B, userId: USER_B, role: "staff" };
}
void test("RefsService.listByRequirement sets org_id via set_config for tenant isolation", async () => {
  const capturedOrgIds = [];
  const calls = [];
  const queryFn = (sql, params) => {
    calls.push(sql.trim());
    if (sql.includes("set_config('app.org_id'")) {
      capturedOrgIds.push(params?.[0]);
      return Promise.resolve({ rows: [], rowCount: 1 });
    }
    if (sql.includes("set_config('app.actor_user_id'")) {
      return Promise.resolve({ rows: [], rowCount: 1 });
    }
    if (sql.includes("document_requirement_file_refs")) {
      return Promise.resolve({ rows: [], rowCount: 0 });
    }
    return Promise.resolve(EMPTY);
  };
  const pool = {
    connect: () =>
      Promise.resolve({ query: queryFn, release: () => undefined }),
  };
  const timeline = makeTimeline();
  const svc = new DocumentRequirementFileRefsService(pool, timeline.service);
  await svc.listByRequirement(ctxA(), REQ_ID);
  assert.ok(calls.some((s) => s.includes("set_config('app.org_id'")));
  assert.ok(capturedOrgIds.includes(ORG_A));
});
void test("RefsService.listByRequirement uses different org_id per tenant", async () => {
  const capturedOrgIds = [];
  const queryFn = (sql, params) => {
    if (sql.includes("set_config('app.org_id'")) {
      capturedOrgIds.push(params?.[0]);
      return Promise.resolve({ rows: [], rowCount: 1 });
    }
    if (sql.includes("set_config('app.actor_user_id'")) {
      return Promise.resolve({ rows: [], rowCount: 1 });
    }
    if (sql.includes("document_requirement_file_refs")) {
      return Promise.resolve({ rows: [], rowCount: 0 });
    }
    return Promise.resolve(EMPTY);
  };
  const pool = {
    connect: () =>
      Promise.resolve({ query: queryFn, release: () => undefined }),
  };
  const timeline = makeTimeline();
  const svc = new DocumentRequirementFileRefsService(pool, timeline.service);
  await svc.listByRequirement(ctxA(), REQ_ID);
  await svc.listByRequirement(ctxB(), REQ_ID);
  assert.ok(capturedOrgIds.includes(ORG_A));
  assert.ok(capturedOrgIds.includes(ORG_B));
});
void test("RefsService.get sets org_id via set_config", async () => {
  const capturedOrgIds = [];
  const queryFn = (sql, params) => {
    if (sql.includes("set_config('app.org_id'")) {
      capturedOrgIds.push(params?.[0]);
      return Promise.resolve({ rows: [], rowCount: 1 });
    }
    if (sql.includes("set_config('app.actor_user_id'")) {
      return Promise.resolve({ rows: [], rowCount: 1 });
    }
    if (sql.includes("document_requirement_file_refs")) {
      return Promise.resolve({ rows: [makeRefRow()], rowCount: 1 });
    }
    return Promise.resolve(EMPTY);
  };
  const pool = {
    connect: () =>
      Promise.resolve({ query: queryFn, release: () => undefined }),
  };
  const timeline = makeTimeline();
  const svc = new DocumentRequirementFileRefsService(pool, timeline.service);
  const ref = await svc.get(ctxA(), REF_ID);
  assert.ok(ref);
  assert.ok(capturedOrgIds.includes(ORG_A));
});
void test("RefsService.link sets org_id inside transaction", async () => {
  const capturedOrgIds = [];
  const queryFn = (sql, params) => {
    for (const p of INFRA_PATTERNS) {
      if (sql.includes(p)) return Promise.resolve(EMPTY);
    }
    if (sql.includes("set_config('app.org_id'")) {
      capturedOrgIds.push(params?.[0]);
      return Promise.resolve({ rows: [], rowCount: 1 });
    }
    if (sql.includes("set_config('app.actor_user_id'")) {
      return Promise.resolve({ rows: [], rowCount: 1 });
    }
    if (sql.includes("FOR UPDATE")) {
      return Promise.resolve({
        rows: [{ id: REQ_ID, status: "approved", case_id: CASE_ID }],
        rowCount: 1,
      });
    }
    if (sql.includes("FROM document_files")) {
      return Promise.resolve({ rows: [{ id: FILE_ID }], rowCount: 1 });
    }
    if (sql.includes("INSERT INTO document_requirement_file_refs")) {
      return Promise.resolve({ rows: [makeRefRow()], rowCount: 1 });
    }
    return Promise.resolve(EMPTY);
  };
  const pool = {
    connect: () =>
      Promise.resolve({ query: queryFn, release: () => undefined }),
  };
  const timeline = makeTimeline();
  const svc = new DocumentRequirementFileRefsService(pool, timeline.service);
  await svc.link(ctxA(), { requirementId: REQ_ID, fileVersionId: FILE_ID });
  assert.ok(capturedOrgIds.includes(ORG_A));
});
void test("RefsService.listCandidates sets org_id via set_config", async () => {
  const capturedOrgIds = [];
  const queryFn = (sql, params) => {
    if (sql.includes("set_config('app.org_id'")) {
      capturedOrgIds.push(params?.[0]);
      return Promise.resolve({ rows: [], rowCount: 1 });
    }
    if (sql.includes("set_config('app.actor_user_id'")) {
      return Promise.resolve({ rows: [], rowCount: 1 });
    }
    if (sql.includes("checklist_item_code")) {
      return Promise.resolve({ rows: [], rowCount: 0 });
    }
    return Promise.resolve(EMPTY);
  };
  const pool = {
    connect: () =>
      Promise.resolve({ query: queryFn, release: () => undefined }),
  };
  const timeline = makeTimeline();
  const svc = new DocumentRequirementFileRefsService(pool, timeline.service);
  await svc.listCandidates(ctxA(), REQ_ID);
  assert.ok(capturedOrgIds.includes(ORG_A));
});
void test("RefsService.listByRequirement also sets actor_user_id", async () => {
  const capturedUserIds = [];
  const queryFn = (sql, params) => {
    if (sql.includes("set_config('app.actor_user_id'")) {
      capturedUserIds.push(params?.[0]);
      return Promise.resolve({ rows: [], rowCount: 1 });
    }
    if (sql.includes("set_config('app.org_id'")) {
      return Promise.resolve({ rows: [], rowCount: 1 });
    }
    if (sql.includes("document_requirement_file_refs")) {
      return Promise.resolve({ rows: [], rowCount: 0 });
    }
    return Promise.resolve(EMPTY);
  };
  const pool = {
    connect: () =>
      Promise.resolve({ query: queryFn, release: () => undefined }),
  };
  const timeline = makeTimeline();
  const svc = new DocumentRequirementFileRefsService(pool, timeline.service);
  await svc.listByRequirement(ctxA(), REQ_ID);
  assert.ok(capturedUserIds.includes(USER_A));
});
//# sourceMappingURL=documentRequirementFileRefs.rls-isolation.test.js.map
