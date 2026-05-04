import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { SubmissionPackagesService } from "./submissionPackages.service";
const ORG = "00000000-0000-4000-8000-000000000000";
const USER = "00000000-0000-4000-8000-000000000001";
const CASE = "00000000-0000-4000-8000-000000000010";
const PKG_INIT = "00000000-0000-4000-8000-000000000020";
const PKG_S1 = "00000000-0000-4000-8000-000000000021";
const REQ_ID = "00000000-0000-4000-8000-000000000040";
const VR_ID = "00000000-0000-4000-8000-000000000043";
function ctx() {
  return { orgId: ORG, userId: USER, role: "staff" };
}
function svc(qfn, stage = "S7") {
  const pool = {
    connect: () => Promise.resolve({ query: qfn, release: () => undefined }),
  };
  return new SubmissionPackagesService(
    pool,
    { write: () => Promise.resolve() },
    {
      get: () =>
        Promise.resolve({
          id: CASE,
          stage,
          status: stage,
          caseTypeCode: "business_manager_visa",
          supplementCount: 0,
        }),
      transition: (_, id) => Promise.resolve({ id, stage: "S7", status: "S7" }),
      incrementSupplementCount: () => Promise.resolve(1),
    },
    {
      resolve: () => Promise.resolve({ mode: "legacy", used: false }),
    },
  );
}
function pkgRow(overrides = {}) {
  return {
    id: PKG_INIT,
    org_id: ORG,
    case_id: CASE,
    submission_no: 1,
    submission_kind: "initial",
    submitted_at: "2026-01-01T00:00:00.000Z",
    validation_run_id: VR_ID,
    review_record_id: null,
    authority_name: "Tokyo Immigration",
    acceptance_no: "A-001",
    receipt_storage_type: null,
    receipt_relative_path_or_key: null,
    related_submission_id: null,
    created_by: USER,
    created_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}
function supInput(relatedId) {
  return {
    caseId: CASE,
    submissionKind: "supplement",
    relatedSubmissionId: relatedId,
    authorityName: "Tokyo Immigration",
    submittedAt: "2026-04-01T10:00:00.000Z",
    items: [
      {
        itemType: "field_snapshot",
        refId: REQ_ID,
        snapshotPayload: { stage: "S7" },
      },
    ],
  };
}
function baseRoutes(latestPkgId, existingPkgId, opts = {}) {
  return (sql, params) => {
    if (sql.includes("from validation_runs"))
      return Promise.resolve({
        rows: [{ id: VR_ID, result_status: "passed" }],
        rowCount: 1,
      });
    if (sql.includes("select id from cases"))
      return Promise.resolve({ rows: [{ id: CASE }], rowCount: 1 });
    if (
      sql.includes("from submission_packages") &&
      sql.includes("where id = $1") &&
      !sql.includes("select related_submission_id")
    ) {
      return params?.[0] === existingPkgId
        ? Promise.resolve({ rows: [{ id: existingPkgId }], rowCount: 1 })
        : Promise.resolve({ rows: [], rowCount: 0 });
    }
    if (sql.includes("order by submission_no desc"))
      return Promise.resolve({
        rows: [{ id: latestPkgId }],
        rowCount: 1,
      });
    if (sql.includes("related_submission_id = $3")) {
      const child = opts.branchChild;
      return child
        ? Promise.resolve({ rows: [{ id: child }], rowCount: 1 })
        : Promise.resolve({ rows: [], rowCount: 0 });
    }
    if (sql.includes("select related_submission_id")) {
      const cid = params?.[0];
      const parent = opts.chainLinks?.get(cid) ?? null;
      return Promise.resolve({
        rows: [{ related_submission_id: parent }],
        rowCount: 1,
      });
    }
    if (sql.includes("coalesce(max(submission_no), 0) + 1"))
      return Promise.resolve({
        rows: [{ next_submission_no: "2" }],
        rowCount: 1,
      });
    if (sql.includes("insert into submission_packages"))
      return Promise.resolve({
        rows: [
          pkgRow({
            id: PKG_S1,
            submission_no: 2,
            submission_kind: "supplement",
            related_submission_id: existingPkgId,
          }),
        ],
        rowCount: 1,
      });
    if (sql.includes("insert into submission_package_items"))
      return Promise.resolve({
        rows: [
          {
            id: "00000000-0000-4000-8000-000000000099",
            submission_package_id: PKG_S1,
            item_type: "field_snapshot",
            ref_id: REQ_ID,
            snapshot_payload: { stage: "S7" },
            created_at: "2026-04-01T10:00:00.000Z",
          },
        ],
        rowCount: 1,
      });
    return Promise.resolve({ rows: [], rowCount: 0 });
  };
}
// ────────────────────────────────────────────
// 1. SP_RELATED_NOT_LATEST
// ────────────────────────────────────────────
void describe("SP_RELATED_NOT_LATEST", () => {
  void test("rejects supplement pointing to older package", async () => {
    const OLD = "00000000-0000-4000-8000-000000000060";
    const s = svc(baseRoutes(PKG_INIT, OLD));
    await assert.rejects(
      () => s.create(ctx(), supInput(OLD)),
      /SP_RELATED_NOT_LATEST/,
    );
  });
  void test("accepts supplement pointing to latest package", async () => {
    const s = svc(baseRoutes(PKG_INIT, PKG_INIT));
    const created = await s.create(ctx(), supInput(PKG_INIT));
    assert.equal(created.submissionKind, "supplement");
    assert.equal(created.relatedSubmissionId, PKG_INIT);
  });
});
// ────────────────────────────────────────────
// 2. SP_RELATED_ALREADY_BRANCHED
// ────────────────────────────────────────────
void describe("SP_RELATED_ALREADY_BRANCHED", () => {
  void test("rejects when another supplement already references same parent", async () => {
    const s = svc(baseRoutes(PKG_INIT, PKG_INIT, { branchChild: PKG_S1 }));
    await assert.rejects(
      () => s.create(ctx(), supInput(PKG_INIT)),
      /SP_RELATED_ALREADY_BRANCHED/,
    );
  });
});
// ────────────────────────────────────────────
// 3. SP_CHAIN_DEPTH_EXCEEDED
// ────────────────────────────────────────────
void describe("SP_CHAIN_DEPTH_EXCEEDED", () => {
  void test("rejects when chain depth exceeds max (10)", async () => {
    const ids = Array.from(
      { length: 11 },
      (_, i) =>
        `00000000-0000-4000-8000-0000000000${String(70 + i).padStart(2, "0")}`,
    );
    const latest = ids.at(-1) ?? "";
    const links = new Map();
    for (let i = ids.length - 1; i > 0; i--) {
      const cur = ids[i] ?? "";
      const prev = ids[i - 1] ?? "";
      links.set(cur, prev);
    }
    links.set(ids[0] ?? "", null);
    const s = svc(baseRoutes(latest, latest, { chainLinks: links }));
    await assert.rejects(
      () => s.create(ctx(), supInput(latest)),
      /SP_CHAIN_DEPTH_EXCEEDED/,
    );
  });
  void test("accepts when chain depth is within limit", async () => {
    const s = svc(baseRoutes(PKG_INIT, PKG_INIT));
    const created = await s.create(ctx(), supInput(PKG_INIT));
    assert.equal(created.submissionKind, "supplement");
  });
});
// ────────────────────────────────────────────
// 4. Cycle detection
// ────────────────────────────────────────────
void describe("Cycle detection in related_submission_id chain", () => {
  void test("detects cycle when chain forms a loop", async () => {
    const A = "00000000-0000-4000-8000-000000000080";
    const B = "00000000-0000-4000-8000-000000000081";
    const links = new Map([
      [B, A],
      [A, B],
    ]);
    const s = svc(baseRoutes(B, B, { chainLinks: links }));
    await assert.rejects(
      () => s.create(ctx(), supInput(B)),
      /Cycle detected|SP_CHAIN_DEPTH_EXCEEDED/,
    );
  });
});
// ────────────────────────────────────────────
// 5. Existing rules remain intact
// ────────────────────────────────────────────
void describe("Existing submission chain rules", () => {
  void test("supplement without relatedSubmissionId rejected", async () => {
    const s = svc(() => Promise.resolve({ rows: [], rowCount: 0 }));
    await assert.rejects(
      () =>
        s.create(ctx(), {
          caseId: CASE,
          submissionKind: "supplement",
          authorityName: "Tokyo Immigration",
          submittedAt: "2026-04-01T10:00:00.000Z",
          items: [
            {
              itemType: "field_snapshot",
              refId: REQ_ID,
              snapshotPayload: { stage: "S7" },
            },
          ],
        }),
      /relatedSubmissionId is required/,
    );
  });
  void test("initial with relatedSubmissionId rejected", async () => {
    const s = svc(() => Promise.resolve({ rows: [], rowCount: 0 }));
    await assert.rejects(
      () =>
        s.create(ctx(), {
          caseId: CASE,
          submissionKind: "initial",
          relatedSubmissionId: PKG_INIT,
          authorityName: "Tokyo Immigration",
          submittedAt: "2026-04-01T10:00:00.000Z",
          items: [
            {
              itemType: "field_snapshot",
              refId: REQ_ID,
              snapshotPayload: { stage: "S7" },
            },
          ],
        }),
      /initial package cannot set relatedSubmissionId/,
    );
  });
  void test("relatedSubmissionId not in case rejected", async () => {
    const FOREIGN = "00000000-0000-4000-8000-000000000090";
    const s = svc((sql) => {
      if (sql.includes("from validation_runs"))
        return Promise.resolve({
          rows: [{ id: VR_ID, result_status: "passed" }],
          rowCount: 1,
        });
      if (sql.includes("select id from cases"))
        return Promise.resolve({ rows: [{ id: CASE }], rowCount: 1 });
      return Promise.resolve({ rows: [], rowCount: 0 });
    });
    await assert.rejects(
      () => s.create(ctx(), supInput(FOREIGN)),
      /relatedSubmissionId does not belong to current case/,
    );
  });
});
//# sourceMappingURL=submissionPackages.chain-guards.focused.test.js.map
