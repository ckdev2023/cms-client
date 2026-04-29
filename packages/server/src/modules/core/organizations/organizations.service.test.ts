import test from "node:test";
import assert from "node:assert/strict";
import type { Pool } from "pg";

import {
  OrganizationsService,
  normalizeOrganizationSettings,
  diffSettings,
} from "./organizations.service";
import type { OrganizationSettings } from "./organizations.service";
import type { RequestContext } from "../tenancy/requestContext";
import type { TimelineService } from "../timeline/timeline.service";
import type { TimelineWriteInput } from "../timeline/timeline.service";

const ORG_ID = "00000000-0000-4000-8000-000000000000";
const USER_ID = "00000000-0000-4000-8000-000000000001";

function makeCtx(role: "viewer" | "manager" = "manager"): RequestContext {
  return { orgId: ORG_ID, userId: USER_ID, role };
}

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

function parseStoredSettings(value: unknown): unknown {
  return typeof value === "string" ? (JSON.parse(value) as unknown) : {};
}

function makeSettings(
  overrides?: Partial<{
    visibility: Partial<OrganizationSettings["visibility"]>;
    storageRoot: Partial<OrganizationSettings["storageRoot"]>;
  }>,
): OrganizationSettings {
  return {
    visibility: {
      allowCrossGroupCaseCreate: false,
      allowPrincipalViewCrossGroupCollab: false,
      ...overrides?.visibility,
    },
    storageRoot: {
      rootLabel: null,
      rootPath: null,
      updatedBy: null,
      updatedAt: null,
      ...overrides?.storageRoot,
    },
  };
}

type TimelineCall = { ctx: RequestContext; input: TimelineWriteInput };

function makeTimelineService(): TimelineService & { calls: TimelineCall[] } {
  const calls: TimelineCall[] = [];
  return {
    calls,
    write(ctx: RequestContext, input: TimelineWriteInput) {
      calls.push({ ctx, input });
      return Promise.resolve();
    },
  } as unknown as TimelineService & { calls: TimelineCall[] };
}

void test("diffSettings returns empty fields when settings are identical", () => {
  const settings = makeSettings();
  const result = diffSettings(settings, settings);
  assert.deepEqual(result.fields, []);
  assert.deepEqual(result.before, {});
  assert.deepEqual(result.after, {});
});

void test("diffSettings detects visibility changes", () => {
  const prev = makeSettings();
  const next = makeSettings({
    visibility: { allowCrossGroupCaseCreate: true },
  });
  const result = diffSettings(prev, next);
  assert.deepEqual(result.fields, ["visibility.allowCrossGroupCaseCreate"]);
  assert.equal(result.before["visibility.allowCrossGroupCaseCreate"], false);
  assert.equal(result.after["visibility.allowCrossGroupCaseCreate"], true);
});

void test("diffSettings detects storageRoot user-field changes", () => {
  const prev = makeSettings();
  const next = makeSettings({
    storageRoot: {
      rootLabel: "案件資料",
      rootPath: "\\\\server\\docs",
      updatedBy: "Admin",
      updatedAt: "2026-04-28T00:00:00Z",
    },
  });
  const result = diffSettings(prev, next);
  assert.deepEqual(result.fields, [
    "storageRoot.rootLabel",
    "storageRoot.rootPath",
  ]);
  assert.equal(result.before["storageRoot.rootLabel"], null);
  assert.equal(result.after["storageRoot.rootLabel"], "案件資料");
  assert.equal(result.after["storageRoot.rootPath"], "\\\\server\\docs");
});

void test("diffSettings ignores storageRoot metadata fields (updatedBy, updatedAt)", () => {
  const prev = makeSettings({
    storageRoot: { rootLabel: "A", updatedBy: "Alice", updatedAt: "t1" },
  });
  const next = makeSettings({
    storageRoot: { rootLabel: "A", updatedBy: "Bob", updatedAt: "t2" },
  });
  const result = diffSettings(prev, next);
  assert.deepEqual(result.fields, []);
});

void test("diffSettings detects multiple changes across sections", () => {
  const prev = makeSettings({
    visibility: { allowCrossGroupCaseCreate: true },
    storageRoot: { rootLabel: "Old" },
  });
  const next = makeSettings({
    visibility: {
      allowCrossGroupCaseCreate: false,
      allowPrincipalViewCrossGroupCollab: true,
    },
    storageRoot: { rootLabel: "New" },
  });
  const result = diffSettings(prev, next);
  assert.deepEqual(result.fields, [
    "visibility.allowCrossGroupCaseCreate",
    "visibility.allowPrincipalViewCrossGroupCollab",
    "storageRoot.rootLabel",
  ]);
});

void test("normalizeOrganizationSettings falls back to defaults", () => {
  const result = normalizeOrganizationSettings({
    visibility: { allowCrossGroupCaseCreate: "yes" },
    storageRoot: { rootLabel: 42 },
  });

  assert.deepEqual(result, {
    visibility: {
      allowCrossGroupCaseCreate: false,
      allowPrincipalViewCrossGroupCollab: false,
    },
    storageRoot: {
      rootLabel: null,
      rootPath: null,
      updatedBy: null,
      updatedAt: null,
    },
  });
});

