import test from "node:test";
import assert from "node:assert/strict";
import type { Pool } from "pg";

import { TimelineService } from "./timeline.service";

void test("TimelineService writes timeline_logs with org/user from context", async () => {
  const calls: { sql: string; params: unknown[] }[] = [];

  type PoolClientLike = {
    query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }>;
    release: () => void;
  };

  type PoolLike = {
    connect: () => Promise<PoolClientLike>;
  };

  const client: PoolClientLike = {
    query: (sql: string, params?: unknown[]) => {
      if (params) calls.push({ sql: sql.trim(), params });
      return Promise.resolve({ rows: [] });
    },
    release: () => undefined,
  };

  const pool: PoolLike = {
    connect: () => Promise.resolve(client),
  };

  const service = new TimelineService(pool as unknown as Pool);
  await service.write(
    {
      orgId: "00000000-0000-4000-8000-000000000000",
      userId: "00000000-0000-4000-8000-000000000001",
      role: "staff",
    },
    {
      entityType: "case",
      entityId: "c1",
      action: "created",
      payload: { a: 1 },
    },
  );

  const insertCall = calls.find((c) =>
    c.sql.includes("insert into timeline_logs"),
  );
  if (!insertCall) throw new Error("missing insert call");
  assert.deepEqual(insertCall.params.slice(0, 5), [
    "00000000-0000-4000-8000-000000000000",
    "case",
    "c1",
    "created",
    "00000000-0000-4000-8000-000000000001",
  ]);
});

void test("TimelineService lists timeline logs with filters", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];

  type PoolClientLike = {
    query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }>;
    release: () => void;
  };

  type PoolLike = {
    connect: () => Promise<PoolClientLike>;
  };

  const client: PoolClientLike = {
    query: (sql: string, params?: unknown[]) => {
      calls.push({ sql: sql.trim(), params });

      if (sql.includes("from timeline_logs")) {
        return Promise.resolve({
          rows: [
            {
              id: "t1",
              org_id: "00000000-0000-4000-8000-000000000000",
              entity_type: "case",
              entity_id: "c1",
              action: "case.status_changed",
              actor_user_id: "00000000-0000-4000-8000-000000000001",
              actor_display_name: "Tanaka Yuki",
              payload: { from: "intake", to: "review" },
              created_at: "2026-01-01T00:00:00.000Z",
            },
          ],
        });
      }

      return Promise.resolve({ rows: [] });
    },
    release: () => undefined,
  };

  const pool: PoolLike = {
    connect: () => Promise.resolve(client),
  };

  const service = new TimelineService(pool as unknown as Pool);
  const logs = await service.list(
    {
      orgId: "00000000-0000-4000-8000-000000000000",
      userId: "00000000-0000-4000-8000-000000000001",
      role: "staff",
    },
    { entityType: "case", entityId: "c1", limit: 10 },
  );

  assert.equal(logs.length, 1);
  assert.equal(logs[0]?.entityType, "case");
  assert.equal(logs[0]?.entityId, "c1");
  assert.equal(logs[0]?.actorDisplayName, "Tanaka Yuki");
  assert.deepEqual(logs[0]?.payload, { from: "intake", to: "review" });

  const selectCall = calls.find((c) => c.sql.includes("from timeline_logs"));
  if (!selectCall) throw new Error("missing select call");
  assert.match(selectCall.sql, /left join users/u);
  assert.deepEqual(selectCall.params, ["case", "c1", 10]);
});

// ── BUG-129 regression: mapTimelineRow uses requireTimestampString ──

function makePoolReturning(row: Record<string, unknown>) {
  type PoolClientLike = {
    query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }>;
    release: () => void;
  };
  type PoolLike = { connect: () => Promise<PoolClientLike> };
  const client: PoolClientLike = {
    query: (sql: string) => {
      if (sql.includes("from timeline_logs"))
        return Promise.resolve({ rows: [row] });
      return Promise.resolve({ rows: [] });
    },
    release: () => undefined,
  };
  return { connect: () => Promise.resolve(client) } as PoolLike;
}

const baseRow = {
  id: "t1",
  org_id: "00000000-0000-4000-8000-000000000000",
  entity_type: "case",
  entity_id: "c1",
  action: "created",
  actor_user_id: "00000000-0000-4000-8000-000000000001",
  actor_display_name: "Tanaka",
  payload: {},
};

const ctx = {
  orgId: "00000000-0000-4000-8000-000000000000",
  userId: "00000000-0000-4000-8000-000000000001",
  role: "staff" as const,
};

void test("mapTimelineRow: Date → ISO string", async () => {
  const d = new Date("2026-04-30T01:00:00.000Z");
  const pool = makePoolReturning({ ...baseRow, created_at: d });
  const service = new TimelineService(pool as unknown as Pool);
  const [log] = await service.list(ctx);
  assert.equal(log.createdAt, "2026-04-30T01:00:00.000Z");
});

void test("mapTimelineRow: string passthrough", async () => {
  const pool = makePoolReturning({
    ...baseRow,
    created_at: "2026-04-30T01:00:00.000Z",
  });
  const service = new TimelineService(pool as unknown as Pool);
  const [log] = await service.list(ctx);
  assert.equal(log.createdAt, "2026-04-30T01:00:00.000Z");
});

void test("mapTimelineRow: null → throws Invalid timestamp", async () => {
  const pool = makePoolReturning({ ...baseRow, created_at: null });
  const service = new TimelineService(pool as unknown as Pool);
  await assert.rejects(
    () => service.list(ctx),
    (err: Error) => {
      assert.match(err.message, /Invalid timestamp.*created_at/);
      return true;
    },
  );
});
