import test from "node:test";
import assert from "node:assert/strict";
import type { Pool } from "pg";

import { shouldUseTemplateByRollout } from "./templates.model";
import { TemplatesService } from "./templates.service";

type PoolClientLike = {
  query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }>;
  release: () => void;
};

void test("shouldUseTemplateByRollout supports all/percentage", () => {
  assert.equal(shouldUseTemplateByRollout({ type: "all" }, undefined), true);
  assert.equal(
    shouldUseTemplateByRollout(
      { type: "percentage", percentage: 0, salt: "s" },
      "e1",
    ),
    false,
  );
  assert.equal(
    shouldUseTemplateByRollout(
      { type: "percentage", percentage: 100, salt: "s" },
      "e1",
    ),
    true,
  );

  const r = { type: "percentage" as const, percentage: 50, salt: "salt" };
  const a = shouldUseTemplateByRollout(r, "entity-1");
  const b = shouldUseTemplateByRollout(r, "entity-1");
  assert.equal(a, b);
});

void test("TemplatesService.createVersion allocates next version per kind+key", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];

  const client: PoolClientLike = {
    query: (sql: string, params?: unknown[]) => {
      calls.push({ sql: sql.trim(), params });

      if (sql.includes("coalesce(max(version)")) {
        return Promise.resolve({ rows: [{ max_version: 2 }] });
      }
      if (sql.includes("insert into template_versions")) {
        return Promise.resolve({
          rows: [
            {
              id: "v1",
              org_id: "00000000-0000-4000-8000-000000000000",
              kind: "case_type",
              key: "k1",
              version: 3,
              config: { a: 1 },
              created_by_user_id: "00000000-0000-4000-8000-000000000001",
              created_at: "2026-01-01T00:00:00.000Z",
            },
          ],
        });
      }
      return Promise.resolve({ rows: [] });
    },
    release: () => undefined,
  };

  const pool = { connect: () => Promise.resolve(client) } as unknown as Pool;
  const service = new TemplatesService(pool);

  const created = await service.createVersion(
    {
      orgId: "00000000-0000-4000-8000-000000000000",
      userId: "00000000-0000-4000-8000-000000000001",
      role: "manager",
    },
    { kind: "case_type", key: "k1", config: { a: 1 } },
  );

  assert.equal(created.version, 3);

  const insertCall = calls.find((c) =>
    c.sql.includes("insert into template_versions"),
  );
  if (!insertCall) throw new Error("missing insert call");
  assert.deepEqual(insertCall.params?.slice(0, 6), [
    "00000000-0000-4000-8000-000000000000",
    "case_type",
    "k1",
    3,
    { a: 1 },
    "00000000-0000-4000-8000-000000000001",
  ]);
});

void test("TemplatesService.releaseVersion stores previous_version for rollback", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];

  const client: PoolClientLike = {
    query: (sql: string, params?: unknown[]) => {
      calls.push({ sql: sql.trim(), params });

      if (sql.includes("from template_releases")) {
        return Promise.resolve({
          rows: [
            {
              id: "r1",
              org_id: "00000000-0000-4000-8000-000000000000",
              kind: "case_type",
              key: "k1",
              mode: "template",
              current_version: 3,
              previous_version: 2,
              rollout: { type: "all" },
              updated_by_user_id: null,
              updated_at: "2026-01-01T00:00:00.000Z",
            },
          ],
        });
      }
      if (sql.includes("insert into template_releases")) {
        return Promise.resolve({
          rows: [
            {
              id: "r1",
              org_id: "00000000-0000-4000-8000-000000000000",
              kind: "case_type",
              key: "k1",
              mode: "template",
              current_version: 4,
              previous_version: 3,
              rollout: { type: "all" },
              updated_by_user_id: "00000000-0000-4000-8000-000000000001",
              updated_at: "2026-01-02T00:00:00.000Z",
            },
          ],
        });
      }
      return Promise.resolve({ rows: [] });
    },
    release: () => undefined,
  };

  const pool = { connect: () => Promise.resolve(client) } as unknown as Pool;
  const service = new TemplatesService(pool);

  const release = await service.releaseVersion(
    {
      orgId: "00000000-0000-4000-8000-000000000000",
      userId: "00000000-0000-4000-8000-000000000001",
      role: "manager",
    },
    { kind: "case_type", key: "k1", version: 4 },
  );

  assert.equal(release.currentVersion, 4);
  assert.equal(release.previousVersion, 3);

  const upsertCall = calls.find((c) =>
    c.sql.includes("insert into template_releases"),
  );
  if (!upsertCall) throw new Error("missing upsert call");
  assert.deepEqual(upsertCall.params?.slice(0, 7), [
    "00000000-0000-4000-8000-000000000000",
    "case_type",
    "k1",
    4,
    3,
    JSON.stringify({ type: "all" }),
    "00000000-0000-4000-8000-000000000001",
  ]);
});