void test("OrganizationsService.getSettings returns normalized settings", async () => {
  const pool = makePool((sql) => {
    if (sql.includes("from organizations")) {
      return Promise.resolve({
        rows: [
          { settings: { visibility: { allowCrossGroupCaseCreate: true } } },
        ],
        rowCount: 1,
      });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  const service = new OrganizationsService(pool, makeTimelineService());
  const result = await service.getSettings(makeCtx("viewer"));
  assert.equal(result.visibility.allowCrossGroupCaseCreate, true);
  assert.equal(result.visibility.allowPrincipalViewCrossGroupCollab, false);
  assert.equal(result.storageRoot.rootLabel, null);
});

void test("OrganizationsService.updateSettings merges patch and stamps storage metadata", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];
  const pool = makePool((sql, params) => {
    calls.push({ sql: sql.trim(), params });

    if (sql.includes("select settings from organizations")) {
      return Promise.resolve({
        rows: [
          {
            settings: {
              visibility: {
                allowCrossGroupCaseCreate: false,
                allowPrincipalViewCrossGroupCollab: false,
              },
              storageRoot: {
                rootLabel: null,
                rootPath: null,
                updatedBy: null,
                updatedAt: null,
              },
            },
          },
        ],
        rowCount: 1,
      });
    }
    if (sql.includes("select name from users")) {
      return Promise.resolve({
        rows: [{ name: "Admin User" }],
        rowCount: 1,
      });
    }
    if (sql.includes("update organizations set settings")) {
      return Promise.resolve({
        rows: [{ settings: parseStoredSettings(params?.[1]) }],
        rowCount: 1,
      });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  const timeline = makeTimelineService();
  const service = new OrganizationsService(pool, timeline);
  const result = await service.updateSettings(makeCtx(), {
    visibility: { allowCrossGroupCaseCreate: true },
    storageRoot: {
      rootLabel: "案件資料総盤",
      rootPath: "\\fileserver\\gyosei-docs",
    },
  });

  assert.equal(result.visibility.allowCrossGroupCaseCreate, true);
  assert.equal(result.storageRoot.rootLabel, "案件資料総盤");
  assert.equal(result.storageRoot.rootPath, "\\fileserver\\gyosei-docs");
  assert.equal(result.storageRoot.updatedBy, "Admin User");
  assert.ok(result.storageRoot.updatedAt);

  const updateCall = calls.find((call) =>
    call.sql.includes("update organizations set settings"),
  );
  assert.ok(updateCall);
  const settingsPayload = updateCall.params?.[1];
  if (typeof settingsPayload !== "string") {
    throw new Error("Expected persisted settings payload to be a JSON string");
  }
  const payload = JSON.parse(settingsPayload) as {
    visibility: { allowCrossGroupCaseCreate: boolean };
    storageRoot: { updatedBy: string };
  };
  assert.equal(payload.visibility.allowCrossGroupCaseCreate, true);
  assert.equal(payload.storageRoot.updatedBy, "Admin User");

  assert.equal(timeline.calls.length, 1);
  const tlCall = timeline.calls[0];
  assert.equal(tlCall.input.entityType, "organization");
  assert.equal(tlCall.input.entityId, ORG_ID);
  assert.equal(tlCall.input.action, "org_settings_changed");
  assert.deepEqual(tlCall.input.payload.fields, [
    "visibility.allowCrossGroupCaseCreate",
    "storageRoot.rootLabel",
    "storageRoot.rootPath",
  ]);
  assert.equal(
    (tlCall.input.payload.before as Record<string, unknown>)[
      "visibility.allowCrossGroupCaseCreate"
    ],
    false,
  );
  assert.equal(
    (tlCall.input.payload.after as Record<string, unknown>)[
      "visibility.allowCrossGroupCaseCreate"
    ],
    true,
  );
});

function makeUpdatePool(currentSettings: OrganizationSettings) {
  return makePool((sql, params) => {
    if (sql.includes("select settings from organizations")) {
      return Promise.resolve({
        rows: [{ settings: currentSettings }],
        rowCount: 1,
      });
    }
    if (sql.includes("select name from users")) {
      return Promise.resolve({
        rows: [{ name: "Admin User" }],
        rowCount: 1,
      });
    }
    if (sql.includes("update organizations set settings")) {
      return Promise.resolve({
        rows: [{ settings: parseStoredSettings(params?.[1]) }],
        rowCount: 1,
      });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });
}

void test("updateSettings writes timeline on visibility-only change", async () => {
  const pool = makeUpdatePool(makeSettings());
  const timeline = makeTimelineService();
  const service = new OrganizationsService(pool, timeline);

  await service.updateSettings(makeCtx(), {
    visibility: { allowCrossGroupCaseCreate: true },
  });

  assert.equal(timeline.calls.length, 1);
  const tl = timeline.calls[0];
  assert.equal(tl.input.entityType, "organization");
  assert.equal(tl.input.entityId, ORG_ID);
  assert.equal(tl.input.action, "org_settings_changed");
  assert.deepEqual(tl.input.payload.fields, [
    "visibility.allowCrossGroupCaseCreate",
  ]);
  assert.equal(
    (tl.input.payload.before as Record<string, unknown>)[
      "visibility.allowCrossGroupCaseCreate"
    ],
    false,
  );
  assert.equal(
    (tl.input.payload.after as Record<string, unknown>)[
      "visibility.allowCrossGroupCaseCreate"
    ],
    true,
  );
});

void test("updateSettings writes timeline on storageRoot-only change", async () => {
  const pool = makeUpdatePool(makeSettings());
  const timeline = makeTimelineService();
  const service = new OrganizationsService(pool, timeline);

  await service.updateSettings(makeCtx(), {
    storageRoot: { rootLabel: "新ラベル", rootPath: "\\\\nas\\docs" },
  });

  assert.equal(timeline.calls.length, 1);
  const tl = timeline.calls[0];
  assert.equal(tl.input.action, "org_settings_changed");
  assert.deepEqual(tl.input.payload.fields, [
    "storageRoot.rootLabel",
    "storageRoot.rootPath",
  ]);
  assert.equal(
    (tl.input.payload.before as Record<string, unknown>)[
      "storageRoot.rootLabel"
    ],
    null,
  );
  assert.equal(
    (tl.input.payload.after as Record<string, unknown>)[
      "storageRoot.rootLabel"
    ],
    "新ラベル",
  );
  assert.equal(
    (tl.input.payload.after as Record<string, unknown>)["storageRoot.rootPath"],
    "\\\\nas\\docs",
  );
});

void test("updateSettings does not write timeline when values are unchanged", async () => {
  const current = makeSettings({
    visibility: { allowCrossGroupCaseCreate: true },
    storageRoot: { rootLabel: "Same" },
  });
  const pool = makeUpdatePool(current);
  const timeline = makeTimelineService();
  const service = new OrganizationsService(pool, timeline);

  await service.updateSettings(makeCtx(), {
    visibility: { allowCrossGroupCaseCreate: true },
    storageRoot: { rootLabel: "Same" },
  });

  assert.equal(timeline.calls.length, 0);
});

void test("updateSettings does not write timeline on empty input", async () => {
  const pool = makeUpdatePool(makeSettings());
  const timeline = makeTimelineService();
  const service = new OrganizationsService(pool, timeline);

  const result = await service.updateSettings(makeCtx(), {});

  assert.equal(timeline.calls.length, 0);
  assert.equal(result.visibility.allowCrossGroupCaseCreate, false);
});

void test("OrganizationsService.updateSettings skips timeline when no fields changed", async () => {
  const pool = makePool((sql) => {
    if (sql.includes("select settings from organizations")) {
      return Promise.resolve({
        rows: [
          {
            settings: {
              visibility: {
                allowCrossGroupCaseCreate: true,
                allowPrincipalViewCrossGroupCollab: false,
              },
              storageRoot: {
                rootLabel: "Existing",
                rootPath: null,
                updatedBy: "Admin",
                updatedAt: "2026-01-01T00:00:00Z",
              },
            },
          },
        ],
        rowCount: 1,
      });
    }
    if (sql.includes("select name from users")) {
      return Promise.resolve({
        rows: [{ name: "Admin User" }],
        rowCount: 1,
      });
    }
    if (sql.includes("update organizations set settings")) {
      return Promise.resolve({
        rows: [
          {
            settings: {
              visibility: {
                allowCrossGroupCaseCreate: true,
                allowPrincipalViewCrossGroupCollab: false,
              },
              storageRoot: {
                rootLabel: "Existing",
                rootPath: null,
                updatedBy: "Admin User",
                updatedAt: "2026-04-28T00:00:00Z",
              },
            },
          },
        ],
        rowCount: 1,
      });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  const timeline = makeTimelineService();
  const service = new OrganizationsService(pool, timeline);
  await service.updateSettings(makeCtx(), {
    visibility: { allowCrossGroupCaseCreate: true },
    storageRoot: { rootLabel: "Existing" },
  });

  assert.equal(timeline.calls.length, 0);
});

void test("OrganizationsService.updateSettings skips timeline on empty patch", async () => {
  const pool = makePool((sql) => {
    if (sql.includes("select settings from organizations")) {
      return Promise.resolve({
        rows: [
          {
            settings: {
              visibility: {
                allowCrossGroupCaseCreate: false,
                allowPrincipalViewCrossGroupCollab: false,
              },
              storageRoot: {
                rootLabel: null,
                rootPath: null,
                updatedBy: null,
                updatedAt: null,
              },
            },
          },
        ],
        rowCount: 1,
      });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  const timeline = makeTimelineService();
  const service = new OrganizationsService(pool, timeline);
  await service.updateSettings(makeCtx(), {});

  assert.equal(timeline.calls.length, 0);
});
