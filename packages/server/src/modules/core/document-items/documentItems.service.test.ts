import test from "node:test";
import assert from "node:assert/strict";
import type { Pool } from "pg";

import { DocumentItemsService } from "./documentItems.service";
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

// ── transition (valid: pending → requested) ──
void test("DocumentItemsService.transition allows valid transition", async () => {
  const pool = makePool((sql, params) => {
    if (sql.includes("update document_items") && sql.includes("status = $")) {
      return Promise.resolve({
        rows: [
          makeItemRow({
            status: "requested",
            requested_at: "2026-01-02T00:00:00.000Z",
          }),
        ],
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
  const result = await svc.transition(makeCtx(), ITEM_ID, {
    toStatus: "requested",
  });

  assert.equal(result.status, "requested");
  assert.equal(timeline.writes.length, 1);
  assert.deepEqual(
    (timeline.writes[0] as Record<string, unknown>).action,
    "document_item.transitioned",
  );
});

// ── transition (invalid: pending → reviewed) ──
void test("DocumentItemsService.transition rejects invalid transition", async () => {
  const pool = makePool((sql, params) => {
    if (sql.includes("from document_items") && params?.[0] === ITEM_ID) {
      return Promise.resolve({ rows: [makeItemRow()], rowCount: 1 });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  const svc = createService(pool, makeTimeline());
  await assert.rejects(
    () => svc.transition(makeCtx(), ITEM_ID, { toStatus: "reviewed" }),
    (err) => {
      assert.ok(err instanceof Error);
      assert.ok(err.message.includes("not allowed"));
      return true;
    },
  );
});

// ── transition not found ──
void test("DocumentItemsService.transition throws when not found", async () => {
  const pool = makePool(() => Promise.resolve({ rows: [], rowCount: 0 }));
  const svc = createService(pool, makeTimeline());

  await assert.rejects(
    () => svc.transition(makeCtx(), "nonexistent", { toStatus: "requested" }),
    (err) => {
      assert.ok(err instanceof Error);
      return true;
    },
  );
});

// ── transition concurrent change ──
void test("DocumentItemsService.transition fails on concurrent status change", async () => {
  const pool = makePool((sql, params) => {
    // get() returns an item with 'pending' status
    if (sql.includes("from document_items") && params?.[0] === ITEM_ID) {
      return Promise.resolve({ rows: [makeItemRow()], rowCount: 1 });
    }
    // update returns 0 rows (simulate someone else already changed the status to requested)
    if (sql.includes("update document_items")) {
      return Promise.resolve({ rows: [], rowCount: 0 });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  const svc = createService(pool, makeTimeline());
  await assert.rejects(
    () => svc.transition(makeCtx(), ITEM_ID, { toStatus: "requested" }),
    (err) => {
      assert.ok(err instanceof Error);
      assert.ok(
        err.message.includes("concurrently") || err.message.includes("Failed"),
      );
      return true;
    },
  );
});

// ── followUp ──
void test("DocumentItemsService.followUp updates lastFollowUpAt and writes timeline", async () => {
  const pool = makePool((sql, params) => {
    if (sql.includes("last_follow_up_at = now()")) {
      return Promise.resolve({
        rows: [makeItemRow({ last_follow_up_at: "2026-01-15T00:00:00.000Z" })],
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
  const result = await svc.followUp(makeCtx(), ITEM_ID);

  assert.equal(result.lastFollowUpAt, "2026-01-15T00:00:00.000Z");
  assert.equal(timeline.writes.length, 1);
  assert.deepEqual(
    (timeline.writes[0] as Record<string, unknown>).action,
    "document_item_follow_up",
  );
});

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
void test("DocumentItemsService.followUp throws when status is reviewed or rejected", async () => {
  const pool = makePool((sql, params) => {
    if (sql.includes("from document_items") && params?.[0] === ITEM_ID) {
      return Promise.resolve({
        rows: [makeItemRow({ status: "reviewed" })],
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
