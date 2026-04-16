/* eslint-disable max-lines */
import assert from "node:assert/strict";
import test from "node:test";
import type { Pool } from "pg";

import type { RequestContext } from "../tenancy/requestContext";
import {
  SubmissionPackagesService,
  mapSubmissionPackageItemRow,
  mapSubmissionPackageRow,
} from "./submissionPackages.service";

const ORG_ID = "00000000-0000-4000-8000-000000000000";
const USER_ID = "00000000-0000-4000-8000-000000000001";
const CASE_ID = "00000000-0000-4000-8000-000000000010";
const PACKAGE_ID = "00000000-0000-4000-8000-000000000020";
const ITEM_ID = "00000000-0000-4000-8000-000000000030";
const REQUIREMENT_ID = "00000000-0000-4000-8000-000000000040";
const FILE_ID = "00000000-0000-4000-8000-000000000041";
const GENERATED_DOC_ID = "00000000-0000-4000-8000-000000000042";
const VALIDATION_RUN_ID = "00000000-0000-4000-8000-000000000043";
const REVIEW_RECORD_ID = "00000000-0000-4000-8000-000000000044";

type QueryResult = { rows: unknown[]; rowCount?: number };
type QueryFn = (sql: string, params?: unknown[]) => Promise<QueryResult>;

function makeCtx(role: RequestContext["role"] = "staff"): RequestContext {
  return { orgId: ORG_ID, userId: USER_ID, role };
}

