import test from "node:test";
import assert from "node:assert/strict";
import type { Pool } from "pg";

import {
  OrganizationsService,
  normalizeOrganizationSettings,
} from "./organizations.service";
import type { RequestContext } from "../tenancy/requestContext";

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

  const service = new OrganizationsService(pool);
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

  const service = new OrganizationsService(pool);
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
});
