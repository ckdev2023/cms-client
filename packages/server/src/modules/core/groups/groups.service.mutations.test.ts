import test from "node:test";
import assert from "node:assert/strict";
import { UnprocessableEntityException } from "@nestjs/common";
import type { Pool } from "pg";

import { GroupsService } from "./groups.service";
import type { TimelineService } from "../timeline/timeline.service";
import type { TimelineWriteInput } from "../timeline/timeline.service";
import type { RequestContext } from "../tenancy/requestContext";

const ORG_ID = "00000000-0000-4000-8000-000000000000";
const USER_ID = "00000000-0000-4000-8000-000000000001";
const GROUP_ID_1 = "00000000-0000-4000-8000-a00000000001";

function makeCtx(): RequestContext {
  return { orgId: ORG_ID, userId: USER_ID, role: "manager" };
}

type SqlCall = { sql: string; params?: unknown[] };
type TimelineCall = { ctx: RequestContext; input: TimelineWriteInput };

type PoolClientLike = {
  query: (
    sql: string,
    params?: unknown[],
  ) => Promise<{ rows: unknown[]; rowCount: number }>;
  release: () => void;
};

function makePool(queryFn: PoolClientLike["query"]): Pool {
  const client: PoolClientLike = { query: queryFn, release: () => undefined };
  return { connect: () => Promise.resolve(client) } as unknown as Pool;
}

function makeTimelineService(calls: TimelineCall[]): TimelineService {
  return {
    write(ctx: RequestContext, input: TimelineWriteInput) {
      calls.push({ ctx, input });
      return Promise.resolve();
    },
  } as unknown as TimelineService;
}

function detailRow(overrides: Record<string, unknown> = {}) {
  return {
    id: GROUP_ID_1,
    org_id: ORG_ID,
    group_no: "GRP-001",
    name: "Alpha",
    description: null,
    active_flag: true,
    created_by: USER_ID,
    created_at: "2026-04-28T00:00:00Z",
    updated_by: USER_ID,
    updated_at: "2026-04-28T00:00:00Z",
    ...overrides,
  };
}