function makeSubmissionPackageRow(overrides: Record<string, unknown> = {}) {
  return {
    id: PACKAGE_ID,
    org_id: ORG_ID,
    case_id: CASE_ID,
    submission_no: 1,
    submission_kind: "initial",
    submitted_at: "2026-01-01T00:00:00.000Z",
    validation_run_id: null,
    review_record_id: null,
    authority_name: "Tokyo Immigration",
    acceptance_no: "A-001",
    receipt_storage_type: null,
    receipt_relative_path_or_key: null,
    related_submission_id: null,
    created_by: USER_ID,
    created_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeSubmissionPackageItemRow(overrides: Record<string, unknown> = {}) {
  return {
    id: ITEM_ID,
    submission_package_id: PACKAGE_ID,
    item_type: "document_requirement",
    ref_id: REQUIREMENT_ID,
    snapshot_payload: { id: REQUIREMENT_ID, name: "Passport" },
    created_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makePool(queryFn: QueryFn): Pool {
  return {
    connect: () =>
      Promise.resolve({
        query: queryFn,
        release: () => undefined,
      }),
  } as unknown as Pool;
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

function makeCasesService(stage = "S7") {
  const transitions: unknown[] = [];
  return {
    service: {
      get: () =>
        Promise.resolve({
          id: CASE_ID,
          stage,
          status: stage,
          caseTypeCode: "visa",
        }),
      transition: (_ctx: unknown, caseId: string, input: unknown) => {
        transitions.push({ caseId, input });
        return Promise.resolve({ id: caseId, stage: "S7", status: "S7" });
      },
    },
    transitions,
  };
}

function makeTemplatesResolver(reviewRequired = false) {
  return {
    resolve: () =>
      Promise.resolve(
        reviewRequired
          ? {
              mode: "template" as const,
              used: true,
              version: 1,
              config: { review_required_flag: true },
            }
          : { mode: "legacy" as const, used: false },
      ),
  };
}

function createService(
  queryFn: QueryFn,
  caseStatus = "S7",
  reviewRequired = false,
) {
  const timeline = makeTimeline();
  const cases = makeCasesService(caseStatus);
  const svc = new SubmissionPackagesService(
    makePool(queryFn),
    timeline.service as never,
    cases.service as never,
    makeTemplatesResolver(reviewRequired) as never,
  );
  return { svc, timeline, cases };
}

void test("mapSubmissionPackageRow maps row to entity", () => {
  const pkg = mapSubmissionPackageRow(makeSubmissionPackageRow());
  assert.equal(pkg.id, PACKAGE_ID);
  assert.equal(pkg.submissionNo, 1);
  assert.equal(pkg.submissionKind, "initial");
});

void test("mapSubmissionPackageItemRow maps snapshot payload", () => {
  const item = mapSubmissionPackageItemRow(makeSubmissionPackageItemRow());
  assert.equal(item.itemType, "document_requirement");
  assert.deepEqual(item.snapshotPayload, {
    id: REQUIREMENT_ID,
    name: "Passport",
  });
});

void test("SubmissionPackagesService.create inserts package items and writes timeline", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];
  const { svc, timeline } = createService((sql, params) => {
    calls.push({ sql, params });
    if (sql.includes("from validation_runs")) {
      return Promise.resolve({
        rows: [{ id: VALIDATION_RUN_ID, result_status: "passed" }],
        rowCount: 1,
      });
    }
    if (sql.includes("select id from cases")) {
      return Promise.resolve({ rows: [{ id: CASE_ID }], rowCount: 1 });
    }
    if (sql.includes("coalesce(max(submission_no), 0) + 1")) {
      return Promise.resolve({
        rows: [{ next_submission_no: "1" }],
        rowCount: 1,
      });
    }
    if (sql.includes("insert into submission_packages")) {
      return Promise.resolve({
        rows: [
          makeSubmissionPackageRow({ validation_run_id: params?.[5] ?? null }),
        ],
        rowCount: 1,
      });
    }
    if (sql.includes("from document_items")) {
      return Promise.resolve({
        rows: [
          {
            id: REQUIREMENT_ID,
            checklist_item_code: "passport",
            name: "Passport",
            status: "pending",
          },
        ],
        rowCount: 1,
      });
    }
    if (sql.includes("from document_files df")) {
      return Promise.resolve({
        rows: [
          {
            id: FILE_ID,
            requirement_id: REQUIREMENT_ID,
            file_name: "passport.pdf",
            version_no: 2,
            hash_value: "hash-1",
          },
        ],
        rowCount: 1,
      });
    }
    if (sql.includes("from generated_documents")) {
      return Promise.resolve({
        rows: [
          {
            id: GENERATED_DOC_ID,
            title: "Application Form",
            version_no: 1,
            output_format: "pdf",
            status: "approved",
          },
        ],
        rowCount: 1,
      });
    }
    if (sql.includes("insert into submission_package_items")) {
      return Promise.resolve({
        rows: [makeSubmissionPackageItemRow()],
        rowCount: 1,
      });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  const created = await svc.create(makeCtx(), {
    caseId: CASE_ID,
    authorityName: "Tokyo Immigration",
    submittedAt: "2026-04-01T10:00:00.000Z",
    items: [
      { itemType: "document_requirement", refId: REQUIREMENT_ID },
      { itemType: "document_file_version", refId: FILE_ID },
      { itemType: "generated_document_version", refId: GENERATED_DOC_ID },
    ],
  });

  assert.equal(created.submissionNo, 1);
  assert.equal(created.items.length, 3);
  assert.equal(created.validationRunId, VALIDATION_RUN_ID);
  assert.equal(timeline.writes.length, 1);
  assert.ok(
    calls.some((call) =>
      call.sql.includes("insert into submission_package_items"),
    ),
  );
});

void test("SubmissionPackagesService.create advances case to S7 when current status is S6", async () => {
  const { svc, cases } = createService((sql) => {
    if (sql.includes("from validation_runs")) {
      return Promise.resolve({
        rows: [{ id: VALIDATION_RUN_ID, result_status: "passed" }],
        rowCount: 1,
      });
    }
    if (sql.includes("select id from cases")) {
      return Promise.resolve({ rows: [{ id: CASE_ID }], rowCount: 1 });
    }
    if (sql.includes("coalesce(max(submission_no), 0) + 1")) {
      return Promise.resolve({
        rows: [{ next_submission_no: "1" }],
        rowCount: 1,
      });
    }
    if (sql.includes("insert into submission_packages")) {
      return Promise.resolve({
        rows: [makeSubmissionPackageRow()],
        rowCount: 1,
      });
    }
    if (sql.includes("from document_items")) {
      return Promise.resolve({
        rows: [
          {
            id: REQUIREMENT_ID,
            checklist_item_code: "passport",
            name: "Passport",
          },
        ],
        rowCount: 1,
      });
    }
    if (sql.includes("insert into submission_package_items")) {
      return Promise.resolve({
        rows: [makeSubmissionPackageItemRow()],
        rowCount: 1,
      });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  }, "S6");

  await svc.create(makeCtx(), {
    caseId: CASE_ID,
    authorityName: "Tokyo Immigration",
    submittedAt: "2026-04-01T10:00:00.000Z",
    items: [{ itemType: "document_requirement", refId: REQUIREMENT_ID }],
  });

  assert.deepEqual(cases.transitions, [
    { caseId: CASE_ID, input: { toStage: "S7" } },
  ]);
});

void test("SubmissionPackagesService.create rejects supplement without relatedSubmissionId", async () => {
  const { svc } = createService(() =>
    Promise.resolve({ rows: [], rowCount: 0 }),
  );
  await assert.rejects(
    () =>
      svc.create(makeCtx(), {
        caseId: CASE_ID,
        submissionKind: "supplement",
        authorityName: "Tokyo Immigration",
        submittedAt: "2026-04-01T10:00:00.000Z",
        items: [
          {
            itemType: "field_snapshot",
            refId: REQUIREMENT_ID,
            snapshotPayload: { stage: "S5" },
          },
        ],
      }),
    /relatedSubmissionId is required/,
  );
});

void test("SubmissionPackagesService.create rejects missing authorityName", async () => {
  const { svc } = createService(() =>
    Promise.resolve({ rows: [], rowCount: 0 }),
  );

  await assert.rejects(
    () =>
      svc.create(makeCtx(), {
        caseId: CASE_ID,
        submittedAt: "2026-04-01T10:00:00.000Z",
        items: [
          {
            itemType: "field_snapshot",
            refId: REQUIREMENT_ID,
            snapshotPayload: { stage: "S6" },
          },
        ],
      }),
    /authorityName is required/,
  );
});

void test("SubmissionPackagesService.create rejects missing submittedAt", async () => {
  const { svc } = createService(() =>
    Promise.resolve({ rows: [], rowCount: 0 }),
  );

  await assert.rejects(
    () =>
      svc.create(makeCtx(), {
        caseId: CASE_ID,
        authorityName: "Tokyo Immigration",
        items: [
          {
            itemType: "field_snapshot",
            refId: REQUIREMENT_ID,
            snapshotPayload: { stage: "S6" },
          },
        ],
      }),
    /submittedAt is required/,
  );
});

void test("SubmissionPackagesService.create rejects case before S6", async () => {
  const { svc } = createService(
    () => Promise.resolve({ rows: [], rowCount: 0 }),
    "S5",
  );

  await assert.rejects(
    () =>
      svc.create(makeCtx(), {
        caseId: CASE_ID,
        authorityName: "Tokyo Immigration",
        submittedAt: "2026-04-01T10:00:00.000Z",
        items: [
          {
            itemType: "field_snapshot",
            refId: REQUIREMENT_ID,
            snapshotPayload: { stage: "S5" },
          },
        ],
      }),
    /case is in S6 or S7/,
  );
});

void test("SubmissionPackagesService.create rejects when latest validation run is not passed", async () => {
  const { svc } = createService((sql) => {
    if (sql.includes("from validation_runs")) {
      return Promise.resolve({
        rows: [{ id: VALIDATION_RUN_ID, result_status: "failed" }],
        rowCount: 1,
      });
    }
    if (sql.includes("select id from cases")) {
      return Promise.resolve({ rows: [{ id: CASE_ID }], rowCount: 1 });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  }, "S6");

  await assert.rejects(
    () =>
      svc.create(makeCtx(), {
        caseId: CASE_ID,
        authorityName: "Tokyo Immigration",
        submittedAt: "2026-04-01T10:00:00.000Z",
        items: [
          {
            itemType: "field_snapshot",
            refId: REQUIREMENT_ID,
            snapshotPayload: { stage: "S6" },
          },
        ],
      }),
    /latest validation run to be passed/,
  );
});

void test("SubmissionPackagesService.create rejects stale validationRunId", async () => {
  const { svc } = createService((sql) => {
    if (sql.includes("from validation_runs")) {
      return Promise.resolve({
        rows: [{ id: VALIDATION_RUN_ID, result_status: "passed" }],
        rowCount: 1,
      });
    }
    if (sql.includes("select id from cases")) {
      return Promise.resolve({ rows: [{ id: CASE_ID }], rowCount: 1 });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  }, "S6");

  await assert.rejects(
    () =>
      svc.create(makeCtx(), {
        caseId: CASE_ID,
        validationRunId: "stale-validation-run",
        authorityName: "Tokyo Immigration",
        submittedAt: "2026-04-01T10:00:00.000Z",
        items: [
          {
            itemType: "field_snapshot",
            refId: REQUIREMENT_ID,
            snapshotPayload: { stage: "S6" },
          },
        ],
      }),
    /latest passed validation run/,
  );
});

void test("SubmissionPackagesService.create auto-links latest approved review when review_required_flag is enabled", async () => {
  const { svc } = createService(
    (sql, params) => {
      if (sql.includes("from validation_runs")) {
        return Promise.resolve({
          rows: [{ id: VALIDATION_RUN_ID, result_status: "passed" }],
          rowCount: 1,
        });
      }
      if (sql.includes("from review_records")) {
        return Promise.resolve({
          rows: [
            {
              id: REVIEW_RECORD_ID,
              validation_run_id: VALIDATION_RUN_ID,
              decision: "approved",
            },
          ],
          rowCount: 1,
        });
      }
      if (sql.includes("select id from cases")) {
        return Promise.resolve({ rows: [{ id: CASE_ID }], rowCount: 1 });
      }
      if (sql.includes("coalesce(max(submission_no), 0) + 1")) {
        return Promise.resolve({
          rows: [{ next_submission_no: "1" }],
          rowCount: 1,
        });
      }
      if (sql.includes("insert into submission_packages")) {
        return Promise.resolve({
          rows: [
            makeSubmissionPackageRow({
              validation_run_id: params?.[5] ?? null,
              review_record_id: params?.[6] ?? null,
            }),
          ],
          rowCount: 1,
        });
      }
      if (sql.includes("insert into submission_package_items")) {
        return Promise.resolve({
          rows: [makeSubmissionPackageItemRow()],
          rowCount: 1,
        });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    },
    "S6",
    true,
  );

  const created = await svc.create(makeCtx(), {
    caseId: CASE_ID,
    authorityName: "Tokyo Immigration",
    submittedAt: "2026-04-01T10:00:00.000Z",
    items: [
      {
        itemType: "field_snapshot",
        refId: REQUIREMENT_ID,
        snapshotPayload: { stage: "S6" },
      },
    ],
  });

  assert.equal(created.validationRunId, VALIDATION_RUN_ID);
  assert.equal(created.reviewRecordId, REVIEW_RECORD_ID);
});

void test("SubmissionPackagesService.get returns package with items", async () => {
  const { svc } = createService((sql, params) => {
    if (
      sql.includes("from submission_packages") &&
      params?.[0] === PACKAGE_ID
    ) {
      return Promise.resolve({
        rows: [makeSubmissionPackageRow()],
        rowCount: 1,
      });
    }
    if (sql.includes("from submission_package_items spi")) {
      return Promise.resolve({
        rows: [makeSubmissionPackageItemRow()],
        rowCount: 1,
      });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  const found = await svc.get(makeCtx("viewer"), PACKAGE_ID);
  assert.ok(found);
  assert.equal(found.items.length, 1);
});

void test("SubmissionPackagesService.list filters by org and caseId", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];
  const { svc } = createService((sql, params) => {
    calls.push({ sql, params });
    if (sql.includes("count(*)::text")) {
      return Promise.resolve({ rows: [{ count: "1" }], rowCount: 1 });
    }
    if (sql.includes("from submission_packages")) {
      return Promise.resolve({
        rows: [makeSubmissionPackageRow()],
        rowCount: 1,
      });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  const result = await svc.list(makeCtx("viewer"), { caseId: CASE_ID });
  assert.equal(result.total, 1);
  assert.equal(result.items.length, 1);
  assert.ok(calls.some((call) => call.sql.includes("org_id = $1")));
  assert.ok(calls.some((call) => call.sql.includes("case_id = $2")));
});
