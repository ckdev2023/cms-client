import test from "node:test";
import assert from "node:assert/strict";
import type { Pool } from "pg";

import { shouldEnableFlagByRollout } from "./featureFlags.model";
import { FeatureFlagsService } from "./featureFlags.service";

void test("shouldEnableFlagByRollout supports all/percentage", () => {
  assert.equal(shouldEnableFlagByRollout({ type: "all" }, undefined), true);
  assert.equal(
    shouldEnableFlagByRollout(
      { type: "percentage", percentage: 0, salt: "s" },
      "e1",
    ),
    false,
  );
  assert.equal(
    shouldEnableFlagByRollout(
      { type: "percentage", percentage: 100, salt: "s" },
      "e1",
    ),
    true,
  );

  const r = { type: "percentage" as const, percentage: 50, salt: "salt" };
  const a = shouldEnableFlagByRollout(r, "entity-1");
  const b = shouldEnableFlagByRollout(r, "entity-1");
  assert.equal(a, b);
});

void test("FeatureFlagsService.resolve returns missing/disabled/rollout/used", async () => {
  type PoolClientLike = {
    query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }>;
    release: () => void;
  };
  type PoolLike = { connect: () => Promise<PoolClientLike> };

  const client: PoolClientLike = {
    query: (sql: string, params?: unknown[]) => {
      const normalized = sql.trim();
      if (normalized.startsWith("select id, org_id, key, enabled, payload")) {
        if (params?.[0] === "missing") return Promise.resolve({ rows: [] });
        if (params?.[0] === "disabled") {
          return Promise.resolve({
            rows: [
              {
                id: "f1",
                org_id: "00000000-0000-4000-8000-000000000000",
                key: "disabled",
                enabled: false,
                payload: {},
                created_at: "2026-01-01T00:00:00.000Z",
                updated_at: "2026-01-01T00:00:00.000Z",
              },
            ],
          });
        }
        if (params?.[0] === "rollout") {
          return Promise.resolve({
            rows: [
              {
                id: "f2",
                org_id: "00000000-0000-4000-8000-000000000000",
                key: "rollout",
                enabled: true,
                payload: {
                  rollout: { type: "percentage", percentage: 0, salt: "s" },
                },
                created_at: "2026-01-01T00:00:00.000Z",
                updated_at: "2026-01-01T00:00:00.000Z",
              },
            ],
          });
        }
        if (params?.[0] === "used") {
          return Promise.resolve({
            rows: [
              {
                id: "f3",
                org_id: "00000000-0000-4000-8000-000000000000",
                key: "used",
                enabled: true,
                payload: { rollout: { type: "all" } },
                created_at: "2026-01-01T00:00:00.000Z",
                updated_at: "2026-01-01T00:00:00.000Z",
              },
            ],
          });
        }
      }
      return Promise.resolve({ rows: [] });
    },
    release: () => undefined,
  };

  const pool: PoolLike = { connect: () => Promise.resolve(client) };

  const timelineWrites: unknown[] = [];
  const timelineService = {
    write: (_ctx: unknown, input: unknown) => {
      timelineWrites.push(input);
      return Promise.resolve();
    },
  };

  const service = new FeatureFlagsService(
    pool as unknown as Pool,
    timelineService as never,
  );

  const ctx = {
    orgId: "00000000-0000-4000-8000-000000000000",
    userId: "00000000-0000-4000-8000-000000000001",
    role: "manager",
  } as const;

  assert.deepEqual(await service.resolve(ctx, { key: "missing" }), {
    key: "missing",
    enabled: false,
    used: false,
    reason: "missing",
  });
  assert.deepEqual(await service.resolve(ctx, { key: "disabled" }), {
    key: "disabled",
    enabled: false,
    used: false,
    reason: "disabled",
  });
  assert.deepEqual(
    await service.resolve(ctx, { key: "rollout", entityId: "e1" }),
    {
      key: "rollout",
      enabled: false,
      used: false,
      reason: "rollout",
    },
  );
  assert.deepEqual(
    await service.resolve(ctx, { key: "used", entityId: "e1" }),
    {
      key: "used",
      enabled: true,
      used: true,
    },
  );

  assert.equal(timelineWrites.length, 0);
});

void test("FeatureFlagsService.upsert writes flag and timeline", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];

  type PoolClientLike = {
    query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }>;
    release: () => void;
  };
  type PoolLike = { connect: () => Promise<PoolClientLike> };

  const client: PoolClientLike = {
    query: (sql: string, params?: unknown[]) => {
      calls.push({ sql: sql.trim(), params });
      if (sql.includes("insert into feature_flags")) {
        return Promise.resolve({
          rows: [
            {
              id: "f1",
              org_id: "00000000-0000-4000-8000-000000000000",
              key: "k1",
              enabled: true,
              payload: { rollout: { type: "all" }, note: "n" },
              created_at: "2026-01-01T00:00:00.000Z",
              updated_at: "2026-01-02T00:00:00.000Z",
            },
          ],
        });
      }
      return Promise.resolve({ rows: [] });
    },
    release: () => undefined,
  };

  const pool: PoolLike = { connect: () => Promise.resolve(client) };

  const timelineWrites: unknown[] = [];
  const timelineService = {
    write: (_ctx: unknown, input: unknown) => {
      timelineWrites.push(input);
      return Promise.resolve();
    },
  };

  const service = new FeatureFlagsService(
    pool as unknown as Pool,
    timelineService as never,
  );

  const ctx = {
    orgId: "00000000-0000-4000-8000-000000000000",
    userId: "00000000-0000-4000-8000-000000000001",
    role: "manager",
  } as const;

  const created = await service.upsert(ctx, {
    key: "k1",
    enabled: true,
    rollout: { type: "all" },
    note: "n",
  });

  assert.equal(created.key, "k1");
  assert.equal(created.enabled, true);

  const upsertCall = calls.find((c) =>
    c.sql.includes("insert into feature_flags"),
  );
  if (!upsertCall) throw new Error("missing upsert call");
  assert.deepEqual(upsertCall.params?.slice(0, 3), [
    "00000000-0000-4000-8000-000000000000",
    "k1",
    true,
  ]);

  assert.equal(timelineWrites.length, 1);
});