// ---------------------------------------------------------------------------
// mapVersionRow / mapReleaseRow timestamp normalisation
// ---------------------------------------------------------------------------

function buildVersionClient(createdAt: unknown): {
  pool: Pool;
  service: TemplatesService;
} {
  const client: PoolClientLike = {
    query: (sql: string) => {
      if (sql.includes("select")) {
        return Promise.resolve({
          rows: [
            {
              id: "v1",
              org_id: "00000000-0000-4000-8000-000000000000",
              kind: "case_type",
              key: "k1",
              version: 1,
              config: {},
              created_by_user_id: null,
              created_at: createdAt,
            },
          ],
        });
      }
      return Promise.resolve({ rows: [] });
    },
    release: () => undefined,
  };
  const pool = { connect: () => Promise.resolve(client) } as unknown as Pool;
  return { pool, service: new TemplatesService(pool) };
}

const ctx = {
  orgId: "00000000-0000-4000-8000-000000000000",
  userId: "00000000-0000-4000-8000-000000000001",
  role: "manager" as const,
};

void test("mapVersionRow normalizes Date to ISO string (createdAt)", async () => {
  const { service } = buildVersionClient(new Date("2026-04-29T02:15:16.000Z"));
  const rows = await service.listVersions(ctx, {
    kind: "case_type",
    key: "k1",
  });
  assert.equal(rows.at(0)?.createdAt, "2026-04-29T02:15:16.000Z");
});

void test("mapVersionRow normalizes Date.toString() to ISO string (createdAt)", async () => {
  const dateToString = new Date("2026-04-29T02:15:16.000Z").toString();
  const { service } = buildVersionClient(dateToString);
  const rows = await service.listVersions(ctx, {
    kind: "case_type",
    key: "k1",
  });
  assert.equal(rows.at(0)?.createdAt, "2026-04-29T02:15:16.000Z");
});

void test("mapVersionRow preserves ISO string as-is (createdAt)", async () => {
  const { service } = buildVersionClient("2026-04-29T02:15:16.000Z");
  const rows = await service.listVersions(ctx, {
    kind: "case_type",
    key: "k1",
  });
  assert.equal(rows.at(0)?.createdAt, "2026-04-29T02:15:16.000Z");
});

void test("mapVersionRow returns empty string for null (createdAt)", async () => {
  const { service } = buildVersionClient(null);
  const rows = await service.listVersions(ctx, {
    kind: "case_type",
    key: "k1",
  });
  assert.equal(rows.at(0)?.createdAt, "");
});

function buildReleaseClient(updatedAt: unknown): {
  pool: Pool;
  service: TemplatesService;
} {
  const client: PoolClientLike = {
    query: (sql: string) => {
      if (sql.includes("select") || sql.includes("insert")) {
        return Promise.resolve({
          rows: [
            {
              id: "r1",
              org_id: "00000000-0000-4000-8000-000000000000",
              kind: "case_type",
              key: "k1",
              mode: "template",
              current_version: 1,
              previous_version: null,
              rollout: { type: "all" },
              updated_by_user_id: null,
              updated_at: updatedAt,
            },
          ],
        });
      }
      return Promise.resolve({ rows: [] });
    },
    release: () => undefined,
  };
  const pool = { connect: () => Promise.resolve(client) } as unknown as Pool;
  return { pool, service: new TemplatesService(pool) };
}

void test("mapReleaseRow normalizes Date to ISO string (updatedAt)", async () => {
  const { service } = buildReleaseClient(new Date("2026-04-29T02:15:16.000Z"));
  const row = await service.getRelease(ctx, { kind: "case_type", key: "k1" });
  assert.equal(row?.updatedAt, "2026-04-29T02:15:16.000Z");
});

void test("mapReleaseRow normalizes Date.toString() to ISO string (updatedAt)", async () => {
  const dateToString = new Date("2026-04-29T02:15:16.000Z").toString();
  const { service } = buildReleaseClient(dateToString);
  const row = await service.getRelease(ctx, { kind: "case_type", key: "k1" });
  assert.equal(row?.updatedAt, "2026-04-29T02:15:16.000Z");
});

void test("mapReleaseRow preserves ISO string as-is (updatedAt)", async () => {
  const { service } = buildReleaseClient("2026-04-29T02:15:16.000Z");
  const row = await service.getRelease(ctx, { kind: "case_type", key: "k1" });
  assert.equal(row?.updatedAt, "2026-04-29T02:15:16.000Z");
});

void test("mapReleaseRow returns empty string for null (updatedAt)", async () => {
  const { service } = buildReleaseClient(null);
  const row = await service.getRelease(ctx, { kind: "case_type", key: "k1" });
  assert.equal(row?.updatedAt, "");
});
