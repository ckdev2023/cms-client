import test from "node:test";
import assert from "node:assert/strict";
import { DocumentAssetsService } from "./documentAssets.service";
const ORG_A = "00000000-0000-4000-8000-aaaaaaaaaaaa";
const ORG_B = "00000000-0000-4000-8000-bbbbbbbbbbbb";
const USER_A = "00000000-0000-4000-8000-000000000001";
const USER_B = "00000000-0000-4000-8000-000000000002";
const ASSET_ID = "00000000-0000-4000-8000-000000000010";
function makeAssetRow() {
  return {
    id: ASSET_ID,
    org_id: ORG_A,
    material_code: "passport",
    owner_subject_type: "customer",
    owner_customer_id: "cust-1",
    owner_employer_identity_key: null,
    origin_case_id: "case-1",
    source_requirement_id: null,
    active_flag: true,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    latest_version_expiry_date: "2027-12-31",
    referenced_case_count: "1",
  };
}
function ctxA() {
  return { orgId: ORG_A, userId: USER_A, role: "viewer" };
}
function ctxB() {
  return { orgId: ORG_B, userId: USER_B, role: "viewer" };
}
void test("DocumentAssetsService.list sets org_id via set_config for tenant isolation", async () => {
  const capturedOrgIds = [];
  const calls = [];
  const queryFn = (sql, params) => {
    calls.push(sql.trim());
    if (sql.includes("set_config('app.org_id'")) {
      capturedOrgIds.push(params?.[0]);
      return Promise.resolve({ rows: [], rowCount: 1 });
    }
    if (sql.includes("set_config('app.actor_user_id'")) {
      return Promise.resolve({ rows: [], rowCount: 1 });
    }
    if (sql.includes("COUNT(*)")) {
      return Promise.resolve({ rows: [{ cnt: "0" }], rowCount: 1 });
    }
    if (sql.includes("document_assets")) {
      return Promise.resolve({ rows: [], rowCount: 0 });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  };
  const pool = {
    connect: () =>
      Promise.resolve({ query: queryFn, release: () => undefined }),
  };
  const svc = new DocumentAssetsService(pool);
  await svc.list(ctxA(), {});
  assert.ok(calls.some((s) => s.includes("set_config('app.org_id'")));
  assert.ok(capturedOrgIds.includes(ORG_A));
});
void test("DocumentAssetsService.list uses different org_id for different tenants", async () => {
  const capturedOrgIds = [];
  const queryFn = (sql, params) => {
    if (sql.includes("set_config('app.org_id'")) {
      capturedOrgIds.push(params?.[0]);
      return Promise.resolve({ rows: [], rowCount: 1 });
    }
    if (sql.includes("set_config('app.actor_user_id'")) {
      return Promise.resolve({ rows: [], rowCount: 1 });
    }
    if (sql.includes("COUNT(*)")) {
      return Promise.resolve({ rows: [{ cnt: "0" }], rowCount: 1 });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  };
  const pool = {
    connect: () =>
      Promise.resolve({ query: queryFn, release: () => undefined }),
  };
  const svc = new DocumentAssetsService(pool);
  await svc.list(ctxA(), {});
  await svc.list(ctxB(), {});
  assert.ok(capturedOrgIds.includes(ORG_A));
  assert.ok(capturedOrgIds.includes(ORG_B));
  assert.ok(
    capturedOrgIds.filter((id) => id === ORG_A).length >= 1,
    "ORG_A should be set at least once",
  );
  assert.ok(
    capturedOrgIds.filter((id) => id === ORG_B).length >= 1,
    "ORG_B should be set at least once",
  );
});
void test("DocumentAssetsService.get sets org_id via set_config", async () => {
  const capturedOrgIds = [];
  const queryFn = (sql, params) => {
    if (sql.includes("set_config('app.org_id'")) {
      capturedOrgIds.push(params?.[0]);
      return Promise.resolve({ rows: [], rowCount: 1 });
    }
    if (sql.includes("set_config('app.actor_user_id'")) {
      return Promise.resolve({ rows: [], rowCount: 1 });
    }
    if (sql.includes("document_assets")) {
      return Promise.resolve({ rows: [makeAssetRow()], rowCount: 1 });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  };
  const pool = {
    connect: () =>
      Promise.resolve({ query: queryFn, release: () => undefined }),
  };
  const svc = new DocumentAssetsService(pool);
  await svc.get(ctxA(), ASSET_ID);
  assert.ok(capturedOrgIds.includes(ORG_A));
});
void test("DocumentAssetsService.getSharedExpiryRisk sets org_id via set_config", async () => {
  const capturedOrgIds = [];
  const queryFn = (sql, params) => {
    if (sql.includes("set_config('app.org_id'")) {
      capturedOrgIds.push(params?.[0]);
      return Promise.resolve({ rows: [], rowCount: 1 });
    }
    if (sql.includes("set_config('app.actor_user_id'")) {
      return Promise.resolve({ rows: [], rowCount: 1 });
    }
    if (sql.includes("SELECT id FROM document_assets")) {
      return Promise.resolve({ rows: [{ id: ASSET_ID }], rowCount: 1 });
    }
    if (sql.includes("expiry_date") && sql.includes("version_no")) {
      return Promise.resolve({ rows: [], rowCount: 0 });
    }
    if (sql.includes("DISTINCT ON")) {
      return Promise.resolve({ rows: [], rowCount: 0 });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  };
  const pool = {
    connect: () =>
      Promise.resolve({ query: queryFn, release: () => undefined }),
  };
  const svc = new DocumentAssetsService(pool);
  await svc.getSharedExpiryRisk(ctxA(), ASSET_ID);
  assert.ok(capturedOrgIds.includes(ORG_A));
});
void test("DocumentAssetsService.upsertByOwnerAndMaterial sets org_id in transaction", async () => {
  const capturedOrgIds = [];
  const NEW_ID = "00000000-0000-4000-8000-cccccccccccc";
  const queryFn = (sql, params) => {
    if (sql.includes("set_config('app.org_id'")) {
      capturedOrgIds.push(params?.[0]);
      return Promise.resolve({ rows: [], rowCount: 1 });
    }
    if (sql.includes("set_config('app.actor_user_id'")) {
      return Promise.resolve({ rows: [], rowCount: 1 });
    }
    if (sql === "begin" || sql === "BEGIN") {
      return Promise.resolve({ rows: [], rowCount: 0 });
    }
    if (sql === "commit" || sql === "COMMIT") {
      return Promise.resolve({ rows: [], rowCount: 0 });
    }
    if (sql === "rollback" || sql === "ROLLBACK") {
      return Promise.resolve({ rows: [], rowCount: 0 });
    }
    if (sql.includes("INSERT INTO document_assets")) {
      return Promise.resolve({ rows: [{ id: NEW_ID }], rowCount: 1 });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  };
  const pool = {
    connect: () =>
      Promise.resolve({ query: queryFn, release: () => undefined }),
  };
  const svc = new DocumentAssetsService(pool);
  const id = await svc.upsertByOwnerAndMaterial(ctxA(), {
    materialCode: "passport",
    ownerSubjectType: "customer",
    ownerCustomerId: "cust-1",
  });
  assert.equal(id, NEW_ID);
  assert.ok(capturedOrgIds.includes(ORG_A));
});
void test("DocumentAssetsService.list also sets actor_user_id", async () => {
  const capturedUserIds = [];
  const queryFn = (sql, params) => {
    if (sql.includes("set_config('app.actor_user_id'")) {
      capturedUserIds.push(params?.[0]);
      return Promise.resolve({ rows: [], rowCount: 1 });
    }
    if (sql.includes("set_config('app.org_id'")) {
      return Promise.resolve({ rows: [], rowCount: 1 });
    }
    if (sql.includes("COUNT(*)")) {
      return Promise.resolve({ rows: [{ cnt: "0" }], rowCount: 1 });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  };
  const pool = {
    connect: () =>
      Promise.resolve({ query: queryFn, release: () => undefined }),
  };
  const svc = new DocumentAssetsService(pool);
  await svc.list(ctxA(), {});
  assert.ok(capturedUserIds.includes(USER_A));
});
//# sourceMappingURL=documentAssets.rls-isolation.test.js.map
