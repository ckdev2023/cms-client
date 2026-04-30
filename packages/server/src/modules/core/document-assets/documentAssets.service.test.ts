import test from "node:test";
import assert from "node:assert/strict";
import type { Pool } from "pg";

import { DocumentAssetsService } from "./documentAssets.service";
import {
  buildAssetListFilters,
  buildUpsertAssetSql,
  mapDocumentAssetRow,
  type DocumentAssetQueryRow,
} from "./documentAssets.shared";
import type { RequestContext } from "../tenancy/requestContext";

const ORG_ID = "00000000-0000-4000-8000-000000000000";
const USER_ID = "00000000-0000-4000-8000-000000000001";
const ASSET_ID = "00000000-0000-4000-8000-000000000010";
const CUSTOMER_ID = "00000000-0000-4000-8000-000000000020";
const CASE_ID = "00000000-0000-4000-8000-000000000030";

function makeCtx(
  role: "staff" | "viewer" | "manager" = "viewer",
): RequestContext {
  return { orgId: ORG_ID, userId: USER_ID, role };
}

function makeAssetRow(
  overrides: Record<string, unknown> = {},
): DocumentAssetQueryRow {
  return {
    id: ASSET_ID,
    org_id: ORG_ID,
    material_code: "passport",
    owner_subject_type: "customer",
    owner_customer_id: CUSTOMER_ID,
    owner_employer_identity_key: null,
    origin_case_id: CASE_ID,
    source_requirement_id: null,
    active_flag: true,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    latest_version_expiry_date: "2027-12-31",
    referenced_case_count: "3",
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

function createService(pool: PoolLike) {
  return new DocumentAssetsService(pool as unknown as Pool);
}

// ── mapDocumentAssetRow ──

void test("mapDocumentAssetRow maps all fields correctly", () => {
  const row = makeAssetRow();
  const asset = mapDocumentAssetRow(row);

  assert.equal(asset.id, ASSET_ID);
  assert.equal(asset.orgId, ORG_ID);
  assert.equal(asset.materialCode, "passport");
  assert.equal(asset.ownerSubjectType, "customer");
  assert.equal(asset.ownerCustomerId, CUSTOMER_ID);
  assert.equal(asset.ownerEmployerIdentityKey, null);
  assert.equal(asset.originCaseId, CASE_ID);
  assert.equal(asset.activeFlag, true);
  assert.equal(asset.latestVersionExpiryDate, "2027-12-31");
  assert.equal(asset.referencedCaseCount, 3);
  assert.equal(asset.isExpired, false);
});

void test("mapDocumentAssetRow marks expired when expiry_date < today", () => {
  const row = makeAssetRow({ latest_version_expiry_date: "2020-01-01" });
  const asset = mapDocumentAssetRow(row);
  assert.equal(asset.isExpired, true);
});

void test("mapDocumentAssetRow handles null expiry_date", () => {
  const row = makeAssetRow({ latest_version_expiry_date: null });
  const asset = mapDocumentAssetRow(row);
  assert.equal(asset.latestVersionExpiryDate, null);
  assert.equal(asset.isExpired, false);
});

void test("mapDocumentAssetRow handles numeric referenced_case_count", () => {
  const row = makeAssetRow({ referenced_case_count: 5 });
  const asset = mapDocumentAssetRow(row);
  assert.equal(asset.referencedCaseCount, 5);
});

void test("mapDocumentAssetRow handles zero referenced_case_count string", () => {
  const row = makeAssetRow({ referenced_case_count: "0" });
  const asset = mapDocumentAssetRow(row);
  assert.equal(asset.referencedCaseCount, 0);
});

// ── buildAssetListFilters ──

void test("buildAssetListFilters returns base filter when no input", () => {
  const { where, params } = buildAssetListFilters({});
  assert.equal(where.length, 1);
  assert.equal(where[0], "da.active_flag = true");
  assert.equal(params.length, 0);
});

void test("buildAssetListFilters adds materialCode filter", () => {
  const { where, params } = buildAssetListFilters({ materialCode: "passport" });
  assert.equal(where.length, 2);
  assert.ok(where[1].includes("material_code"));
  assert.deepEqual(params, ["passport"]);
});

void test("buildAssetListFilters adds ownerCustomerId filter", () => {
  const { where, params } = buildAssetListFilters({
    ownerCustomerId: CUSTOMER_ID,
  });
  assert.equal(where.length, 2);
  assert.ok(where[1].includes("owner_customer_id"));
  assert.deepEqual(params, [CUSTOMER_ID]);
});

void test("buildAssetListFilters adds caseId subquery filter", () => {
  const { where, params } = buildAssetListFilters({ caseId: CASE_ID });
  assert.equal(where.length, 2);
  assert.ok(where[1].includes("document_files"));
  assert.ok(where[1].includes("document_items"));
  assert.deepEqual(params, [CASE_ID]);
});

void test("buildAssetListFilters combines multiple filters", () => {
  const { where, params } = buildAssetListFilters({
    materialCode: "passport",
    ownerCustomerId: CUSTOMER_ID,
    caseId: CASE_ID,
  });
  assert.equal(where.length, 4);
  assert.equal(params.length, 3);
});

// ── DocumentAssetsService.list ──

void test("DocumentAssetsService.list returns items from query", async () => {
  const row = makeAssetRow();
  const pool = makePool((sql) => {
    if (sql.includes("COUNT(*)")) {
      return Promise.resolve({ rows: [{ cnt: "1" }], rowCount: 1 });
    }
    return Promise.resolve({ rows: [row], rowCount: 1 });
  });

  const svc = createService(pool);
  const result = await svc.list(makeCtx(), {});
  assert.equal(result.items.length, 1);
  assert.equal(result.total, 1);
  assert.equal(result.items[0].id, ASSET_ID);
  assert.equal(result.items[0].materialCode, "passport");
});

void test("DocumentAssetsService.list returns empty when no rows", async () => {
  const pool = makePool((sql) => {
    if (sql.includes("COUNT(*)")) {
      return Promise.resolve({ rows: [{ cnt: "0" }], rowCount: 1 });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  const svc = createService(pool);
  const result = await svc.list(makeCtx(), {});
  assert.equal(result.items.length, 0);
  assert.equal(result.total, 0);
});

void test("DocumentAssetsService.list passes materialCode to query", async () => {
  const queriedSqls: string[] = [];
  const queriedParams: unknown[][] = [];
  const pool = makePool((sql, params) => {
    queriedSqls.push(sql);
    queriedParams.push(params ?? []);
    if (sql.includes("COUNT(*)")) {
      return Promise.resolve({ rows: [{ cnt: "0" }], rowCount: 1 });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  const svc = createService(pool);
  await svc.list(makeCtx(), { materialCode: "passport" });

  const countIdx = queriedSqls.findIndex((s) => s.includes("COUNT(*)"));
  assert.ok(countIdx >= 0, "should have a COUNT query");
  assert.ok(queriedSqls[countIdx].includes("material_code"));
  const countParams = queriedParams[countIdx];
  assert.ok(countParams.includes("passport"));
});

void test("DocumentAssetsService.list passes ownerCustomerId to query", async () => {
  const queriedParams: unknown[][] = [];
  const pool = makePool((sql, params) => {
    queriedParams.push(params ?? []);
    if (sql.includes("COUNT(*)")) {
      return Promise.resolve({ rows: [{ cnt: "0" }], rowCount: 1 });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  const svc = createService(pool);
  await svc.list(makeCtx(), { ownerCustomerId: CUSTOMER_ID });

  assert.ok(queriedParams.some((p) => p.includes(CUSTOMER_ID)));
});

void test("DocumentAssetsService.list applies limit parameter", async () => {
  const queriedParams: unknown[][] = [];
  const pool = makePool((sql, params) => {
    queriedParams.push(params ?? []);
    if (sql.includes("COUNT(*)")) {
      return Promise.resolve({ rows: [{ cnt: "0" }], rowCount: 1 });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  const svc = createService(pool);
  await svc.list(makeCtx(), { limit: 10 });

  const listParams = queriedParams.find((p) => p.includes(10));
  assert.ok(listParams, "limit=10 should be in query params");
});

void test("DocumentAssetsService.list defaults limit to 50", async () => {
  const queriedParams: unknown[][] = [];
  const pool = makePool((sql, params) => {
    queriedParams.push(params ?? []);
    if (sql.includes("COUNT(*)")) {
      return Promise.resolve({ rows: [{ cnt: "0" }], rowCount: 1 });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  const svc = createService(pool);
  await svc.list(makeCtx(), {});

  const listParams = queriedParams.find((p) => p.includes(50));
  assert.ok(listParams, "default limit=50 should be in query params");
});

void test("DocumentAssetsService.list adds HAVING clause for onlyExpired", async () => {
  const queriedSqls: string[] = [];
  const pool = makePool((sql) => {
    queriedSqls.push(sql);
    if (sql.includes("COUNT(*)")) {
      return Promise.resolve({ rows: [{ cnt: "0" }], rowCount: 1 });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  const svc = createService(pool);
  await svc.list(makeCtx(), { onlyExpired: true });

  const listSql = queriedSqls.find(
    (s) => !s.includes("COUNT(*)") && s.includes("document_assets"),
  );
  assert.ok(
    listSql?.includes("HAVING"),
    "onlyExpired should produce HAVING clause",
  );
  assert.ok(listSql?.includes("CURRENT_DATE"));
});

// ── DocumentAssetsService.get ──

void test("DocumentAssetsService.get returns asset by id", async () => {
  const row = makeAssetRow();
  const pool = makePool(() => Promise.resolve({ rows: [row], rowCount: 1 }));

  const svc = createService(pool);
  const asset = await svc.get(makeCtx(), ASSET_ID);
  assert.ok(asset);
  assert.equal(asset.id, ASSET_ID);
  assert.equal(asset.materialCode, "passport");
});

void test("DocumentAssetsService.get returns null when not found", async () => {
  const pool = makePool(() => Promise.resolve({ rows: [], rowCount: 0 }));

  const svc = createService(pool);
  const asset = await svc.get(makeCtx(), "nonexistent");
  assert.equal(asset, null);
});

// ── buildUpsertAssetSql ──

void test("buildUpsertAssetSql uses customer conflict target when ownerCustomerId is set", () => {
  const { insertSql, fallbackSql, params } = buildUpsertAssetSql({
    orgId: ORG_ID,
    materialCode: "passport",
    ownerSubjectType: "customer",
    ownerCustomerId: CUSTOMER_ID,
  });

  assert.ok(
    insertSql.includes("ON CONFLICT"),
    "insert should have ON CONFLICT",
  );
  assert.ok(
    insertSql.includes("owner_customer_id"),
    "conflict target should reference owner_customer_id",
  );
  assert.ok(
    insertSql.includes("DO NOTHING"),
    "conflict resolution should be DO NOTHING",
  );
  assert.ok(
    fallbackSql.includes("owner_customer_id"),
    "fallback should match on owner_customer_id",
  );
  assert.equal(params.length, 7);
  assert.equal(params[0], ORG_ID);
  assert.equal(params[1], "passport");
  assert.equal(params[3], CUSTOMER_ID);
});

void test("buildUpsertAssetSql uses employer conflict target when ownerEmployerIdentityKey is set", () => {
  const { insertSql, fallbackSql, params } = buildUpsertAssetSql({
    orgId: ORG_ID,
    materialCode: "tax_certificate",
    ownerSubjectType: "employer",
    ownerEmployerIdentityKey: "EMP-001",
  });

  assert.ok(insertSql.includes("owner_employer_identity_key"));
  assert.ok(fallbackSql.includes("owner_employer_identity_key"));
  assert.equal(params[4], "EMP-001");
  assert.equal(params[3], null);
});

void test("buildUpsertAssetSql has no conflict clause when neither owner key is set", () => {
  const { insertSql, fallbackSql } = buildUpsertAssetSql({
    orgId: ORG_ID,
    materialCode: "other_doc",
    ownerSubjectType: "unknown",
  });

  assert.ok(
    !insertSql.includes("ON CONFLICT"),
    "no conflict clause without owner key",
  );
  assert.ok(fallbackSql.includes("FALSE"), "fallback should be unsatisfiable");
});

void test("buildUpsertAssetSql passes originCaseId and sourceRequirementId", () => {
  const { params } = buildUpsertAssetSql({
    orgId: ORG_ID,
    materialCode: "passport",
    ownerSubjectType: "customer",
    ownerCustomerId: CUSTOMER_ID,
    originCaseId: CASE_ID,
    sourceRequirementId: "00000000-0000-4000-8000-000000000099",
  });

  assert.equal(params[5], CASE_ID);
  assert.equal(params[6], "00000000-0000-4000-8000-000000000099");
});

// ── DocumentAssetsService.upsertByOwnerAndMaterial ──

void test("upsertByOwnerAndMaterial returns id from INSERT when new", async () => {
  const NEW_ID = "00000000-0000-4000-8000-aaaaaaaaaaaa";
  const queries: string[] = [];

  const pool = makePool((sql) => {
    queries.push(sql);
    if (sql.includes("INSERT INTO document_assets")) {
      return Promise.resolve({ rows: [{ id: NEW_ID }], rowCount: 1 });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  const svc = createService(pool);
  const id = await svc.upsertByOwnerAndMaterial(makeCtx("staff"), {
    materialCode: "passport",
    ownerSubjectType: "customer",
    ownerCustomerId: CUSTOMER_ID,
  });

  assert.equal(id, NEW_ID);
  assert.ok(
    queries.some((q) => q.includes("INSERT INTO document_assets")),
    "should execute INSERT",
  );
});

void test("upsertByOwnerAndMaterial falls back to SELECT on conflict (empty INSERT RETURNING)", async () => {
  const EXISTING_ID = "00000000-0000-4000-8000-bbbbbbbbbbbb";
  const queries: string[] = [];

  const pool = makePool((sql) => {
    queries.push(sql);
    if (sql.includes("INSERT INTO document_assets")) {
      return Promise.resolve({ rows: [], rowCount: 0 });
    }
    if (sql.includes("SELECT id FROM document_assets")) {
      return Promise.resolve({ rows: [{ id: EXISTING_ID }], rowCount: 1 });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  const svc = createService(pool);
  const id = await svc.upsertByOwnerAndMaterial(makeCtx("staff"), {
    materialCode: "passport",
    ownerSubjectType: "customer",
    ownerCustomerId: CUSTOMER_ID,
  });

  assert.equal(id, EXISTING_ID);
  assert.ok(
    queries.some((q) => q.includes("SELECT id FROM document_assets")),
    "should execute fallback SELECT",
  );
});

void test("upsertByOwnerAndMaterial throws when neither INSERT nor SELECT returns a row", async () => {
  const pool = makePool(() => Promise.resolve({ rows: [], rowCount: 0 }));

  const svc = createService(pool);
  await assert.rejects(
    () =>
      svc.upsertByOwnerAndMaterial(makeCtx("staff"), {
        materialCode: "passport",
        ownerSubjectType: "customer",
        ownerCustomerId: CUSTOMER_ID,
      }),
    (err: Error) => {
      assert.ok(err.message.includes("neither INSERT nor SELECT"));
      return true;
    },
  );
});