function createQueryFn(opts: {
  nextSeq?: string;
  insertId?: string;
  detail?: Record<string, unknown>;
  insertError?: Error;
  updateError?: Error;
  calls?: SqlCall[];
}): PoolClientLike["query"] {
  const calls = opts.calls ?? [];
  return (sql: string, params?: unknown[]) => {
    calls.push({ sql: sql.trim(), params });

    if (sql.includes("next_seq")) {
      return Promise.resolve({
        rows: [{ next_seq: opts.nextSeq ?? "1" }],
        rowCount: 1,
      });
    }
    if (sql.includes("INSERT INTO groups")) {
      if (opts.insertError) return Promise.reject(opts.insertError);
      return Promise.resolve({
        rows: [{ id: opts.insertId ?? GROUP_ID_1 }],
        rowCount: 1,
      });
    }
    if (sql.includes("UPDATE groups") && sql.includes("name =")) {
      if (opts.updateError) return Promise.reject(opts.updateError);
      return Promise.resolve({ rows: [], rowCount: 1 });
    }
    if (sql.includes("UPDATE groups") && sql.includes("active_flag = false")) {
      return Promise.resolve({ rows: [], rowCount: 1 });
    }
    if (sql.includes("SELECT name FROM groups WHERE")) {
      const row = opts.detail;
      if (!row) return Promise.resolve({ rows: [], rowCount: 0 });
      return Promise.resolve({ rows: [{ name: row.name }], rowCount: 1 });
    }
    if (sql.includes("SELECT active_flag FROM groups WHERE")) {
      const row = opts.detail;
      if (!row) return Promise.resolve({ rows: [], rowCount: 0 });
      return Promise.resolve({
        rows: [{ active_flag: row.active_flag }],
        rowCount: 1,
      });
    }
    if (sql.includes("FROM groups g WHERE g.id")) {
      const row = opts.detail ?? detailRow();
      return Promise.resolve({ rows: [row], rowCount: 1 });
    }
    if (sql.includes("user_group_memberships")) {
      return Promise.resolve({ rows: [], rowCount: 0 });
    }
    if (sql.includes("FROM cases c") && sql.includes("group_id")) {
      return Promise.resolve({
        rows: [{ customer_count: "2", case_count: "5" }],
        rowCount: 1,
      });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  };
}

function makeDuplicateNameError(): Error {
  const err = new Error("duplicate key") as Error & {
    code: string;
    constraint: string;
  };
  err.code = "23505";
  err.constraint = "uq_groups_org_name";
  return err;
}

// ── createGroup ─────────────────────────────────────────────────

void test("createGroup assigns GRP-001 when no groups exist", async () => {
  const sqlCalls: SqlCall[] = [];
  const tlCalls: TimelineCall[] = [];

  const pool = makePool(
    createQueryFn({ nextSeq: "1", calls: sqlCalls, detail: detailRow() }),
  );
  const service = new GroupsService(pool, makeTimelineService(tlCalls));
  const result = await service.createGroup(makeCtx(), { name: "Alpha" });

  assert.equal(result.groupNo, "GRP-001");
  const insertCall = sqlCalls.find((c) => c.sql.includes("INSERT INTO groups"));
  assert.ok(insertCall, "expected INSERT query");
  assert.equal(insertCall.params?.[1], "GRP-001");
});

void test("createGroup auto-increments group_no to GRP-003", async () => {
  const sqlCalls: SqlCall[] = [];
  const tlCalls: TimelineCall[] = [];

  const pool = makePool(
    createQueryFn({
      nextSeq: "3",
      calls: sqlCalls,
      detail: detailRow({ group_no: "GRP-003" }),
    }),
  );
  const service = new GroupsService(pool, makeTimelineService(tlCalls));
  const result = await service.createGroup(makeCtx(), { name: "Gamma" });

  assert.equal(result.groupNo, "GRP-003");
  const insertCall = sqlCalls.find((c) => c.sql.includes("INSERT INTO groups"));
  assert.ok(insertCall);
  assert.equal(insertCall.params?.[1], "GRP-003");
});

void test("createGroup throws 422 on duplicate name", async () => {
  const pool = makePool(
    createQueryFn({ nextSeq: "1", insertError: makeDuplicateNameError() }),
  );
  const service = new GroupsService(pool, makeTimelineService([]));

  await assert.rejects(
    () => service.createGroup(makeCtx(), { name: "Dup" }),
    (err: unknown) => {
      assert.ok(err instanceof UnprocessableEntityException);
      const body = err.getResponse();
      const msg = typeof body === "string" ? body : JSON.stringify(body);
      assert.match(msg, /GROUP_DUPLICATE_NAME/);
      return true;
    },
  );
});

void test("createGroup writes timeline with action group_created", async () => {
  const tlCalls: TimelineCall[] = [];
  const pool = makePool(createQueryFn({ detail: detailRow() }));
  const service = new GroupsService(pool, makeTimelineService(tlCalls));

  await service.createGroup(makeCtx(), { name: "Alpha" });

  assert.equal(tlCalls.length, 1);
  const tl = tlCalls[0];
  assert.equal(tl.input.entityType, "group");
  assert.equal(tl.input.entityId, GROUP_ID_1);
  assert.equal(tl.input.action, "group_created");
  assert.deepEqual(tl.input.payload, { name: "Alpha" });
});

// ── renameGroup ─────────────────────────────────────────────────

void test("renameGroup updates name and writes timeline with from/to", async () => {
  const tlCalls: TimelineCall[] = [];
  const renamedDetail = detailRow({ name: "Beta-v2" });

  const pool = makePool(createQueryFn({ detail: renamedDetail }));
  const service = new GroupsService(pool, makeTimelineService(tlCalls));
  const result = await service.renameGroup(makeCtx(), GROUP_ID_1, {
    name: "Beta-v2",
  });

  assert.ok(result);
  assert.equal(tlCalls.length, 1);
  const tl = tlCalls[0];
  assert.equal(tl.input.action, "group_renamed");
  assert.equal(tl.input.entityType, "group");
  assert.equal(tl.input.entityId, GROUP_ID_1);
  assert.equal((tl.input.payload as { from: string }).from, "Beta-v2");
  assert.equal((tl.input.payload as { to: string }).to, "Beta-v2");
});

void test("renameGroup throws 422 on duplicate name conflict", async () => {
  const pool = makePool(
    createQueryFn({
      detail: detailRow({ name: "Existing" }),
      updateError: makeDuplicateNameError(),
    }),
  );
  const service = new GroupsService(pool, makeTimelineService([]));

  await assert.rejects(
    () =>
      service.renameGroup(makeCtx(), GROUP_ID_1, { name: "ConflictingName" }),
    (err: unknown) => {
      assert.ok(err instanceof UnprocessableEntityException);
      return true;
    },
  );
});

void test("renameGroup returns null when group not found", async () => {
  const pool = makePool(
    createQueryFn({ detail: undefined as unknown as Record<string, unknown> }),
  );
  const service = new GroupsService(pool, makeTimelineService([]));
  const result = await service.renameGroup(makeCtx(), GROUP_ID_1, {
    name: "Nope",
  });
  assert.equal(result, null);
});

// ── disableGroup ────────────────────────────────────────────────

void test("disableGroup sets active_flag=false and writes timeline with reference counts", async () => {
  const tlCalls: TimelineCall[] = [];
  const disabledDetail = detailRow({ active_flag: false });
  let disableDone = false;

  const pool = makePool((sql) => {
    if (sql.includes("SELECT active_flag FROM groups WHERE")) {
      return Promise.resolve({ rows: [{ active_flag: true }], rowCount: 1 });
    }
    if (sql.includes("FROM cases c") && sql.includes("group_id")) {
      return Promise.resolve({
        rows: [{ customer_count: "3", case_count: "7" }],
        rowCount: 1,
      });
    }
    if (sql.includes("UPDATE groups") && sql.includes("active_flag = false")) {
      disableDone = true;
      return Promise.resolve({ rows: [], rowCount: 1 });
    }
    if (sql.includes("FROM groups g WHERE g.id")) {
      return Promise.resolve({ rows: [disabledDetail], rowCount: 1 });
    }
    if (sql.includes("user_group_memberships")) {
      return Promise.resolve({ rows: [], rowCount: 0 });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  const service = new GroupsService(pool, makeTimelineService(tlCalls));
  const result = await service.disableGroup(makeCtx(), GROUP_ID_1, {
    reason: "restructuring",
  });

  assert.ok(result);
  assert.equal(result.activeFlag, false);
  assert.ok(disableDone, "UPDATE should have been executed");

  assert.equal(tlCalls.length, 1);
  const tl = tlCalls[0];
  assert.equal(tl.input.entityType, "group");
  assert.equal(tl.input.entityId, GROUP_ID_1);
  assert.equal(tl.input.action, "group_disabled");
  assert.equal(
    (tl.input.payload as { customer_count: number }).customer_count,
    3,
  );
  assert.equal((tl.input.payload as { case_count: number }).case_count, 7);
  assert.equal(
    (tl.input.payload as { reason: string }).reason,
    "restructuring",
  );
});

void test("disableGroup throws 422 when group is already disabled", async () => {
  const pool = makePool((sql) => {
    if (sql.includes("SELECT active_flag FROM groups WHERE")) {
      return Promise.resolve({ rows: [{ active_flag: false }], rowCount: 1 });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });
  const service = new GroupsService(pool, makeTimelineService([]));

  await assert.rejects(
    () => service.disableGroup(makeCtx(), GROUP_ID_1),
    (err: unknown) => {
      assert.ok(err instanceof UnprocessableEntityException);
      const body = err.getResponse();
      const msg = typeof body === "string" ? body : JSON.stringify(body);
      assert.match(msg, /GROUP_ALREADY_DISABLED/);
      return true;
    },
  );
});

void test("disableGroup returns null when group not found", async () => {
  const pool = makePool((sql) => {
    if (sql.includes("SELECT active_flag FROM groups WHERE")) {
      return Promise.resolve({ rows: [], rowCount: 0 });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });
  const service = new GroupsService(pool, makeTimelineService([]));
  const result = await service.disableGroup(makeCtx(), GROUP_ID_1);
  assert.equal(result, null);
});

void test("disableGroup writes timeline with null reason when omitted", async () => {
  const tlCalls: TimelineCall[] = [];

  const pool = makePool((sql) => {
    if (sql.includes("SELECT active_flag FROM groups WHERE")) {
      return Promise.resolve({ rows: [{ active_flag: true }], rowCount: 1 });
    }
    if (sql.includes("FROM cases c") && sql.includes("group_id")) {
      return Promise.resolve({
        rows: [{ customer_count: "0", case_count: "0" }],
        rowCount: 1,
      });
    }
    if (sql.includes("UPDATE groups") && sql.includes("active_flag = false")) {
      return Promise.resolve({ rows: [], rowCount: 1 });
    }
    if (sql.includes("FROM groups g WHERE g.id")) {
      return Promise.resolve({
        rows: [detailRow({ active_flag: false })],
        rowCount: 1,
      });
    }
    if (sql.includes("user_group_memberships")) {
      return Promise.resolve({ rows: [], rowCount: 0 });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  const service = new GroupsService(pool, makeTimelineService(tlCalls));
  await service.disableGroup(makeCtx(), GROUP_ID_1);

  assert.equal(tlCalls.length, 1);
  assert.equal((tlCalls[0].input.payload as { reason: unknown }).reason, null);
});
