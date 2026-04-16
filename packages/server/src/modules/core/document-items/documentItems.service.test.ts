/* eslint-disable max-lines */
import test from "node:test";
import assert from "node:assert/strict";
import type { Pool } from "pg";

import {
  DocumentItemsService,
  ALLOWED_TRANSITIONS,
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
    last_follow_up_at: null,
    note: null,
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
        { status: "approved", count: "1" },
        { status: "waived", count: "1" },
        { status: "pending", count: "1" },
        { status: "revision_required", count: "1" },
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
