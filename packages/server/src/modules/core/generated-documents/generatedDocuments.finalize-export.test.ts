import test from "node:test";
import assert from "node:assert/strict";
import { BadRequestException } from "@nestjs/common";
import type { Pool } from "pg";

import { GeneratedDocumentsService } from "./generatedDocuments.service";
import type { TimelineService } from "../timeline/timeline.service";
import type { TimelineWriteInput } from "../timeline/timeline.service";
import { GENERATED_DOCUMENT_ERROR_CODES } from "../cases/cases.types-generated-docs";
import { PermissionsService } from "../auth/permissions.service";
import type { Case } from "../model/coreEntities";

const ORG_ID = "00000000-0000-4000-8000-000000000000";
const USER_ID = "00000000-0000-4000-8000-000000000001";
const OTHER_USER_ID = "00000000-0000-4000-8000-000000000003";
const CASE_ID = "00000000-0000-4000-8000-000000000002";
const GD_ID = "00000000-0000-4000-8000-000000000005";

const isTxSql = (s: string) =>
  /^(begin|commit|rollback|select set_config)/.test(s.trim().toLowerCase());

function makeGdRow(overrides: Record<string, unknown> = {}) {
  return {
    id: GD_ID,
    org_id: ORG_ID,
    case_id: CASE_ID,
    template_id: null,
    title: "申請書",
    version_no: 1,
    output_format: "pdf",
    file_url: null,
    status: "draft",
    generated_by: USER_ID,
    approved_by: null,
    generated_at: "2026-01-01T00:00:00.000Z",
    approved_at: null,
    template_version_no_snapshot: null,
    template_doc_type: null,
    generated_by_display_name: "Admin User",
    approved_by_display_name: null,
    ...overrides,
  };
}
type QueryFn = (
  sql: string,
  params?: unknown[],
) => Promise<{ rows: unknown[]; rowCount: number }>;
const ok = (rows: unknown[] = [], rowCount = rows.length) =>
  Promise.resolve({ rows, rowCount });
function makePool(qf: QueryFn) {
  return {
    connect: () =>
      Promise.resolve({
        query: (s: string, p?: unknown[]) => (isTxSql(s) ? ok() : qf(s, p)),
        release: () => undefined,
      }),
  } as unknown as Pool;
}
function makeSpyTimeline() {
  const calls: TimelineWriteInput[] = [];
  const service = {
    write: (_ctx: unknown, input: TimelineWriteInput) => {
      calls.push(input);
      return Promise.resolve();
    },
  } as unknown as TimelineService;
  return { service, calls };
}
function ctx(role: "staff" | "manager" | "viewer" = "staff") {
  return { orgId: ORG_ID, userId: USER_ID, role };
}
function makeServiceForStatus(
  existingStatus: string,
  timeline: { service: TimelineService; calls: TimelineWriteInput[] },
  sqlSpy?: (sql: string, params?: unknown[]) => void,
) {
  const pool = makePool((sql, params) => {
    sqlSpy?.(sql, params);
    if (sql.includes("from generated_documents") && sql.includes("limit 1")) {
      return ok([makeGdRow({ status: existingStatus })]);
    }
    if (sql.includes("gen_u.name")) {
      return ok([makeGdRow({ status: existingStatus })]);
    }
    if (sql.includes("update generated_documents")) {
      return ok([], 1);
    }
    return ok([]);
  });
  return new GeneratedDocumentsService(pool, timeline.service);
}

void test("finalize (draft → final) succeeds", async () => {
  const tl = makeSpyTimeline();
  const svc = makeServiceForStatus("draft", tl);
  const dto = await svc.update(ctx(), GD_ID, { status: "final" });
  assert.ok(dto);
});

void test("finalize rejects draft → exported (must go through final)", async () => {
  const tl = makeSpyTimeline();
  const svc = makeServiceForStatus("draft", tl);
  await assert.rejects(
    () => svc.update(ctx(), GD_ID, { status: "exported" }),
    (e) => {
      assert.ok(e instanceof BadRequestException);
      assert.ok(
        e.message.includes(
          GENERATED_DOCUMENT_ERROR_CODES.GD_INVALID_TRANSITION,
        ),
      );
      assert.ok(e.message.includes("draft"));
      assert.ok(e.message.includes("exported"));
      return true;
    },
  );
});

