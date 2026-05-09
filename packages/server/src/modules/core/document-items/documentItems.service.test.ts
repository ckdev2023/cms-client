/* eslint-disable max-lines */
import test from "node:test";
import assert from "node:assert/strict";
import type { Pool } from "pg";

import {
  DocumentItemsService,
  ALLOWED_TRANSITIONS,
  mapDocumentItemRow,
} from "./documentItems.service";
import type { RequestContext } from "../tenancy/requestContext";

const ORG_ID = "00000000-0000-4000-8000-000000000000";
const USER_ID = "00000000-0000-4000-8000-000000000001";
const ITEM_ID = "item-1";
const CASE_ID = "case-1";

function makeCtx(
  role: "staff" | "viewer" | "manager" = "staff",
): RequestContext {
  return { orgId: ORG_ID, userId: USER_ID, role };
}

function makeItemRow(overrides: Record<string, unknown> = {}) {
  return {
    id: ITEM_ID,
    org_id: ORG_ID,
    case_id: CASE_ID,
    checklist_item_code: "passport",
    name: "Passport Copy",
    status: "pending",
    required_flag: false,
    requested_at: null,
    received_at: null,
    reviewed_at: null,
    due_at: null,
    owner_side: "applicant",
    provided_by_role: "applicant",
    last_follow_up_at: null,
    note: null,
    category: null,
    survey_data: null,
    waive_reason_latest: null,
    waive_reason_code_latest: null,
    waived_by_user_id_latest: null,
    waived_at_latest: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

type QueryFn = (
  sql: string,
  params?: unknown[],
) => Promise<{ rows: unknown[]; rowCount: number }>;
type PoolLike = {
  connect: () => Promise<{ query: QueryFn; release: () => void }>;
};

function makePool(queryFn: QueryFn): PoolLike {
  return {
    connect: () =>
      Promise.resolve({ query: queryFn, release: () => undefined }),
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

function createService(
  pool: PoolLike,
  timeline: ReturnType<typeof makeTimeline>,
) {
  return new DocumentItemsService(
    pool as unknown as Pool,
    timeline.service as never,
  );
}

// ── create ──
void test("DocumentItemsService.create inserts row and writes timeline", async () => {
  const pool = makePool((sql) => {
    if (sql.includes("insert into document_items")) {
      return Promise.resolve({ rows: [makeItemRow()], rowCount: 1 });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  const timeline = makeTimeline();
  const svc = createService(pool, timeline);
  const item = await svc.create(makeCtx(), {
    caseId: CASE_ID,
    checklistItemCode: "passport",
    name: "Passport Copy",
  });

  assert.equal(item.id, ITEM_ID);
  assert.equal(item.status, "pending");
  assert.equal(item.ownerSide, "applicant");
  assert.equal(timeline.writes.length, 1);
  assert.deepEqual(
    (timeline.writes[0] as Record<string, unknown>).action,
    "document_item.created",
  );
});

// ── create failure ──
void test("DocumentItemsService.create throws on insert failure", async () => {
  const pool = makePool(() => Promise.resolve({ rows: [], rowCount: 0 }));
  const svc = createService(pool, makeTimeline());

  await assert.rejects(
    () =>
      svc.create(makeCtx(), {
        caseId: CASE_ID,
        checklistItemCode: "x",
        name: "X",
      }),
    (err) => {
      assert.ok(err instanceof Error);
      return true;
    },
  );
});

// ── get ──
void test("DocumentItemsService.get returns item or null", async () => {
  const pool = makePool((sql, params) => {
    if (sql.includes("from document_items") && params?.[0] === ITEM_ID) {
      return Promise.resolve({ rows: [makeItemRow()], rowCount: 1 });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  const svc = createService(pool, makeTimeline());
  const item = await svc.get(makeCtx("viewer"), ITEM_ID);
  assert.ok(item);
  assert.equal(item.id, ITEM_ID);

  const notFound = await svc.get(makeCtx("viewer"), "nonexistent");
  assert.equal(notFound, null);
});

// ── list (no filters) ──
void test("DocumentItemsService.list returns items and total", async () => {
  const pool = makePool((sql) => {
    if (sql.includes("count(*)")) {
      return Promise.resolve({ rows: [{ count: "2" }], rowCount: 1 });
    }
    return Promise.resolve({ rows: [makeItemRow()], rowCount: 1 });
  });

  const svc = createService(pool, makeTimeline());
  const result = await svc.list(makeCtx("viewer"));
  assert.equal(result.total, 2);
  assert.equal(result.items.length, 1);
});

// ── list (with filters) ──
void test("DocumentItemsService.list applies caseId/status filters", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];
  const pool = makePool((sql, params) => {
    calls.push({ sql: sql.trim(), params });
    if (sql.includes("count(*)")) {
      return Promise.resolve({ rows: [{ count: "1" }], rowCount: 1 });
    }
    return Promise.resolve({ rows: [makeItemRow()], rowCount: 1 });
  });

  const svc = createService(pool, makeTimeline());
  await svc.list(makeCtx("viewer"), { caseId: CASE_ID, status: "pending" });

  const countCall = calls.find((c) => c.sql.includes("count(*)"));
  assert.ok(countCall);
  assert.ok(countCall.sql.includes("case_id = $"));
  assert.ok(countCall.sql.includes("status = $"));
});

void test("DocumentItemsService.getCompletionRate returns aggregated percentage", async () => {
  const pool = makePool((sql) => {
    if (/^(begin|commit|rollback|select set_config)/i.test(sql.trim())) {
      return Promise.resolve({ rows: [], rowCount: 0 });
    }
    return Promise.resolve({
      rows: [
        { status: "approved", category: null, count: "1" },
        { status: "waived", category: null, count: "1" },
        { status: "pending", category: null, count: "1" },
        { status: "revision_required", category: null, count: "1" },
      ],
      rowCount: 4,
    });
  });

  const result = await createService(pool, makeTimeline()).getCompletionRate(
    makeCtx(),
    CASE_ID,
  );
  assert.deepEqual(result, {
    caseId: CASE_ID,
    total: 4,
    completed: 2,
    approved: 1,
    waived: 1,
    completionRate: 50,
    questionnaireTotal: 0,
    questionnaireCompleted: 0,
    questionnaireCompletionRate: 0,
  });
});

void test("DocumentItemsService.getCompletionRate returns zero and keeps tenant context", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];
  const pool = makePool((sql, params) => {
    calls.push({ sql: sql.trim(), params });
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  const result = await createService(pool, makeTimeline()).getCompletionRate(
    makeCtx(),
    "case-empty",
  );
  assert.deepEqual(result, {
    caseId: "case-empty",
    total: 0,
    completed: 0,
    approved: 0,
    waived: 0,
    completionRate: 0,
    questionnaireTotal: 0,
    questionnaireCompleted: 0,
    questionnaireCompletionRate: 0,
  });
  const orgCall = calls.find((call) => call.sql.includes("app.org_id"));
  assert.equal(orgCall?.params?.[0], ORG_ID);
});

// ── update ──
void test("DocumentItemsService.update updates and writes timeline", async () => {
  const pool = makePool((sql, params) => {
    if (sql.includes("update document_items")) {
      return Promise.resolve({
        rows: [makeItemRow({ name: "Updated Name" })],
        rowCount: 1,
      });
    }
    if (sql.includes("from document_items") && params?.[0] === ITEM_ID) {
      return Promise.resolve({ rows: [makeItemRow()], rowCount: 1 });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  const timeline = makeTimeline();
  const svc = createService(pool, timeline);
  const updated = await svc.update(makeCtx(), ITEM_ID, {
    name: "Updated Name",
  });

  assert.equal(updated.name, "Updated Name");
  assert.equal(timeline.writes.length, 1);
  assert.deepEqual(
    (timeline.writes[0] as Record<string, unknown>).action,
    "document_item.updated",
  );
});

// ── update not found ──
void test("DocumentItemsService.update throws NotFoundException when not found", async () => {
  const pool = makePool(() => Promise.resolve({ rows: [], rowCount: 0 }));
  const svc = createService(pool, makeTimeline());

  await assert.rejects(
    () => svc.update(makeCtx(), "nonexistent", { name: "x" }),
    (err) => {
      assert.ok(err instanceof Error);
      return true;
    },
  );
});

// ── transition: all valid pairs from ALLOWED_TRANSITIONS ──
function transitionPool(toStatus: string, fromStatus: string) {
  return makePool((sql, params) => {
    if (sql.includes("update document_items") && sql.includes("status = $")) {
      return Promise.resolve({
        rows: [makeItemRow({ status: toStatus })],
        rowCount: 1,
      });
    }
    if (sql.includes("from document_items") && params?.[0] === ITEM_ID) {
      return Promise.resolve({
        rows: [makeItemRow({ status: fromStatus })],
        rowCount: 1,
      });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });
}

const ALL_VALID_PAIRS: [string, string][] = Object.entries(
  ALLOWED_TRANSITIONS,
).flatMap(([from, tos]) =>
  (tos ?? []).map((to): [string, string] => [from, to]),
);

for (const [from, to] of ALL_VALID_PAIRS) {
  void test(`transition: allows ${from} → ${to}`, async () => {
    const timeline = makeTimeline();
    const svc = createService(transitionPool(to, from), timeline);
    const result = await svc.transition(makeCtx(), ITEM_ID, { toStatus: to });
    assert.equal(result.status, to);
    assert.equal(timeline.writes.length, 1);
    assert.deepEqual(
      (timeline.writes[0] as Record<string, unknown>).action,
      "document_item.transitioned",
    );
  });
}

// ── transition (invalid: pending → approved) ──
void test("DocumentItemsService.transition rejects invalid transition", async () => {
  const pool = makePool((sql, params) => {
    if (sql.includes("from document_items") && params?.[0] === ITEM_ID) {
      return Promise.resolve({ rows: [makeItemRow()], rowCount: 1 });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  const svc = createService(pool, makeTimeline());
  await assert.rejects(
    () => svc.transition(makeCtx(), ITEM_ID, { toStatus: "approved" }),
    (err) => {
      assert.ok(err instanceof Error);
      assert.ok(err.message.includes("not allowed"));
      return true;
    },
  );
});

// ── transition: toStatus='waived' is explicitly blocked ──
void test("transition: rejects toStatus='waived' and directs to dedicated waive endpoint", async () => {
  const pool = makePool((sql, params) => {
    if (sql.includes("from document_items") && params?.[0] === ITEM_ID) {
      return Promise.resolve({ rows: [makeItemRow()], rowCount: 1 });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  const svc = createService(pool, makeTimeline());
  await assert.rejects(
    () => svc.transition(makeCtx(), ITEM_ID, { toStatus: "waived" }),
    (err) => {
      assert.ok(err instanceof Error);
      assert.ok(err.message.includes("POST /:id/waive"));
      return true;
    },
  );
});

void test("transition: rejects toStatus='waived' regardless of current status", async () => {
  for (const fromStatus of [
    "pending",
    "waiting_upload",
    "approved",
    "expired",
  ]) {
    const pool = makePool((sql, params) => {
      if (sql.includes("from document_items") && params?.[0] === ITEM_ID) {
        return Promise.resolve({
          rows: [makeItemRow({ status: fromStatus })],
          rowCount: 1,
        });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    });

    const svc = createService(pool, makeTimeline());
    await assert.rejects(
      () => svc.transition(makeCtx(), ITEM_ID, { toStatus: "waived" }),
      (err) => {
        assert.ok(err instanceof Error);
        assert.ok(
          err.message.includes("POST /:id/waive"),
          `from '${fromStatus}': expected message to include 'POST /:id/waive', got: ${err.message}`,
        );
        return true;
      },
    );
  }
});

void test("transition: throws when not found", async () => {
  const pool = makePool(() => Promise.resolve({ rows: [], rowCount: 0 }));
  const svc = createService(pool, makeTimeline());
  await assert.rejects(
    () =>
      svc.transition(makeCtx(), "nonexistent", { toStatus: "waiting_upload" }),
    (err) => {
      assert.ok(err instanceof Error);
      return true;
    },
  );
});

void test("transition: fails on concurrent status change", async () => {
  const pool = makePool((sql, params) => {
    if (sql.includes("from document_items") && params?.[0] === ITEM_ID)
      return Promise.resolve({ rows: [makeItemRow()], rowCount: 1 });
    if (sql.includes("update document_items"))
      return Promise.resolve({ rows: [], rowCount: 0 });
    return Promise.resolve({ rows: [], rowCount: 0 });
  });
  const svc = createService(pool, makeTimeline());
  await assert.rejects(
    () => svc.transition(makeCtx(), ITEM_ID, { toStatus: "waiting_upload" }),
    (err) => {
      assert.ok(err instanceof Error);
      assert.ok(
        err.message.includes("concurrently") || err.message.includes("Failed"),
      );
      return true;
    },
  );
});

// ── transition: timestamp mapping ──
const TIMESTAMP_CASES: {
  toStatus: string;
  fromStatus: string;
  dbCol: string;
  entityField: keyof Awaited<ReturnType<DocumentItemsService["transition"]>>;
}[] = [
  {
    toStatus: "waiting_upload",
    fromStatus: "pending",
    dbCol: "requested_at",
    entityField: "requestedAt",
  },
  {
    toStatus: "uploaded_reviewing",
    fromStatus: "waiting_upload",
    dbCol: "received_at",
    entityField: "receivedAt",
  },
  {
    toStatus: "approved",
    fromStatus: "uploaded_reviewing",
    dbCol: "reviewed_at",
    entityField: "reviewedAt",
  },
];

for (const tc of TIMESTAMP_CASES) {
  void test(`transition: ${tc.toStatus} sets ${tc.dbCol}`, async () => {
    const calls: { sql: string }[] = [];
    const ts = "2026-01-02T00:00:00.000Z";
    const pool = makePool((sql, params) => {
      calls.push({ sql });
      if (sql.includes("update document_items") && sql.includes("status = $")) {
        return Promise.resolve({
          rows: [makeItemRow({ status: tc.toStatus, [tc.dbCol]: ts })],
          rowCount: 1,
        });
      }
      if (sql.includes("from document_items") && params?.[0] === ITEM_ID) {
        return Promise.resolve({
          rows: [makeItemRow({ status: tc.fromStatus })],
          rowCount: 1,
        });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    });

    const svc = createService(pool, makeTimeline());
    const result = await svc.transition(makeCtx(), ITEM_ID, {
      toStatus: tc.toStatus,
    });
    assert.equal(result[tc.entityField], ts);
    const updateSql = calls.find((c) =>
      c.sql.includes("update document_items"),
    );
    assert.ok(updateSql?.sql.includes(`${tc.dbCol} = now()`));
  });
}

// ── followUp (valid statuses) ──
for (const validStatus of ["waiting_upload", "revision_required"]) {
  void test(`followUp: allowed in ${validStatus}`, async () => {
    const pool = makePool((sql, params) => {
      if (sql.includes("last_follow_up_at = now()")) {
        return Promise.resolve({
          rows: [
            makeItemRow({
              status: validStatus,
              last_follow_up_at: "2026-01-15T00:00:00.000Z",
            }),
          ],
          rowCount: 1,
        });
      }
      if (sql.includes("from document_items") && params?.[0] === ITEM_ID) {
        return Promise.resolve({
          rows: [makeItemRow({ status: validStatus })],
          rowCount: 1,
        });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    });

    const timeline = makeTimeline();
    const svc = createService(pool, timeline);
    const result = await svc.followUp(makeCtx(), ITEM_ID);
    assert.equal(result.lastFollowUpAt, "2026-01-15T00:00:00.000Z");
    assert.equal(timeline.writes.length, 1);
    assert.deepEqual(
      (timeline.writes[0] as Record<string, unknown>).action,
      "document_item_follow_up",
    );
  });
}

// ── followUp not found ──
void test("DocumentItemsService.followUp throws when not found", async () => {
  const pool = makePool(() => Promise.resolve({ rows: [], rowCount: 0 }));
  const svc = createService(pool, makeTimeline());

  await assert.rejects(
    () => svc.followUp(makeCtx(), "nonexistent"),
    (err) => {
      assert.ok(err instanceof Error);
      return true;
    },
  );
});

// ── followUp invalid status ──
for (const invalidStatus of [
  "pending",
  "uploaded_reviewing",
  "approved",
  "waived",
  "expired",
]) {
  void test(`DocumentItemsService.followUp throws when status is ${invalidStatus}`, async () => {
    const pool = makePool((sql, params) => {
      if (sql.includes("from document_items") && params?.[0] === ITEM_ID) {
        return Promise.resolve({
          rows: [makeItemRow({ status: invalidStatus })],
          rowCount: 1,
        });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    });

    const svc = createService(pool, makeTimeline());
    await assert.rejects(
      () => svc.followUp(makeCtx(), ITEM_ID),
      (err) => {
        assert.ok(err instanceof Error);
        assert.ok(err.message.includes("Cannot follow up"));
        return true;
      },
    );
  });
}

// ── softDelete ──
void test("DocumentItemsService.softDelete marks as deleted and writes timeline", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];
  const pool = makePool((sql, params) => {
    calls.push({ sql: sql.trim(), params });
    if (sql.includes("status = 'deleted'") && sql.includes("update")) {
      return Promise.resolve({
        rows: [makeItemRow({ status: "deleted" })],
        rowCount: 1,
      });
    }
    if (sql.includes("from document_items") && params?.[0] === ITEM_ID) {
      return Promise.resolve({ rows: [makeItemRow()], rowCount: 1 });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  const timeline = makeTimeline();
  const svc = createService(pool, timeline);
  await svc.softDelete(makeCtx("manager"), ITEM_ID);

  assert.equal(timeline.writes.length, 1);
  assert.deepEqual(
    (timeline.writes[0] as Record<string, unknown>).action,
    "document_item.deleted",
  );
});

// ── softDelete not found ──
void test("DocumentItemsService.softDelete throws when not found", async () => {
  const pool = makePool(() => Promise.resolve({ rows: [], rowCount: 0 }));
  const svc = createService(pool, makeTimeline());

  await assert.rejects(
    () => svc.softDelete(makeCtx("manager"), "nonexistent"),
    (err) => {
      assert.ok(err instanceof Error);
      return true;
    },
  );
});

// ── create with category=questionnaire ──
void test("create: accepts category=questionnaire and returns it", async () => {
  const pool = makePool((sql) => {
    if (sql.includes("insert into document_items")) {
      return Promise.resolve({
        rows: [makeItemRow({ category: "questionnaire" })],
        rowCount: 1,
      });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  const timeline = makeTimeline();
  const svc = createService(pool, timeline);
  const item = await svc.create(makeCtx(), {
    caseId: CASE_ID,
    checklistItemCode: "bmv-questionnaire",
    name: "BMV Questionnaire",
    category: "questionnaire",
  });

  assert.equal(item.category, "questionnaire");
  assert.equal(item.surveyData, null);
});

// ── create with category=questionnaire and surveyData ──
void test("create: accepts category=questionnaire with surveyData", async () => {
  const surveyPayload = { personal_info: { name: "Test" } };
  const pool = makePool((sql) => {
    if (sql.includes("insert into document_items")) {
      return Promise.resolve({
        rows: [
          makeItemRow({
            category: "questionnaire",
            survey_data: surveyPayload,
          }),
        ],
        rowCount: 1,
      });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  const svc = createService(pool, makeTimeline());
  const item = await svc.create(makeCtx(), {
    caseId: CASE_ID,
    checklistItemCode: "bmv-questionnaire",
    name: "BMV Questionnaire",
    category: "questionnaire",
    surveyData: surveyPayload,
  });

  assert.equal(item.category, "questionnaire");
  assert.deepEqual(item.surveyData, surveyPayload);
});

// ── create rejects surveyData without category=questionnaire ──
void test("create: rejects surveyData when category is not questionnaire", async () => {
  const pool = makePool(() => Promise.resolve({ rows: [], rowCount: 0 }));
  const svc = createService(pool, makeTimeline());

  await assert.rejects(
    () =>
      svc.create(makeCtx(), {
        caseId: CASE_ID,
        checklistItemCode: "x",
        name: "X",
        category: "standard",
        surveyData: { foo: "bar" },
      }),
    (err) => {
      assert.ok(err instanceof Error);
      assert.ok(err.message.includes("questionnaire"));
      return true;
    },
  );
});

// ── create with category=standard (null survey_data) ──
void test("create: accepts category=standard without surveyData", async () => {
  const pool = makePool((sql) => {
    if (sql.includes("insert into document_items")) {
      return Promise.resolve({
        rows: [makeItemRow({ category: "standard" })],
        rowCount: 1,
      });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  const svc = createService(pool, makeTimeline());
  const item = await svc.create(makeCtx(), {
    caseId: CASE_ID,
    checklistItemCode: "residence-card",
    name: "Residence Card",
    category: "standard",
  });

  assert.equal(item.category, "standard");
  assert.equal(item.surveyData, null);
});

// ── list filters by category ──
void test("list: applies category filter", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];
  const pool = makePool((sql, params) => {
    calls.push({ sql: sql.trim(), params });
    if (sql.includes("count(*)")) {
      return Promise.resolve({ rows: [{ count: "1" }], rowCount: 1 });
    }
    return Promise.resolve({
      rows: [makeItemRow({ category: "questionnaire" })],
      rowCount: 1,
    });
  });

  const svc = createService(pool, makeTimeline());
  const result = await svc.list(makeCtx("viewer"), {
    caseId: CASE_ID,
    category: "questionnaire",
  });

  assert.equal(result.items.length, 1);
  assert.equal(result.items[0]?.category, "questionnaire");

  const countCall = calls.find((c) => c.sql.includes("count(*)"));
  assert.ok(countCall);
  assert.ok(countCall.sql.includes("category = $"));
});

// ── updateSurveyData: success on questionnaire item ──
void test("updateSurveyData: updates survey_data on questionnaire item", async () => {
  const surveyPayload = { business_plan: { revenue: 1000000 } };
  const pool = makePool((sql, params) => {
    if (sql.includes("update document_items") && sql.includes("survey_data")) {
      return Promise.resolve({
        rows: [
          makeItemRow({
            category: "questionnaire",
            survey_data: surveyPayload,
          }),
        ],
        rowCount: 1,
      });
    }
    if (sql.includes("from document_items") && params?.[0] === ITEM_ID) {
      return Promise.resolve({
        rows: [makeItemRow({ category: "questionnaire" })],
        rowCount: 1,
      });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  const timeline = makeTimeline();
  const svc = createService(pool, timeline);
  const result = await svc.updateSurveyData(makeCtx(), ITEM_ID, {
    surveyData: surveyPayload,
  });

  assert.deepEqual(result.surveyData, surveyPayload);
  assert.equal(timeline.writes.length, 1);
  assert.deepEqual(
    (timeline.writes[0] as Record<string, unknown>).action,
    "document_item.survey_data_updated",
  );
});

// ── updateSurveyData: set to null ──
void test("updateSurveyData: allows setting survey_data to null", async () => {
  const pool = makePool((sql, params) => {
    if (sql.includes("update document_items") && sql.includes("survey_data")) {
      return Promise.resolve({
        rows: [makeItemRow({ category: "questionnaire", survey_data: null })],
        rowCount: 1,
      });
    }
    if (sql.includes("from document_items") && params?.[0] === ITEM_ID) {
      return Promise.resolve({
        rows: [
          makeItemRow({
            category: "questionnaire",
            survey_data: { old: "data" },
          }),
        ],
        rowCount: 1,
      });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  const svc = createService(pool, makeTimeline());
  const result = await svc.updateSurveyData(makeCtx(), ITEM_ID, {
    surveyData: null,
  });
  assert.equal(result.surveyData, null);
});

// ── updateSurveyData: rejects on non-questionnaire item ──
void test("updateSurveyData: rejects when category is not questionnaire", async () => {
  const pool = makePool((sql, params) => {
    if (sql.includes("from document_items") && params?.[0] === ITEM_ID) {
      return Promise.resolve({
        rows: [makeItemRow({ category: "standard" })],
        rowCount: 1,
      });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  const svc = createService(pool, makeTimeline());
  await assert.rejects(
    () =>
      svc.updateSurveyData(makeCtx(), ITEM_ID, {
        surveyData: { test: true },
      }),
    (err) => {
      assert.ok(err instanceof Error);
      assert.ok(err.message.includes("questionnaire"));
      return true;
    },
  );
});

// ── updateSurveyData: rejects when category is null ──
void test("updateSurveyData: rejects when category is null", async () => {
  const pool = makePool((sql, params) => {
    if (sql.includes("from document_items") && params?.[0] === ITEM_ID) {
      return Promise.resolve({ rows: [makeItemRow()], rowCount: 1 });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  const svc = createService(pool, makeTimeline());
  await assert.rejects(
    () =>
      svc.updateSurveyData(makeCtx(), ITEM_ID, {
        surveyData: { test: true },
      }),
    (err) => {
      assert.ok(err instanceof Error);
      assert.ok(err.message.includes("questionnaire"));
      return true;
    },
  );
});

// ── updateSurveyData: not found ──
void test("updateSurveyData: throws when item not found", async () => {
  const pool = makePool(() => Promise.resolve({ rows: [], rowCount: 0 }));
  const svc = createService(pool, makeTimeline());

  await assert.rejects(
    () =>
      svc.updateSurveyData(makeCtx(), "nonexistent", {
        surveyData: { test: true },
      }),
    (err) => {
      assert.ok(err instanceof Error);
      return true;
    },
  );
});

// ── mapDocumentItemRow: providedByRole（NEW-V10-1 资料分组一致性修复） ──
void test("mapDocumentItemRow: maps provided_by_role when populated", () => {
  for (const role of ["applicant", "supporter", "office", "employer"]) {
    const item = mapDocumentItemRow(
      makeItemRow({ provided_by_role: role }) as never,
    );
    assert.equal(item.providedByRole, role);
  }
});

void test("mapDocumentItemRow: maps null provided_by_role to null (legacy / 058 迁移前)", () => {
  const item = mapDocumentItemRow(
    makeItemRow({ provided_by_role: null }) as never,
  );
  assert.equal(item.providedByRole, null);
});

// ── mapDocumentItemRow: surveyData from JSON string ──
void test("mapDocumentItemRow: parses survey_data JSON string", () => {
  const row = makeItemRow({
    category: "questionnaire",
    survey_data: '{"personal_info":{"name":"Taro"}}',
  });
  const item = mapDocumentItemRow(row as never);
  assert.equal(item.category, "questionnaire");
  assert.deepEqual(item.surveyData, { personal_info: { name: "Taro" } });
});

// ── mapDocumentItemRow: surveyData from object ──
void test("mapDocumentItemRow: handles survey_data as object", () => {
  const row = makeItemRow({
    category: "questionnaire",
    survey_data: { business_plan: { revenue: 500000 } },
  });
  const item = mapDocumentItemRow(row as never);
  assert.deepEqual(item.surveyData, { business_plan: { revenue: 500000 } });
});

// ── mapDocumentItemRow: null category and survey_data ──
void test("mapDocumentItemRow: handles null category and survey_data", () => {
  const row = makeItemRow();
  const item = mapDocumentItemRow(row as never);
  assert.equal(item.category, null);
  assert.equal(item.surveyData, null);
});

// ── mapDocumentItemRow: waive fields ──

void test("mapDocumentItemRow: maps waive fields when populated", () => {
  const row = makeItemRow({
    status: "waived",
    waive_reason_code_latest: "visa_type_exempt",
    waive_reason_latest: "N1 visa holders exempt",
    waived_by_user_id_latest: USER_ID,
    waived_at_latest: "2026-04-01T09:00:00.000Z",
  });
  const item = mapDocumentItemRow(row as never);
  assert.equal(item.waiveReasonCodeLatest, "visa_type_exempt");
  assert.equal(item.waiveReasonLatest, "N1 visa holders exempt");
  assert.equal(item.waivedByUserIdLatest, USER_ID);
  assert.equal(item.waivedAtLatest, "2026-04-01T09:00:00.000Z");
});

void test("mapDocumentItemRow: waive fields are null when not populated", () => {
  const row = makeItemRow();
  const item = mapDocumentItemRow(row as never);
  assert.equal(item.waiveReasonCodeLatest, null);
  assert.equal(item.waiveReasonLatest, null);
  assert.equal(item.waivedByUserIdLatest, null);
  assert.equal(item.waivedAtLatest, null);
});

// ── get: returns waive fields ──

void test("get: returns waive fields when item is waived", async () => {
  const pool = makePool((sql, params) => {
    if (sql.includes("from document_items") && params?.[0] === ITEM_ID) {
      return Promise.resolve({
        rows: [
          makeItemRow({
            status: "waived",
            waive_reason_code_latest: "equivalent_in_other_case",
            waive_reason_latest: "provided in case #7",
            waived_by_user_id_latest: USER_ID,
            waived_at_latest: "2026-04-15T12:00:00.000Z",
          }),
        ],
        rowCount: 1,
      });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  const svc = createService(pool, makeTimeline());
  const item = await svc.get(makeCtx("viewer"), ITEM_ID);
  assert.ok(item);
  assert.equal(item.waiveReasonCodeLatest, "equivalent_in_other_case");
  assert.equal(item.waiveReasonLatest, "provided in case #7");
  assert.equal(item.waivedByUserIdLatest, USER_ID);
  assert.equal(item.waivedAtLatest, "2026-04-15T12:00:00.000Z");
});

// ── list: returns waive fields ──

void test("list: returns waive fields on waived items", async () => {
  const pool = makePool((sql) => {
    if (sql.includes("count(*)")) {
      return Promise.resolve({ rows: [{ count: "1" }], rowCount: 1 });
    }
    return Promise.resolve({
      rows: [
        makeItemRow({
          status: "waived",
          waive_reason_code_latest: "other",
          waive_reason_latest: "client confirmed exempt",
          waived_by_user_id_latest: USER_ID,
          waived_at_latest: "2026-04-20T08:30:00.000Z",
        }),
      ],
      rowCount: 1,
    });
  });

  const svc = createService(pool, makeTimeline());
  const result = await svc.list(makeCtx("viewer"), { caseId: CASE_ID });
  assert.equal(result.items.length, 1);
  const item = result.items[0];
  assert.equal(item.waiveReasonCodeLatest, "other");
  assert.equal(item.waiveReasonLatest, "client confirmed exempt");
  assert.equal(item.waivedByUserIdLatest, USER_ID);
  assert.equal(item.waivedAtLatest, "2026-04-20T08:30:00.000Z");
});

// ────────────────────────────────────────────────────────────────
// P1: questionnaire participation in completion / review / follow-up
// ────────────────────────────────────────────────────────────────

void test("getCompletionRate includes questionnaire breakdown", async () => {
  const pool = makePool((sql) => {
    if (/^(begin|commit|rollback|select set_config)/i.test(sql.trim())) {
      return Promise.resolve({ rows: [], rowCount: 0 });
    }
    return Promise.resolve({
      rows: [
        { status: "approved", category: null, count: "3" },
        { status: "pending", category: null, count: "2" },
        { status: "approved", category: "questionnaire", count: "1" },
        { status: "pending", category: "questionnaire", count: "1" },
      ],
      rowCount: 4,
    });
  });

  const result = await createService(pool, makeTimeline()).getCompletionRate(
    makeCtx(),
    CASE_ID,
  );
  assert.equal(result.total, 7);
  assert.equal(result.completed, 4);
  assert.equal(result.approved, 4);
  assert.equal(result.waived, 0);
  assert.equal(result.questionnaireTotal, 2);
  assert.equal(result.questionnaireCompleted, 1);
  assert.equal(result.questionnaireCompletionRate, 50);
});

void test("getCompletionRate questionnaire fields are zero when no questionnaire items", async () => {
  const pool = makePool((sql) => {
    if (/^(begin|commit|rollback|select set_config)/i.test(sql.trim())) {
      return Promise.resolve({ rows: [], rowCount: 0 });
    }
    return Promise.resolve({
      rows: [
        { status: "approved", category: null, count: "2" },
        { status: "pending", category: "standard", count: "1" },
      ],
      rowCount: 2,
    });
  });

  const result = await createService(pool, makeTimeline()).getCompletionRate(
    makeCtx(),
    CASE_ID,
  );
  assert.equal(result.questionnaireTotal, 0);
  assert.equal(result.questionnaireCompleted, 0);
  assert.equal(result.questionnaireCompletionRate, 0);
});

void test("followUp: allowed on questionnaire item in pending status", async () => {
  const pool = makePool((sql, params) => {
    if (sql.includes("last_follow_up_at = now()")) {
      return Promise.resolve({
        rows: [
          makeItemRow({
            status: "pending",
            category: "questionnaire",
            last_follow_up_at: "2026-02-01T00:00:00.000Z",
          }),
        ],
        rowCount: 1,
      });
    }
    if (sql.includes("from document_items") && params?.[0] === ITEM_ID) {
      return Promise.resolve({
        rows: [makeItemRow({ status: "pending", category: "questionnaire" })],
        rowCount: 1,
      });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  const timeline = makeTimeline();
  const svc = createService(pool, timeline);
  const result = await svc.followUp(makeCtx(), ITEM_ID);
  assert.equal(result.lastFollowUpAt, "2026-02-01T00:00:00.000Z");
  assert.equal(result.category, "questionnaire");
  assert.equal(timeline.writes.length, 1);
});

void test("followUp: still rejected on non-questionnaire item in pending status", async () => {
  const pool = makePool((sql, params) => {
    if (sql.includes("from document_items") && params?.[0] === ITEM_ID) {
      return Promise.resolve({
        rows: [makeItemRow({ status: "pending", category: null })],
        rowCount: 1,
      });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  const svc = createService(pool, makeTimeline());
  await assert.rejects(
    () => svc.followUp(makeCtx(), ITEM_ID),
    (err) => {
      assert.ok(err instanceof Error);
      assert.ok(err.message.includes("Cannot follow up"));
      return true;
    },
  );
});

// ────────────────────────────────────────────────────────────────
// waive
// ────────────────────────────────────────────────────────────────

const WAIVE_TS = "2026-03-01T00:00:00.000Z";

function waivePool(fromStatus: string) {
  return makePool((sql, params) => {
    if (
      sql.includes("update document_items") &&
      sql.includes("status = 'waived'")
    ) {
      return Promise.resolve({
        rows: [
          makeItemRow({
            status: "waived",
            waive_reason_code_latest: "visa_type_exempt",
            waive_reason_latest: null,
            waived_by_user_id_latest: USER_ID,
            waived_at_latest: WAIVE_TS,
          }),
        ],
        rowCount: 1,
      });
    }
    if (sql.includes("from document_items") && params?.[0] === ITEM_ID) {
      return Promise.resolve({
        rows: [makeItemRow({ status: fromStatus })],
        rowCount: 1,
      });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });
}

for (const fromStatus of [
  "pending",
  "waiting_upload",
  "revision_required",
  "approved",
  "expired",
]) {
  void test(`waive: allows from ${fromStatus}`, async () => {
    const timeline = makeTimeline();
    const svc = createService(waivePool(fromStatus), timeline);
    const result = await svc.waive(makeCtx(), ITEM_ID, {
      reasonCode: "visa_type_exempt",
    });
    assert.equal(result.status, "waived");
    assert.equal(result.waiveReasonCodeLatest, "visa_type_exempt");
    assert.equal(result.waivedByUserIdLatest, USER_ID);
    assert.equal(result.waivedAtLatest, WAIVE_TS);
    assert.equal(timeline.writes.length, 1);
    assert.deepEqual(
      (timeline.writes[0] as Record<string, unknown>).action,
      "document_item.waived",
    );
  });
}

void test("waive: writes timeline with reasonCode and note", async () => {
  const pool = makePool((sql, params) => {
    if (
      sql.includes("update document_items") &&
      sql.includes("status = 'waived'")
    ) {
      return Promise.resolve({
        rows: [
          makeItemRow({
            status: "waived",
            waive_reason_code_latest: "other",
            waive_reason_latest: "custom reason",
            waived_by_user_id_latest: USER_ID,
            waived_at_latest: WAIVE_TS,
          }),
        ],
        rowCount: 1,
      });
    }
    if (sql.includes("from document_items") && params?.[0] === ITEM_ID) {
      return Promise.resolve({
        rows: [makeItemRow({ status: "pending" })],
        rowCount: 1,
      });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  const timeline = makeTimeline();
  const svc = createService(pool, timeline);
  await svc.waive(makeCtx(), ITEM_ID, {
    reasonCode: "other",
    note: "custom reason",
  });

  assert.equal(timeline.writes.length, 1);
  const payload = (timeline.writes[0] as Record<string, unknown>)
    .payload as Record<string, unknown>;
  assert.equal(payload.from, "pending");
  assert.equal(payload.reasonCode, "other");
  assert.equal(payload.note, "custom reason");
});

void test("waive: rejects from waived status", async () => {
  const pool = makePool((sql, params) => {
    if (sql.includes("from document_items") && params?.[0] === ITEM_ID) {
      return Promise.resolve({
        rows: [makeItemRow({ status: "waived" })],
        rowCount: 1,
      });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  const svc = createService(pool, makeTimeline());
  await assert.rejects(
    () => svc.waive(makeCtx(), ITEM_ID, { reasonCode: "visa_type_exempt" }),
    (err) => {
      assert.ok(err instanceof Error);
      assert.ok(err.message.includes("Cannot waive"));
      return true;
    },
  );
});

void test("waive: rejects from deleted status", async () => {
  const pool = makePool(() => Promise.resolve({ rows: [], rowCount: 0 }));
  const svc = createService(pool, makeTimeline());
  await assert.rejects(
    () => svc.waive(makeCtx(), ITEM_ID, { reasonCode: "visa_type_exempt" }),
    (err) => {
      assert.ok(err instanceof Error);
      return true;
    },
  );
});

void test("waive: rejects from uploaded_reviewing status", async () => {
  const pool = makePool((sql, params) => {
    if (sql.includes("from document_items") && params?.[0] === ITEM_ID) {
      return Promise.resolve({
        rows: [makeItemRow({ status: "uploaded_reviewing" })],
        rowCount: 1,
      });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  const svc = createService(pool, makeTimeline());
  await assert.rejects(
    () => svc.waive(makeCtx(), ITEM_ID, { reasonCode: "visa_type_exempt" }),
    (err) => {
      assert.ok(err instanceof Error);
      assert.ok(err.message.includes("Cannot waive"));
      return true;
    },
  );
});

void test("waive: requires note when reasonCode is 'other'", async () => {
  const pool = makePool((sql, params) => {
    if (sql.includes("from document_items") && params?.[0] === ITEM_ID) {
      return Promise.resolve({
        rows: [makeItemRow({ status: "pending" })],
        rowCount: 1,
      });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  const svc = createService(pool, makeTimeline());
  await assert.rejects(
    () => svc.waive(makeCtx(), ITEM_ID, { reasonCode: "other" }),
    (err) => {
      assert.ok(err instanceof Error);
      assert.ok(err.message.includes("note is required"));
      return true;
    },
  );
});

void test("waive: allows note to be omitted for non-other reasonCode", async () => {
  const timeline = makeTimeline();
  const svc = createService(waivePool("pending"), timeline);
  const result = await svc.waive(makeCtx(), ITEM_ID, {
    reasonCode: "visa_type_exempt",
  });
  assert.equal(result.status, "waived");
});

void test("waive: throws on item not found", async () => {
  const pool = makePool(() => Promise.resolve({ rows: [], rowCount: 0 }));
  const svc = createService(pool, makeTimeline());
  await assert.rejects(
    () =>
      svc.waive(makeCtx(), "nonexistent", {
        reasonCode: "visa_type_exempt",
      }),
    (err) => {
      assert.ok(err instanceof Error);
      return true;
    },
  );
});

void test("waive: concurrent status change causes failure", async () => {
  const pool = makePool((sql, params) => {
    if (sql.includes("from document_items") && params?.[0] === ITEM_ID) {
      return Promise.resolve({
        rows: [makeItemRow({ status: "pending" })],
        rowCount: 1,
      });
    }
    if (
      sql.includes("update document_items") &&
      sql.includes("status = 'waived'")
    ) {
      return Promise.resolve({ rows: [], rowCount: 0 });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  const svc = createService(pool, makeTimeline());
  await assert.rejects(
    () => svc.waive(makeCtx(), ITEM_ID, { reasonCode: "visa_type_exempt" }),
    (err) => {
      assert.ok(err instanceof Error);
      assert.ok(
        err.message.includes("concurrently") || err.message.includes("Failed"),
      );
      return true;
    },
  );
});

void test("waive: passes userId and reasonCode to SQL params", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];
  const pool = makePool((sql, params) => {
    calls.push({ sql, params });
    if (
      sql.includes("update document_items") &&
      sql.includes("status = 'waived'")
    ) {
      return Promise.resolve({
        rows: [
          makeItemRow({
            status: "waived",
            waive_reason_code_latest: "equivalent_in_other_case",
            waive_reason_latest: "see case #42",
            waived_by_user_id_latest: USER_ID,
            waived_at_latest: WAIVE_TS,
          }),
        ],
        rowCount: 1,
      });
    }
    if (sql.includes("from document_items") && params?.[0] === ITEM_ID) {
      return Promise.resolve({
        rows: [makeItemRow({ status: "approved" })],
        rowCount: 1,
      });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  const svc = createService(pool, makeTimeline());
  const result = await svc.waive(makeCtx(), ITEM_ID, {
    reasonCode: "equivalent_in_other_case",
    note: "see case #42",
  });

  assert.equal(result.waiveReasonCodeLatest, "equivalent_in_other_case");
  assert.equal(result.waiveReasonLatest, "see case #42");

  const updateCall = calls.find(
    (c) =>
      c.sql.includes("update document_items") &&
      c.sql.includes("status = 'waived'"),
  );
  assert.ok(updateCall);
  assert.ok(updateCall.params);
  assert.equal(updateCall.params[1], "equivalent_in_other_case");
  assert.equal(updateCall.params[2], "see case #42");
  assert.equal(updateCall.params[3], USER_ID);
  assert.equal(updateCall.params[4], "approved");
});

// ── unwaive ──

void test("unwaive: success path — status becomes pending, 4 latest fields nulled, timeline written", async () => {
  const pool = makePool((sql, params) => {
    if (sql.includes("from document_items") && params?.[0] === ITEM_ID) {
      return Promise.resolve({
        rows: [
          makeItemRow({
            status: "waived",
            waive_reason_code_latest: "other",
            waive_reason_latest: "reason",
            waived_by_user_id_latest: USER_ID,
            waived_at_latest: "2026-02-01T00:00:00.000Z",
          }),
        ],
        rowCount: 1,
      });
    }
    if (
      sql.includes("update document_items") &&
      sql.includes("status = 'pending'")
    ) {
      return Promise.resolve({
        rows: [
          makeItemRow({
            status: "pending",
            waive_reason_code_latest: null,
            waive_reason_latest: null,
            waived_by_user_id_latest: null,
            waived_at_latest: null,
          }),
        ],
        rowCount: 1,
      });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  const timeline = makeTimeline();
  const svc = createService(pool, timeline);
  const result = await svc.unwaive(makeCtx(), ITEM_ID, { note: "restoring" });

  assert.equal(result.status, "pending");
  assert.equal(result.waiveReasonCodeLatest, null);
  assert.equal(result.waiveReasonLatest, null);
  assert.equal(result.waivedByUserIdLatest, null);
  assert.equal(result.waivedAtLatest, null);
  assert.equal(timeline.writes.length, 1);
  const entry = timeline.writes[0] as {
    action: string;
    payload: { from: string; note: string | null };
  };
  assert.equal(entry.action, "document_item.unwaived");
  assert.equal(entry.payload.from, "waived");
  assert.equal(entry.payload.note, "restoring");
});

void test("unwaive: rejects when status is not waived", async () => {
  const pool = makePool((sql, params) => {
    if (sql.includes("from document_items") && params?.[0] === ITEM_ID) {
      return Promise.resolve({
        rows: [makeItemRow({ status: "pending" })],
        rowCount: 1,
      });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  const svc = createService(pool, makeTimeline());
  await assert.rejects(
    () => svc.unwaive(makeCtx(), ITEM_ID, { note: null }),
    (err: Error) => err.message.includes("Cannot unwaive"),
  );
});

void test("unwaive: throws on item not found", async () => {
  const pool = makePool(() => Promise.resolve({ rows: [], rowCount: 0 }));
  const svc = createService(pool, makeTimeline());
  await assert.rejects(
    () => svc.unwaive(makeCtx(), ITEM_ID, {}),
    (err: Error) => err.message.includes("not found"),
  );
});

void test("unwaive: concurrent status change causes failure", async () => {
  const pool = makePool((sql, params) => {
    if (sql.includes("from document_items") && params?.[0] === ITEM_ID) {
      return Promise.resolve({
        rows: [makeItemRow({ status: "waived" })],
        rowCount: 1,
      });
    }
    if (sql.includes("update document_items")) {
      return Promise.resolve({ rows: [], rowCount: 0 });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  const svc = createService(pool, makeTimeline());
  await assert.rejects(
    () => svc.unwaive(makeCtx(), ITEM_ID, { note: null }),
    (err: Error) => err.message.includes("concurrently"),
  );
});

void test("transition: rejects waived → pending (path closed)", async () => {
  const pool = makePool((sql, params) => {
    if (sql.includes("from document_items") && params?.[0] === ITEM_ID) {
      return Promise.resolve({
        rows: [makeItemRow({ status: "waived" })],
        rowCount: 1,
      });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  const svc = createService(pool, makeTimeline());
  await assert.rejects(
    () => svc.transition(makeCtx(), ITEM_ID, { toStatus: "pending" }),
    (err: Error) => err.message.includes("not allowed"),
  );
});

// ────────────────────────────────────────────────────────────────
// A2: ownerSide filter + statusIn array + expired derived
// ────────────────────────────────────────────────────────────────

void test("list: applies ownerSide filter", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];
  const pool = makePool((sql, params) => {
    calls.push({ sql: sql.trim(), params });
    if (sql.includes("count(*)")) {
      return Promise.resolve({ rows: [{ count: "1" }], rowCount: 1 });
    }
    return Promise.resolve({
      rows: [makeItemRow({ owner_side: "office" })],
      rowCount: 1,
    });
  });

  const svc = createService(pool, makeTimeline());
  const result = await svc.list(makeCtx("viewer"), { ownerSide: "office" });

  assert.equal(result.items.length, 1);
  assert.equal(result.items[0]?.ownerSide, "office");

  const countCall = calls.find((c) => c.sql.includes("count(*)"));
  assert.ok(countCall);
  assert.ok(countCall.sql.includes("owner_side = $"));
  assert.ok(countCall.params?.includes("office"));
});

void test("list: applies statusIn with single value", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];
  const pool = makePool((sql, params) => {
    calls.push({ sql: sql.trim(), params });
    if (sql.includes("count(*)")) {
      return Promise.resolve({ rows: [{ count: "1" }], rowCount: 1 });
    }
    return Promise.resolve({
      rows: [makeItemRow({ status: "approved" })],
      rowCount: 1,
    });
  });

  const svc = createService(pool, makeTimeline());
  await svc.list(makeCtx("viewer"), { statusIn: ["approved"] });

  const countCall = calls.find((c) => c.sql.includes("count(*)"));
  assert.ok(countCall);
  assert.ok(countCall.sql.includes("status IN ("));
  assert.ok(countCall.params?.includes("approved"));
});

void test("list: statusIn with multiple values produces IN clause", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];
  const pool = makePool((sql, params) => {
    calls.push({ sql: sql.trim(), params });
    if (sql.includes("count(*)")) {
      return Promise.resolve({ rows: [{ count: "2" }], rowCount: 1 });
    }
    return Promise.resolve({ rows: [makeItemRow()], rowCount: 1 });
  });

  const svc = createService(pool, makeTimeline());
  await svc.list(makeCtx("viewer"), {
    statusIn: ["pending", "waiting_upload"],
  });

  const countCall = calls.find((c) => c.sql.includes("count(*)"));
  assert.ok(countCall);
  assert.ok(countCall.sql.includes("status IN ("));
  assert.ok(countCall.params?.includes("pending"));
  assert.ok(countCall.params?.includes("waiting_upload"));
});

void test("list: statusIn 'missing' expands to pending + revision_required", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];
  const pool = makePool((sql, params) => {
    calls.push({ sql: sql.trim(), params });
    if (sql.includes("count(*)")) {
      return Promise.resolve({ rows: [{ count: "0" }], rowCount: 1 });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  const svc = createService(pool, makeTimeline());
  await svc.list(makeCtx("viewer"), { statusIn: ["missing"] });

  const countCall = calls.find((c) => c.sql.includes("count(*)"));
  assert.ok(countCall);
  assert.ok(countCall.sql.includes("status IN ("));
  assert.ok(countCall.params?.includes("pending"));
  assert.ok(countCall.params?.includes("revision_required"));
});

void test("list: statusIn 'expired' produces derived SQL (approved AND due_at < now())", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];
  const pool = makePool((sql, params) => {
    calls.push({ sql: sql.trim(), params });
    if (sql.includes("count(*)")) {
      return Promise.resolve({ rows: [{ count: "0" }], rowCount: 1 });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  const svc = createService(pool, makeTimeline());
  await svc.list(makeCtx("viewer"), { statusIn: ["expired"] });

  const countCall = calls.find((c) => c.sql.includes("count(*)"));
  assert.ok(countCall);
  assert.ok(
    countCall.sql.includes("status = 'approved' AND due_at < now()"),
    `Expected derived expired clause, got: ${countCall.sql}`,
  );
});

void test("list: statusIn 'expired' combined with other statuses produces OR clause", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];
  const pool = makePool((sql, params) => {
    calls.push({ sql: sql.trim(), params });
    if (sql.includes("count(*)")) {
      return Promise.resolve({ rows: [{ count: "0" }], rowCount: 1 });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  const svc = createService(pool, makeTimeline());
  await svc.list(makeCtx("viewer"), {
    statusIn: ["pending", "expired"],
  });

  const countCall = calls.find((c) => c.sql.includes("count(*)"));
  assert.ok(countCall);
  assert.ok(
    countCall.sql.includes("status IN ("),
    `Expected IN clause for direct statuses, got: ${countCall.sql}`,
  );
  assert.ok(
    countCall.sql.includes("status = 'approved' AND due_at < now()"),
    `Expected derived expired clause, got: ${countCall.sql}`,
  );
  assert.ok(
    countCall.sql.includes(" OR "),
    `Expected OR between clauses, got: ${countCall.sql}`,
  );
  assert.ok(countCall.params?.includes("pending"));
});

void test("list: statusIn 'missing' combined with 'expired' produces both expansions", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];
  const pool = makePool((sql, params) => {
    calls.push({ sql: sql.trim(), params });
    if (sql.includes("count(*)")) {
      return Promise.resolve({ rows: [{ count: "0" }], rowCount: 1 });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  const svc = createService(pool, makeTimeline());
  await svc.list(makeCtx("viewer"), {
    statusIn: ["missing", "expired"],
  });

  const countCall = calls.find((c) => c.sql.includes("count(*)"));
  assert.ok(countCall);
  assert.ok(countCall.sql.includes("status IN ("));
  assert.ok(countCall.params?.includes("pending"));
  assert.ok(countCall.params?.includes("revision_required"));
  assert.ok(countCall.sql.includes("status = 'approved' AND due_at < now()"));
});

void test("list: statusIn takes precedence over status when both provided", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];
  const pool = makePool((sql, params) => {
    calls.push({ sql: sql.trim(), params });
    if (sql.includes("count(*)")) {
      return Promise.resolve({ rows: [{ count: "0" }], rowCount: 1 });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  const svc = createService(pool, makeTimeline());
  await svc.list(makeCtx("viewer"), {
    status: "approved",
    statusIn: ["pending"],
  });

  const countCall = calls.find((c) => c.sql.includes("count(*)"));
  assert.ok(countCall);
  assert.ok(countCall.sql.includes("status IN ("));
  assert.ok(!countCall.sql.includes("status = $"));
  assert.ok(countCall.params?.includes("pending"));
  assert.ok(!countCall.params?.includes("approved"));
});

void test("list: ownerSide combined with statusIn and caseId", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];
  const pool = makePool((sql, params) => {
    calls.push({ sql: sql.trim(), params });
    if (sql.includes("count(*)")) {
      return Promise.resolve({ rows: [{ count: "1" }], rowCount: 1 });
    }
    return Promise.resolve({
      rows: [makeItemRow({ owner_side: "customer", status: "pending" })],
      rowCount: 1,
    });
  });

  const svc = createService(pool, makeTimeline());
  const result = await svc.list(makeCtx("viewer"), {
    caseId: CASE_ID,
    ownerSide: "customer",
    statusIn: ["missing"],
  });

  assert.equal(result.items.length, 1);
  const countCall = calls.find((c) => c.sql.includes("count(*)"));
  assert.ok(countCall);
  assert.ok(countCall.sql.includes("case_id = $"));
  assert.ok(countCall.sql.includes("owner_side = $"));
  assert.ok(countCall.sql.includes("status IN ("));
  assert.ok(countCall.params?.includes(CASE_ID));
  assert.ok(countCall.params?.includes("customer"));
});