void test("finalize rejects exported → final (cannot un-export)", async () => {
  const tl = makeSpyTimeline();
  const svc = makeServiceForStatus("exported", tl);
  await assert.rejects(
    () => svc.update(ctx(), GD_ID, { status: "final" }),
    (e) => {
      assert.ok(e instanceof BadRequestException);
      assert.ok(
        e.message.includes(
          GENERATED_DOCUMENT_ERROR_CODES.GD_INVALID_TRANSITION,
        ),
      );
      return true;
    },
  );
});

void test("finalize rejects final → draft (rollback not allowed)", async () => {
  const tl = makeSpyTimeline();
  const svc = makeServiceForStatus("final", tl);
  await assert.rejects(
    () => svc.update(ctx(), GD_ID, { status: "draft" }),
    (e) => {
      assert.ok(e instanceof BadRequestException);
      assert.ok(
        e.message.includes(
          GENERATED_DOCUMENT_ERROR_CODES.GD_INVALID_TRANSITION,
        ),
      );
      return true;
    },
  );
});

void test("finalize rejects exported → draft (rollback not allowed)", async () => {
  const tl = makeSpyTimeline();
  const svc = makeServiceForStatus("exported", tl);
  await assert.rejects(
    () => svc.update(ctx(), GD_ID, { status: "draft" }),
    (e) => {
      assert.ok(e instanceof BadRequestException);
      assert.ok(
        e.message.includes(
          GENERATED_DOCUMENT_ERROR_CODES.GD_INVALID_TRANSITION,
        ),
      );
      return true;
    },
  );
});

// ─── Finalize: idempotency ───────────────────────────────────────

void test("finalize is idempotent: final → final succeeds", async () => {
  const tl = makeSpyTimeline();
  const svc = makeServiceForStatus("final", tl);
  const dto = await svc.update(ctx(), GD_ID, { status: "final" });
  assert.ok(dto);
});

// ─── Finalize: approved_by auto-fill ─────────────────────────────

void test("finalize (draft → final) SQL includes approved_by and approved_at", async () => {
  const tl = makeSpyTimeline();
  const captured: { sql: string; params?: unknown[] }[] = [];
  const svc = makeServiceForStatus("draft", tl, (sql, params) => {
    captured.push({ sql, params });
  });

  await svc.update(ctx(), GD_ID, { status: "final" });

  const updateCall = captured.find((c) =>
    c.sql.includes("update generated_documents"),
  );
  assert.ok(updateCall, "must emit UPDATE SQL");
  assert.ok(
    updateCall.sql.includes("approved_by"),
    "UPDATE must set approved_by on draft→final",
  );
  assert.ok(
    updateCall.sql.includes("approved_at"),
    "UPDATE must set approved_at on draft→final",
  );
});

void test("finalize (final → final) does NOT overwrite approved_by", async () => {
  const tl = makeSpyTimeline();
  const captured: { sql: string; params?: unknown[] }[] = [];

  const pool = makePool((sql, params) => {
    captured.push({ sql, params });
    if (sql.includes("from generated_documents") && sql.includes("limit 1")) {
      return ok([
        makeGdRow({
          status: "final",
          approved_by: OTHER_USER_ID,
          approved_at: "2026-01-02T00:00:00.000Z",
        }),
      ]);
    }
    if (sql.includes("gen_u.name")) {
      return ok([
        makeGdRow({
          status: "final",
          approved_by: OTHER_USER_ID,
          approved_at: "2026-01-02T00:00:00.000Z",
        }),
      ]);
    }
    if (sql.includes("update generated_documents")) return ok([], 1);
    return ok([]);
  });

  const svc = new GeneratedDocumentsService(pool, tl.service);
  await svc.update(ctx(), GD_ID, { status: "final" });

  const updateCall = captured.find((c) =>
    c.sql.includes("update generated_documents"),
  );
  assert.ok(updateCall, "must emit UPDATE SQL");
  assert.ok(
    !updateCall.sql.includes("approved_by"),
    "UPDATE must NOT overwrite approved_by on final→final",
  );
});

// ─── Export: status machine ──────────────────────────────────────

void test("export (final → exporting) succeeds", async () => {
  const tl = makeSpyTimeline();
  const svc = makeServiceForStatus("final", tl);
  const dto = await svc.update(ctx(), GD_ID, { status: "exporting" });
  assert.ok(dto);
});

void test("export (exporting → exported) succeeds", async () => {
  const tl = makeSpyTimeline();
  const svc = makeServiceForStatus("exporting", tl);
  const dto = await svc.update(ctx(), GD_ID, { status: "exported" });
  assert.ok(dto);
});

void test("export (exporting → export_failed) succeeds", async () => {
  const tl = makeSpyTimeline();
  const svc = makeServiceForStatus("exporting", tl);
  const dto = await svc.update(ctx(), GD_ID, { status: "export_failed" });
  assert.ok(dto);
});

void test("export retry (export_failed → exporting) succeeds", async () => {
  const tl = makeSpyTimeline();
  const svc = makeServiceForStatus("export_failed", tl);
  const dto = await svc.update(ctx(), GD_ID, { status: "exporting" });
  assert.ok(dto);
});

void test("export rejects draft → exported (must finalize first)", async () => {
  const tl = makeSpyTimeline();
  const svc = makeServiceForStatus("draft", tl);
  await assert.rejects(
    () => svc.update(ctx(), GD_ID, { status: "exported" }),
    (e) => {
      assert.ok(e instanceof BadRequestException);
      assert.ok(
        e.message.includes(
          GENERATED_DOCUMENT_ERROR_CODES.GD_INVALID_TRANSITION,
        ),
      );
      return true;
    },
  );
});

void test("export rejects final → exported (must go through exporting)", async () => {
  const tl = makeSpyTimeline();
  const svc = makeServiceForStatus("final", tl);
  await assert.rejects(
    () => svc.update(ctx(), GD_ID, { status: "exported" }),
    (e) => {
      assert.ok(e instanceof BadRequestException);
      assert.ok(
        e.message.includes(
          GENERATED_DOCUMENT_ERROR_CODES.GD_INVALID_TRANSITION,
        ),
      );
      return true;
    },
  );
});

// ─── Export: idempotency (exported → exported) ───────────────────

void test("export is idempotent: exported → exported succeeds", async () => {
  const tl = makeSpyTimeline();
  const svc = makeServiceForStatus("exported", tl);
  const dto = await svc.update(ctx(), GD_ID, { status: "exported" });
  assert.ok(dto);
});

// ─── Timeline: generic updated event on finalize ─────────────────

void test("finalize writes generated_document.updated timeline event", async () => {
  const tl = makeSpyTimeline();
  const svc = makeServiceForStatus("draft", tl);

  await svc.update(ctx(), GD_ID, { status: "final" });

  assert.equal(tl.calls.length, 1, "exactly one timeline event");
  assert.equal(tl.calls[0].action, "generated_document.updated");
  assert.equal(tl.calls[0].entityType, "case");
  assert.equal(tl.calls[0].entityId, CASE_ID);
  assert.deepEqual(tl.calls[0].payload.changes, { status: "final" });
});

// ─── Timeline: skipTimelineWrite suppresses the .updated event ───

void test("update with skipTimelineWrite=true writes no timeline event", async () => {
  const tl = makeSpyTimeline();
  const svc = makeServiceForStatus("draft", tl);

  await svc.update(
    ctx(),
    GD_ID,
    { status: "final" },
    { skipTimelineWrite: true },
  );

  assert.equal(
    tl.calls.length,
    0,
    "no timeline event when skipTimelineWrite is true",
  );
});

void test("update with skipTimelineWrite=false still writes timeline", async () => {
  const tl = makeSpyTimeline();
  const svc = makeServiceForStatus("draft", tl);

  await svc.update(
    ctx(),
    GD_ID,
    { status: "final" },
    { skipTimelineWrite: false },
  );

  assert.equal(
    tl.calls.length,
    1,
    "timeline written when skipTimelineWrite is false",
  );
  assert.equal(tl.calls[0].action, "generated_document.updated");
});

// ─── Timeline: generic updated event on export ───────────────────

void test("export writes generated_document.updated timeline event", async () => {
  const tl = makeSpyTimeline();
  const svc = makeServiceForStatus("final", tl);

  await svc.update(ctx(), GD_ID, { status: "exporting" });

  assert.equal(tl.calls.length, 1, "exactly one timeline event");
  assert.equal(tl.calls[0].action, "generated_document.updated");
  assert.equal(tl.calls[0].entityType, "case");
  assert.equal(tl.calls[0].entityId, CASE_ID);
});

void test("two consecutive exports produce two timeline writes", async () => {
  const tl = makeSpyTimeline();
  const svc = makeServiceForStatus("exported", tl);

  await svc.update(ctx(), GD_ID, { status: "exported" });
  await svc.update(ctx(), GD_ID, { status: "exported" });

  assert.equal(tl.calls.length, 2, "each export must produce a timeline write");
  assert.equal(tl.calls[0].action, "generated_document.updated");
  assert.equal(tl.calls[1].action, "generated_document.updated");
  assert.equal(tl.calls[0].payload.generatedDocumentId, GD_ID);
  assert.equal(tl.calls[1].payload.generatedDocumentId, GD_ID);
});

void test("rejected transition does not write timeline", async () => {
  const tl = makeSpyTimeline();
  const svc = makeServiceForStatus("draft", tl);

  await assert.rejects(() => svc.update(ctx(), GD_ID, { status: "exported" }));

  assert.equal(tl.calls.length, 0, "no timeline on rejected transition");
});

// ─── Permission matrix: canFinalizeCase ──────────────────────────

const NULLS = {
  groupId: null,
  dueAt: null,
  caseName: null,
  caseSubtype: null,
  applicationType: null,
  applicationFlowType: null,
  visaPlan: null,
  postApprovalStage: null,
  coeIssuedAt: null,
  coeExpiryDate: null,
  coeSentAt: null,
  closeReason: null,
  companyId: null,
  assistantUserId: null,
  sourceChannel: null,
  signedAt: null,
  acceptedAt: null,
  submissionDate: null,
  resultDate: null,
  residenceExpiryDate: null,
  archivedAt: null,
  resultOutcome: null,
  quotePrice: null,
  billingRiskAcknowledgedBy: null,
  billingRiskAcknowledgedAt: null,
  billingRiskAckReasonCode: null,
  billingRiskAckReasonNote: null,
  billingRiskAckEvidenceUrl: null,
  overseasVisaStartAt: null,
  entryConfirmedAt: null,
  currentWorkflowStepCode: null,
} as const;

const baseMockCase: Case = {
  id: CASE_ID,
  orgId: ORG_ID,
  customerId: "customer-1",
  caseTypeCode: "visa",
  status: "S5",
  stage: "S5",
  ownerUserId: USER_ID,
  caseNo: "CASE-001",
  openedAt: "2026-01-01T00:00:00.000Z",
  metadata: {},
  supplementCount: 0,
  priority: "normal",
  riskLevel: "low",
  depositPaidCached: false,
  finalPaymentPaidCached: false,
  billingUnpaidAmountCached: 0,
  businessPhase: "CONSULTING",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...NULLS,
};

void test("canFinalizeCase: manager can finalize any case", () => {
  const perm = new PermissionsService();
  const c = { ...baseMockCase, ownerUserId: OTHER_USER_ID };
  assert.equal(perm.canFinalizeCase(USER_ID, "manager", c), true);
});

void test("canFinalizeCase: owner can finalize own case", () => {
  const perm = new PermissionsService();
  assert.equal(perm.canFinalizeCase(USER_ID, "owner", baseMockCase), true);
});
void test("canFinalizeCase: case owner (staff role) can finalize", () => {
  const perm = new PermissionsService();
  const c = { ...baseMockCase, ownerUserId: USER_ID };
  assert.equal(perm.canFinalizeCase(USER_ID, "staff", c), true);
});

void test("canFinalizeCase: assistant (non-owner staff) cannot finalize", () => {
  const perm = new PermissionsService();
  const c = {
    ...baseMockCase,
    ownerUserId: OTHER_USER_ID,
    assistantUserId: USER_ID,
  };
  assert.equal(perm.canFinalizeCase(USER_ID, "staff", c), false);
});

void test("canFinalizeCase: viewer and unrelated staff cannot finalize", () => {
  const perm = new PermissionsService();
  const c = { ...baseMockCase, ownerUserId: OTHER_USER_ID };
  assert.equal(perm.canFinalizeCase(USER_ID, "viewer", c), false);
  assert.equal(perm.canFinalizeCase(USER_ID, "staff", c), false);
});
